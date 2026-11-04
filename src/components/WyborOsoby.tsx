import { useSearchParams } from "react-router-dom";
import { useCzyWlascicielka, useJa, useZespol } from "../lib/dane";

/** Filtr osoby w zespole (zapamiętany w adresie ?o=). "" = wszyscy. Pracownik domyślnie widzi siebie. */
export function useWybranaOsoba(): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams();
  const ja = useJa();
  const wlascicielka = useCzyWlascicielka();
  const { wiele } = useZespol();
  const domyslna = wlascicielka ? "" : ja;
  const o = params.get("o");
  const wybrana = !wiele ? "" : o === null ? domyslna : o === "all" ? "" : o;
  const ustaw = (id: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        const wartosc = id === "" ? "all" : id;
        if ((domyslna === "" && wartosc === "all") || wartosc === domyslna) n.delete("o");
        else n.set("o", wartosc);
        return n;
      },
      { replace: true },
    );
  return [wybrana, ustaw];
}

export function WyborOsoby({ wartosc, onZmien }: { wartosc: string; onZmien: (id: string) => void }) {
  const { aktywni, wiele } = useZespol();
  if (!wiele) return null;
  const chip = (aktywny: boolean) =>
    `inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-semibold transition ${
      aktywny ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier text-szary hover:text-atrament"
    }`;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Osoba">
      <button className={chip(wartosc === "")} aria-pressed={wartosc === ""} onClick={() => onZmien("")}>
        Wszyscy
      </button>
      {aktywni.map((p) => (
        <button key={p.id} className={chip(wartosc === p.id)} aria-pressed={wartosc === p.id} onClick={() => onZmien(p.id)}>
          <span className="size-2.5 rounded-full" style={{ background: p.kolor }} />
          {p.imie}
        </button>
      ))}
    </div>
  );
}
