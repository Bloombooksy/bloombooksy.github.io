-- Pakiety (Start / Premium), okres próbny, akceptacja regulaminu, e-mail klientki
-- i przypomnienia mailem (Start) albo SMS z miesięcznym limitem (Premium).

alter type public.sms_status add value if not exists 'mail';

alter table public.salony
  add column pakiet text not null default 'start' check (pakiet in ('start', 'premium')),
  add column proba_do timestamptz not null default now() + interval '14 days',
  add column oplacone_do timestamptz,
  add column sms_limit integer not null default 100 check (sms_limit between 0 and 10000),
  add column regulamin_wersja text,
  add column regulamin_akceptacja timestamptz;

alter table public.klientki
  add column email text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- istniejące salony (pilot): 90 dni; salon demo: zawsze aktywny, w Premium
update public.salony set proba_do = now() + interval '90 days';
update public.salony set proba_do = '2099-01-01', pakiet = 'premium' where slug = 'demo';

-- Pakietu, dat i limitu nie zmieni sama właścicielka – tylko Bloomly (service_role / SQL).
create or replace function public.salony_chron_pakiet() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') and (
       new.pakiet is distinct from old.pakiet or new.proba_do is distinct from old.proba_do
    or new.oplacone_do is distinct from old.oplacone_do or new.sms_limit is distinct from old.sms_limit
    or new.regulamin_wersja is distinct from old.regulamin_wersja
    or new.regulamin_akceptacja is distinct from old.regulamin_akceptacja) then
    raise exception 'Tych ustawień nie można zmienić samodzielnie' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger salony_chron_pakiet before update on public.salony
  for each row execute function public.salony_chron_pakiet();

create or replace function public.salon_aktywny(s public.salony) returns boolean
language sql stable set search_path = public as $$
  select greatest(s.proba_do, coalesce(s.oplacone_do, s.proba_do)) > now()
$$;

-- SMS-y wysłane automatycznie w bieżącym miesiącu (strefa salonu)
create or replace function public.sms_w_miesiacu(p_salon uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.wizyty w join public.salony s on s.id = w.salon_id
  where w.salon_id = p_salon and w.sms_status = 'wyslany'
    and date_trunc('month', w.sms_wyslano at time zone s.strefa) = date_trunc('month', now() at time zone s.strefa)
$$;
revoke all on function public.sms_w_miesiacu(uuid) from public, anon;
grant execute on function public.sms_w_miesiacu(uuid) to authenticated, service_role;

-- Stan pakietu dla aplikacji (zespół salonu)
create or replace function public.moj_pakiet() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'pakiet', s.pakiet, 'proba_do', s.proba_do, 'oplacone_do', s.oplacone_do,
    'aktywny', public.salon_aktywny(s), 'sms_limit', s.sms_limit,
    'sms_w_miesiacu', public.sms_w_miesiacu(s.id),
    'regulamin_wersja', s.regulamin_wersja, 'regulamin_akceptacja', s.regulamin_akceptacja)
  from public.salony s where s.id in (select public.salony_zespolu()) limit 1
$$;
revoke all on function public.moj_pakiet() from public, anon;
grant execute on function public.moj_pakiet() to authenticated;

-- Akceptacja regulaminu – tylko właścicielka
create or replace function public.akceptuj_regulamin(p_wersja text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_wersja, '')) not between 1 and 40 then raise exception 'Zła wersja' using errcode = 'P0001'; end if;
  update public.salony set regulamin_wersja = p_wersja, regulamin_akceptacja = now()
  where id in (select public.moje_salony());
  if not found then raise exception 'Tylko właścicielka salonu akceptuje regulamin' using errcode = 'P0001'; end if;
end $$;
revoke all on function public.akceptuj_regulamin(text) from public, anon;
grant execute on function public.akceptuj_regulamin(text) to authenticated;

