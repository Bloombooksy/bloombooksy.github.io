-- Bloombeauty Terminarz – schemat bazy
-- Każdy salon należy do jednego konta (owner_id). RLS: właścicielka widzi tylko swoje dane.
-- Zapisy przez tajny link idą wyłącznie przez funkcje SECURITY DEFINER (zapisy_*).

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.status_wizyty as enum ('oczekuje', 'potwierdzona', 'zrealizowana', 'odwolana', 'nieobecnosc');
create type public.zrodlo_wizyty as enum ('panel', 'link');
create type public.sms_status as enum ('brak', 'wyslany', 'blad', 'pominiety', 'test');
create type public.platnosc as enum ('gotowka', 'karta', 'blik', 'przelew');

-- ---------------------------------------------------------------- salony
create table public.salony (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  nazwa text not null default 'Mój salon' check (char_length(nazwa) between 1 and 80),
  strefa text not null default 'Europe/Warsaw',
  zapisy_wlaczone boolean not null default true,
  zapisy_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  zapisy_wyprzedzenie_h integer not null default 12 check (zapisy_wyprzedzenie_h between 0 and 168),
  zapisy_horyzont_dni integer not null default 60 check (zapisy_horyzont_dni between 1 and 180),
  krok_min integer not null default 15 check (krok_min in (5, 10, 15, 20, 30, 60)),
  sms_wlaczone boolean not null default false,
  sms_godzina integer not null default 10 check (sms_godzina between 6 and 21),
  sms_szablon text not null default 'Hej {imie}! Przypominam o wizycie jutro ({data}) o {godzina} – {usluga}. Do zobaczenia! {salon}' check (char_length(sms_szablon) between 10 and 480),
  sms_nadawca text not null default '' check (char_length(sms_nadawca) <= 11),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- usługi
create table public.uslugi (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  nazwa text not null check (char_length(nazwa) between 1 and 80),
  czas_min integer not null check (czas_min between 5 and 600),
  cena numeric(10, 2) not null default 0 check (cena >= 0),
  kolor text not null default '#b8935a' check (kolor ~ '^#[0-9a-fA-F]{6}$'),
  aktywna boolean not null default true,
  w_zapisach boolean not null default true,
  kolejnosc integer not null default 0,
  created_at timestamptz not null default now()
);
create index uslugi_salon_idx on public.uslugi (salon_id, kolejnosc);

-- ---------------------------------------------------------------- klientki
create table public.klientki (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  imie text not null check (char_length(imie) between 1 and 80),
  telefon text not null default '' check (char_length(telefon) <= 20),
  instagram text not null default '' check (char_length(instagram) <= 60),
  notatka text not null default '' check (char_length(notatka) <= 2000),
  zgoda_sms boolean not null default true,
  created_at timestamptz not null default now()
);
create index klientki_salon_idx on public.klientki (salon_id, imie);
create index klientki_tel_idx on public.klientki (salon_id, telefon);

-- ---------------------------------------------------------------- godziny pracy (1 = poniedziałek … 7 = niedziela)
create table public.godziny_pracy (
  salon_id uuid not null references public.salony (id) on delete cascade,
  dzien smallint not null check (dzien between 1 and 7),
  od_godz time not null,
  do_godz time not null,
  primary key (salon_id, dzien),
  check (od_godz < do_godz)
);

-- ---------------------------------------------------------------- przerwy / urlop (blokują zapisy przez link)
create table public.przerwy (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  start timestamptz not null,
  koniec timestamptz not null,
  opis text not null default '' check (char_length(opis) <= 120),
  check (koniec > start)
);
create index przerwy_salon_idx on public.przerwy (salon_id, start);

-- ---------------------------------------------------------------- wizyty
create table public.wizyty (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  klientka_id uuid references public.klientki (id) on delete set null,
  usluga_id uuid references public.uslugi (id) on delete set null,
  usluga_nazwa text not null default '' check (char_length(usluga_nazwa) <= 80),
  start timestamptz not null,
  koniec timestamptz not null,
  status public.status_wizyty not null default 'potwierdzona',
  zrodlo public.zrodlo_wizyty not null default 'panel',
  cena numeric(10, 2) not null default 0 check (cena >= 0),
  kwota numeric(10, 2) check (kwota >= 0),
  napiwek numeric(10, 2) not null default 0 check (napiwek >= 0),
  platnosc public.platnosc,
  notatka text not null default '' check (char_length(notatka) <= 2000),
  sms_status public.sms_status not null default 'brak',
  sms_wyslano timestamptz,
  sms_blad text,
  created_at timestamptz not null default now(),
  check (koniec > start),
  check (koniec - start <= interval '12 hours'),
  -- dwie aktywne wizyty nie mogą nachodzić na siebie (chroni też przed podwójną rezerwacją przez link)
  constraint wizyty_bez_kolizji exclude using gist (
    salon_id with =,
    tstzrange(start, koniec) with &&
  ) where (status in ('oczekuje', 'potwierdzona', 'zrealizowana'))
);
create index wizyty_salon_start_idx on public.wizyty (salon_id, start);
create index wizyty_klientka_idx on public.wizyty (klientka_id);

-- zmiana terminu = przypomnienie trzeba wysłać od nowa
create function public.wizyty_reset_sms() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.start is distinct from old.start then
    new.sms_status := 'brak';
    new.sms_wyslano := null;
    new.sms_blad := null;
  end if;
  return new;
end $$;
create trigger wizyty_reset_sms before update on public.wizyty
for each row execute function public.wizyty_reset_sms();

-- ---------------------------------------------------------------- RLS: tylko właścicielka salonu
alter table public.salony enable row level security;
alter table public.uslugi enable row level security;
alter table public.klientki enable row level security;
alter table public.godziny_pracy enable row level security;
alter table public.przerwy enable row level security;
alter table public.wizyty enable row level security;

create function public.moje_salony() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.salony where owner_id = (select auth.uid())
$$;
revoke all on function public.moje_salony() from public, anon;
grant execute on function public.moje_salony() to authenticated;

create policy "Własny salon" on public.salony for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Własne usługi" on public.uslugi for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));
create policy "Własne klientki" on public.klientki for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));
create policy "Własne godziny" on public.godziny_pracy for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));
create policy "Własne przerwy" on public.przerwy for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));
create policy "Własne wizyty" on public.wizyty for all to authenticated
  using (salon_id in (select public.moje_salony())) with check (salon_id in (select public.moje_salony()));

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------- salon zalogowanej osoby (tworzony przy pierwszym logowaniu)
create function public.moj_salon() returns public.salony
language plpgsql security definer set search_path = public as $$
declare s public.salony;
begin
  if auth.uid() is null then raise exception 'Zaloguj się'; end if;
  select * into s from public.salony where owner_id = auth.uid();
  if found then return s; end if;
  insert into public.salony (owner_id) values (auth.uid()) returning * into s;
  insert into public.godziny_pracy (salon_id, dzien, od_godz, do_godz)
  select s.id, d, time '09:00', time '17:00' from generate_series(1, 5) d;
  return s;
