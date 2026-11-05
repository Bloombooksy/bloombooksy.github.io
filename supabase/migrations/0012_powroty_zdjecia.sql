-- „Czas na kolejną wizytę” (przypomnienie po X dniach od ostatniej usługi, za zgodą klientki)
-- oraz karta klientki: alergie i zdjęcia prac.

alter table public.uslugi
  add column powrot_dni integer check (powrot_dni is null or powrot_dni between 7 and 365);

alter table public.klientki
  add column zgoda_powrot boolean not null default false,
  add column powrot_wyslano timestamptz,
  add column alergie text not null default '' check (char_length(alergie) <= 300);

alter table public.salony
  add column powrot_wlaczony boolean not null default true;

-- domyślny czas powrotu na podstawie nazwy usługi (salon może zmienić)
create or replace function public.powrot_domyslny(p_nazwa text) returns integer
language sql immutable as $$
  select case
    when p_nazwa ~* '(zdjęci|zdjeci|usunięci|usuniecie|konsultac)' then null
    when p_nazwa ~* '(hybryd|uzupełn|uzupeln|żel|zel|przedłuż|przedluz|manicure|pedicure|paznok)' then 21
    when p_nazwa ~* '(rzęs|rzes|lash)' then 21
    when p_nazwa ~* '(brwi|henna|laminac|regulac)' then 35
    when p_nazwa ~* '(strzyż|strzyz|fade|brod|barber)' then 28
    when p_nazwa ~* '(koloryz|farb|balayage|refleks|ombre|odrost)' then 42
  end
$$;

update public.uslugi set powrot_dni = public.powrot_domyslny(nazwa) where powrot_dni is null;

create or replace function public.uslugi_powrot_domyslny() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.powrot_dni is null then new.powrot_dni := public.powrot_domyslny(new.nazwa); end if;
  return new;
end $$;
create trigger uslugi_powrot_domyslny before insert on public.uslugi
  for each row execute function public.uslugi_powrot_domyslny();

-- Klientki, którym minął czas powrotu (ostatnia zrobiona wizyta + dni z usługi), bez zaplanowanej wizyty.
create or replace function public.powroty(p_okno_dni integer) returns table (
  klientka_id uuid, salon_id uuid, imie text, telefon text, email text, zgoda boolean,
  usluga text, ostatnia timestamptz, termin date, kod text, wyslano timestamptz
)
language sql stable security definer set search_path = public as $$
  with ostatnie as (
    select distinct on (w.klientka_id) w.klientka_id, w.salon_id, w.start, w.usluga_nazwa, w.kod, u.powrot_dni
    from public.wizyty w
    left join public.uslugi u on u.id = w.usluga_id
    where w.status = 'zrealizowana' and w.klientka_id is not null
    order by w.klientka_id, w.start desc
  )
  select k.id, k.salon_id, k.imie, k.telefon, k.email, k.zgoda_powrot,
         o.usluga_nazwa, o.start, ((o.start at time zone s.strefa)::date + o.powrot_dni), o.kod, k.powrot_wyslano
  from ostatnie o
  join public.klientki k on k.id = o.klientka_id
  join public.salony s on s.id = o.salon_id
  where o.powrot_dni is not null
    and not k.zablokowana
    and (o.start at time zone s.strefa)::date + o.powrot_dni <= (now() at time zone s.strefa)::date
    and (o.start at time zone s.strefa)::date + o.powrot_dni >= (now() at time zone s.strefa)::date - p_okno_dni
    and (k.powrot_wyslano is null or k.powrot_wyslano < o.start)
    and not exists (select 1 from public.wizyty f where f.klientka_id = k.id
                    and f.status in ('oczekuje', 'potwierdzona') and f.start > now())
$$;
revoke all on function public.powroty(integer) from public, anon, authenticated;

-- dla aplikacji: lista do ręcznego zaproszenia (ostatnie 60 dni)
create or replace function public.moje_powroty() returns setof json
language sql stable security definer set search_path = public as $$
  select json_build_object('klientka_id', p.klientka_id, 'imie', p.imie, 'telefon', p.telefon, 'email', p.email <> '',
                           'zgoda', p.zgoda, 'usluga', p.usluga, 'ostatnia', p.ostatnia, 'termin', p.termin)
  from public.powroty(60) p
  where p.salon_id in (select public.salony_zespolu())
  order by p.termin
