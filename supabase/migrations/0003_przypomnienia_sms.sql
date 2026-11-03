-- Przypomnienia SMS: co godzinę pg_cron woła funkcję brzegową "przypomnienia",
-- która wysyła SMS-y do klientek z jutrzejszymi wizytami (raz na wizytę).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Prywatny klucz do autoryzacji crona (niewidoczny przez API).
create schema if not exists prywatne;
revoke all on schema prywatne from public, anon, authenticated;
create table prywatne.klucze (nazwa text primary key, wartosc text not null);
insert into prywatne.klucze values ('cron', encode(extensions.gen_random_bytes(24), 'hex'));

create function public.sms_klucz_ok(p_klucz text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from prywatne.klucze where nazwa = 'cron' and wartosc = p_klucz)
$$;
revoke all on function public.sms_klucz_ok(text) from public, anon, authenticated;
grant execute on function public.sms_klucz_ok(text) to service_role;

-- Wizyty, które trzeba teraz przypomnieć: jutro (w strefie salonu), potwierdzone,
-- jeszcze bez SMS-a, a w salonie minęła już godzina wysyłki.
create function public.sms_do_wyslania() returns table (
  wizyta_id uuid, start timestamptz, strefa text, usluga text, salon text, szablon text, nadawca text,
  imie text, telefon text, zgoda boolean
)
language sql stable security definer set search_path = public as $$
  select w.id, w.start, s.strefa, w.usluga_nazwa, s.nazwa, s.sms_szablon, s.sms_nadawca,
         coalesce(k.imie, ''), coalesce(k.telefon, ''), coalesce(k.zgoda_sms, false)
  from public.wizyty w
  join public.salony s on s.id = w.salon_id
  left join public.klientki k on k.id = w.klientka_id
  where s.sms_wlaczone
    and w.status = 'potwierdzona'
    and w.sms_status = 'brak'
    and (w.start at time zone s.strefa)::date = (now() at time zone s.strefa)::date + 1
    and extract(hour from now() at time zone s.strefa) >= s.sms_godzina
  order by w.start
  limit 200
$$;
revoke all on function public.sms_do_wyslania() from public, anon, authenticated;
grant execute on function public.sms_do_wyslania() to service_role;

-- Co godzinę (5 min po pełnej).
select cron.schedule(
  'przypomnienia-sms',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://hwajuqkesgkemimiwrnj.supabase.co/functions/v1/przypomnienia',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-klucz', (select wartosc from prywatne.klucze where nazwa = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);
