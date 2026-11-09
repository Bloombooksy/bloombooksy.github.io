-- Audyt 9.11: mniej funkcji dostępnych z zewnątrz, stały search_path, indeksy pod klucze obce.

-- stare wersje zapisów online – aplikacja używa już tylko zapisy_rezerwuj_v4 / zapisy_wolne_v2
-- (v4 woła v3 i v2 wewnętrznie jako właściciel funkcji, więc nadal działa)
revoke execute on function public.zapisy_rezerwuj(text, uuid, timestamptz, text, text, text) from anon, authenticated, public;
revoke execute on function public.zapisy_rezerwuj_v2(text, uuid, timestamptz, text, text, text, uuid) from anon, authenticated, public;
revoke execute on function public.zapisy_rezerwuj_v3(text, uuid, timestamptz, text, text, text, uuid, text) from anon, authenticated, public;
revoke execute on function public.zapisy_wolne(text, uuid, date) from anon, authenticated, public;
-- nieużywane w aplikacji / tylko do użytku wewnętrznego
revoke execute on function public.moj_salon() from anon, authenticated, public;
revoke execute on function public.sms_w_miesiacu(uuid) from anon, authenticated, public;

alter function public.powrot_domyslny(text) set search_path = public;

comment on table public.lista_powiadomienia is 'Tylko dla funkcji wysyłającej (service_role) – celowo bez polityk RLS.';

create index if not exists lista_oczekujacych_pracownik on public.lista_oczekujacych (pracownik_id);
create index if not exists lista_oczekujacych_usluga on public.lista_oczekujacych (usluga_id);
create index if not exists lista_powiadomienia_zwolniony on public.lista_powiadomienia (zwolniony_id);
create index if not exists zdjecia_salon on public.zdjecia (salon_id);
create index if not exists zdjecia_wizyta on public.zdjecia (wizyta_id);
create index if not exists zwolnione_terminy_pracownik on public.zwolnione_terminy (pracownik_id);
create index if not exists zwolnione_terminy_salon on public.zwolnione_terminy (salon_id, obsluzone);
