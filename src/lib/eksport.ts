/** Eksport danych salonu do plików CSV (Excel w Polsce: średnik + BOM, żeby polskie litery były czytelne). */

type Wartosc = string | number | boolean | null | undefined;

export function doCsv(naglowki: string[], wiersze: Wartosc[][]): string {
  const pole = (v: Wartosc) => {
    const t = v == null ? "" : String(v);
    return /[";\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  return "﻿" + [naglowki, ...wiersze].map((w) => w.map(pole).join(";")).join("\r\n") + "\r\n";
}

export function pobierzPlik(nazwa: string, tresc: string, typ = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([tresc], { type: typ }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwa;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Data i godzina w strefie salonu, w formacie czytelnym dla Excela. */
export function dataCsv(iso: string | null | undefined, strefa = "Europe/Warsaw"): string {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: strefa, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
