import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) throw new Error("Brak VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY – skopiuj .env.example do .env");

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Zamienia błąd z bazy na zdanie dla Madzi. */
export function komunikat(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return "Coś poszło nie tak";
  if (err.code === "23P01") return "W tym czasie jest już inna wizyta – wybierz inną godzinę.";
  if (err.code === "23514") return "Sprawdź wpisane dane (np. godzina końca przed początkiem).";
  if (err.message === "Failed to fetch") return "Brak internetu – spróbuj za chwilę.";
  if (err.message?.includes("Invalid login credentials")) return "Zły e-mail lub hasło.";
  if (err.message?.includes("Email not confirmed")) return "Potwierdź adres e-mail (link w skrzynce).";
  return err.message || "Coś poszło nie tak";
}
