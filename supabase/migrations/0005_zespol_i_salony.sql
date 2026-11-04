-- Bloomly: wiele osób w salonie (każda ma swój kalendarz), role, samodzielne zakładanie salonu
-- z szablonem branży, własny kolor i adres zapisów (slug).
-- Zmiany są zgodne wstecz: stara wersja aplikacji działa dalej, dopóki nie wejdzie nowa.

-- ---------------------------------------------------------------- salon: branża, kolor, slug
alter table public.salony
  add column branza text not null default 'paznokcie'
    check (branza in ('paznokcie', 'rzesy_brwi', 'fryzjer', 'barber', 'kosmetyka', 'masaz', 'inne')),
  add column kolor text not null default '#b98a4e' check (kolor ~ '^#[0-9a-fA-F]{6}$'),
  add column slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$');

-- ---------------------------------------------------------------- zespół
create table public.pracownicy (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  imie text not null check (char_length(imie) between 1 and 60),
  kolor text not null default '#7a5a47' check (kolor ~ '^#[0-9a-fA-F]{6}$'),
  aktywny boolean not null default true,
  w_zapisach boolean not null default true,
  kolejnosc integer not null default 0,
  -- konto logowania (właścicielka albo pracownik, który przyjął zaproszenie)
  user_id uuid references auth.users (id) on delete set null,
  -- zaproszenie: osoba zakłada konto na ten adres i dołącza do salonu
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rola text not null default 'pracownik' check (rola in ('wlascicielka', 'pracownik')),
  created_at timestamptz not null default now(),
  unique (salon_id, user_id)
);
create index pracownicy_salon_idx on public.pracownicy (salon_id);
create index pracownicy_user_idx on public.pracownicy (user_id);
create unique index pracownicy_email_idx on public.pracownicy (lower(email)) where email is not null and user_id is null;

-- kto wykonuje którą usługę (brak wpisów = wszyscy)
create table public.uslugi_pracownicy (
  usluga_id uuid not null references public.uslugi (id) on delete cascade,
  pracownik_id uuid not null references public.pracownicy (id) on delete cascade,
  primary key (usluga_id, pracownik_id)
);
create index uslugi_pracownicy_prac_idx on public.uslugi_pracownicy (pracownik_id);

-- własne godziny osoby (brak wpisów = godziny salonu)
create table public.godziny_pracownikow (
  pracownik_id uuid not null references public.pracownicy (id) on delete cascade,
  dzien smallint not null check (dzien between 1 and 7),
  od_godz time not null,
  do_godz time not null,
  primary key (pracownik_id, dzien),
  check (od_godz < do_godz)
);

alter table public.przerwy add column pracownik_id uuid references public.pracownicy (id) on delete cascade;
create index przerwy_prac_idx on public.przerwy (pracownik_id);

-- właścicielka każdego istniejącego salonu staje się pierwszą osobą w zespole
insert into public.pracownicy (salon_id, imie, user_id, rola, kolejnosc)
select s.id,
       case when u.email = 'bloombeauty@o2.pl' then 'Madzia' else 'Ja' end,
       s.owner_id, 'wlascicielka', 0
from public.salony s left join auth.users u on u.id = s.owner_id;

-- ---------------------------------------------------------------- wizyty przypisane do osoby
alter table public.wizyty add column pracownik_id uuid references public.pracownicy (id) on delete restrict;
update public.wizyty w set pracownik_id = p.id
from public.pracownicy p where p.salon_id = w.salon_id and p.rola = 'wlascicielka';
alter table public.wizyty alter column pracownik_id set not null;
create index wizyty_prac_idx on public.wizyty (pracownik_id, start);

-- wizyta bez osoby (stara wersja aplikacji) trafia do właścicielki
create function public.wizyty_domyslna_osoba() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pracownik_id is null then
    select id into new.pracownik_id from public.pracownicy
    where salon_id = new.salon_id and aktywny order by (rola = 'wlascicielka') desc, kolejnosc, created_at limit 1;
  end if;
  if not exists (select 1 from public.pracownicy where id = new.pracownik_id and salon_id = new.salon_id) then
    raise exception 'Ta osoba nie pracuje w tym salonie';
  end if;
  return new;
end $$;
create trigger wizyty_domyslna_osoba before insert or update of pracownik_id, salon_id on public.wizyty
  for each row execute function public.wizyty_domyslna_osoba();

