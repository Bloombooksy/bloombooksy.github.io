-- Indeks pod klucz obcy usługi (advisor: unindexed_foreign_keys)
create index if not exists wizyty_usluga_idx on public.wizyty (usluga_id);

-- Funkcje pomocnicze tylko dla zalogowanych; publiczne zostają tylko 3 RPC zapisów.
revoke execute on function public.moje_salony() from public, anon;
revoke execute on function public.moj_salon() from public, anon;
revoke execute on function public.nowy_link_zapisow() from public, anon;
