-- Blokada klientek, zadatki (BLIK/przelew bezpośrednio do salonu) i prośba o opinię Google.

alter table public.klientki
  add column zablokowana boolean not null default false,
  add column wymaga_zadatku boolean not null default false,
  add column prosba_o_opinie timestamptz;

alter table public.salony
  add column zadatek_tryb text not null default 'wybrane' check (zadatek_tryb in ('wybrane', 'nowe', 'wszyscy')),
  add column zadatek_kwota numeric(10, 2) not null default 0 check (zadatek_kwota >= 0 and zadatek_kwota <= 2000),
  add column zadatek_instrukcja text not null default '' check (char_length(zadatek_instrukcja) <= 300),
  add column link_opinii text not null default '' check (link_opinii = '' or link_opinii ~ '^https://');

alter table public.wizyty
  add column zadatek numeric(10, 2) check (zadatek is null or zadatek >= 0),
  add column zadatek_wplacony boolean not null default false;

-- zapis online: odmowa dla zablokowanych, zadatek wg ustawień salonu
create or replace function public.zapisy_rezerwuj_v2(
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
  kl public.klientki;
  v_zadatek numeric;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then raise exception 'Link do zapisów jest nieaktywny' using errcode = 'P0001'; end if;
  if char_length(imie) not between 2 and 80 then raise exception 'Podaj imię' using errcode = 'P0001'; end if;
  if tel !~ '^\+?[0-9]{9,15}$' then raise exception 'Podaj poprawny numer telefonu' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_notatka, '')) > 500 then raise exception 'Wiadomość jest za długa' using errcode = 'P0001'; end if;

  -- klientka zablokowana przez salon: zapis tylko telefonicznie
  select * into kl from public.klientki
  where salon_id = s.id and telefon <> ''
    and right(regexp_replace(telefon, '[^0-9]', '', 'g'), 9) = right(regexp_replace(tel, '[^0-9]', '', 'g'), 9)
  order by zablokowana desc, created_at limit 1;
  if kl.zablokowana then
    raise exception 'Zapisy online są niedostępne – zadzwoń do salonu%', case when s.telefon <> '' then ': ' || s.telefon else '' end
      using errcode = 'P0001';
  end if;

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

  k_id := kl.id;
  if k_id is null then
    insert into public.klientki (salon_id, imie, telefon) values (s.id, imie, tel) returning id into k_id;
  end if;

  -- zadatek: wszystkie zapisy online, tylko nowe klientki (bez zrobionej wizyty) albo klientki oznaczone przez salon
  if s.zadatek_kwota > 0 and (
       s.zadatek_tryb = 'wszyscy'
       or (s.zadatek_tryb = 'nowe' and not exists (select 1 from public.wizyty x where x.klientka_id = k_id and x.status = 'zrealizowana'))
       or coalesce(kl.wymaga_zadatku, false)) then
    v_zadatek := least(s.zadatek_kwota, u.cena);
    if v_zadatek <= 0 then v_zadatek := s.zadatek_kwota; end if;
  end if;

  begin
    insert into public.wizyty (salon_id, pracownik_id, klientka_id, usluga_id, usluga_nazwa, start, koniec, status, zrodlo, cena, notatka, zadatek)
    values (s.id, osoba, k_id, u.id, u.nazwa, p_start, p_start + make_interval(mins => u.czas_min), 'oczekuje', 'link', u.cena,
            coalesce(btrim(p_notatka), ''), v_zadatek)
    returning id, kod into w_id, w_kod;
  exception when exclusion_violation then
    raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001';
  end;

  return json_build_object('id', w_id, 'kod', w_kod, 'salon', s.nazwa, 'usluga', u.nazwa, 'start', p_start,
                           'pracownik', (select pp.imie from public.pracownicy pp where pp.id = osoba),
                           'zadatek', v_zadatek, 'zadatek_instrukcja', case when v_zadatek is not null then s.zadatek_instrukcja end);
end $$;

-- strona „Moja wizyta”: kwota zadatku i jak go wpłacić
create or replace function public.wizyta_info(p_kod text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'salon', s.nazwa, 'adres', s.adres, 'telefon', s.telefon, 'kolor', s.kolor,
    'usluga', w.usluga_nazwa, 'start', w.start, 'koniec', w.koniec, 'status', w.status,
    'imie', split_part(coalesce(k.imie, ''), ' ', 1),
    'pracownik', case when (select count(*) from public.pracownicy x where x.salon_id = s.id and x.aktywny) > 1 then p.imie end,
    'odwolala_klientka', w.odwolala_klientka,
    'zadatek', w.zadatek, 'zadatek_wplacony', w.zadatek_wplacony,
    'zadatek_instrukcja', case when w.zadatek is not null and not w.zadatek_wplacony then s.zadatek_instrukcja end,
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

-- strona zapisów: informacja o zadatku przed zapisem
create or replace function public.zapisy_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.salony;
begin
  s := public.zapisy_salon(p_token);
  if s.id is null then return null; end if;
  return json_build_object(
    'salon', s.nazwa,
    'kolor', s.kolor,
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
