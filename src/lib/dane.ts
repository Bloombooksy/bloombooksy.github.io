import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Database, GodzinyRow, KlientkaRow, PrzerwaRow, SalonRow, UslugaRow, WizytaRow } from "./database.types";
import { dodajDni, wStrefie } from "./czas";

type Tabele = Database["public"]["Tables"];

export type WizytaZKlientka = WizytaRow & { klientka: Pick<KlientkaRow, "id" | "imie" | "telefon" | "instagram"> | null };

function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export function useSalon() {
  return useQuery({
    queryKey: ["salon"],
    queryFn: async () => ok<SalonRow>(await supabase.rpc("moj_salon")),
    staleTime: 5 * 60_000,
  });
}

/** Salon jest zawsze załadowany w części dla zalogowanych (pilnuje tego Layout). */
export function useSalonId(): string {
  const { data } = useSalon();
  return data?.id ?? "";
}

export function useUslugi() {
  return useQuery({
    queryKey: ["uslugi"],
    queryFn: async () =>
      ok<UslugaRow[]>(await supabase.from("uslugi").select("*").order("kolejnosc").order("nazwa")),
  });
}

export function useKlientki() {
  return useQuery({
    queryKey: ["klientki"],
    queryFn: async () => ok<KlientkaRow[]>(await supabase.from("klientki").select("*").order("imie")),
  });
}

export function useGodziny() {
  return useQuery({
    queryKey: ["godziny"],
    queryFn: async () => ok<GodzinyRow[]>(await supabase.from("godziny_pracy").select("*").order("dzien")),
  });
}

export function usePrzerwy(od: string, doDnia: string) {
  return useQuery({
    queryKey: ["przerwy", od, doDnia],
    queryFn: async () =>
      ok<PrzerwaRow[]>(
        await supabase
          .from("przerwy")
          .select("*")
          .lt("start", wStrefie(dodajDni(doDnia, 1)).toISOString())
          .gt("koniec", wStrefie(od).toISOString())
          .order("start"),
      ),
  });
}

const WIZYTA_SELECT = "*, klientka:klientki(id, imie, telefon, instagram)";

/** Wizyty z zakresu dni (włącznie). */
export function useWizyty(od: string, doDnia: string) {
  return useQuery({
    queryKey: ["wizyty", od, doDnia],
    queryFn: async () =>
      ok<WizytaZKlientka[]>(
        (await supabase
          .from("wizyty")
          .select(WIZYTA_SELECT)
          .gte("start", wStrefie(od).toISOString())
          .lt("start", wStrefie(dodajDni(doDnia, 1)).toISOString())
          .order("start")) as { data: WizytaZKlientka[] | null; error: unknown },
      ),
  });
}

/** Zapisy z linku czekające na decyzję Madzi. */
export function useOczekujace() {
  return useQuery({
    queryKey: ["wizyty", "oczekujace"],
    queryFn: async () =>
      ok<WizytaZKlientka[]>(
        (await supabase
          .from("wizyty")
          .select(WIZYTA_SELECT)
          .eq("status", "oczekuje")
          .gte("start", new Date().toISOString())
          .order("start")) as { data: WizytaZKlientka[] | null; error: unknown },
      ),
    refetchInterval: 60_000,
  });
}

export function useHistoriaKlientki(klientkaId: string | null) {
  return useQuery({
    enabled: !!klientkaId,
    queryKey: ["wizyty", "klientka", klientkaId],
    queryFn: async () =>
      ok<WizytaRow[]>(
        await supabase.from("wizyty").select("*").eq("klientka_id", klientkaId!).order("start", { ascending: false }),
      ),
  });
}

/** Wspólny zapis/aktualizacja/usuwanie dla dowolnej tabeli – po sukcesie odświeża podane listy. */
export function useZapis<K extends keyof Tabele>(tabela: K, odswiez: string[]) {
  const qc = useQueryClient();
  const done = () => Promise.all(odswiez.map((k) => qc.invalidateQueries({ queryKey: [k] })));
  return {
    dodaj: useMutation({
      mutationFn: async (row: Tabele[K]["Insert"]) =>
        ok<Tabele[K]["Row"]>(await supabase.from(tabela).insert(row as never).select().single()),
      onSuccess: done,
    }),
    zmien: useMutation({
      mutationFn: async ({ id, ...zmiany }: Tabele[K]["Update"] & { id: string }) =>
        ok<Tabele[K]["Row"]>(await supabase.from(tabela).update(zmiany as never).eq("id" as never, id as never).select().single()),
      onSuccess: done,
    }),
    usun: useMutation({
      mutationFn: async (id: string) => ok(await supabase.from(tabela).delete().eq("id" as never, id as never)),
      onSuccess: done,
    }),
  };
}

/** Zmiana ustawień salonu (nazwa, zapisy, SMS). */
export function useZmienSalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (z: Tabele["salony"]["Update"] & { id: string }) => {
      const { id, ...reszta } = z;
      return ok<SalonRow>(await supabase.from("salony").update(reszta).eq("id", id).select().single());
    },
    onSuccess: (s) => qc.setQueryData(["salon"], s),
  });
}

/** Przyszłe wizyty odwołane przez klientki ze strony „Moja wizyta”. */
export function useOdwolanePrzezKlientki() {
  return useQuery({
    queryKey: ["wizyty", "odwolane-klientki"],
    queryFn: async () =>
      ok<WizytaZKlientka[]>(
        (await supabase
          .from("wizyty")
          .select(WIZYTA_SELECT)
          .eq("odwolala_klientka", true)
          .eq("status", "odwolana")
          .gte("start", new Date().toISOString())
          .order("start")) as { data: WizytaZKlientka[] | null; error: unknown },
      ),
    refetchInterval: 60_000,
  });
}
