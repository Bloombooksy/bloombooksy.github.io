import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useSalonId, useUslugi, useZapis } from "../lib/dane";
import type { UslugaRow } from "../lib/database.types";
import { opisCzasu } from "../lib/czas";
import { parsujKwote, zl } from "../lib/pieniadze";
import { komunikat } from "../lib/supabase";
import { Blad, Ladowanie, Modal, Przelacznik, Pusto } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

const KOLORY = ["#c9707a", "#b98a4e", "#7a5a47", "#4f7a5b", "#6b7fa8", "#9b6fa6", "#d29a6a", "#5e8c8c"];
const PRZYKLADY = [
  { nazwa: "Manicure hybrydowy", czas_min: 90, cena: 120 },
  { nazwa: "Przedłużanie żelem", czas_min: 150, cena: 180 },
  { nazwa: "Uzupełnienie żelu", czas_min: 120, cena: 150 },
  { nazwa: "Pedicure hybrydowy", czas_min: 90, cena: 130 },
  { nazwa: "Zdjęcie hybrydy", czas_min: 30, cena: 40 },
];

export default function Uslugi() {
  const salonId = useSalonId();
  const { data = [], isLoading } = useUslugi();
  const api = useZapis("uslugi", ["uslugi"]);
  const [edycja, setEdycja] = useState<UslugaRow | "nowa" | null>(null);

  async function dodajPrzyklady() {
    for (const [i, p] of PRZYKLADY.entries()) await api.dodaj.mutateAsync({ ...p, salon_id: salonId, kolor: KOLORY[i]!, kolejnosc: i });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <div className="flex items-center justify-between">
        <h1 className="naglowek">Usługi i cennik</h1>
        <button className="btn-glowny" onClick={() => setEdycja("nowa")}>
          <Plus className="size-5" /> Dodaj
        </button>
      </div>
      {isLoading ? (
        <Ladowanie />
      ) : data.length === 0 ? (
        <Pusto ikona={<Sparkles className="size-8 text-linia" />}>
          Dodaj usługi, żeby wizyty same ustawiały czas i cenę.
          <button className="btn-jasny mt-2" disabled={api.dodaj.isPending} onClick={dodajPrzyklady}>
            Wstaw przykładowy cennik (zmienisz go potem)
          </button>
        </Pusto>
      ) : (
        <ul className="karta divide-y divide-linia">
          {data.map((u) => (
            <li key={u.id}>
              <button onClick={() => setEdycja(u)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-piasek/30 ${u.aktywna ? "" : "opacity-50"}`}>
                <span className="size-3.5 shrink-0 rounded-full" style={{ background: u.kolor }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{u.nazwa}</span>
                  <span className="block text-[13px] text-szary">
                    {opisCzasu(u.czas_min)}
                    {!u.aktywna ? " · ukryta" : !u.w_zapisach ? " · tylko w panelu" : ""}
                  </span>
                </span>
                <span className="font-serif text-lg font-semibold">{zl(Number(u.cena))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edycja && <UslugaModal u={edycja === "nowa" ? null : edycja} kolejnosc={data.length} onClose={() => setEdycja(null)} />}
    </div>
  );
}

function UslugaModal({ u, kolejnosc, onClose }: { u: UslugaRow | null; kolejnosc: number; onClose: () => void }) {
  const salonId = useSalonId();
  const api = useZapis("uslugi", ["uslugi"]);
  const [f, setF] = useState({
    nazwa: u?.nazwa ?? "",
    czas_min: u?.czas_min ?? 60,
    cena: u ? String(u.cena) : "",
    kolor: u?.kolor ?? KOLORY[kolejnosc % KOLORY.length]!,
    aktywna: u?.aktywna ?? true,
    w_zapisach: u?.w_zapisach ?? true,
    powrot_dni: u ? u.powrot_dni : null,
  });
  const [blad, setBlad] = useState("");

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    const row = { ...f, nazwa: f.nazwa.trim(), cena: parsujKwote(f.cena) ?? 0 };
    try {
      if (u) await api.zmien.mutateAsync({ id: u.id, ...row });
      else await api.dodaj.mutateAsync({ ...row, salon_id: salonId, kolejnosc });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  return (
    <Modal
      tytul={u ? "Usługa" : "Nowa usługa"}
      onClose={onClose}
      stopka={
        <button form="us-form" className="btn-glowny w-full">
          Zapisz
        </button>
      }
    >
      <form id="us-form" onSubmit={zapisz} className="space-y-4">
        <div>
          <label className="etykieta" htmlFor="u-n">
            Nazwa
          </label>
          <input id="u-n" required className="pole" value={f.nazwa} onChange={(e) => setF({ ...f, nazwa: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etykieta" htmlFor="u-c">
              Czas (minuty)
            </label>
            <input id="u-c" type="number" min={5} max={720} step={5} required className="pole" value={f.czas_min} onChange={(e) => setF({ ...f, czas_min: +e.target.value })} />
          </div>
          <div>
            <label className="etykieta" htmlFor="u-p">
              Cena (zł)
            </label>
            <input id="u-p" inputMode="decimal" className="pole" value={f.cena} onChange={(e) => setF({ ...f, cena: e.target.value })} />
          </div>
        </div>
        <div>
          <span className="etykieta">Kolor w kalendarzu</span>
          <div className="flex flex-wrap gap-2">
            {KOLORY.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`Kolor ${k}`}
                aria-pressed={f.kolor === k}
                onClick={() => setF({ ...f, kolor: k })}
                className={`size-9 rounded-full ring-offset-2 ring-offset-papier ${f.kolor === k ? "ring-2 ring-atrament" : ""}`}
                style={{ background: k }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="etykieta" htmlFor="u-pw">
            Kolejna wizyta zwykle po
          </label>
          <select id="u-pw" className="pole" value={f.powrot_dni ?? ""} onChange={(e) => setF({ ...f, powrot_dni: e.target.value ? +e.target.value : null })}>
            <option value="">nie przypominaj</option>
            {[14, 21, 28, 35, 42, 56, 84].map((d) => (
              <option key={d} value={d}>
                {d / 7} tygodniach
              </option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-szary">Po tym czasie klientka trafi na listę „Czas na kolejną wizytę”, a jeśli się zgodziła – dostanie mail z linkiem do zapisów.</p>
        </div>
        <Przelacznik wl={f.w_zapisach} onZmien={(v) => setF({ ...f, w_zapisach: v })} etykieta="Widoczna w zapisach przez link" opis="Znajome mogą ją wybrać same" />
        <Przelacznik wl={f.aktywna} onZmien={(v) => setF({ ...f, aktywna: v })} etykieta="Aktywna" opis="Wyłącz, jeśli już jej nie robisz – historia zostaje" />
        <Blad>{blad}</Blad>
      </form>
    </Modal>
  );
}