-- Po okresie próbnym bez opłaty: nie można dodawać nowych wizyt (dane zostają, podgląd działa).
create or replace function public.wizyty_tylko_aktywny() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (select public.salon_aktywny(s) from public.salony s where s.id = new.salon_id) then
    raise exception 'Okres próbny się skończył – wybierz pakiet w zakładce Więcej → Pakiet, żeby dodawać wizyty'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.wizyty_tylko_aktywny() from public, anon, authenticated;
create trigger wizyty_tylko_aktywny before insert on public.wizyty
  for each row execute function public.wizyty_tylko_aktywny();

-- Zapisy online tylko dla aktywnych salonów
create or replace function public.zapisy_salon(p_token text) returns public.salony
language sql stable security definer set search_path = public as $$
  select * from public.salony s
  where s.zapisy_wlaczone and public.salon_aktywny(s)
    and ((s.zapisy_token = p_token and char_length(p_token) >= 16) or (s.slug is not null and s.slug = lower(p_token)))
  limit 1
$$;
revoke all on function public.zapisy_salon(text) from public, anon, authenticated;

-- Zapis online z e-mailem do przypomnienia
create or replace function public.zapisy_rezerwuj_v3(
  p_token text, p_usluga uuid, p_start timestamptz, p_imie text, p_telefon text,
  p_notatka text default '', p_pracownik uuid default null, p_email text default ''
) returns json
language plpgsql security definer set search_path = public as $$
declare
  wynik json;
  mail text := lower(btrim(coalesce(p_email, '')));
begin
  if mail <> '' and mail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Podaj poprawny e-mail albo zostaw puste' using errcode = 'P0001';
  end if;
  wynik := public.zapisy_rezerwuj_v2(p_token, p_usluga, p_start, p_imie, p_telefon, p_notatka, p_pracownik);
  if mail <> '' then
    update public.klientki k set email = mail
    from public.wizyty w where w.id = (wynik->>'id')::uuid and k.id = w.klientka_id;
  end if;
  return wynik;
end $$;
revoke all on function public.zapisy_rezerwuj_v3(text, uuid, timestamptz, text, text, text, uuid, text) from public;
grant execute on function public.zapisy_rezerwuj_v3(text, uuid, timestamptz, text, text, text, uuid, text) to anon, authenticated;

-- Lista przypomnień na jutro (dla funkcji „przypomnienia”), z pakietem i licznikiem SMS
create or replace function public.przypomnienia_do_wyslania() returns table (
  wizyta_id uuid, kod text, start timestamptz, strefa text, usluga text, salon_id uuid, salon text,
  kolor text, adres text, salon_telefon text, szablon text, nadawca text, pakiet text,
  sms_limit integer, sms_w_miesiacu integer, imie text, telefon text, zgoda boolean, email text
)
language sql stable security definer set search_path = public as $$
  select w.id, w.kod, w.start, s.strefa, w.usluga_nazwa, s.id, s.nazwa, s.kolor, s.adres, s.telefon,
         s.sms_szablon, s.sms_nadawca, s.pakiet, s.sms_limit, public.sms_w_miesiacu(s.id),
         coalesce(k.imie, ''), coalesce(k.telefon, ''), coalesce(k.zgoda_sms, false), coalesce(k.email, '')
  from public.wizyty w
  join public.salony s on s.id = w.salon_id
  left join public.klientki k on k.id = w.klientka_id
  where s.sms_wlaczone and public.salon_aktywny(s)
    and w.status = 'potwierdzona'
    and w.sms_status = 'brak'
    and (w.start at time zone s.strefa)::date = (now() at time zone s.strefa)::date + 1
    and extract(hour from now() at time zone s.strefa) >= s.sms_godzina
  order by s.id, w.start
  limit 300
$$;
revoke all on function public.przypomnienia_do_wyslania() from public, anon, authenticated;
grant execute on function public.przypomnienia_do_wyslania() to service_role;
