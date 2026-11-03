/** Logika przypomnień SMS – ta sama co w funkcji serwerowej (supabase/functions/przypomnienia). */

export const DOMYSLNY_SZABLON =
  "Hej {imie}! Przypominam o wizycie jutro ({data}) o {godzina} – {usluga}. Do zobaczenia! {salon}";

export type DaneSms = { imie: string; data: string; godzina: string; usluga: string; salon: string };

export function renderSzablon(szablon: string, d: DaneSms): string {
  const pierwszeImie = d.imie.trim().split(/\s+/)[0] ?? "";
  return szablon
    .replaceAll("{imie}", pierwszeImie)
    .replaceAll("{data}", d.data)
    .replaceAll("{godzina}", d.godzina)
    .replaceAll("{usluga}", d.usluga)
    .replaceAll("{salon}", d.salon)
    .replace(/\s+/g, " ")
    .trim();
}

const PL: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  "–": "-", "—": "-", "„": '"', "”": '"', "’": "'",
};

/** Bez polskich znaków SMS mieści 160 znaków zamiast 70 – i kosztuje mniej. */
export function bezPolskichZnakow(t: string): string {
  return t.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”’]/g, (c) => PL[c] ?? c);
}

/** Ile części (i opłat) zajmie wiadomość po usunięciu polskich znaków. */
export function liczbaCzesci(t: string): number {
  const n = bezPolskichZnakow(t).length;
  if (n === 0) return 0;
  return n <= 160 ? 1 : Math.ceil(n / 153);
}

/** "690 017 099", "+48 690-017-099", "0048690017099" → "48690017099"; błędny → null */
export function normalizujTelefon(t: string): string | null {
  let c = t.replace(/[^\d+]/g, "");
  if (c.startsWith("+")) c = c.slice(1);
  else if (c.startsWith("00")) c = c.slice(2);
  if (/^\d{9}$/.test(c)) c = `48${c}`;
  return /^\d{11,15}$/.test(c) ? c : null;
}

/** Ładny zapis numeru: "690 017 099" */
export function ladnyTelefon(t: string): string {
  const n = normalizujTelefon(t);
  if (!n) return t;
  const lok = n.startsWith("48") ? n.slice(2) : n;
  return (n.startsWith("48") ? "" : "+") + lok.replace(/(\d{3})(?=\d)/g, "$1 ");
}
