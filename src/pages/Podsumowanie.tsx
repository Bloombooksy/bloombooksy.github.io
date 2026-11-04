import { useState } from "react";
import { useCzyWlascicielka, useJa, useWizyty, useZespol } from "../lib/dane";
import { DNI_KROTKO, dniMiesiaca, dodajDni, dzienKey, dzienTygodnia, krotkaData, nazwaMiesiaca, poczatekMiesiaca, tydzien } from "../lib/czas";
import { PLATNOSCI, podsumuj, zl } from "../lib/pieniadze";
import type { Platnosc } from "../lib/database.types";
import { Kafelek } from "../components/ui";
import { PasekDnia } from "../components/PasekDnia";
import { Wstecz } from "../components/Wstecz";

export default function Podsumowanie() {
  const dzis = dzienKey();
  const [tryb, setTryb] = useState<"tydzien" | "miesiac">("tydzien");
  const [baza, setBaza] = useState(dzis);
  const dni = tryb === "tydzien" ? tydzien(baza) : dniMiesiaca(baza);
  const { data: wszystkie = [] } = useWizyty(dni[0]!, dni.at(-1)!);
  const wlascicielka = useCzyWlascicielka();
  const ja = useJa();
  const { wszyscy: zespol, wiele } = useZespol();
  // osoba z zespołu widzi tylko swoje wyniki
  const wizyty = wlascicielka ? wszystkie : wszystkie.filter((w) => w.pracownik_id === ja);
  const naOsobe = wlascicielka && wiele ? zespol.map((o) => ({ o, ...podsumuj(wszystkie.filter((w) => w.pracownik_id === o.id)) })).filter((x) => x.o.aktywny || x.zrobione) : [];
  const p = podsumuj(wizyty);

  const naDzien = dni.map((d) => ({ d, ...podsumuj(wizyty.filter((w) => dzienKey(w.start) === d)) }));
  const max = Math.max(1, ...naDzien.map((x) => x.razem));
  const uslugi = new Map<string, { n: number; suma: number }>();
  for (const w of wizyty) {
    if (w.status !== "zrealizowana") continue;
    const k = w.usluga_nazwa || "Inne";
    const u = uslugi.get(k) ?? { n: 0, suma: 0 };
    u.n++;
    u.suma += Number(w.kwota ?? w.cena) + Number(w.napiwek);
    uslugi.set(k, u);
  }
  const przesun = (n: number) => {
    if (tryb === "tydzien") setBaza(dodajDni(baza, 7 * n));
    else {
      const [r, m] = baza.split("-").map(Number) as [number, number];
      const t = new Date(Date.UTC(r, m - 1 + n, 1));
      setBaza(t.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Wstecz />
      <div className="inline-flex rounded-xl bg-piasek p-1">
        {(["tydzien", "miesiac"] as const).map((t) => (
          <button key={t} onClick={() => setTryb(t)} className={`rounded-lg px-4 py-2 text-[14px] font-bold ${tryb === t ? "bg-papier shadow-sm" : "text-szary"}`}>
            {t === "tydzien" ? "Tydzień" : "Miesiąc"}
          </button>
        ))}
      </div>
      <PasekDnia
        tytul={tryb === "tydzien" ? `${krotkaData(dni[0]!)} – ${krotkaData(dni[6]!)}` : nazwaMiesiaca(baza)}
        czyDzis={dni.includes(dzis)}
        onPoprz={() => przesun(-1)}
        onNast={() => przesun(1)}
        onDzis={() => setBaza(dzis)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kafelek akcent etykieta="Utarg" wartosc={zl(p.razem)} podpis={p.napiwki ? `napiwki ${zl(p.napiwki)}` : undefined} />
        <Kafelek etykieta="Klientki" wartosc={p.zrobione} podpis={p.zaplanowane ? `+ ${p.zaplanowane} umówione` : undefined} />
        <Kafelek etykieta="Średnio" wartosc={zl(Math.round(p.sredniaNaKlientke))} podpis="na klientkę" />
        <Kafelek etykieta="Nie przyszły" wartosc={p.nieobecne} podpis={p.zrobione + p.nieobecne ? `${Math.round((p.nieobecne / (p.zrobione + p.nieobecne)) * 100)}% wizyt` : undefined} />
      </div>

      <section className="karta p-4">
        <h2 className="mb-3 font-bold">Utarg dzień po dniu</h2>
        <div className="flex h-48 items-end gap-[3px] pt-6">
          {naDzien.map((x) => (
            <div key={x.d} className="group relative flex h-full flex-1 flex-col justify-end" title={`${krotkaData(x.d)}: ${zl(x.razem)}, ${x.zrobione} klientek`}>
              <div className={`rounded-t-md ${x.d === dzis ? "bg-roz" : "bg-mokka/80"}`} style={{ height: `${(x.razem / max) * 100}%`, minHeight: x.razem ? 3 : 0 }} />
              {tryb === "tydzien" && (
                <span className="absolute -top-5 inset-x-0 text-center text-[11px] font-bold text-szary">{x.razem ? Math.round(x.razem) : ""}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-[3px] text-center text-[10px] font-bold text-szary">
          {naDzien.map((x) => (
            <span key={x.d} className="flex-1 truncate">
              {tryb === "tydzien" ? DNI_KROTKO[dzienTygodnia(x.d)] : +x.d.slice(8) % 5 === 1 ? +x.d.slice(8) : ""}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="karta p-4">
          <h2 className="mb-2 font-bold">Płatności</h2>
          {(Object.keys(PLATNOSCI) as Platnosc[]).map((k) => (
            <div key={k} className="flex justify-between py-1 text-[15px]">
              <span className="text-szary">{PLATNOSCI[k]}</span>
              <span className="font-semibold">{zl(p.wgPlatnosci[k])}</span>
            </div>
          ))}
        </section>
        <section className="karta p-4">
          <h2 className="mb-2 font-bold">Usługi</h2>
          {uslugi.size === 0 && <p className="text-[14px] text-szary">Brak zrobionych wizyt.</p>}
          {[...uslugi.entries()]
            .sort((a, b) => b[1].suma - a[1].suma)
            .map(([n, u]) => (
              <div key={n} className="flex justify-between gap-3 py-1 text-[15px]">
                <span className="truncate text-szary">
                  {n} <span className="text-[13px]">×{u.n}</span>
                </span>
                <span className="shrink-0 font-semibold">{zl(u.suma)}</span>
              </div>
            ))}
        </section>
      </div>
      {naOsobe.length > 0 && (
        <section className="karta p-4">
          <h2 className="mb-2 font-bold">Zespół</h2>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-[15px]">
            <span className="text-[12px] font-bold text-szary uppercase">Osoba</span>
            <span className="text-right text-[12px] font-bold text-szary uppercase">Klientki</span>
            <span className="text-right text-[12px] font-bold text-szary uppercase">Utarg</span>
            {naOsobe.map(({ o, zrobione, razem }) => (
              <div key={o.id} className="contents">
                <span className="flex items-center gap-2 truncate">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: o.kolor }} />
                  {o.imie}
                </span>
                <span className="text-right">{zrobione}</span>
                <span className="text-right font-semibold">{zl(razem)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {tryb === "miesiac" && <p className="text-[13px] text-szary">Miesiąc liczony od {krotkaData(poczatekMiesiaca(baza))}.</p>}
    </div>
  );
}
