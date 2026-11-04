-- Salon demo do pokazywania Bloomly: konto demo@bloomly.example (hasło publiczne, podane na stronie),
-- trzy osoby w zespole, cennik, klientki i wizyty wokół dzisiejszego dnia. Odświeżany co noc.

create or replace function prywatne.demo_odswiez() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  mail constant text := 'demo@bloomly.example';
  haslo constant text := 'bloomly-demo-2026';
  uid uuid;
  sid uuid;
  ola uuid; kasia uuid; nati uuid;
  osoby uuid[];
  us record;
  uslugi_ids uuid[];
  klientki_ids uuid[];
  dzis date := (now() at time zone 'Europe/Warsaw')::date;
  d date;
  godz time;
  i int; j int; n int := 0;
  st timestamptz;
  u public.uslugi;
  status_w public.status_wizyty;
  imiona text[] := array['Ola Nowak','Kasia Wiśniewska','Natalia Kowalczyk','Ewa Zielińska','Marta Wójcik','Julia Kamińska',
    'Zuzia Lewandowska','Magda Dąbrowska','Ania Chwastek','Patrycja Szulc','Weronika Mazur','Daria Krawczyk',
    'Sonia Piotrowska','Iga Grabowska','Basia Pawlak','Monika Michalska'];
begin
  -- konto demo (tworzone raz; hasło przywracane co noc)
  select id into uid from auth.users where email = mail;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail, crypt(haslo, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, json_build_object('sub', uid::text, 'email', mail, 'email_verified', true)::jsonb,
            'email', now(), now(), now());
  else
    update auth.users set encrypted_password = crypt(haslo, gen_salt('bf')), email = mail where id = uid;
  end if;

  -- salon od nowa
  delete from public.wizyty where salon_id in (select id from public.salony where owner_id = uid);
  delete from public.salony where owner_id = uid;
  update public.salony set slug = null where slug = 'demo';
  insert into public.salony (owner_id, nazwa, branza, kolor, slug, adres, telefon, zapisy_wyprzedzenie_h, sms_wlaczone)
  values (uid, 'Studio Bloom (demo)', 'paznokcie', '#c9707a', 'demo', 'ul. Przykładowa 1, 00-001 Warszawa', '500 000 000', 2, false)
  returning id into sid;

  insert into public.pracownicy (salon_id, imie, user_id, rola, kolor, kolejnosc) values (sid, 'Ola', uid, 'wlascicielka', '#7a5a47', 0) returning id into ola;
  insert into public.pracownicy (salon_id, imie, rola, kolor, kolejnosc) values (sid, 'Kasia', 'pracownik', '#c9707a', 1) returning id into kasia;
  insert into public.pracownicy (salon_id, imie, rola, kolor, kolejnosc) values (sid, 'Natalia', 'pracownik', '#6b7fa8', 2) returning id into nati;
  osoby := array[ola, kasia, nati];

  insert into public.godziny_pracy (salon_id, dzien, od_godz, do_godz)
  select sid, x, time '09:00', time '18:00' from generate_series(1, 5) x
  union all select sid, 6, time '09:00', time '14:00';
  -- Natalia robi rzęsy i brwi, pracuje wt–sob
  insert into public.godziny_pracownikow (pracownik_id, dzien, od_godz, do_godz)
  select nati, x, time '10:00', time '18:00' from generate_series(2, 5) x
  union all select nati, 6, time '09:00', time '14:00';

  insert into public.uslugi (salon_id, nazwa, czas_min, cena, kolor, kolejnosc) values
    (sid, 'Manicure hybrydowy', 90, 120, '#c9707a', 1),
    (sid, 'Przedłużanie żelem', 150, 180, '#b98a4e', 2),
    (sid, 'Uzupełnienie żelu', 120, 150, '#d29a6a', 3),
    (sid, 'Pedicure hybrydowy', 90, 130, '#4f7a5b', 4),
    (sid, 'Przedłużanie rzęs 1:1', 120, 180, '#6b7fa8', 5),
    (sid, 'Laminacja brwi', 60, 110, '#9b6fa6', 6);
  select array_agg(id order by kolejnosc) into uslugi_ids from public.uslugi where salon_id = sid;
  insert into public.uslugi_pracownicy (usluga_id, pracownik_id)
  select uslugi_ids[x], p from generate_series(1, 4) x, unnest(array[ola, kasia]) p
  union all select uslugi_ids[x], nati from generate_series(5, 6) x;

  insert into public.klientki (salon_id, imie, telefon, notatka)
  select sid, imiona[x], '50000' || lpad(x::text, 4, '0'), case when x % 5 = 0 then 'Lubi nude i krótkie migdały' else '' end
  from generate_series(1, array_length(imiona, 1)) x;
  select array_agg(id order by imie) into klientki_ids from public.klientki where salon_id = sid;

  -- wizyty: tydzień wstecz (zrobione) i dwa tygodnie do przodu
  for d in select generate_series(dzis - 7, dzis + 14, interval '1 day')::date loop
    continue when extract(isodow from d) = 7;
    for i in 1 .. 3 loop
      continue when osoby[i] = nati and extract(isodow from d) = 1;
      godz := case when osoby[i] = nati then time '10:00' else time '09:00' end + make_interval(mins => 30 * ((n + i) % 3));
      for j in 1 .. (case when extract(isodow from d) = 6 then 2 else 3 + (n + i) % 2 end) loop
        n := n + 1;
        -- pomijamy część terminów, żeby w zapisach zostały wolne godziny
        continue when (n % 4 = 0 and d >= dzis);
        select * into u from public.uslugi
        where id = case when osoby[i] = nati then uslugi_ids[5 + n % 2] else uslugi_ids[1 + n % 4] end;
        st := (d + godz) at time zone 'Europe/Warsaw';
        exit when (d + godz + make_interval(mins => u.czas_min)) > (d + time '18:00');
        status_w := case when d < dzis then (case when n % 13 = 0 then 'nieobecnosc' else 'zrealizowana' end)::public.status_wizyty
                         when d = dzis and godz < (now() at time zone 'Europe/Warsaw')::time - interval '2 hours' then 'zrealizowana'
                         when d between dzis + 1 and dzis + 3 and n % 9 = 0 then 'oczekuje'
                         else 'potwierdzona' end;
        insert into public.wizyty (salon_id, pracownik_id, klientka_id, usluga_id, usluga_nazwa, start, koniec, status, zrodlo,
                                   cena, kwota, napiwek, platnosc, sms_status)
        values (sid, osoby[i], klientki_ids[1 + n % array_length(klientki_ids, 1)], u.id, u.nazwa, st,
                st + make_interval(mins => u.czas_min), status_w,
                case when status_w = 'oczekuje' or n % 3 = 0 then 'link' else 'panel' end::public.zrodlo_wizyty,
                u.cena,
                case when status_w = 'zrealizowana' then u.cena + (n % 3) * 10 end,
                case when status_w = 'zrealizowana' and n % 4 = 1 then 20 else 0 end,
                case when status_w = 'zrealizowana' then (array['gotowka','blik','karta','blik'])[1 + n % 4]::public.platnosc end,
                case when d < dzis + 1 then 'wyslany' else 'brak' end::public.sms_status);
        godz := godz + make_interval(mins => u.czas_min + 15 * (n % 3));
      end loop;
    end loop;
  end loop;

  insert into public.przerwy (salon_id, pracownik_id, start, koniec, opis)
  values (sid, kasia, ((dzis + 10) + time '00:00') at time zone 'Europe/Warsaw', ((dzis + 12) + time '00:00') at time zone 'Europe/Warsaw', 'Urlop Kasi');
end $$;
revoke all on function prywatne.demo_odswiez() from public, anon, authenticated;

select prywatne.demo_odswiez();
select cron.schedule('demo-odswiez', '0 2 * * *', 'select prywatne.demo_odswiez()');
