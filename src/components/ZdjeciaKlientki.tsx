import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, X } from "lucide-react";
import { supabase, komunikat } from "../lib/supabase";
import type { ZdjecieRow } from "../lib/database.types";
import { Blad } from "./ui";

const MAKS = 1600;

/** Zmniejsza zdjęcie z telefonu do max 1600 px i zapisuje jako JPEG (ok. 200–400 kB zamiast kilku MB). */
async function zmniejsz(plik: File): Promise<Blob> {
  const bitmap = await createImageBitmap(plik);
  const skala = Math.min(1, MAKS / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * skala);
  c.height = Math.round(bitmap.height * skala);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return new Promise((ok, zle) => c.toBlob((b) => (b ? ok(b) : zle(new Error("Nie udało się przygotować zdjęcia"))), "image/jpeg", 0.82));
}

type ZAdresem = ZdjecieRow & { url: string };

/** Zdjęcia prac w karcie klientki – widzi je tylko zespół salonu. */
export function ZdjeciaKlientki({ salonId, klientkaId }: { salonId: string; klientkaId: string }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [wysylam, setWysylam] = useState(0);
  const [blad, setBlad] = useState("");
  const [podglad, setPodglad] = useState<ZAdresem | null>(null);
  const klucz = ["zdjecia", klientkaId];

  const { data: zdjecia = [] } = useQuery({
    queryKey: klucz,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<ZAdresem[]> => {
      const { data, error } = await supabase.from("zdjecia").select("*").eq("klientka_id", klientkaId).order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      const { data: adresy, error: e2 } = await supabase.storage.from("zdjecia").createSignedUrls(
        data.map((z) => z.sciezka),
        60 * 60,
      );
      if (e2) throw e2;
      const mapa = new Map((adresy ?? []).map((a) => [a.path, a.signedUrl]));
      return data.map((z) => ({ ...z, url: mapa.get(z.sciezka) ?? "" }));
    },
  });

  async function dodaj(pliki: FileList | null) {
    if (!pliki?.length) return;
    setBlad("");
    setWysylam(pliki.length);
    try {
      for (const plik of Array.from(pliki)) {
        const blob = await zmniejsz(plik);
        const sciezka = `${salonId}/${klientkaId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("zdjecia").upload(sciezka, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const { error: e2 } = await supabase.from("zdjecia").insert({ salon_id: salonId, klientka_id: klientkaId, sciezka });
        if (e2) throw e2;
        setWysylam((n) => n - 1);
      }
    } catch (err) {
      setBlad(komunikat(err));
    } finally {
      setWysylam(0);
      if (input.current) input.current.value = "";
      await qc.invalidateQueries({ queryKey: klucz });
    }
  }

  async function usun(z: ZAdresem) {
    if (!window.confirm("Usunąć to zdjęcie?")) return;
    const { error } = await supabase.storage.from("zdjecia").remove([z.sciezka]);
    const { error: e2 } = await supabase.from("zdjecia").delete().eq("id", z.id);
    if (error || e2) return setBlad(komunikat(error ?? e2));
    setPodglad(null);
    await qc.invalidateQueries({ queryKey: klucz });
  }

  return (
    <section className="border-t border-linia pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold tracking-wide text-szary uppercase">Zdjęcia prac</h3>
        <button type="button" className="btn-jasny min-h-9 px-3 text-[14px]" disabled={wysylam > 0} onClick={() => input.current?.click()}>
          <Camera className="size-4" /> {wysylam > 0 ? `Wysyłam (${wysylam})…` : "Dodaj"}
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => dodaj(e.target.files)} />
      </div>
      {zdjecia.length === 0 ? (
        <p className="mt-2 text-[14px] text-szary">Zrób zdjęcie po wizycie – następnym razem zobaczysz, co robiłaś, jaki kolor i kształt.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {zdjecia.map((z) => (
            <li key={z.id}>
              <button type="button" className="block aspect-square w-full overflow-hidden rounded-xl bg-piasek" onClick={() => setPodglad(z)}>
                {z.url && <img src={z.url} alt={`Zdjęcie z ${new Date(z.created_at).toLocaleDateString("pl-PL")}`} loading="lazy" className="size-full object-cover" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Blad>{blad}</Blad>
      {podglad && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 p-4" role="dialog" aria-label="Zdjęcie">
          <div className="flex items-center justify-between text-white">
            <span className="text-[14px]">{new Date(podglad.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
            <div className="flex gap-2">
              <button type="button" className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Usuń zdjęcie" onClick={() => usun(podglad)}>
                <Trash2 className="size-5" />
              </button>
              <button type="button" className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Zamknij" onClick={() => setPodglad(null)}>
                <X className="size-5" />
              </button>
            </div>
          </div>
          <img src={podglad.url} alt="" className="mt-4 min-h-0 flex-1 object-contain" />
        </div>
      )}
    </section>
  );
}