-- ---------------------------------------------------------------- dostęp: właścicielka i zespół
-- moje_salony() = salony właścicielki (pełne prawa, jak dotąd); salony_zespolu() = także salony, w których się pracuje.
create function public.salony_zespolu() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.salony where owner_id = (select auth.uid())
  union
  select salon_id from public.pracownicy where user_id = (select auth.uid()) and aktywny
$$;
revoke all on function public.salony_zespolu() from public, anon;
grant execute on function public.salony_zespolu() to authenticated;

alter table public.pracownicy enable row level security;
alter table public.uslugi_pracownicy enable row level security;
alter table public.godziny_pracownikow enable row level security;
grant select, insert, update, delete on public.pracownicy, public.uslugi_pracownicy, public.godziny_pracownikow to authenticated;
revoke all on public.pracownicy, public.uslugi_pracownicy, public.godziny_pracownikow from anon;

-- zespół czyta salon i ustawienia (zmienia je tylko właścicielka – istniejące polityki „Własny/Własne …”)
create policy "Zespół – odczyt salonu" on public.salony for select to authenticated
  using (id in (select public.salony_zespolu()));
create policy "Zespół – odczyt usług" on public.uslugi for select to authenticated
  using (salon_id in (select public.salony_zespolu()));
create policy "Zespół – odczyt godzin" on public.godziny_pracy for select to authenticated
  using (salon_id in (select public.salony_zespolu()));
-- klientki, wizyty i przerwy prowadzi cały zespół
create policy "Zespół – klientki" on public.klientki for all to authenticated
  using (salon_id in (select public.salony_zespolu())) with check (salon_id in (select public.salony_zespolu()));
create policy "Zespół – wizyty" on public.wizyty for all to authenticated
  using (salon_id in (select public.salony_zespolu())) with check (salon_id in (select public.salony_zespolu()));
create policy "Zespół – przerwy" on public.przerwy for all to authenticated
  using (salon_id in (select public.salony_zespolu())) with check (salon_id in (select public.salony_zespolu()));

create policy "Zespół – odczyt osób" on public.pracownicy for select to authenticated
  using (salon_id in (select public.salony_zespolu()));
create policy "Zespół – zmiany osób" on public.pracownicy for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));

create policy "Kto co robi – odczyt" on public.uslugi_pracownicy for select to authenticated
  using (pracownik_id in (select id from public.pracownicy where salon_id in (select public.salony_zespolu())));
create policy "Kto co robi – zmiany" on public.uslugi_pracownicy for all to authenticated
  using (pracownik_id in (select id from public.pracownicy where salon_id in (select public.moje_salony())))
  with check (pracownik_id in (select id from public.pracownicy where salon_id in (select public.moje_salony())));

create policy "Godziny osób – odczyt" on public.godziny_pracownikow for select to authenticated
  using (pracownik_id in (select id from public.pracownicy where salon_id in (select public.salony_zespolu())));
create policy "Godziny osób – zmiany" on public.godziny_pracownikow for all to authenticated
  using (pracownik_id in (select id from public.pracownicy where salon_id in (select public.moje_salony())))
  with check (pracownik_id in (select id from public.pracownicy where salon_id in (select public.moje_salony())));

-- ---------------------------------------------------------------- kontekst zalogowanej osoby
create function public.moj_kontekst() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  p public.pracownicy;
  s public.salony;
begin
  if uid is null then raise exception 'Zaloguj się'; end if;

  select * into s from public.salony where owner_id = uid;
  if found then
    select * into p from public.pracownicy where salon_id = s.id and user_id = uid;
  else
    select * into p from public.pracownicy where user_id = uid and aktywny order by created_at limit 1;
    if not found and mail <> '' then
      -- przyjęcie zaproszenia: konto założone na adres podany przez właścicielkę
      update public.pracownicy set user_id = uid
      where id = (select id from public.pracownicy where lower(email) = mail and user_id is null and aktywny
                  order by created_at limit 1)
      returning * into p;
    end if;
    if p.id is null then return null; end if;
    select * into s from public.salony where id = p.salon_id;
  end if;

  return json_build_object(
    'salon', row_to_json(s),
    'rola', case when s.owner_id = uid then 'wlascicielka' else 'pracownik' end,
    'pracownik_id', p.id
  );
end $$;
revoke all on function public.moj_kontekst() from public, anon;
grant execute on function public.moj_kontekst() to authenticated;

