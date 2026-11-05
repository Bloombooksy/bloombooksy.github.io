-- Lista oczekujących na zwolniony termin + trwałe usuwanie salonów 30 dni po decyzji właścicielki.

create table public.lista_oczekujacych (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  usluga_id uuid references public.uslugi (id) on delete set null,
  pracownik_id uuid references public.pracownicy (id) on delete set null,
  imie text not null check (char_length(imie) between 2 and 80),
  telefon text not null default '',
  email text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  od date not null,
  do_dnia date not null,
  uwagi text not null default '' check (char_length(uwagi) <= 300),
  powiadomiono timestamptz,
  zalatwione boolean not null default false,
  created_at timestamptz not null default now(),
  check (do_dnia >= od and do_dnia <= od + 62)
);
create index lista_oczekujacych_salon on public.lista_oczekujacych (salon_id, zalatwione, od);
alter table public.lista_oczekujacych enable row level security;
create policy "Zespół – lista oczekujących" on public.lista_oczekujacych for all to authenticated
  using (salon_id in (select public.salony_zespolu())) with check (salon_id in (select public.salony_zespolu()));

-- Zapis na listę ze strony zapisów (bez logowania)
create or replace function public.zapisy_lista_dopisz(
  p_token text, p_usluga uuid, p_od date, p_do date, p_imie text, p_telefon text,
  p_email text default '', p_uwagi text default '', p_pracownik uuid default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  s public.salony;
  tel text := regexp_replace(coalesce(p_telefon, ''), '[^0-9+]', '', 'g');
  mail text := lower(btrim(coalesce(p_email, '')));
  dzis date;
  w_id uuid;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then raise exception 'Link do zapisów jest nieaktywny' using errcode = 'P0001'; end if;
  dzis := (now() at time zone s.strefa)::date;
  if char_length(btrim(coalesce(p_imie, ''))) not between 2 and 80 then raise exception 'Podaj imię' using errcode = 'P0001'; end if;
  if tel !~ '^\+?[0-9]{9,15}$' then raise exception 'Podaj poprawny numer telefonu' using errcode = 'P0001'; end if;
  if mail <> '' and mail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Podaj poprawny e-mail albo zostaw puste' using errcode = 'P0001'; end if;
  if p_od is null or p_do is null or p_od < dzis or p_do < p_od or p_do > dzis + s.zapisy_horyzont_dni + 31 then
    raise exception 'Wybierz poprawne daty' using errcode = 'P0001';
  end if;
  if p_usluga is not null and not exists (select 1 from public.uslugi where id = p_usluga and salon_id = s.id and aktywna and w_zapisach) then
    raise exception 'Wybierz usługę' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.klientki k where k.salon_id = s.id and k.zablokowana and k.telefon <> ''
             and right(regexp_replace(k.telefon, '[^0-9]', '', 'g'), 9) = right(regexp_replace(tel, '[^0-9]', '', 'g'), 9)) then
    raise exception 'Zapisy online są niedostępne – zadzwoń do salonu%', case when s.telefon <> '' then ': ' || s.telefon else '' end using errcode = 'P0001';
  end if;
  if (select count(*) from public.lista_oczekujacych l where l.salon_id = s.id and not l.zalatwione and l.do_dnia >= dzis
      and right(regexp_replace(l.telefon, '[^0-9]', '', 'g'), 9) = right(regexp_replace(tel, '[^0-9]', '', 'g'), 9)) >= 3 then
    raise exception 'Jesteś już na liście oczekujących – salon da Ci znać' using errcode = 'P0001';
  end if;
  if (select count(*) from public.lista_oczekujacych where salon_id = s.id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Za dużo zgłoszeń naraz – spróbuj za chwilę' using errcode = 'P0001';
  end if;
  insert into public.lista_oczekujacych (salon_id, usluga_id, pracownik_id, imie, telefon, email, od, do_dnia, uwagi)
  values (s.id, p_usluga,
          (select id from public.pracownicy where id = p_pracownik and salon_id = s.id and aktywny),
          btrim(p_imie), tel, mail, p_od, p_do, left(btrim(coalesce(p_uwagi, '')), 300))
  returning id into w_id;
  return json_build_object('id', w_id, 'salon', s.nazwa);
end $$;
revoke all on function public.zapisy_lista_dopisz(text, uuid, date, date, text, text, text, text, uuid) from public;
grant execute on function public.zapisy_lista_dopisz(text, uuid, date, date, text, text, text, text, uuid) to anon, authenticated;

-- Zwolnione terminy (odwołane wizyty w przyszłości) – z nich powstają powiadomienia dla listy
create table public.zwolnione_terminy (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salony (id) on delete cascade,
  pracownik_id uuid references public.pracownicy (id) on delete cascade,
  start timestamptz not null,
  koniec timestamptz not null,
  obsluzone boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.zwolnione_terminy enable row level security;
create policy "Zespół – zwolnione terminy" on public.zwolnione_terminy for select to authenticated
  using (salon_id in (select public.salony_zespolu()));

create table public.lista_powiadomienia (
  wpis_id uuid not null references public.lista_oczekujacych (id) on delete cascade,
  zwolniony_id uuid not null references public.zwolnione_terminy (id) on delete cascade,
  wyslano timestamptz not null default now(),
  primary key (wpis_id, zwolniony_id)
);
alter table public.lista_powiadomienia enable row level security;

create or replace function public.wizyty_zwolniony_termin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'odwolana' and old.status in ('oczekuje', 'potwierdzona') and new.start > now() + interval '1 hour' then
    insert into public.zwolnione_terminy (salon_id, pracownik_id, start, koniec) values (new.salon_id, new.pracownik_id, new.start, new.koniec);
  end if;
  return new;
end $$;
revoke all on function public.wizyty_zwolniony_termin() from public, anon, authenticated;
create trigger wizyty_zwolniony_termin after update of status on public.wizyty
  for each row execute function public.wizyty_zwolniony_termin();

-- Dla funkcji wysyłającej: kogo z listy powiadomić o zwolnionym terminie (max 5 na termin, kolejność zgłoszeń)
create or replace function public.lista_do_powiadomienia() returns table (
  wpis_id uuid, zwolniony_id uuid, salon text, kolor text, link text, imie text, email text,
  usluga text, start timestamptz, strefa text, pracownik text
)
language sql stable security definer set search_path = public as $$
  select x.wpis_id, x.zwolniony_id, x.salon, x.kolor, x.link, x.imie, x.email, x.usluga, x.start, x.strefa, x.pracownik
  from (
    select l.id wpis_id, z.id zwolniony_id, s.nazwa salon, s.kolor, coalesce(s.slug, s.zapisy_token) link, l.imie, l.email,
           coalesce(u.nazwa, '') usluga, z.start, s.strefa,
           case when (select count(*) from public.pracownicy x where x.salon_id = s.id and x.aktywny) > 1 then p.imie end pracownik,
           row_number() over (partition by z.id order by l.created_at) nr
    from public.zwolnione_terminy z
    join public.salony s on s.id = z.salon_id
    join public.lista_oczekujacych l on l.salon_id = z.salon_id
    left join public.uslugi u on u.id = l.usluga_id
    left join public.pracownicy p on p.id = z.pracownik_id
    where not z.obsluzone and z.start > now() + interval '2 hours'
      and s.zapisy_wlaczone and public.salon_aktywny(s)
      and not l.zalatwione and l.email <> ''
      and (z.start at time zone s.strefa)::date between l.od and l.do_dnia
      and (l.usluga_id is null or u.czas_min <= extract(epoch from (z.koniec - z.start)) / 60)
      and (l.pracownik_id is null or l.pracownik_id = z.pracownik_id)
      and not exists (select 1 from public.lista_powiadomienia n where n.wpis_id = l.id and n.zwolniony_id = z.id)
  ) x where x.nr <= 5
$$;
revoke all on function public.lista_do_powiadomienia() from public, anon, authenticated;
grant execute on function public.lista_do_powiadomienia() to service_role;

-- Trwałe usuwanie: salony, którym minęło 30 dni od „Usuń salon” (funkcja wysyłająca najpierw kasuje pliki zdjęć)
create or replace function public.salony_do_usuniecia_trwale() returns table (salon_id uuid, pliki text[])
language sql stable security definer set search_path = public, storage as $$
  select s.id, coalesce((select array_agg(o.name) from storage.objects o
                         where o.bucket_id = 'zdjecia' and o.name like s.id::text || '/%'), '{}')
  from public.salony s where s.do_usuniecia is not null and s.do_usuniecia < now()
$$;
revoke all on function public.salony_do_usuniecia_trwale() from public, anon, authenticated;
grant execute on function public.salony_do_usuniecia_trwale() to service_role;

create or replace function public.usun_salon_trwale(p_salon uuid) returns void
language plpgsql security definer set search_path = public as $$
declare wlascicielka uuid;
begin
  select owner_id into wlascicielka from public.salony where id = p_salon and do_usuniecia is not null and do_usuniecia < now();
  if wlascicielka is null then return; end if;
  delete from public.wizyty where salon_id = p_salon;
  delete from public.salony where id = p_salon;
  -- konto właścicielki (e-mail, hasło) – kasujemy razem z salonem
  delete from auth.users where id = wlascicielka;
end $$;
revoke all on function public.usun_salon_trwale(uuid) from public, anon, authenticated;
grant execute on function public.usun_salon_trwale(uuid) to service_role;

-- Funkcja wysyłająca co 5 minut (lista oczekujących musi działać szybko; przypomnienia nadal raz na wizytę)
select cron.alter_job(jobid, schedule => '*/5 * * * *') from cron.job where jobname = 'przypomnienia-sms';
