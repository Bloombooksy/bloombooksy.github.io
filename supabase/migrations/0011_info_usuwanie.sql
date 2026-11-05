-- Informacja dla klientki (parking, wejście, przygotowanie) i usuwanie salonu z 30-dniowym okresem na zmianę zdania.

alter table public.salony
  add column info_dla_klientki text not null default '' check (char_length(info_dla_klientki) <= 500),
  add column do_usuniecia timestamptz;

-- do_usuniecia zmienia tylko funkcja usun_salon / anuluj_usuniecie
create or replace function public.salony_chron_pakiet() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and coalesce(current_setting('bloomly.zmiana_systemowa', true), '') <> 'tak' and (
       new.pakiet is distinct from old.pakiet or new.proba_do is distinct from old.proba_do
    or new.oplacone_do is distinct from old.oplacone_do or new.sms_limit is distinct from old.sms_limit
    or new.regulamin_wersja is distinct from old.regulamin_wersja
    or new.regulamin_akceptacja is distinct from old.regulamin_akceptacja
    or new.do_usuniecia is distinct from old.do_usuniecia) then
    raise exception 'Tych ustawień nie można zmienić samodzielnie' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.salon_aktywny(s public.salony) returns boolean
language sql stable set search_path = public as $$
  select s.do_usuniecia is null and greatest(s.proba_do, coalesce(s.oplacone_do, s.proba_do)) > now()
$$;

-- akceptuj_regulamin musi przejść przez ochronę kolumn
create or replace function public.akceptuj_regulamin(p_wersja text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_wersja, '')) not between 1 and 40 then raise exception 'Zła wersja' using errcode = 'P0001'; end if;
  perform set_config('bloomly.zmiana_systemowa', 'tak', true);
  update public.salony set regulamin_wersja = p_wersja, regulamin_akceptacja = now()
  where id in (select public.moje_salony());
  if not found then raise exception 'Tylko właścicielka salonu akceptuje regulamin' using errcode = 'P0001'; end if;
  perform set_config('bloomly.zmiana_systemowa', '', true);
end $$;

-- Usunięcie salonu: właścicielka wpisuje nazwę salonu; dane znikają po 30 dniach (do tego czasu można cofnąć).
create or replace function public.usun_salon(p_nazwa text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare s public.salony; kiedy timestamptz := now() + interval '30 days';
begin
  select * into s from public.salony where id in (select public.moje_salony()) limit 1;
  if s.id is null then raise exception 'Tylko właścicielka może usunąć salon' using errcode = 'P0001'; end if;
  if lower(btrim(coalesce(p_nazwa, ''))) <> lower(btrim(s.nazwa)) then
    raise exception 'Wpisz dokładnie nazwę salonu, żeby potwierdzić' using errcode = 'P0001';
  end if;
  perform set_config('bloomly.zmiana_systemowa', 'tak', true);
  update public.salony set do_usuniecia = kiedy, zapisy_wlaczone = false, sms_wlaczone = false where id = s.id;
  perform set_config('bloomly.zmiana_systemowa', '', true);
  return kiedy;
end $$;

create or replace function public.anuluj_usuniecie() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('bloomly.zmiana_systemowa', 'tak', true);
  update public.salony set do_usuniecia = null where id in (select public.moje_salony());
  perform set_config('bloomly.zmiana_systemowa', '', true);
end $$;

revoke all on function public.usun_salon(text) from public, anon;
revoke all on function public.anuluj_usuniecie() from public, anon;
grant execute on function public.usun_salon(text) to authenticated;
grant execute on function public.anuluj_usuniecie() to authenticated;

create or replace function public.moj_pakiet() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'pakiet', s.pakiet, 'proba_do', s.proba_do, 'oplacone_do', s.oplacone_do,
    'aktywny', public.salon_aktywny(s), 'sms_limit', s.sms_limit,
    'sms_w_miesiacu', public.sms_w_miesiacu(s.id),
    'regulamin_wersja', s.regulamin_wersja, 'regulamin_akceptacja', s.regulamin_akceptacja,
    'do_usuniecia', s.do_usuniecia)
  from public.salony s where s.id in (select public.salony_zespolu()) limit 1
$$;

-- strona „Moja wizyta”: informacja od salonu
create or replace function public.wizyta_info(p_kod text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'salon', s.nazwa, 'adres', s.adres, 'telefon', s.telefon, 'kolor', s.kolor,
    'info', s.info_dla_klientki,
    'usluga', w.usluga_nazwa, 'start', w.start, 'koniec', w.koniec, 'status', w.status,
    'imie', split_part(coalesce(k.imie, ''), ' ', 1),
    'pracownik', case when (select count(*) from public.pracownicy x where x.salon_id = s.id and x.aktywny) > 1 then p.imie end,
    'odwolala_klientka', w.odwolala_klientka,
    'zadatek', w.zadatek, 'zadatek_wplacony', w.zadatek_wplacony,
    'zadatek_instrukcja', case when w.zadatek is not null and not w.zadatek_wplacony then s.zadatek_instrukcja end,
    'mozna_odwolac', w.status in ('oczekuje', 'potwierdzona')
                     and w.start > now() + make_interval(hours => s.zapisy_wyprzedzenie_h),
    'zapisy_token', case when s.zapisy_wlaczone and public.salon_aktywny(s) then coalesce(s.slug, s.zapisy_token) end
  )
  from public.wizyty w
  join public.salony s on s.id = w.salon_id
  join public.pracownicy p on p.id = w.pracownik_id
  left join public.klientki k on k.id = w.klientka_id
  where w.kod = p_kod and char_length(p_kod) >= 16
$$;

-- strona zapisów: informacja od salonu
create or replace function public.zapisy_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.salony;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return null; end if;
  return json_build_object(
    'salon', s.nazwa,
    'kolor', s.kolor,
    'info', s.info_dla_klientki,
    'zadatek', case when s.zadatek_kwota > 0 and s.zadatek_tryb <> 'wybrane' then json_build_object('kwota', s.zadatek_kwota, 'tryb', s.zadatek_tryb) end,
    'horyzont_dni', s.zapisy_horyzont_dni,
    'dni_pracy', (
      select coalesce(json_agg(distinct d order by d), '[]') from (
        select dzien d from public.godziny_pracy where salon_id = s.id
        union select g.dzien from public.godziny_pracownikow g join public.pracownicy p on p.id = g.pracownik_id
        where p.salon_id = s.id and p.aktywny and p.w_zapisach) x),
    'uslugi', (select coalesce(json_agg(json_build_object(
                 'id', u.id, 'nazwa', u.nazwa, 'czas_min', u.czas_min, 'cena', u.cena,
                 'pracownicy', (select coalesce(json_agg(up.pracownik_id), '[]') from public.uslugi_pracownicy up where up.usluga_id = u.id))
               order by u.kolejnosc, u.nazwa), '[]')
               from public.uslugi u where u.salon_id = s.id and u.aktywna and u.w_zapisach),
    'pracownicy', (select coalesce(json_agg(json_build_object('id', p.id, 'imie', p.imie, 'kolor', p.kolor) order by p.kolejnosc, p.created_at), '[]')
                   from public.pracownicy p where p.salon_id = s.id and p.aktywny and p.w_zapisach)
  );
end $$;
