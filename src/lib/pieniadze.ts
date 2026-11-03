import type { Platnosc, StatusWizyty } from "./database.types";

const fmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
export const zl = (n: number) => `${fmt.format(n)} zł`;

export const PLATNOSCI: Record<Platnosc, string> = {
  gotowka: "Gotówka",
  karta: "Karta",
  blik: "BLIK",
  przelew: "Przelew",
};

type W = { status: StatusWizyty; kwota: number | null; napiwek: number; cena: number; platnosc: Platnosc | null };

export type Podsumowanie = {
  zrobione: number;
  zaplanowane: number;
  oczekujace: number;
  nieobecne: number;
  utarg: number;
  napiwki: number;
  razem: number;
  prognoza: number;
  sredniaNaKlientke: number;
  wgPlatnosci: Record<Platnosc, number>;
};

/** Liczy dzień / tydzień / miesiąc pracy z listy wizyt. */
export function podsumuj(wizyty: W[]): Podsumowanie {
  const p: Podsumowanie = {
    zrobione: 0,
    zaplanowane: 0,
    oczekujace: 0,
    nieobecne: 0,
    utarg: 0,
    napiwki: 0,
    razem: 0,
    prognoza: 0,
    sredniaNaKlientke: 0,
    wgPlatnosci: { gotowka: 0, karta: 0, blik: 0, przelew: 0 },
  };
  for (const w of wizyty) {
    if (w.status === "zrealizowana") {
      const kwota = Number(w.kwota ?? w.cena);
      const napiwek = Number(w.napiwek || 0);
      p.zrobione++;
      p.utarg += kwota;
      p.napiwki += napiwek;
      if (w.platnosc) p.wgPlatnosci[w.platnosc] += kwota + napiwek;
    } else if (w.status === "potwierdzona") {
      p.zaplanowane++;
      p.prognoza += Number(w.cena);
    } else if (w.status === "oczekuje") {
      p.oczekujace++;
    } else if (w.status === "nieobecnosc") {
      p.nieobecne++;
    }
  }
  p.razem = p.utarg + p.napiwki;
  p.prognoza += p.razem;
  p.sredniaNaKlientke = p.zrobione ? Math.round((p.razem / p.zrobione) * 100) / 100 : 0;
  return p;
}

/** "120", "120,50", "120.5" → liczba; puste → null */
export function parsujKwote(txt: string): number | null {
  const t = txt.replace(/\s|zł/gi, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
