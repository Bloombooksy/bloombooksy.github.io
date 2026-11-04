import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useKlientki, useSalonId } from "../lib/dane";
import { klientkiZCsv, parsujCsv, type NowaKlientka } from "../lib/importCsv";
import { komunikat, supabase } from "../lib/supabase";
import { Blad, Modal } from "./ui";

/** Przenosiny z Booksy / telefonu / Excela: wybierz plik CSV, sprawdź podgląd, zaimportuj. */
export function ImportKlientek({ onClose }: { onClose: () => void }) {
  const salonId = useSalonId();
  const qc = useQueryClient();
  const { data: istniejace = [] } = useKlientki();
  const [wynik, setWynik] = useState<{ nowe: NowaKlientka[]; pominiete: number; plik: string } | null>(null);
  const [blad, setBlad] = useState("");
  const [zapisuje, setZapisuje] = useState(false);
  const [gotowe, setGotowe] = useState(0);

  async function wczytaj(f: File | undefined) {
    setBlad("");
    if (!f) return;
    if (f.size > 5_000_000) return setBlad("Plik jest za duży (max 5 MB).");
    const tekst = await f.text();
    const r = klientkiZCsv(parsujCsv(tekst), istniejace);
    if (!r.nowe.length && !r.pominiete) return setBlad("Nie znalazłam klientek w tym pliku. Zapisz go jako CSV (np. w Excelu: Plik → Zapisz jako → CSV).");
    setWynik({ ...r, plik: f.name });
  }

  async function importuj() {
    if (!wynik) return;
    setZapisuje(true);
    try {
      for (let i = 0; i < wynik.nowe.length; i += 500) {
        const paczka = wynik.nowe.slice(i, i + 500).map((k) => ({ ...k, salon_id: salonId }));
        const { error } = await supabase.from("klientki").insert(paczka);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["klientki"] });
      setGotowe(wynik.nowe.length);
    } catch (e) {
      setBlad(komunikat(e));
    } finally {
      setZapisuje(false);
    }
  }

  return (
    <Modal
      tytul="Import klientek"
      onClose={onClose}
      stopka={
        gotowe ? (
          <button className="btn-glowny w-full" onClick={onClose}>
            Gotowe
          </button>
        ) : (
          wynik && (
            <button className="btn-glowny w-full" disabled={zapisuje || !wynik.nowe.length} onClick={importuj}>
              {zapisuje ? "Importuję…" : `Dodaj ${wynik.nowe.length} klientek`}
            </button>
          )
        )
      }
    >
      {gotowe ? (
        <p className="rounded-2xl bg-ziel-jasny p-4 text-[15px] font-semibold text-ziel">Dodano {gotowe} klientek ✓</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[15px] text-szary">
            Plik CSV z kolumnami takimi jak <b>Imię</b>, <b>Nazwisko</b>, <b>Telefon</b> (kolejność dowolna). Pasuje eksport klientów z Booksy, kontakty z Google
            albo tabela z Excela zapisana jako CSV. Osoby, które już masz, pominę.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-linia px-4 py-8 text-center hover:border-mokka">
            <FileUp className="size-8 text-mokka" />
            <span className="font-semibold">{wynik ? wynik.plik : "Wybierz plik CSV"}</span>
            <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => wczytaj(e.target.files?.[0])} />
          </label>
          {wynik && (
            <div>
              <p className="text-[15px]">
                Nowe: <b>{wynik.nowe.length}</b>
                {wynik.pominiete > 0 && <span className="text-szary"> · pominięte (już są albo bez imienia): {wynik.pominiete}</span>}
              </p>
              <ul className="mt-2 max-h-52 divide-y divide-linia overflow-y-auto rounded-xl border border-linia text-[14px]">
                {wynik.nowe.slice(0, 50).map((k, i) => (
                  <li key={i} className="flex justify-between gap-3 px-3 py-2">
                    <span className="truncate font-semibold">{k.imie}</span>
                    <span className="shrink-0 text-szary">{k.telefon}</span>
                  </li>
                ))}
                {wynik.nowe.length > 50 && <li className="px-3 py-2 text-szary">…i {wynik.nowe.length - 50} więcej</li>}
              </ul>
            </div>
          )}
          <Blad>{blad}</Blad>
        </div>
      )}
    </Modal>
  );
}
