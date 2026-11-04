-- kolizje liczone dla każdej osoby osobno (dwie stylistki mogą mieć klientki o tej samej godzinie)
alter table public.wizyty drop constraint wizyty_bez_kolizji;
alter table public.wizyty add constraint wizyty_bez_kolizji exclude using gist (
  pracownik_id with =, tstzrange(start, koniec) with &&
) where (status in ('oczekuje', 'potwierdzona', 'zrealizowana'));
