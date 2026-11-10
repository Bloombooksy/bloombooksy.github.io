/**
 * Daty i godziny zawsze liczone w strefie salonu (Europe/Warsaw),
 * niezależnie od strefy telefonu czy serwera. Dzień = klucz "RRRR-MM-DD".
 */
export const STREFA = "Europe/Warsaw";

const czesci = new Intl.DateTimeFormat("en-CA", {
  timeZone: STREFA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function rozbij(d: Date) {
  const p = Object.fromEntries(czesci.formatToParts(d).map((x) => [x.type, x.value]));
  return { r: +p.year!, m: +p.month!, d: +p.day!, h: +p.hour!, min: +p.minute! };
}

/** Klucz dnia w strefie salonu. */
export function dzienKey(d: Date | string = new Date()): string {
  const { r, m, d: dz } = rozbij(new Date(d));
  return `${r}-${String(m).padStart(2, "0")}-${String(dz).padStart(2, "0")}`;
}

/** "14:30" w strefie salonu. */
export function godzina(d: Date | string): string {
  const { h, min } = rozbij(new Date(d));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Minuty od północy (w strefie salonu). */
export function minutyDnia(d: Date | string): number {
  const { h, min } = rozbij(new Date(d));
  return h * 60 + min;
}

/** Zamienia dzień + "HH:MM" (czas w Polsce) na prawdziwy moment w czasie. */
export function wStrefie(key: string, hhmm = "00:00"): Date {
  const [r, m, d] = key.split("-").map(Number) as [number, number, number];
  const [h, min] = hhmm.split(":").map(Number) as [number, number];
  const naiwny = Date.UTC(r, m - 1, d, h, min);
  // przesunięcie strefy w tym momencie (uwzględnia czas letni/zimowy)
  let wynik = naiwny;
  for (let i = 0; i < 2; i++) {
    const p = rozbij(new Date(wynik));
    const pokazany = Date.UTC(p.r, p.m - 1, p.d, p.h, p.min);
    wynik += naiwny - pokazany;
  }
  return new Date(wynik);
}

export function dodajDni(key: string, n: number): string {
  const [r, m, d] = key.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(r, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** 1 = poniedziałek … 7 = niedziela (jak isodow w Postgresie). */
export function dzienTygodnia(key: string): number {
  const [r, m, d] = key.split("-").map(Number) as [number, number, number];
  const w = new Date(Date.UTC(r, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function poczatekTygodnia(key: string): string {
  return dodajDni(key, 1 - dzienTygodnia(key));
}

export function tydzien(key: string): string[] {
  const pon = poczatekTygodnia(key);
  return Array.from({ length: 7 }, (_, i) => dodajDni(pon, i));
}

export function poczatekMiesiaca(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function dniMiesiaca(key: string): string[] {
  const start = poczatekMiesiaca(key);
  const out: string[] = [];
  for (let k = start; k.slice(0, 7) === start.slice(0, 7); k = dodajDni(k, 1)) out.push(k);
  return out;
}

export function godzinaNaMinuty(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + (m || 0);
}

export function minutyNaGodzine(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export const DNI = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"] as const;
export const DNI_KROTKO = ["", "pon", "wt", "śr", "czw", "pt", "sob", "nd"] as const;
const MIESIACE_D = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const MIESIACE = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

/** "wtorek, 4 listopada" */
export function opisDnia(key: string, zDniem = true): string {
  const [, m, d] = key.split("-").map(Number) as [number, number, number];
  const txt = `${d} ${MIESIACE_D[m - 1]}`;
  return zDniem ? `${DNI[dzienTygodnia(key)]!.toLowerCase()}, ${txt}` : txt;
}

/** "4.11" */
export function krotkaData(key: string): string {
  const [, m, d] = key.split("-").map(Number) as [number, number, number];
  return `${d}.${String(m).padStart(2, "0")}`;
}

export function nazwaMiesiaca(key: string): string {
  const [r, m] = key.split("-").map(Number) as [number, number];
  return `${MIESIACE[m - 1]} ${r}`;
}

/** "dziś", "jutro", "wczoraj" albo null */
export function wzglednie(key: string, dzis = dzienKey()): string | null {
  if (key === dzis) return "dziś";
  if (key === dodajDni(dzis, 1)) return "jutro";
  if (key === dodajDni(dzis, -1)) return "wczoraj";
  return null;
}

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h" */
export function opisCzasu(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Polska odmiana po liczebniku: odmiana(4, "wizyta", "wizyty", "wizyt") → "4 wizyty". */
export function odmiana(n: number, jedna: string, kilka: string, wiele: string): string {
  const d = n % 10;
  const s = n % 100;
  const slowo = n === 1 ? jedna : d >= 2 && d <= 4 && !(s >= 12 && s <= 14) ? kilka : wiele;
  return `${n} ${slowo}`;
}
