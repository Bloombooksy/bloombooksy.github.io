import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, CalendarPlus, Plus, X } from "lucide-react";
import { useGodziny, usePrzerwy, useUslugi, useWizyty, useZapis, useZespol, type WizytaZKlientka } from "../lib/dane";
import { WyborOsoby, useWybranaOsoba } from "../components/WyborOsoby";
import {
  DNI_KROTKO,
  dniMiesiaca,
  dodajDni,
  dzienKey,
  dzienTygodnia,
  godzina,
  godzinaNaMinuty,
  krotkaData,
  minutyDnia,
  minutyNaGodzine,
  nazwaMiesiaca,
  opisDnia,
  poczatekMiesiaca,
  poczatekTygodnia,
  tydzien,
  wStrefie,
  wzglednie,
} from "../lib/czas";
import { PasekDnia } from "../components/PasekDnia";
import { WizytaForm } from "../components/WizytaForm";
import { BlokadaForm } from "../components/BlokadaForm";
import { Oczekujace } from "../components/Oczekujace";
import { podsumuj, zl } from "../lib/pieniadze";
import { komunikat } from "../lib/supabase";
import type { PrzerwaRow } from "../lib/database.types";

const PX_NA_MIN = 1.1;
const KROK = 15;

type Widok = "dzien" | "3dni" | "tydzien" | "miesiac";
const WIDOKI: { id: Widok; txt: string }[] = [
  { id: "dzien", txt: "Dzień" },
  { id: "3dni", txt: "3 dni" },
  { id: "tydzien", txt: "Tydzień" },
  { id: "miesiac", txt: "Miesiąc" },
];

function zapamietanyWidok(): Widok {
  try {
    const v = localStorage.getItem("bloomly-widok") as Widok | null;
    if (v && WIDOKI.some((w) => w.id === v)) return v;
  } catch {
    /* tryb prywatny */
  }
  return window.matchMedia?.("(max-width: 640px)").matches ? "3dni" : "tydzien";
}

/** Kalendarz: dzień, 3 dni, tydzień albo miesiąc. Stuknij puste pole, by dodać; przytrzymaj wizytę, by ją przesunąć. */
export default function Kalendarz() {
  const [params, setParams] = useSearchParams();
  const dzis = dzienKey();
  const baza = params.get("d") ?? dzis;
  const [widok, setWidokStan] = useState<Widok>(zapamietanyWidok);
  const setWidok = (w: Widok) => {
    setWidokStan(w);
    try {
      localStorage.setItem("bloomly-widok", w);
    } catch {
      /* tryb prywatny */
    }
  };

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-piasek/60 p-1" role="tablist" aria-label="Widok kalendarza">
        {WIDOKI.map((w) => (
          <button
            key={w.id}
            role="tab"
            aria-selected={widok === w.id}
            onClick={() => setWidok(w.id)}
            className={`rounded-xl py-2 text-[14px] font-bold transition ${widok === w.id ? "bg-papier shadow-sm" : "text-szary"}`}
          >
            {w.txt}
          </button>
        ))}
      </div>
      {widok === "miesiac" ? (
        <Miesiac baza={baza} ustaw={ustaw} onDzien={(d) => (ustaw(d), setWidok("dzien"))} />
      ) : (
        <Siatka widok={widok} baza={baza} ustaw={ustaw} />
      )}
    </div>
  );
}

type Edycja = { w?: WizytaZKlientka; dzien?: string; start?: string; pracownik?: string | undefined };
type Przeciaganie = { w: WizytaZKlientka; dx: number; dy: number; dzien: string; minuty: number; pracownik: string };