end $$;
revoke all on function public.moj_salon() from public, anon;
grant execute on function public.moj_salon() to authenticated;

create function public.nowy_link_zapisow() returns text
language plpgsql security definer set search_path = public as $$
declare t text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  update public.salony set zapisy_token = t where owner_id = auth.uid();
  if not found then raise exception 'Brak salonu'; end if;
  return t;
end $$;
revoke all on function public.nowy_link_zapisow() from public, anon;
grant execute on function public.nowy_link_zapisow() to authenticated;

-- ---------------------------------------------------------------- zapisy przez tajny link (dla niezalogowanych)
create function public.zapisy_salon(p_token text) returns public.salony
language sql stable security definer set search_path = public as $$
  select * from public.salony
  where zapisy_token = p_token and zapisy_wlaczone and char_length(p_token) >= 16
$$;
revoke all on function public.zapisy_salon(text) from public, anon, authenticated;

create function public.zapisy_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.salony;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return null; end if;
  return json_build_object(
    'salon', s.nazwa,
    'horyzont_dni', s.zapisy_horyzont_dni,
    'dni_pracy', (select coalesce(json_agg(dzien order by dzien), '[]') from public.godziny_pracy where salon_id = s.id),
    'uslugi', (select coalesce(json_agg(json_build_object('id', id, 'nazwa', nazwa, 'czas_min', czas_min, 'cena', cena) order by kolejnosc, nazwa), '[]')
               from public.uslugi where salon_id = s.id and aktywna and w_zapisach)
  );
end $$;

