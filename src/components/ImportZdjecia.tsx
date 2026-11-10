import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Camera, Check, ImagePlus, Sparkles, X } from "lucide-react";
import { Blad, Modal } from "./ui";
import { useKlientki, useSalonId, useUslugi, useWizyty } from "../lib/dane";
import { DNI_KROTKO, dodajDni, dzienKey, dzienTygodnia, godzina, krotkaData, wStrefie } from "../lib/czas";
import { doBase64, zmniejszZdjecie } from "../lib/obraz";
import { wierszeZOdczytu, type Odczyt, type WierszImportu } from "../lib/importZdjecia";
import { komunikat, supabase } from "../lib/supabase";
import { normalizujTelefon } from "../lib/sms";
import { odmiana } from "../lib/czas";

const MAKS_ZDJEC = 6;

/** Zrób zdjęcie papierowego kalendarza albo screen z innej aplikacji – Bloomly odczyta wizyty i klientki. */
export function ImportZdjecia({ onClose }: { onClose: () => void }) {
  const salonId = useSalonId();
  const qc = useQueryClient();
  const dzis = dzienKey();
  const { data: uslugi = [] } = useUslugi();
  const { data: klientki = [] } = useKlientki();
  const { data: istniejace = [] } = useWizyty(dodajDni(dzis, -90), dodajDni(dzis, 365));
  const input = useRef<HTMLInputElement>(null);
  const [zdjecia, setZdjecia] = useState<{ url: string; blob: Blob }[]>([]);
  const [etap, setEtap] = useState<"zdjecia" | "czytam" | "podglad" | "zapisuje" | "gotowe">("zdjecia");
  const [wiersze, setWiersze] = useState<WierszImportu[]>([]);
  const [noweKlientki, setNoweKlientki] = useState<{ imie: string; telefon: string; wlaczona: boolean }[]>([]);
  const [uwagi, setUwagi] = useState("");
  const [blad, setBlad] = useState("");
  const [wynik, setWynik] = useState({ wizyty: 0, klientki: 0, bledy: [] as string[] });

  async function dodajPliki(pliki: FileList | null) {
    if (!pliki) return;
    setBlad("");
    const nowe: { url: string; blob: Blob }[] = [];
    for (const p of Array.from(pliki).slice(0, MAKS_ZDJEC - zdjecia.length)) {
      try {
        const blob = await zmniejszZdjecie(p, 2000, 0.85);
        nowe.push({ url: URL.createObjectURL(blob), blob });
      } catch {
        setBlad("Nie udało się wczytać jednego ze zdjęć.");
      }
    }
    setZdjecia((z) => [...z, ...nowe]);
    if (input.current) input.current.value = "";
  }

  async function czytaj() {
    setBlad("");
    setEtap("czytam");
    try {
      const obrazy = await Promise.all(zdjecia.map(async (z) => ({ typ: "image/jpeg", dane: await doBase64(z.blob) })));
      const { data, error } = await supabase.functions.invoke("import-zdjecie", { body: { obrazy, dzis, uslugi: uslugi.filter((u) => u.aktywna).map((u) => u.nazwa) } });
      if (error) {
        const tresc = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(tresc?.blad ?? "Nie udało się odczytać zdjęcia. Spróbuj ponownie.");
      }
      const o = data as Odczyt;
      const zajete = istniejace.filter((w) => w.status !== "odwolana").map((w) => ({ start: w.start, klucz: `${dzienKey(w.start)} ${godzina(w.start)}` }));
      const w = wierszeZOdczytu(o, uslugi, klientki, zajete, dzis);
      const znane = new Set(klientki.map((k) => normalizujTelefon(k.telefon)).filter(Boolean));
      setWiersze(w);
      setNoweKlientki(
        (o.klientki ?? [])
          .filter((k) => k.imie?.trim() && !(k.telefon && znane.has(normalizujTelefon(k.telefon))))
          .map((k) => ({ imie: k.imie.trim(), telefon: (k.telefon ?? "").trim(), wlaczona: true })),
      );
      setUwagi(o.uwagi ?? "");
      if (!w.length && !(o.klientki ?? []).length) {
        setEtap("zdjecia");
        return setBlad("Nie znalazłam wizyt na tych zdjęciach. Zrób zdjęcie z bliska, przy dobrym świetle, z całą stroną.");
      }
      setEtap("podglad");
    } catch (e) {
      setEtap("zdjecia");
      setBlad(e instanceof Error ? e.message : komunikat(e));
    }
  }

  const zmien = (klucz: string, z: Partial<WierszImportu>) => setWiersze((ws) => ws.map((w) => (w.klucz === klucz ? { ...w, ...z } : w)));

  async function zapisz() {
    setEtap("zapisuje");
    setBlad("");
    const bledy: string[] = [];
    let nWizyt = 0;
    let nKlientek = 0;
    // klientki: istniejące po numerze/imieniu, nowe – raz na osobę
    const mapa = new Map<string, string>();
    const kluczK = (imie: string, tel: string) => normalizujTelefon(tel) ?? imie.trim().toLowerCase();
    async function klientka(imie: string, telefon: string, id: string | null): Promise<string | null> {
      if (id) return id;
      const k = kluczK(imie, telefon);
      if (mapa.has(k)) return mapa.get(k)!;
      const { data, error } = await supabase.from("klientki").insert({ salon_id: salonId, imie, telefon }).select("id").single();
      if (error) {
        bledy.push(`${imie}: ${komunikat(error)}`);
        return null;
      }
      nKlientek++;
      mapa.set(k, data.id);
      return data.id;
    }
    for (const w of wiersze.filter((x) => x.wlaczony)) {
      const kid = await klientka(w.imie, w.telefon, w.klientka_id);
      if (!kid) continue;
      const start = wStrefie(w.data, w.godzina);
      const przeszla = w.data < dzis;
      const { error } = await supabase.from("wizyty").insert({
        salon_id: salonId,
        klientka_id: kid,
        usluga_id: w.usluga_id,
        usluga_nazwa: w.usluga_nazwa,
        start: start.toISOString(),
        koniec: new Date(+start + w.czas_min * 60_000).toISOString(),
        status: przeszla ? "zrealizowana" : "potwierdzona",
        kwota: przeszla ? w.cena : null,
        cena: w.cena,
        notatka: w.notatka,
        zrodlo: "panel",
      });
      if (error) bledy.push(`${krotkaData(w.data)} ${w.godzina} ${w.imie}: ${komunikat(error)}`);
      else nWizyt++;
    }
    for (const k of noweKlientki.filter((x) => x.wlaczona)) await klientka(k.imie, k.telefon, null);
    await Promise.all(["wizyty", "klientki", "powroty"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    setWynik({ wizyty: nWizyt, klientki: nKlientek, bledy });
    setEtap("gotowe");
  }

  const ileWizyt = wiersze.filter((w) => w.wlaczony).length;
  const ileKlientek = noweKlientki.filter((k) => k.wlaczona).length;

  return (
    <Modal
      tytul="Import ze zdjęcia"
      onClose={onClose}
      stopka={
        etap === "gotowe" ? (
          <button className="btn-glowny w-full" onClick={onClose}>
            Gotowe
          </button>
        ) : etap === "podglad" || etap === "zapisuje" ? (
          <button className="btn-glowny w-full" disabled={etap === "zapisuje" || (!ileWizyt && !ileKlientek)} onClick={zapisz}>
            {etap === "zapisuje" ? "Zapisuję…" : `Dodaj ${odmiana(ileWizyt, "wizytę", "wizyty", "wizyt")}${ileKlientek ? ` i ${odmiana(ileKlientek, "klientkę", "klientki", "klientek")}` : ""}`}
          </button>
        ) : (
          <button className="btn-glowny w-full" disabled={!zdjecia.length || etap === "czytam"} onClick={czytaj}>
            <Sparkles className="size-5" /> {etap === "czytam" ? "Czytam kalendarz… (ok. 20–40 s)" : "Odczytaj wizyty"}
          </button>
        )
      }
    >
      {(etap === "zdjecia" || etap === "czytam") && (
        <div className="space-y-4">
          <p className="text-[15px]">
            Zrób zdjęcie stron papierowego kalendarza albo screen z innej aplikacji (Booksy, Google Kalendarz, notatki). Bloomly odczyta godziny, imiona i usługi – zanim
            cokolwiek zapisze, sprawdzisz wszystko na liście.
          </p>
          <ul className="space-y-1 text-[14px] text-szary">
            <li>• cała strona w kadrze, dobre światło, bez cienia ręki</li>
            <li>• do {MAKS_ZDJEC} zdjęć naraz (np. tydzień po tygodniu)</li>
          </ul>
          <p className="text-[12px] text-szary">Zdjęcie odczytuje model AI Claude (Anthropic). Bloomly nie zapisuje zdjęcia – tylko wizyty, które zatwierdzisz.</p>
          <div className="grid grid-cols-3 gap-2">
            {zdjecia.map((z, i) => (
              <div key={z.url} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-piasek">
                <img src={z.url} alt={`Zdjęcie ${i + 1}`} className="size-full object-cover" />
                {etap !== "czytam" && (
                  <button
                    type="button"
                    aria-label="Usuń zdjęcie"
                    className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-atrament/80 text-krem"
                    onClick={() => setZdjecia((zs) => zs.filter((x) => x !== z))}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {zdjecia.length < MAKS_ZDJEC && etap !== "czytam" && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-linia text-[13px] font-semibold text-mokka"
              >
                {zdjecia.length ? <ImagePlus className="size-6" /> : <Camera className="size-6" />}
                {zdjecia.length ? "Dodaj" : "Zdjęcie"}
              </button>
            )}
          </div>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => dodajPliki(e.target.files)} />
          <Blad>{blad}</Blad>
        </div>
      )}

      {(etap === "podglad" || etap === "zapisuje") && (
        <div className="space-y-4">
          <p className="text-[14px] text-szary">
            Sprawdź i popraw. Odznaczone wiersze nie zostaną dodane. <span className="font-semibold text-bursztyn">Żółte</span> – trudne do odczytania pismo.
          </p>
          {uwagi && <p className="rounded-xl bg-piasek/60 px-3.5 py-2.5 text-[14px]">{uwagi}</p>}
          <ul className="space-y-2">
            {wiersze.map((w) => (
              <li key={w.klucz} className={`rounded-xl border p-3 ${w.wlaczony ? "border-linia bg-papier" : "border-transparent bg-piasek/40 opacity-70"} ${w.pewnosc === "niska" && w.wlaczony ? "ring-2 ring-bursztyn/60" : ""}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 size-5 shrink-0" checked={w.wlaczony} onChange={(e) => zmien(w.klucz, { wlaczony: e.target.checked })} aria-label={`Dodaj wizytę ${w.imie}`} />
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                    <input type="date" className="pole min-h-9 min-w-0 px-2 text-[14px]" value={w.data} onChange={(e) => zmien(w.klucz, { data: e.target.value })} aria-label="Dzień" />
                    <input type="time" step={900} className="pole min-h-9 min-w-0 px-2 text-[14px]" value={w.godzina} onChange={(e) => zmien(w.klucz, { godzina: e.target.value })} aria-label="Godzina" />
                    <input className="pole col-span-2 min-h-9 px-2 text-[14px]" value={w.imie} onChange={(e) => zmien(w.klucz, { imie: e.target.value, klientka_id: null })} aria-label="Klientka" />
                    <span className="col-span-2 -mt-0.5 text-[12px] text-szary">
                      {DNI_KROTKO[dzienTygodnia(w.data)]} {krotkaData(w.data)} ·{" "}
                      <span className={w.klientka_id ? "font-semibold text-ziel" : ""}>{w.klientka_id ? "klientka jest już w bazie" : "nowa klientka"}</span>
                    </span>
                    <select
                      className="pole col-span-2 min-h-9 px-2 text-[14px]"
                      value={w.usluga_id ?? ""}
                      aria-label="Usługa"
                      onChange={(e) => {
                        const u = uslugi.find((x) => x.id === e.target.value);
                        zmien(w.klucz, u ? { usluga_id: u.id, usluga_nazwa: u.nazwa, czas_min: u.czas_min, cena: Number(u.cena) } : { usluga_id: null });
                      }}
                    >
                      <option value="">{w.usluga_nazwa ? `${w.usluga_nazwa} (spoza cennika)` : "— usługa —"}</option>
                      {uslugi.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nazwa} · {u.czas_min} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {(w.duplikat || w.data < dzis || w.notatka) && (
                  <p className="mt-2 flex items-start gap-1.5 text-[12px] text-szary">
                    {(w.duplikat || w.data < dzis) && <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-bursztyn" />}
                    {[w.duplikat && "o tej godzinie masz już wizytę", w.data < dzis && "termin z przeszłości – doda się jako zrobiona", w.notatka].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {noweKlientki.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold">Klientki bez terminu</p>
              {noweKlientki.map((k, i) => (
                <label key={`${k.imie}-${i}`} className="flex items-center gap-3 text-[15px]">
                  <input type="checkbox" className="size-5" checked={k.wlaczona} onChange={(e) => setNoweKlientki((ks) => ks.map((x, j) => (j === i ? { ...x, wlaczona: e.target.checked } : x)))} />
                  {k.imie} <span className="text-szary">{k.telefon}</span>
                </label>
              ))}
            </div>
          )}
          <Blad>{blad}</Blad>
        </div>
      )}

      {etap === "gotowe" && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[17px] font-bold text-ziel">
            <Check className="size-6" /> Dodano {odmiana(wynik.wizyty, "wizytę", "wizyty", "wizyt")}{wynik.klientki ? ` i ${odmiana(wynik.klientki, "nową klientkę", "nowe klientki", "nowych klientek")}` : ""}.
          </p>
          {wynik.bledy.length > 0 && (
            <div className="rounded-xl bg-bursztyn-jasny p-3 text-[14px] text-bursztyn">
              <p className="font-bold">Nie dodałam:</p>
              <ul className="mt-1 list-disc pl-5">
                {wynik.bledy.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
