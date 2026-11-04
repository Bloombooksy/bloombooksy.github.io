import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useGodziny, usePrzerwy, useUslugi, useWizyty, useZespol, type WizytaZKlientka } from "../lib/dane";
import { WyborOsoby, useWybranaOsoba } from "../components/WyborOsoby";
import { DNI_KROTKO, dodajDni, dzienKey, dzienTygodnia, godzina, godzinaNaMinuty, krotkaData, minutyDnia, minutyNaGodzine, opisDnia, tydzien } from "../lib/czas";
import { PasekDnia } from "../components/PasekDnia";
import { WizytaForm } from "../components/WizytaForm";
import { Oczekujace } from "../components/Oczekujace";
import { podsumuj, zl } from "../lib/pieniadze";

const PX_NA_MIN = 1.1;
const KROK = 15;

/** Widok tygodnia: kolumny dni, wizyty jak w papierowym kalendarzu – stuknij puste pole, by dodać. */
export default function Kalendarz() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const dzis = dzienKey();
  const baza = params.get("d") ?? dzis;
  const dni = tydzien(baza);
  const od = dni[0]!;
  const doDnia = dni[6]!;
  const { data: wszystkieWizyty = [] } = useWizyty(od, doDnia);
  const [osoba, setOsoba] = useWybranaOsoba();
  const { aktywni, wiele } = useZespol();
  const wizyty = osoba ? wszystkieWizyty.filter((w) => w.pracownik_id === osoba) : wszystkieWizyty;
  // „Wszyscy” w zespole: każda osoba ma swój pasek w kolumnie dnia
  const pasy = !osoba && wiele ? aktywni : [];
  const kolorOsoby = new Map(aktywni.map((p) => [p.id, p.kolor]));
  const { data: godziny = [] } = useGodziny();
  const { data: przerwy = [] } = usePrzerwy(od, doDnia);
  const { data: uslugi = [] } = useUslugi();
  const [edycja, setEdycja] = useState<{ w?: WizytaZKlientka; dzien?: string; start?: string; pracownik?: string | undefined } | null>(null);

  const siatka = useRef<HTMLDivElement>(null);
  // na telefonie tydzień się przewija – zaczynamy od dzisiejszej kolumny
  useEffect(() => {
    const el = siatka.current?.querySelector<HTMLElement>("[data-dzis]");
    if (siatka.current && el) siatka.current.scrollLeft = el.offsetLeft - 48;
  }, [od]);

  const kolor = useMemo(() => new Map(uslugi.map((u) => [u.id, u.kolor])), [uslugi]);

  // zakres godzin: godziny pracy z zapasem + wszystko, co faktycznie jest w kalendarzu
  const [minStart, minKoniec] = useMemo(() => {
    let a = 9 * 60;
    let b = 17 * 60;
    for (const g of godziny) {
      a = Math.min(a, godzinaNaMinuty(g.od_godz));
      b = Math.max(b, godzinaNaMinuty(g.do_godz));
    }
    for (const w of wizyty) {
      a = Math.min(a, minutyDnia(w.start));
      b = Math.max(b, dzienKey(w.koniec) === dzienKey(w.start) ? minutyDnia(w.koniec) : 24 * 60);
    }
    return [Math.max(0, Math.floor(a / 60) * 60 - 60), Math.min(24 * 60, Math.ceil(b / 60) * 60 + 60)];
  }, [godziny, wizyty]);
  const wysokosc = (minKoniec - minStart) * PX_NA_MIN;
  const godzinyOsi = Array.from({ length: (minKoniec - minStart) / 60 }, (_, i) => minStart + i * 60);
  const tydzienSuma = podsumuj(wizyty);

  const ustaw = (k: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (k === dzis) n.delete("d");
        else n.set("d", k);
        return n;
      },
      { replace: true },
    );

  function klik(dzien: string, e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const m = Math.floor((minStart + y / PX_NA_MIN) / KROK) * KROK;
    // w widoku „Wszyscy” stuknięcie w pasek osoby dodaje wizytę tej osobie
    const pas = pasy.length ? pasy[Math.min(pasy.length - 1, Math.floor((e.nativeEvent.offsetX / e.currentTarget.clientWidth) * pasy.length))] : undefined;
    setEdycja({ dzien, start: minutyNaGodzine(Math.min(m, 23 * 60 + 45)), pracownik: osoba || pas?.id });
  }

  return (
    <div className="space-y-4">
      <PasekDnia
        tytul={`${krotkaData(od)} – ${krotkaData(doDnia)}`}
        podtytul={`${tydzienSuma.zrobione + tydzienSuma.zaplanowane} wizyt · ${zl(tydzienSuma.razem)} utargu`}
        czyDzis={dni.includes(dzis)}
        onPoprz={() => ustaw(dodajDni(baza, -7))}
        onNast={() => ustaw(dodajDni(baza, 7))}
        onDzis={() => ustaw(dzis)}
      />
      <WyborOsoby wartosc={osoba} onZmien={setOsoba} />
      <Oczekujace />

      <div ref={siatka} className="karta overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div className="sticky left-0 z-10 border-b border-linia bg-papier" />
          {dni.map((d) => {
            const zaDzien = wizyty.filter((w) => dzienKey(w.start) === d && w.status !== "odwolana").length;
            return (
              <button
                key={d}
                onClick={() => nav(`/?d=${d}`)}
                className={`border-b border-l border-linia px-2 py-2.5 text-left hover:bg-piasek/40 ${d === dzis ? "bg-piasek/60" : ""}`}
                title={`Otwórz ${opisDnia(d)}`}
                data-dzis={d === dzis ? "" : undefined}
              >
                <div className="text-[12px] font-bold tracking-wide text-szary uppercase">{DNI_KROTKO[dzienTygodnia(d)]}</div>
                <div className="flex items-baseline justify-between">
                  <span className={`font-serif text-xl font-semibold ${d === dzis ? "text-roz" : ""}`}>{krotkaData(d)}</span>
                  {zaDzien > 0 && <span className="text-[12px] font-bold text-szary">{zaDzien}</span>}
                </div>
              </button>
            );
          })}

          <div className="sticky left-0 z-10 bg-papier" style={{ height: wysokosc }}>
            {godzinyOsi.map((m) => (
              <div key={m} className="absolute right-1.5 -translate-y-1/2 text-[11px] font-semibold text-szary" style={{ top: (m - minStart) * PX_NA_MIN }}>
                {m > minStart && minutyNaGodzine(m)}
              </div>
            ))}
          </div>

          {dni.map((d) => {
            const g = godziny.find((x) => x.dzien === dzienTygodnia(d));
            const pracy = g ? [godzinaNaMinuty(g.od_godz), godzinaNaMinuty(g.do_godz)] : null;
            const tegoDnia = wizyty.filter((w) => dzienKey(w.start) === d);
            const przerwyDnia = przerwy.filter(
              (p) => dzienKey(p.start) <= d && dzienKey(p.koniec) >= d && (!osoba || !p.pracownik_id || p.pracownik_id === osoba),
            );
            return (
              <div
                key={d}
                onClick={(e) => klik(d, e)}
                className="relative cursor-cell border-l border-linia bg-[repeating-linear-gradient(-45deg,transparent_0_6px,rgba(118,103,93,0.06)_6px_7px)]"
                style={{ height: wysokosc }}
              >
                {pracy && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bg-papier"
                    style={{ top: (pracy[0]! - minStart) * PX_NA_MIN, height: (pracy[1]! - pracy[0]!) * PX_NA_MIN }}
                  />
                )}
                {godzinyOsi.map((m) => (
                  <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-linia/70" style={{ top: (m - minStart) * PX_NA_MIN }} />
                ))}
                {d === dzis && (
                  <div className="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-roz" style={{ top: (minutyDnia(new Date()) - minStart) * PX_NA_MIN }} />
                )}
                {przerwyDnia.map((p) => {
                  const a = dzienKey(p.start) < d ? 0 : minutyDnia(p.start);
                  const b = dzienKey(p.koniec) > d ? 24 * 60 : minutyDnia(p.koniec);
                  const top = Math.max(a, minStart);
                  return (
                    <div
                      key={p.id}
                      className="pointer-events-none absolute inset-x-1 overflow-hidden rounded-lg bg-linia/70 px-1.5 py-1 text-[11px] font-bold text-szary"
                      style={{ top: (top - minStart) * PX_NA_MIN, height: Math.max(0, Math.min(b, minKoniec) - top) * PX_NA_MIN }}
                    >
                      {p.opis || "Wolne"}
                    </div>
                  );
                })}
                {tegoDnia.map((w) => {
                  const a = minutyDnia(w.start);
                  const b = dzienKey(w.koniec) === d ? minutyDnia(w.koniec) : 24 * 60;
                  const c = (w.usluga_id && kolor.get(w.usluga_id)) || "#b98a4e";
                  const wyg = w.status === "odwolana" || w.status === "nieobecnosc";
                  const pas = pasy.length ? Math.max(0, pasy.findIndex((p) => p.id === w.pracownik_id)) : -1;
                  const poziomo =
                    pas >= 0
                      ? { left: `calc(${(pas / pasy.length) * 100}% + 2px)`, width: `calc(${100 / pasy.length}% - 4px)`, right: "auto" }
                      : {};
                  return (
                    <button
                      key={w.id}
                      onClick={() => setEdycja({ w })}
                      className={`absolute inset-x-1 z-[2] overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-[12px] leading-tight shadow-sm transition hover:z-[3] hover:shadow-md ${
                        wyg ? "opacity-45 line-through" : ""
                      } ${w.status === "oczekuje" ? "border-dashed bg-bursztyn-jasny" : ""}`}
                      style={{
                        top: (a - minStart) * PX_NA_MIN + 1,
                        height: Math.max(22, (b - a) * PX_NA_MIN - 2),
                        borderLeftColor: pas >= 0 ? (kolorOsoby.get(w.pracownik_id) ?? c) : c,
                        background: w.status === "oczekuje" ? undefined : `color-mix(in srgb, ${c} 16%, #fffdfa)`,
                        ...poziomo,
                      }}
                    >
                      <span className="font-bold">{godzina(w.start)}</span> {w.klientka?.imie}
                      <span className="block truncate text-szary">{w.status === "zrealizowana" ? `✓ ${zl(Number(w.kwota ?? w.cena) + Number(w.napiwek))}` : w.usluga_nazwa}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[13px] text-szary">Stuknij puste miejsce w kalendarzu, żeby dodać wizytę o tej godzinie. Kreskowane pola to czas poza godzinami pracy.</p>

      <button
        onClick={() => setEdycja({ dzien: dni.includes(dzis) ? dzis : od })}
        className="fixed right-5 bottom-24 z-10 grid size-14 place-items-center rounded-full bg-atrament text-krem shadow-xl hover:bg-mokka md:bottom-8"
        aria-label="Nowa wizyta"
      >
        <Plus className="size-7" />
      </button>
      {edycja && <WizytaForm wizyta={edycja.w} dzien={edycja.dzien} start={edycja.start} pracownik={edycja.pracownik} onClose={() => setEdycja(null)} />}
    </div>
  );
}