$$;
revoke all on function public.moje_powroty() from public, anon;
grant execute on function public.moje_powroty() to authenticated;

-- dla funkcji wysyłającej: maile do klientek ze zgodą (okno 7 dni, od 11:00 w strefie salonu)
create or replace function public.powroty_do_wyslania() returns table (
  klientka_id uuid, salon_id uuid, salon text, kolor text, info text, link text,
  imie text, email text, usluga text, ostatnia timestamptz, strefa text, kod text
)
language sql stable security definer set search_path = public as $$
  select p.klientka_id, s.id, s.nazwa, s.kolor, s.info_dla_klientki, coalesce(s.slug, s.zapisy_token),
         p.imie, p.email, p.usluga, p.ostatnia, s.strefa, p.kod
  from public.powroty(7) p
  join public.salony s on s.id = p.salon_id
  where s.powrot_wlaczony and s.zapisy_wlaczone and public.salon_aktywny(s)
    and p.zgoda and p.email <> ''
    and extract(hour from now() at time zone s.strefa) >= 11
  limit 300
$$;
revoke all on function public.powroty_do_wyslania() from public, anon, authenticated;
grant execute on function public.powroty_do_wyslania() to service_role;

-- wypisanie z przypomnień o kolejnej wizycie (link w mailu)
create or replace function public.powrot_wypisz(p_kod text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.klientki k set zgoda_powrot = false
  from public.wizyty w where w.kod = p_kod and char_length(p_kod) >= 16 and k.id = w.klientka_id;
  return found;
end $$;
revoke all on function public.powrot_wypisz(text) from public;
grant execute on function public.powrot_wypisz(text) to anon, authenticated;

-- zapis online ze zgodą na przypomnienie o kolejnej wizycie
create or replace function public.zapisy_rezerwuj_v4(
  p_token text, p_usluga uuid, p_start timestamptz, p_imie text, p_telefon text,
  p_notatka text default '', p_pracownik uuid default null, p_email text default '', p_zgoda_powrot boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare wynik json;
begin
  wynik := public.zapisy_rezerwuj_v3(p_token, p_usluga, p_start, p_imie, p_telefon, p_notatka, p_pracownik, p_email);
  if p_zgoda_powrot then
    update public.klientki k set zgoda_powrot = true
    from public.wizyty w where w.id = (wynik->>'id')::uuid and k.id = w.klientka_id;
  end if;
  return wynik;
end $$;
revoke all on function public.zapisy_rezerwuj_v4(text, uuid, timestamptz, text, text, text, uuid, text, boolean) from public;
grant execute on function public.zapisy_rezerwuj_v4(text, uuid, timestamptz, text, text, text, uuid, text, boolean) to anon, authenticated;

-- Zdjęcia prac w karcie klientki
create table public.zdjecia (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  klientka_id uuid not null references public.klientki (id) on delete cascade,
  wizyta_id uuid references public.wizyty (id) on delete set null,
  sciezka text not null unique,
  opis text not null default '' check (char_length(opis) <= 200),
  created_at timestamptz not null default now()
);
create index zdjecia_klientka on public.zdjecia (klientka_id, created_at desc);
alter table public.zdjecia enable row level security;
create policy "Zespół – zdjęcia" on public.zdjecia for all to authenticated
  using (salon_id in (select public.salony_zespolu()))
  with check (salon_id in (select public.salony_zespolu()) and sciezka like salon_id::text || '/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zdjecia', 'zdjecia', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Zespół – pliki zdjęć (odczyt)" on storage.objects for select to authenticated
  using (bucket_id = 'zdjecia' and (storage.foldername(name))[1] in (select x::text from public.salony_zespolu() x));
create policy "Zespół – pliki zdjęć (dodawanie)" on storage.objects for insert to authenticated
  with check (bucket_id = 'zdjecia' and (storage.foldername(name))[1] in (select x::text from public.salony_zespolu() x));
create policy "Zespół – pliki zdjęć (usuwanie)" on storage.objects for delete to authenticated
  using (bucket_id = 'zdjecia' and (storage.foldername(name))[1] in (select x::text from public.salony_zespolu() x));