-- stara wersja aplikacji: pracownik nie dostaje własnego, pustego salonu
create or replace function public.moj_salon() returns public.salony
language plpgsql security definer set search_path = public as $$
declare s public.salony;
begin
  if auth.uid() is null then raise exception 'Zaloguj się'; end if;
  select * into s from public.salony where owner_id = auth.uid();
  if found then return s; end if;
  select x.* into s from public.salony x join public.pracownicy p on p.salon_id = x.id
  where p.user_id = auth.uid() and p.aktywny limit 1;
  if found then return s; end if;
  insert into public.salony (owner_id) values (auth.uid()) returning * into s;
  insert into public.godziny_pracy (salon_id, dzien, od_godz, do_godz)
  select s.id, d, time '09:00', time '17:00' from generate_series(1, 5) d;
  insert into public.pracownicy (salon_id, imie, user_id, rola) values (s.id, 'Ja', auth.uid(), 'wlascicielka');
  return s;
end $$;

-- ---------------------------------------------------------------- zakładanie salonu (kreator)
create function public.zaloz_salon(p_nazwa text, p_branza text, p_kolor text, p_imie text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.salony;
  uslugi_szablon jsonb;
  kolory text[] := array['#c9707a', '#b98a4e', '#7a5a47', '#4f7a5b', '#6b7fa8', '#9b6fa6', '#d29a6a', '#5e8c8c'];
  i int := 0;
  x jsonb;
begin
  if uid is null then raise exception 'Zaloguj się'; end if;
  if exists (select 1 from public.salony where owner_id = uid) then raise exception 'Masz już salon' using errcode = 'P0001'; end if;
  if exists (select 1 from public.pracownicy where user_id = uid and aktywny) then
    raise exception 'To konto należy już do zespołu innego salonu' using errcode = 'P0001';
  end if;

  insert into public.salony (owner_id, nazwa, branza, kolor)
  values (uid, btrim(p_nazwa), p_branza, p_kolor) returning * into s;

  insert into public.pracownicy (salon_id, imie, user_id, rola, kolor)
  values (s.id, coalesce(nullif(btrim(p_imie), ''), 'Ja'), uid, 'wlascicielka', p_kolor);

  insert into public.godziny_pracy (salon_id, dzien, od_godz, do_godz)
  select s.id, d, time '09:00', time '17:00' from generate_series(1, 5) d;

  uslugi_szablon := case p_branza
    when 'paznokcie' then '[["Manicure hybrydowy",90,120],["Przedłużanie żelem",150,180],["Uzupełnienie żelu",120,150],["Pedicure hybrydowy",90,130],["Zdjęcie hybrydy",30,40]]'
    when 'rzesy_brwi' then '[["Przedłużanie rzęs 1:1",120,180],["Uzupełnienie rzęs",90,130],["Laminacja rzęs",60,120],["Laminacja brwi",60,110],["Henna i regulacja brwi",30,50]]'
    when 'fryzjer' then '[["Strzyżenie damskie",60,90],["Strzyżenie męskie",30,50],["Koloryzacja",150,250],["Refleksy",180,300],["Modelowanie",45,70]]'
    when 'barber' then '[["Strzyżenie",45,70],["Broda",30,50],["Strzyżenie + broda",60,100],["Golenie brzytwą",30,60]]'
    when 'kosmetyka' then '[["Oczyszczanie wodorowe",60,150],["Peeling kawitacyjny",45,100],["Mezoterapia mikroigłowa",60,250],["Henna brwi",30,50],["Depilacja woskiem – nogi",45,90]]'
    when 'masaz' then '[["Masaż klasyczny",60,150],["Masaż relaksacyjny",60,140],["Masaż gorącymi kamieniami",90,200],["Drenaż limfatyczny",60,160]]'
    else '[]'
  end::jsonb;
  for x in select * from jsonb_array_elements(uslugi_szablon) loop
    i := i + 1;
    insert into public.uslugi (salon_id, nazwa, czas_min, cena, kolor, kolejnosc)
    values (s.id, x ->> 0, (x ->> 1)::int, (x ->> 2)::numeric, kolory[1 + (i - 1) % 8], i);
  end loop;

  return public.moj_kontekst();
end $$;
revoke all on function public.zaloz_salon(text, text, text, text) from public, anon;
grant execute on function public.zaloz_salon(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- zapisy: token (tajny link) albo slug (publiczny adres)
create or replace function public.zapisy_salon(p_token text) returns public.salony
language sql stable security definer set search_path = public as $$
  select * from public.salony
  where zapisy_wlaczone
    and ((zapisy_token = p_token and char_length(p_token) >= 16) or (slug is not null and slug = lower(p_token)))
  limit 1
$$;
revoke all on function public.zapisy_salon(text) from public, anon, authenticated;

create or replace function public.zapisy_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.salony;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return null; end if;
  return json_build_object(
    'salon', s.nazwa,
    'kolor', s.kolor,
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

-- wolne godziny z podziałem na osoby; p_pracownik = null → ktokolwiek
create function public.zapisy_wolne_v2(p_token text, p_usluga uuid, p_dzien date, p_pracownik uuid default null)
returns table (start timestamptz, pracownik_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  s public.salony;
  u public.uslugi;
  dzis date;
  dlugosc interval;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return; end if;
  select * into u from public.uslugi where id = p_usluga and salon_id = s.id and aktywna and w_zapisach;
  if not found then return; end if;
  dzis := (now() at time zone s.strefa)::date;
  if p_dzien < dzis or p_dzien > dzis + s.zapisy_horyzont_dni then return; end if;
  dlugosc := make_interval(mins => u.czas_min);

  return query
  with osoby as (
    select p.id, p.kolejnosc, p.created_at,
           coalesce(gp.od_godz, gs.od_godz) od_godz, coalesce(gp.do_godz, gs.do_godz) do_godz,
           exists (select 1 from public.godziny_pracownikow x where x.pracownik_id = p.id) ma_wlasne
    from public.pracownicy p
    left join public.godziny_pracownikow gp on gp.pracownik_id = p.id and gp.dzien = extract(isodow from p_dzien)
    left join public.godziny_pracy gs on gs.salon_id = s.id and gs.dzien = extract(isodow from p_dzien)
    where p.salon_id = s.id and p.aktywny and p.w_zapisach
      and (p_pracownik is null or p.id = p_pracownik)
      and (not exists (select 1 from public.uslugi_pracownicy up where up.usluga_id = u.id)
           or exists (select 1 from public.uslugi_pracownicy up where up.usluga_id = u.id and up.pracownik_id = p.id))
  ),
  godziny as (
    -- osoba z własnym grafikiem pracuje tylko w swoje dni
    select o.* from osoby o
    where (o.ma_wlasne and exists (select 1 from public.godziny_pracownikow x where x.pracownik_id = o.id and x.dzien = extract(isodow from p_dzien)))
       or (not o.ma_wlasne and o.od_godz is not null)
  ),
  sloty as (
    select g.id pid, g.kolejnosc, g.created_at, t
    from godziny g,
         generate_series((p_dzien + g.od_godz) at time zone s.strefa,
                         ((p_dzien + g.do_godz) at time zone s.strefa) - dlugosc,
                         make_interval(mins => s.krok_min)) t
    where t >= now() + make_interval(hours => s.zapisy_wyprzedzenie_h)
      and not exists (select 1 from public.wizyty w
                      where w.pracownik_id = g.id and w.status in ('oczekuje', 'potwierdzona', 'zrealizowana')
                        and tstzrange(w.start, w.koniec) && tstzrange(t, t + dlugosc))
      and not exists (select 1 from public.przerwy pr
                      where pr.salon_id = s.id and (pr.pracownik_id is null or pr.pracownik_id = g.id)
                        and tstzrange(pr.start, pr.koniec) && tstzrange(t, t + dlugosc))
  )
  select distinct on (sl.t) sl.t, sl.pid from sloty sl order by sl.t, sl.kolejnosc, sl.created_at;
end $$;

create function public.zapisy_rezerwuj_v2(
  p_token text, p_usluga uuid, p_start timestamptz, p_imie text, p_telefon text,
  p_notatka text default '', p_pracownik uuid default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  s public.salony;
  u public.uslugi;
  tel text := regexp_replace(coalesce(p_telefon, ''), '[^0-9+]', '', 'g');
  imie text := btrim(coalesce(p_imie, ''));
  osoba uuid;
  k_id uuid;
  w_id uuid;
  w_kod text;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then raise exception 'Link do zapisów jest nieaktywny' using errcode = 'P0001'; end if;
  if char_length(imie) not between 2 and 80 then raise exception 'Podaj imię' using errcode = 'P0001'; end if;
  if tel !~ '^\+?[0-9]{9,15}$' then raise exception 'Podaj poprawny numer telefonu' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_notatka, '')) > 500 then raise exception 'Wiadomość jest za długa' using errcode = 'P0001'; end if;

  select * into u from public.uslugi where id = p_usluga and salon_id = s.id and aktywna and w_zapisach;
  if not found then raise exception 'Wybierz usługę' using errcode = 'P0001'; end if;

  select v.pracownik_id into osoba
  from public.zapisy_wolne_v2(p_token, p_usluga, (p_start at time zone s.strefa)::date, p_pracownik) v
  where v.start = p_start;
  if osoba is null then raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001'; end if;

  if (select count(*) from public.wizyty w join public.klientki k on k.id = w.klientka_id
      where w.salon_id = s.id and w.zrodlo = 'link' and w.status = 'oczekuje' and w.start > now()
        and right(regexp_replace(k.telefon, '[^0-9]', '', 'g'), 9) = right(regexp_replace(tel, '[^0-9]', '', 'g'), 9)) >= 3 then
    raise exception 'Masz już 3 wizyty czekające na potwierdzenie' using errcode = 'P0001';
  end if;
  if (select count(*) from public.wizyty where salon_id = s.id and zrodlo = 'link'
      and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Za dużo zapisów naraz – spróbuj za chwilę' using errcode = 'P0001';
  end if;

  select id into k_id from public.klientki
  where salon_id = s.id and telefon <> ''
    and right(regexp_replace(telefon, '[^0-9]', '', 'g'), 9) = right(regexp_replace(tel, '[^0-9]', '', 'g'), 9)
  order by created_at limit 1;
  if k_id is null then
    insert into public.klientki (salon_id, imie, telefon) values (s.id, imie, tel) returning id into k_id;
  end if;

  begin
    insert into public.wizyty (salon_id, pracownik_id, klientka_id, usluga_id, usluga_nazwa, start, koniec, status, zrodlo, cena, notatka)
    values (s.id, osoba, k_id, u.id, u.nazwa, p_start, p_start + make_interval(mins => u.czas_min), 'oczekuje', 'link', u.cena,
            coalesce(btrim(p_notatka), ''))
    returning id, kod into w_id, w_kod;
  exception when exclusion_violation then
    raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001';
  end;

  return json_build_object('id', w_id, 'kod', w_kod, 'salon', s.nazwa, 'usluga', u.nazwa, 'start', p_start,
                           'pracownik', (select pp.imie from public.pracownicy pp where pp.id = osoba));
end $$;

-- stare funkcje (obecna wersja aplikacji) korzystają z nowej logiki
create or replace function public.zapisy_wolne(p_token text, p_usluga uuid, p_dzien date) returns setof timestamptz
language sql stable security definer set search_path = public as $$
  select start from public.zapisy_wolne_v2(p_token, p_usluga, p_dzien, null) order by start
$$;

create or replace function public.zapisy_rezerwuj(
  p_token text, p_usluga uuid, p_start timestamptz, p_imie text, p_telefon text, p_notatka text default ''
) returns json
language sql security definer set search_path = public as $$
  select public.zapisy_rezerwuj_v2(p_token, p_usluga, p_start, p_imie, p_telefon, p_notatka, null)
$$;

revoke all on function public.zapisy_wolne_v2(text, uuid, date, uuid) from public;
revoke all on function public.zapisy_rezerwuj_v2(text, uuid, timestamptz, text, text, text, uuid) from public;
grant execute on function public.zapisy_wolne_v2(text, uuid, date, uuid) to anon, authenticated;
grant execute on function public.zapisy_rezerwuj_v2(text, uuid, timestamptz, text, text, text, uuid) to anon, authenticated;

-- strona „Moja wizyta”: imię osoby i kolor salonu
create or replace function public.wizyta_info(p_kod text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'salon', s.nazwa, 'adres', s.adres, 'telefon', s.telefon, 'kolor', s.kolor,
    'usluga', w.usluga_nazwa, 'start', w.start, 'koniec', w.koniec, 'status', w.status,
    'imie', split_part(coalesce(k.imie, ''), ' ', 1),
    'pracownik', case when (select count(*) from public.pracownicy x where x.salon_id = s.id and x.aktywny) > 1 then p.imie end,
    'odwolala_klientka', w.odwolala_klientka,
    'mozna_odwolac', w.status in ('oczekuje', 'potwierdzona')
                     and w.start > now() + make_interval(hours => s.zapisy_wyprzedzenie_h),
    'zapisy_token', case when s.zapisy_wlaczone then coalesce(s.slug, s.zapisy_token) end
  )
  from public.wizyty w
  join public.salony s on s.id = w.salon_id
  join public.pracownicy p on p.id = w.pracownik_id
  left join public.klientki k on k.id = w.klientka_id
  where w.kod = p_kod and char_length(p_kod) >= 16
$$;
