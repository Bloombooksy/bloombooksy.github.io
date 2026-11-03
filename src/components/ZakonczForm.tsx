import { useState } from "react";
import { Blad, Modal } from "./ui";
import { useZapis, type WizytaZKlientka } from "../lib/dane";
import { godzina } from "../lib/czas";
import { komunikat } from "../lib/supabase";
import { parsujKwote, PLATNOSCI, zl } from "../lib/pieniadze";
import type { Platnosc } from "../lib/database.types";

const SZYBKIE_NAPIWKI = [0, 10, 20, 30];

/** Po klientce: ile zapłaciła, napiwek, jak – jedno okienko, dwa tapnięcia. */
export function ZakonczForm({ wizyta, onClose }: { wizyta: WizytaZKlientka; onClose: () => void }) {
  const api = useZapis("wizyty", ["wizyty"]);
  const [kwota, setKwota] = useState(String(wizyta.kwota ?? wizyta.cena));
  const [napiwek, setNapiwek] = useState(wizyta.napiwek ? String(wizyta.napiwek) : "");
  const [platnosc, setPlatnosc] = useState<Platnosc>(wizyta.platnosc ?? "gotowka");
  const [blad, setBlad] = useState("");

  const k = parsujKwote(kwota);
  const n = parsujKwote(napiwek) ?? 0;

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (k === null) return setBlad("Wpisz kwotę.");
    try {
      await api.zmien.mutateAsync({ id: wizyta.id, status: "zrealizowana", kwota: k, napiwek: n, platnosc });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  async function nieprzyszla() {
    try {
      await api.zmien.mutateAsync({ id: wizyta.id, status: "nieobecnosc", kwota: null, napiwek: 0, platnosc: null });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  return (
    <Modal
      tytul={wizyta.klientka?.imie ?? "Klientka"}
      onClose={onClose}
      stopka={
        <button form="zakoncz" disabled={api.zmien.isPending} className="btn-zielony w-full">
          Zapisz · {zl((k ?? 0) + n)}
        </button>
      }
    >
      <form id="zakoncz" onSubmit={zapisz} className="space-y-5">
        <p className="text-[14px] text-szary">
          {godzina(wizyta.start)} · {wizyta.usluga_nazwa || "wizyta"} · w cenniku {zl(Number(wizyta.cena))}
        </p>
        <div>
          <label className="etykieta" htmlFor="kw">
            Zapłaciła (zł)
          </label>
          <input
            id="kw"
            autoFocus
            inputMode="decimal"
            className="pole text-center font-serif text-3xl font-semibold"
            value={kwota}
            onChange={(e) => setKwota(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div>
          <span className="etykieta">Napiwek</span>
          <div className="grid grid-cols-5 gap-2">
            {SZYBKIE_NAPIWKI.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setNapiwek(x ? String(x) : "")}
                className={`btn px-0 ${n === x ? "bg-atrament text-krem" : "border border-linia bg-papier"}`}
              >
                {x ? `+${x}` : "brak"}
              </button>
            ))}
            <input
              aria-label="Inny napiwek"
              inputMode="decimal"
              placeholder="inny"
              className="pole px-2 text-center"
              value={SZYBKIE_NAPIWKI.includes(n) ? "" : napiwek}
              onChange={(e) => setNapiwek(e.target.value)}
            />
          </div>
        </div>
        <div>
          <span className="etykieta">Płatność</span>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(PLATNOSCI) as Platnosc[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatnosc(p)}
                aria-pressed={platnosc === p}
                className={`btn px-0 text-[14px] ${platnosc === p ? "bg-atrament text-krem" : "border border-linia bg-papier"}`}
              >
                {PLATNOSCI[p]}
              </button>
            ))}
          </div>
        </div>
        <Blad>{blad}</Blad>
        {wizyta.status !== "nieobecnosc" && (
          <button type="button" onClick={nieprzyszla} className="btn-cichy w-full text-[#8a2f3a]">
            Klientka nie przyszła
          </button>
        )}
      </form>
    </Modal>
  );
}
