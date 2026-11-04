import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type {
  Database,
  GodzinyPracownikaRow,
  GodzinyRow,
  KlientkaRow,
  PracownikRow,
  PrzerwaRow,
  Rola,
  SalonRow,
  UslugaPracownikRow,
  UslugaRow,
  WizytaRow,
} from "./database.types";
import { dodajDni, wStrefie } from "./czas";

type Tabele = Database["public"]["Tables"];

export type WizytaZKlientka = WizytaRow & { klientka: Pick<KlientkaRow, "id" | "imie" | "telefon" | "instagram" | "prosba_o_opinie" | "zablokowana"> | null };

function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export type Kontekst = { salon: SalonRow; rola: Rola; pracownik_id: string };

/** Kim jest zalogowana osoba: jej salon, rola i „ja” w zespole. null = konto bez salonu (kreator). */
export function useKontekst() {
  return useQuery({
    queryKey: ["kontekst"],
    queryFn: async () => ok<Kontekst | null>((await supabase.rpc("moj_kontekst")) as { data: Kontekst | null; error: unknown }),
    staleTime: 5 * 60_000,
  });
}

export function useSalon() {
  const q = useKontekst();
  return { ...q, data: q.data?.salon };
}

/** Salon jest zawsze załadowany w części dla zalogowanych (pilnuje tego Layout). */
export function useSalonId(): string {
  return useKontekst().data?.salon.id ?? "";
}

export function useCzyWlascicielka(): boolean {
  return useKontekst().data?.rola === "wlascicielka";
}

export function useJa(): string {
  return useKontekst().data?.pracownik_id ?? "";
}

export function usePracownicy() {
  return useQuery({
    queryKey: ["pracownicy"],
    queryFn: async () =>
      ok<PracownikRow[]>(await supabase.from("pracownicy").select("*").order("kolejnosc").order("created_at")),
  });
}

/** Aktywne osoby w zespole; gdy jest tylko jedna, aplikacja nie pokazuje wyboru osoby. */
export function useZespol() {
  const { data = [], ...q } = usePracownicy();
  const aktywni = data.filter((p) => p.aktywny);
  return { ...q, wszyscy: data, aktywni, wiele: aktywni.length > 1 };
}

export function useUslugiPracownicy() {
  return useQuery({
    queryKey: ["uslugi_pracownicy"],
    queryFn: async () => ok<UslugaPracownikRow[]>(await supabase.from("uslugi_pracownicy").select("*")),
  });
}

export function useGodzinyPracownikow() {
  return useQuery({
    queryKey: ["godziny_pracownikow"],
    queryFn: async () => ok<GodzinyPracownikaRow[]>(await supabase.from("godziny_pracownikow").select("*").order("dzien")),
  });
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

const WIZYTA_SELECT = "*, klientka:klientki(id, imie, telefon, instagram, prosba_o_opinie, zablokowana)";

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
    onSuccess: (s) => qc.setQueryData<Kontekst | null>(["kontekst"], (k) => (k ? { ...k, salon: s } : k)),
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
