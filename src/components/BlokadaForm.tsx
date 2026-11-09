import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Blad, Modal } from "./ui";
import { useSalonId, useZapis, useZespol } from "../lib/dane";
import { dzienKey, godzina, wStrefie } from "../lib/czas";
import { komunikat } from "../lib/supabase";
import type { PrzerwaRow } from "../lib/database.types";

/** Blokada czasu w kalendarzu: przerwa, zakupy, szkolenie – nikt się wtedy nie zapisze przez link. */
export function BlokadaForm({
  przerwa,
  dzien,
  start,
  pracownik,
  onClose,
}: {
  przerwa?: PrzerwaRow;
  dzien?: string;
  start?: string;
  pracownik?: string;
  onClose: () => void;
}) {
  const salonId = useSalonId();
  const { aktywni, wiele } = useZespol();
  const api = useZapis("przerwy", ["przerwy"]);
  const [d, setD] = useState(przerwa ? dzienKey(przerwa.start) : (dzien ?? dzienKey()));
  const [od, setOd] = useState(przerwa ? godzina(przerwa.start) : (start ?? "12:00"));
  const [doG, setDoG] = useState(przerwa ? godzina(przerwa.koniec) : dodajGodzine(start ?? "12:00"));
  const [opis, setOpis] = useState(przerwa?.opis ?? "Przerwa");
  const [osoba, setOsoba] = useState<string>(przerwa?.pracownik_id ?? pracownik ?? "");
  const [blad, setBlad] = useState("");

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (doG <= od) return setBlad("Koniec musi być po początku.");
    const row = {
      start: wStrefie(d, od).toISOString(),
      koniec: wStrefie(d, doG).toISOString(),
      opis: opis.trim() || "Przerwa",
      pracownik_id: osoba || null,
    };
    try {
      if (przerwa) await api.zmien.mutateAsync({ id: przerwa.id, ...row });
      else await api.dodaj.mutateAsync({ salon_id: salonId, ...row });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  async function usun() {
    if (!przerwa) return;
    try {
      await api.usun.mutateAsync(przerwa.id);
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  return (
    <Modal
      tytul={przerwa ? "Blokada czasu" : "Zablokuj czas"}
      onClose={onClose}
      stopka={
        <button form="blokada" className="btn-glowny w-full" disabled={api.dodaj.isPending || api.zmien.isPending}>
          {przerwa ? "Zapisz" : "Zablokuj"}
        </button>
      }
    >
      <form id="blokada" onSubmit={zapisz} className="space-y-4">
        <p className="text-[14px] text-szary">W tym czasie nikt nie zapisze się przez link. Na urlop kilku dni użyj Więcej → Godziny pracy.</p>
        <div className="flex flex-wrap gap-2">
          {["Przerwa", "Obiad", "Szkolenie", "Sprawy prywatne"].map((o) => (
            <button key={o} type="button" onClick={() => setOpis(o)} className={`btn min-h-9 px-3 text-[14px] ${opis === o ? "bg-atrament text-krem" : "border border-linia bg-papier"}`}>
              {o}
            </button>
          ))}
        </div>
        <input aria-label="Opis" className="pole" maxLength={60} value={opis} onChange={(e) => setOpis(e.target.value)} />
        <label className="block">
          <span className="etykieta">Dzień</span>
          <input type="date" className="pole" value={d} onChange={(e) => setD(e.target.value)} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="etykieta">Od</span>
            <input type="time" step={900} className="pole" value={od} onChange={(e) => setOd(e.target.value)} required />
          </label>
          <label className="block">
            <span className="etykieta">Do</span>
            <input type="time" step={900} className="pole" value={doG} onChange={(e) => setDoG(e.target.value)} required />
          </label>
        </div>
        {wiele && (
          <label className="block">
            <span className="etykieta">Kogo dotyczy</span>
            <select className="pole" value={osoba} onChange={(e) => setOsoba(e.target.value)}>
              <option value="">Cały salon</option>
              {aktywni.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.imie}
                </option>
              ))}
            </select>
          </label>
        )}
        <Blad>{blad}</Blad>
        {przerwa && (
          <button type="button" onClick={usun} className="btn-cichy w-full text-[#8a2f3a]">
            <Trash2 className="size-4" /> Usuń blokadę
          </button>
        )}
      </form>
    </Modal>
  );
}

function dodajGodzine(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