function Siatka({ widok, baza, ustaw }: { widok: Exclude<Widok, "miesiac">; baza: string; ustaw: (k: string) => void }) {
  const nav = useNavigate();
  const dzis = dzienKey();
  const dni = widok === "tydzien" ? tydzien(baza) : Array.from({ length: widok === "3dni" ? 3 : 1 }, (_, i) => dodajDni(baza, i));
  const krok = widok === "tydzien" ? 7 : widok === "3dni" ? 3 : 1;
  const od = dni[0]!;
  const doDnia = dni[dni.length - 1]!;
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
  const api = useZapis("wizyty", ["wizyty"]);
  const [edycja, setEdycja] = useState<Edycja | null>(null);
  const [blokada, setBlokada] = useState<{ p?: PrzerwaRow; dzien?: string; start?: string; pracownik?: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const [przesun, setPrzesun] = useState<Przeciaganie | null>(null);
  const [cofnij, setCofnij] = useState<{ txt: string; w: WizytaZKlientka } | null>(null);
  const [blad, setBlad] = useState("");

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
  const suma = podsumuj(wizyty);

  function miejsce(dzien: string, e: { offsetX: number; offsetY: number }, szer: number) {
    const m = Math.floor((minStart + e.offsetY / PX_NA_MIN) / KROK) * KROK;
    const pas = pasy.length ? pasy[Math.min(pasy.length - 1, Math.floor((e.offsetX / szer) * pasy.length))] : undefined;
    return { dzien, start: minutyNaGodzine(Math.max(0, Math.min(m, 23 * 60 + 45))), pracownik: osoba || pas?.id };
  }

  function klik(dzien: string, e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    setEdycja(miejsce(dzien, e.nativeEvent, e.currentTarget.clientWidth));
  }

  // ——— przesuwanie wizyty: przytrzymaj (telefon) albo przeciągnij (myszką) ———
  const gest = useRef<{ id: number; x: number; y: number; w: WizytaZKlientka; aktywny: boolean; timer?: number; ruszyl: boolean } | null>(null);

  // po przytrzymaniu palcem strona nie może się przewijać, dopóki przesuwamy wizytę
  useEffect(() => {
    const stop = (e: TouchEvent) => {
      if (gest.current?.aktywny) e.preventDefault();
    };
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, []);

  function celPod(x: number, y: number, w: WizytaZKlientka, dy: number): Przeciaganie | null {
    const el = document.elementsFromPoint(x, y).find((n) => (n as HTMLElement).dataset?.kolumna) as HTMLElement | undefined;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const minuty = Math.round((minutyDnia(w.start) + dy / PX_NA_MIN) / KROK) * KROK;
    const pas = pasy.length ? pasy[Math.min(pasy.length - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * pasy.length)))] : undefined;
    return { w, dx: 0, dy, dzien: el.dataset.kolumna!, minuty: Math.max(0, Math.min(minuty, 24 * 60 - KROK)), pracownik: pas?.id ?? w.pracownik_id };
  }

  function wizytaDown(w: WizytaZKlientka, e: React.PointerEvent<HTMLButtonElement>) {
    if (w.status === "zrealizowana" || w.status === "odwolana" || w.status === "nieobecnosc") return;
    const g = { id: e.pointerId, x: e.clientX, y: e.clientY, w, aktywny: false, ruszyl: false } as NonNullable<typeof gest.current>;
    if (e.pointerType !== "mouse")
      g.timer = window.setTimeout(() => {
        g.aktywny = true;
        navigator.vibrate?.(15);
        setPrzesun({ w, dx: 0, dy: 0, dzien: dzienKey(w.start), minuty: minutyDnia(w.start), pracownik: w.pracownik_id });
      }, 350);
    gest.current = g;
  }

  function wizytaMove(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gest.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.aktywny) {
      if (Math.hypot(dx, dy) > 6) {
        if (e.pointerType === "mouse") {
          g.aktywny = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        } else {
          window.clearTimeout(g.timer); // przewijanie, nie przesuwanie
          gest.current = null;
          return;
        }
      } else return;
    }
    g.ruszyl = true;
    const cel = celPod(e.clientX, e.clientY, g.w, dy);
    if (cel) setPrzesun({ ...cel, dx, dy });
  }

  async function wizytaUp(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gest.current;
    gest.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    const p = przesun;
    setPrzesun(null);
    if (!g.aktywny || !g.ruszyl || !p) {
      if (!g.aktywny) setEdycja({ w: g.w });
      return;
    }
    e.preventDefault();
    const dlug = +new Date(g.w.koniec) - +new Date(g.w.start);
    const start = wStrefie(p.dzien, minutyNaGodzine(p.minuty));
    if (+start === +new Date(g.w.start) && p.pracownik === g.w.pracownik_id) return;
    setBlad("");
    try {
      await api.zmien.mutateAsync({ id: g.w.id, start: start.toISOString(), koniec: new Date(+start + dlug).toISOString(), pracownik_id: p.pracownik });
      const kto = aktywni.find((o) => o.id === p.pracownik);
      setCofnij({ txt: `${g.w.klientka?.imie ?? "Wizyta"} → ${opisDnia(p.dzien)}, ${minutyNaGodzine(p.minuty)}${wiele && kto ? ` (${kto.imie})` : ""}`, w: g.w });
      window.setTimeout(() => setCofnij((c) => (c?.w.id === g.w.id ? null : c)), 8000);
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  async function cofnijPrzesuniecie() {
    if (!cofnij) return;
    const { w } = cofnij;
    setCofnij(null);
    try {
      await api.zmien.mutateAsync({ id: w.id, start: w.start, koniec: w.koniec, pracownik_id: w.pracownik_id });
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  const tytul = dni.length === 1 ? `${wzglednie(od) ?? DNI_KROTKO[dzienTygodnia(od)]}, ${krotkaData(od)}` : `${krotkaData(od)} – ${krotkaData(doDnia)}`;

  return (
    <>
      <PasekDnia
        tytul={tytul}
        podtytul={`${suma.zrobione + suma.zaplanowane} wizyt · ${zl(suma.razem)} utargu`}
        czyDzis={dni.includes(dzis)}
        onPoprz={() => ustaw(dodajDni(widok === "tydzien" ? poczatekTygodnia(baza) : baza, -krok))}
        onNast={() => ustaw(dodajDni(widok === "tydzien" ? poczatekTygodnia(baza) : baza, krok))}
        onDzis={() => ustaw(dzis)}
      />
      <WyborOsoby wartosc={osoba} onZmien={setOsoba} />
      <Oczekujace />

      <div ref={siatka} className="karta overflow-x-auto select-none">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `3rem repeat(${dni.length}, minmax(0, 1fr))`,
            minWidth: widok === "tydzien" ? 760 : undefined,
          }}
        >
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
                {pasy.length > 0 && dni.length < 7 && (
                  <div className="mt-1 grid gap-0.5 text-[11px] font-bold" style={{ gridTemplateColumns: `repeat(${pasy.length}, minmax(0,1fr))` }}>
                    {pasy.map((p) => (
                      <span key={p.id} className="truncate" style={{ color: p.kolor }}>
                        {p.imie}
                      </span>
                    ))}
                  </div>
                )}
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
            const przerwyDnia = przerwy.filter((p) => dzienKey(p.start) <= d && dzienKey(p.koniec) >= d && (!osoba || !p.pracownik_id || p.pracownik_id === osoba));
            return (
              <div
                key={d}
                data-kolumna={d}
                onClick={(e) => klik(d, e)}
                className="relative cursor-cell border-l border-linia bg-[repeating-linear-gradient(-45deg,transparent_0_6px,rgba(118,103,93,0.06)_6px_7px)]"
                style={{ height: wysokosc }}
              >
                {pracy && (
                  <div className="pointer-events-none absolute inset-x-0 bg-papier" style={{ top: (pracy[0]! - minStart) * PX_NA_MIN, height: (pracy[1]! - pracy[0]!) * PX_NA_MIN }} />
                )}
                {godzinyOsi.map((m) => (
                  <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-linia/70" style={{ top: (m - minStart) * PX_NA_MIN }} />
                ))}
                {pasy.length > 1 &&
                  pasy.slice(1).map((p, i) => (
                    <div key={p.id} className="pointer-events-none absolute inset-y-0 border-l border-dashed border-linia" style={{ left: `${((i + 1) / pasy.length) * 100}%` }} />
                  ))}
                {d === dzis && (
                  <div className="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-roz" style={{ top: (minutyDnia(new Date()) - minStart) * PX_NA_MIN }} />
                )}
                {przerwyDnia.map((p) => {
                  const a = dzienKey(p.start) < d ? 0 : minutyDnia(p.start);
                  const b = dzienKey(p.koniec) > d ? 24 * 60 : minutyDnia(p.koniec);
                  const top = Math.max(a, minStart);
                  const pas = pasy.length && p.pracownik_id ? pasy.findIndex((o) => o.id === p.pracownik_id) : -1;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setBlokada({ p })}
                      className="absolute inset-x-1 z-[1] overflow-hidden rounded-lg bg-linia/70 px-1.5 py-1 text-left text-[11px] font-bold text-szary"
                      style={{
                        top: (top - minStart) * PX_NA_MIN,
                        height: Math.max(0, Math.min(b, minKoniec) - top) * PX_NA_MIN,
                        ...(pas >= 0 ? { left: `calc(${(pas / pasy.length) * 100}% + 2px)`, width: `calc(${100 / pasy.length}% - 4px)`, right: "auto" } : {}),
                      }}
                    >
                      <Ban className="mr-1 inline size-3" />
                      {p.opis || "Wolne"}
                    </button>
                  );
                })}
                {tegoDnia.map((w) => {
                  const a = minutyDnia(w.start);
                  const b = dzienKey(w.koniec) === d ? minutyDnia(w.koniec) : 24 * 60;
                  const c = (w.usluga_id && kolor.get(w.usluga_id)) || "#b98a4e";
                  const wyg = w.status === "odwolana" || w.status === "nieobecnosc";
                  const pas = pasy.length ? Math.max(0, pasy.findIndex((p) => p.id === w.pracownik_id)) : -1;
                  const poziomo = pas >= 0 ? { left: `calc(${(pas / pasy.length) * 100}% + 2px)`, width: `calc(${100 / pasy.length}% - 4px)`, right: "auto" } : {};
                  const ruch = przesun?.w.id === w.id ? przesun : null;
                  return (
                    <button
                      key={w.id}
                      onPointerDown={(e) => wizytaDown(w, e)}
                      onPointerMove={wizytaMove}
                      onPointerUp={wizytaUp}
                      onPointerCancel={() => {
                        window.clearTimeout(gest.current?.timer);
                        gest.current = null;
                        setPrzesun(null);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEdycja({ w });
                        }
                      }}
                      className={`absolute inset-x-1 z-[2] overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-[12px] leading-tight shadow-sm transition-shadow hover:z-[3] hover:shadow-md ${
                        wyg ? "opacity-45 line-through" : ""
                      } ${w.status === "oczekuje" ? "border-dashed bg-bursztyn-jasny" : ""} ${ruch ? "z-[5] opacity-90 shadow-xl ring-2 ring-atrament" : ""}`}
                      style={{
                        top: (a - minStart) * PX_NA_MIN + 1,
                        height: Math.max(22, (b - a) * PX_NA_MIN - 2),
                        borderLeftColor: pas >= 0 ? (kolorOsoby.get(w.pracownik_id) ?? c) : c,
                        background: w.status === "oczekuje" ? undefined : `color-mix(in srgb, ${c} 16%, #fffdfa)`,
                        transform: ruch ? `translate(${ruch.dx}px, ${ruch.dy}px)` : undefined,
                        touchAction: przesun ? "none" : undefined,
                        ...poziomo,
                      }}
                    >
                      <span className="font-bold">{ruch ? minutyNaGodzine(ruch.minuty) : godzina(w.start)}</span> {w.klientka?.imie}
                      <span className="block truncate text-szary">{w.status === "zrealizowana" ? `✓ ${zl(Number(w.kwota ?? w.cena) + Number(w.napiwek))}` : w.usluga_nazwa}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {blad && <p className="rounded-xl bg-[#fbebeb] px-3.5 py-2.5 text-[14px] text-[#8a2f3a]">{blad}</p>}
      <p className="text-[13px] text-szary">
        Stuknij puste miejsce, żeby dodać wizytę. <b>Przytrzymaj wizytę</b> (na komputerze: przeciągnij), żeby przesunąć ją na inną godzinę lub dzień.
      </p>

      {cofnij && (
        <div className="fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-atrament px-4 py-3 text-[14px] text-krem shadow-xl md:bottom-8">
          <span className="flex-1">Przeniesiono: {cofnij.txt}</span>
          <button className="font-bold underline" onClick={cofnijPrzesuniecie}>
            Cofnij
          </button>
          <button aria-label="Zamknij" onClick={() => setCofnij(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {menu && (
        <div className="fixed right-5 bottom-40 z-20 w-56 overflow-hidden rounded-2xl bg-papier shadow-xl ring-1 ring-linia md:bottom-24">
          <button
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-semibold hover:bg-piasek/50"
            onClick={() => (setMenu(false), setEdycja({ dzien: dni.includes(dzienKey()) ? dzienKey() : od }))}
          >
            <CalendarPlus className="size-5" /> Nowa wizyta
          </button>
          <button
            className="flex w-full items-center gap-3 border-t border-linia px-4 py-3.5 text-left font-semibold hover:bg-piasek/50"
            onClick={() => (setMenu(false), setBlokada({ dzien: dni.includes(dzienKey()) ? dzienKey() : od, pracownik: osoba || undefined }))}
          >
            <Ban className="size-5" /> Zablokuj czas
          </button>
        </div>
      )}
      <button
        onClick={() => setMenu(!menu)}
        className="fixed right-5 bottom-24 z-20 grid size-14 place-items-center rounded-full bg-atrament text-krem shadow-xl hover:bg-mokka md:bottom-8"
        aria-label={menu ? "Zamknij menu" : "Dodaj"}
        aria-expanded={menu}
      >
        {menu ? <X className="size-7" /> : <Plus className="size-7" />}
      </button>
      {edycja && <WizytaForm wizyta={edycja.w} dzien={edycja.dzien} start={edycja.start} pracownik={edycja.pracownik} onClose={() => setEdycja(null)} />}
      {blokada && <BlokadaForm przerwa={blokada.p} dzien={blokada.dzien} start={blokada.start} pracownik={blokada.pracownik} onClose={() => setBlokada(null)} />}
    </>
  );
}

/** Miesiąc: liczba wizyt i utarg każdego dnia – stuknij dzień, żeby go otworzyć. */
function Miesiac({ baza, ustaw, onDzien }: { baza: string; ustaw: (k: string) => void; onDzien: (d: string) => void }) {
  const dzis = dzienKey();
  const dni = dniMiesiaca(baza);
  const od = dni[0]!;
  const doDnia = dni[dni.length - 1]!;
  const [osoba, setOsoba] = useWybranaOsoba();
  const { data: wszystkie = [] } = useWizyty(od, doDnia);
  const { data: przerwy = [] } = usePrzerwy(od, doDnia);
  const { data: godziny = [] } = useGodziny();
  const wizyty = osoba ? wszystkie.filter((w) => w.pracownik_id === osoba) : wszystkie;
  const suma = podsumuj(wizyty);
  const puste = dzienTygodnia(od) - 1;

  return (
    <>
      <PasekDnia
        tytul={nazwaMiesiaca(od)}
        podtytul={`${suma.zrobione + suma.zaplanowane} wizyt · ${zl(suma.razem)} utargu`}
        czyDzis={od === poczatekMiesiaca(dzis)}
        onPoprz={() => ustaw(poczatekMiesiaca(dodajDni(od, -1)))}
        onNast={() => ustaw(dodajDni(doDnia, 1))}
        onDzis={() => ustaw(dzis)}
      />
      <WyborOsoby wartosc={osoba} onZmien={setOsoba} />
      <div className="karta p-2">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[12px] font-bold text-szary uppercase">
          {DNI_KROTKO.slice(1).map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: puste }, (_, i) => (
            <span key={`p${i}`} />
          ))}
          {dni.map((d) => {
            const dnia = wizyty.filter((w) => dzienKey(w.start) === d && w.status !== "odwolana");
            const s = podsumuj(dnia);
            const pracuje = godziny.some((g) => g.dzien === dzienTygodnia(d));
            const wolne = przerwy.some((p) => dzienKey(p.start) <= d && dzienKey(new Date(+new Date(p.koniec) - 1)) >= d && !p.pracownik_id && +new Date(p.koniec) - +new Date(p.start) >= 20 * 3600_000);
            return (
              <button
                key={d}
                onClick={() => onDzien(d)}
                className={`flex min-h-16 flex-col items-start rounded-xl p-1.5 text-left transition hover:bg-piasek/60 ${d === dzis ? "ring-2 ring-roz" : ""} ${!pracuje || wolne ? "bg-piasek/40" : "bg-papier"}`}
              >
                <span className={`text-[14px] font-bold ${d === dzis ? "text-roz" : ""}`}>{Number(d.slice(8))}</span>
                {dnia.length > 0 && <span className="mt-auto text-[12px] font-bold">{dnia.length} wiz.</span>}
                {s.razem > 0 && <span className="hidden text-[11px] text-szary sm:block">{zl(s.razem)}</span>}
                {wolne && <span className="mt-auto text-[11px] text-szary">wolne</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
