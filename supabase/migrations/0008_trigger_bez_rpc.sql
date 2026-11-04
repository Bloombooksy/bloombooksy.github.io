-- funkcja wyzwalacza nie powinna być dostępna jako RPC
revoke all on function public.wizyty_domyslna_osoba() from public, anon, authenticated;
