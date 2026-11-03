import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Palmtree, Trash2 } from "lucide-react";
import { useGodziny, usePrzerwy, useSalonId, useZapis } from "../lib/dane";
import { DNI, dodajDni, dzienKey, opisDnia, wStrefie } from "../lib/czas";
import { komunikat, supabase } from "../lib/supabase";
import { Blad } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

type Dzien = { wl: boolean; od: string; do: string };

export default function Godziny() {
  const salonId = useSalonId();
  const qc = useQueryClient();
  const { data: godziny } = useGodziny();
  const [dni, setDni] = useState<Dzien[]>([]);
  const [stan, setStan] = useState<"" | "zapisuje" | "zapisano">("");
  const [blad, setBlad] = useState("");

  useEffect(() => {
    if (!godziny) return;
    setDni(
      [1, 2, 3, 4, 5, 6, 7].map((d) => {
        const g = godziny.find((x) => x.dzien === d);
        return g ? { wl: true, od: g.od_godz.slice(0, 5), do: g.do_godz.slice(0, 5) } : { wl: false, od: "09:00", do: "17:00" };
      }),
    );
  }, [godziny]);

  const zmien = (i: number, z: Partial<Dzien>) => {
    setStan("");
    setDni((d) => d.map((x, j) => (j === i ? { ...x, ...z } : x)));
  };

  async function zapisz() {
    setBlad("");
    if (dni.some((d) => d.wl && d.od >= d.do)) return setBlad("Godzina końca musi być po godzinie początku.");
    setStan("zapisuje");
    const wl = dni.flatMap((d, i) => (d.wl ? [{ salon_id: salonId, dzien: i + 1, od_godz: d.od, do_godz: d.do }] : []));
    const wyl = dni.flatMap((d, i) => (d.wl ? [] : [i + 1]));
    const r1 = wl.length ? await supabase.from("godziny_pracy").upsert(wl) : { error: null };
    const r2 = wyl.length ? await supabase.from("godziny_pracy").delete().eq("salon_id", salonId).in("dzien", wyl) : { error: null };
    if (r1.error || r2.error) {
      setStan("");
      return setBlad(komunikat(r1.error ?? r2.error));
    }
    await qc.invalidateQueries({ queryKey: ["godziny"] });
    setStan("zapisano");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Godziny pracy</h1>
      <p className="text-[14px] text-szary">Na tej podstawie znajome widzą wolne terminy w zapisach przez link. Ty możesz wpisać wizytę o każdej porze.</p>
      <div className="karta divide-y divide-linia">
        {dni.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex w-40 cursor-pointer items-center gap-3">
              <input type="checkbox" className="size-5 accent-[#2a211d]" checked={d.wl} onChange={(e) => zmien(i, { wl: e.target.checked })} />
              <span className={`font-bold ${d.wl ? "" : "text-szary"}`}>{DNI[i + 1]}</span>
            </label>
            {d.wl ? (
              <div className="flex items-center gap-2">
                <input type="time" step={900} aria-label={`${DNI[i + 1]} od`} className="pole w-28 py-2" value={d.od} onChange={(e) => zmien(i, { od: e.target.value })} />
                <span className="text-szary">–</span>
                <input type="time" step={900} aria-label={`${DNI[i + 1]} do`} className="pole w-28 py-2" value={d.do} onChange={(e) => zmien(i, { do: e.target.value })} />
              </div>
            ) : (
              <span className="text-[14px] text-szary">wolne</span>
            )}
          </div>
        ))}
      </div>
      <Blad>{blad}</Blad>
      <button className="btn-glowny w-full" disabled={stan === "zapisuje"} onClick={zapisz}>
        {stan === "zapisuje" ? "Zapisuję…" : stan === "zapisano" ? "Zapisano ✓" : "Zapisz godziny"}
      </button>

      <Urlopy />
    </div>
  );
}

/** Urlopy, szkolenia, wolne dni – blokują zapisy przez link i widać je w kalendarzu. */
function Urlopy() {
  const salonId = useSalonId();
  const dzis = dzienKey();
  const { data: przerwy = [] } = usePrzerwy(dzis, dodajDni(dzis, 365));
  const api = useZapis("przerwy", ["przerwy"]);
  const [od, setOd] = useState(dzis);
  const [doD, setDoD] = useState(dzis);
  const [opis, setOpis] = useState("");
  const [blad, setBlad] = useState("");

  async function dodaj(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (doD < od) return setBlad("Koniec przed początkiem.");
    try {
      await api.dodaj.mutateAsync({
        salon_id: salonId,
        start: wStrefie(od).toISOString(),
        koniec: wStrefie(dodajDni(doD, 1)).toISOString(),
        opis: opis.trim() || "Wolne",
      });
      setOpis("");
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  return (
    <section className="space-y-3 pt-4">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
        <Palmtree className="size-5 text-ziel" /> Urlopy i wolne dni
      </h2>
      <form onSubmit={dodaj} className="karta grid grid-cols-2 gap-3 p-4">
        <div>
          <label className="etykieta" htmlFor="u-od">
            Od
          </label>
          <input id="u-od" type="date" className="pole" value={od} onChange={(e) => {
            setOd(e.target.value);
            if (doD < e.target.value) setDoD(e.target.value);
          }} />
        </div>
        <div>
          <label className="etykieta" htmlFor="u-do">
            Do (włącznie)
          </label>
          <input id="u-do" type="date" className="pole" value={doD} onChange={(e) => setDoD(e.target.value)} />
        </div>
        <input aria-label="Opis" className="pole col-span-2" placeholder="np. Urlop, Szkolenie w Krakowie" value={opis} onChange={(e) => setOpis(e.target.value)} />
        <div className="col-span-2">
          <Blad>{blad}</Blad>
        </div>
        <button className="btn-jasny col-span-2" disabled={api.dodaj.isPending}>
          Dodaj wolne
        </button>
      </form>
      {przerwy.length > 0 && (
        <ul className="karta divide-y divide-linia">
          {przerwy.map((p) => {
            const a = dzienKey(p.start);
            const b = dzienKey(new Date(+new Date(p.koniec) - 1));
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1">
                  <span className="block font-bold">{p.opis}</span>
                  <span className="text-[13px] text-szary">{a === b ? opisDnia(a) : `${opisDnia(a, false)} – ${opisDnia(b, false)}`}</span>
                </span>
                <button className="btn-cichy size-10 min-h-10 px-0" aria-label="Usuń" onClick={() => api.usun.mutate(p.id)}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
