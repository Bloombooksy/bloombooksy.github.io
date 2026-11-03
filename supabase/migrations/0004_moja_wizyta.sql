-- Strona „Moja wizyta” dla klientki: prywatny kod wizyty, podgląd statusu, dodanie do kalendarza, odwołanie.
alter table public.salony
  add column adres text not null default 'ul. Wróblewskiego 8, 32-600 Oświęcim' check (char_length(adres) <= 200),
  add column telefon text not null default '690 017 099' check (char_length(telefon) <= 30);

alter table public.wizyty
  add column kod text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  add column odwolala_klientka boolean not null default false;
create unique index wizyty_kod_idx on public.wizyty (kod);

-- rezerwacja zwraca teraz też kod wizyty (link „Moja wizyta”)
create or replace function public.zapisy_rezerwuj(
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
  w_kod text;
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
    returning id, kod into w_id, w_kod;
  exception when exclusion_violation then
    raise exception 'Ten termin jest już zajęty – wybierz inny' using errcode = 'P0001';
  end;

  return json_build_object('id', w_id, 'kod', w_kod, 'salon', s.nazwa, 'usluga', u.nazwa, 'start', p_start);
end $$;


-- Podgląd wizyty po kodzie (bez logowania). Zwraca tylko dane tej jednej wizyty.
create function public.wizyta_info(p_kod text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'salon', s.nazwa, 'adres', s.adres, 'telefon', s.telefon,
    'usluga', w.usluga_nazwa, 'start', w.start, 'koniec', w.koniec, 'status', w.status,
    'imie', split_part(coalesce(k.imie, ''), ' ', 1),
    'odwolala_klientka', w.odwolala_klientka,
    'mozna_odwolac', w.status in ('oczekuje', 'potwierdzona')
                     and w.start > now() + make_interval(hours => s.zapisy_wyprzedzenie_h),
    'zapisy_token', case when s.zapisy_wlaczone then s.zapisy_token end
  )
  from public.wizyty w
  join public.salony s on s.id = w.salon_id
  left join public.klientki k on k.id = w.klientka_id
  where w.kod = p_kod and char_length(p_kod) >= 16
$$;

create function public.wizyta_odwolaj(p_kod text) returns json
language plpgsql security definer set search_path = public as $$
declare w public.wizyty; s public.salony;
begin
  select * into w from public.wizyty where kod = p_kod and char_length(p_kod) >= 16;
  if not found then raise exception 'Nie ma takiej wizyty' using errcode = 'P0001'; end if;
  select * into s from public.salony where id = w.salon_id;
  if w.status not in ('oczekuje', 'potwierdzona') then
    raise exception 'Tej wizyty nie można już odwołać' using errcode = 'P0001';
  end if;
  if w.start <= now() + make_interval(hours => s.zapisy_wyprzedzenie_h) then
    raise exception 'Na odwołanie przez internet jest już za późno – zadzwoń, proszę' using errcode = 'P0001';
  end if;
  update public.wizyty set status = 'odwolana', odwolala_klientka = true where id = w.id;
  return public.wizyta_info(p_kod);
end $$;

revoke all on function public.wizyta_info(text) from public;
revoke all on function public.wizyta_odwolaj(text) from public;
grant execute on function public.wizyta_info(text) to anon, authenticated;
grant execute on function public.wizyta_odwolaj(text) to anon, authenticated;