create function public.zapisy_wolne(p_token text, p_usluga uuid, p_dzien date) returns setof timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  s public.salony;
  u public.uslugi;
  g public.godziny_pracy;
  dzis date;
  dlugosc interval;
  od_ts timestamptz;
  do_ts timestamptz;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return; end if;
  select * into u from public.uslugi where id = p_usluga and salon_id = s.id and aktywna and w_zapisach;
  if not found then return; end if;
  dzis := (now() at time zone s.strefa)::date;
  if p_dzien < dzis or p_dzien > dzis + s.zapisy_horyzont_dni then return; end if;
  select * into g from public.godziny_pracy where salon_id = s.id and dzien = extract(isodow from p_dzien);
  if not found then return; end if;

  dlugosc := make_interval(mins => u.czas_min);
  od_ts := (p_dzien + g.od_godz) at time zone s.strefa;
  do_ts := (p_dzien + g.do_godz) at time zone s.strefa;

  return query
    select t from generate_series(od_ts, do_ts - dlugosc, make_interval(mins => s.krok_min)) as t
    where t >= now() + make_interval(hours => s.zapisy_wyprzedzenie_h)
      and not exists (
        select 1 from public.wizyty w
        where w.salon_id = s.id and w.status in ('oczekuje', 'potwierdzona', 'zrealizowana')
          and tstzrange(w.start, w.koniec) && tstzrange(t, t + dlugosc))
      and not exists (
        select 1 from public.przerwy p
        where p.salon_id = s.id and tstzrange(p.start, p.koniec) && tstzrange(t, t + dlugosc))
    order by t;
end $$;

create function public.zapisy_rezerwuj(
  p_token text, p_usluga uuid, p_start timestamptz, p_imie text, p_telefon text, p_notatka text default ''
) returns json
language plpgsql security definer set search_path = public as $$
declare
  s public.salony;
  u public.uslugi;
  tel text := regexp_replace(coalesce(p_telefon, ''), '[^0-9+]', '', 'g');
  imie text := btrim(coalesce(p_imie, ''));
  k_id uuid;
  w_id uuid;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then raise exception 'Link do zapisów jest nieaktywny' using errcode = 'P0001'; end if;
  if char_length(imie) not between 2 and 80 then raise exception 'Podaj imię' using errcode = 'P0001'; end if;
  if tel !~ '^\+?[0-9]{9,15}$' then raise exception 'Podaj poprawny numer telefonu' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_notatka, '')) > 500 then raise exception 'Wiadomość jest za długa' using errcode = 'P0001'; end if;

  select * into u from public.uslugi where id = p_usluga and salon_id = s.id and aktywna and w_zapisach;
  if not found then raise exception 'Wybierz usługę' using errcode = 'P0001'; end if;

  if p_start not in (select public.zapisy_wolne(p_token, p_usluga, (p_start at time zone s.strefa)::date)) then
    raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001';
  end if;

  -- ograniczenia przeciw nadużyciom
  if (select count(*) from public.wizyty w join public.klientki k on k.id = w.klientka_id
      where w.salon_id = s.id and w.zrodlo = 'link' and w.status = 'oczekuje' and w.start > now()
        and regexp_replace(k.telefon, '[^0-9]', '', 'g') = regexp_replace(tel, '[^0-9]', '', 'g')) >= 3 then
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
    insert into public.wizyty (salon_id, klientka_id, usluga_id, usluga_nazwa, start, koniec, status, zrodlo, cena, notatka)
    values (s.id, k_id, u.id, u.nazwa, p_start, p_start + make_interval(mins => u.czas_min), 'oczekuje', 'link', u.cena,
            coalesce(btrim(p_notatka), ''))
    returning id into w_id;
  exception when exclusion_violation then
    raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001';
  end;

  return json_build_object('id', w_id, 'salon', s.nazwa, 'usluga', u.nazwa, 'start', p_start);
end $$;

revoke all on function public.zapisy_info(text) from public;
revoke all on function public.zapisy_wolne(text, uuid, date) from public;
revoke all on function public.zapisy_rezerwuj(text, uuid, timestamptz, text, text, text) from public;
grant execute on function public.zapisy_info(text) to anon, authenticated;
grant execute on function public.zapisy_wolne(text, uuid, date) to anon, authenticated;
grant execute on function public.zapisy_rezerwuj(text, uuid, timestamptz, text, text, text) to anon, authenticated;
