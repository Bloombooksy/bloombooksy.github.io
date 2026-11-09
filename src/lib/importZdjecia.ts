import { normalizujTelefon } from "./sms";

/** To, co odczytuje model ze zdjęcia kalendarza (funkcja import-zdjecie). */
export type OdczytWizyty = {
  data: string;
  godzina: string;
  czas_min?: number | null;
  imie: string;
  telefon?: string | null;
  usluga?: string | null;
  cena?: number | null;
  notatka?: string | null;
  skreslona: boolean;
  pewnosc: "wysoka" | "srednia" | "niska";
};
export type Odczyt = { wizyty: OdczytWizyty[]; klientki: { imie: string; telefon?: string | null }[]; uwagi?: string };

type Usluga = { id: string; nazwa: string; czas_min: number; cena: number };
type Klientka = { id: string; imie: string; telefon: string };

/** Wiersz podglądu – salon może go poprawić przed zapisem. */
export type WierszImportu = {
  klucz: string;
  wlaczony: boolean;
  data: string;
  godzina: string;
  czas_min: number;
  imie: string;
  telefon: string;
  usluga_id: string | null;
  usluga_nazwa: string;
  cena: number;
  notatka: string;
  pewnosc: OdczytWizyty["pewnosc"];
  klientka_id: string | null;
  duplikat: boolean;
};

const bezOgonkow = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Dopasowanie usługi z cennika do tego, co zapisano odręcznie („hybr” → „Manicure hybrydowy”). */
export function dopasujUsluge(nazwa: string | null | undefined, uslugi: Usluga[]): Usluga | null {
  if (!nazwa?.trim()) return null;
  const n = bezOgonkow(nazwa);
  const dokladna = uslugi.find((u) => bezOgonkow(u.nazwa) === n);
  if (dokladna) return dokladna;
  let najlepsza: Usluga | null = null;
  let wynik = 0;
  for (const u of uslugi) {
    const un = bezOgonkow(u.nazwa);
    const slowa = n.split(" ").filter((s) => s.length >= 3);
    const wspolny = (a: string, b: string) => {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      return i >= Math.min(4, a.length, b.length);
    };
    const trafienia = slowa.filter((s) => un.split(" ").some((w) => wspolny(s, w))).length;
    const punkty = slowa.length ? trafienia / slowa.length : 0;
    if (punkty > wynik) {
      wynik = punkty;
      najlepsza = u;
    }
  }
  return wynik >= 0.5 ? najlepsza : null;
}

/** Klientka z bazy: najpierw po numerze, potem po identycznym imieniu i nazwisku. */
export function znajdzKlientke(imie: string, telefon: string, klientki: Klientka[]): Klientka | null {
  const t = normalizujTelefon(telefon);
  if (t) {
    const poTel = klientki.find((k) => normalizujTelefon(k.telefon) === t);
    if (poTel) return poTel;
  }
  const n = bezOgonkow(imie);
  if (!n) return null;
  const poImieniu = klientki.filter((k) => bezOgonkow(k.imie) === n);
  if (poImieniu.length) return poImieniu.length === 1 ? poImieniu[0]! : null;
  // samo imię („Daria”) – tylko jeśli w bazie jest dokładnie jedna taka klientka
  if (!n.includes(" ")) {
    const poPierwszym = klientki.filter((k) => bezOgonkow(k.imie).split(" ")[0] === n);
    if (poPierwszym.length === 1) return poPierwszym[0]!;
  }
  return null;
}

const GODZINA = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Zamienia odczyt na wiersze podglądu. Skreślone i nieczytelne terminy są domyślnie odznaczone. */
export function wierszeZOdczytu(
  o: Odczyt,
  uslugi: Usluga[],
  klientki: Klientka[],
  istniejace: { start: string; klucz: string }[],
  dzis: string,
): WierszImportu[] {
  const zajete = new Set(istniejace.map((x) => x.klucz));
  return o.wizyty
    .filter((w) => DATA.test(w.data) && GODZINA.test(w.godzina) && w.imie?.trim())
    .map((w, i) => {
      const u = dopasujUsluge(w.usluga, uslugi);
      const tel = (w.telefon ?? "").trim();
      const k = znajdzKlientke(w.imie, tel, klientki);
      const godzina = w.godzina.padStart(5, "0");
      const duplikat = zajete.has(`${w.data} ${godzina}`);
      return {
        klucz: `${i}-${w.data}-${godzina}`,
        wlaczony: !w.skreslona && !duplikat && w.data >= dzis,
        data: w.data,
        godzina,
        czas_min: w.czas_min && w.czas_min >= 10 && w.czas_min <= 600 ? w.czas_min : (u?.czas_min ?? 60),
        imie: w.imie.trim(),
        telefon: k?.telefon || tel,
        usluga_id: u?.id ?? null,
        usluga_nazwa: u?.nazwa ?? (w.usluga ?? "").trim(),
        cena: w.cena ?? u?.cena ?? 0,
        notatka: [w.notatka?.trim(), w.skreslona ? "skreślona w kalendarzu" : ""].filter(Boolean).join(" · "),
        pewnosc: w.pewnosc,
        klientka_id: k?.id ?? null,
        duplikat,
      };
    })
    .sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina));
}
