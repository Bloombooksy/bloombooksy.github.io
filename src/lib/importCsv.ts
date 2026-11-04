/** Import listy klientek z pliku CSV (eksport z Booksy, Google/iPhone kontaktów, Excela). */

export type NowaKlientka = { imie: string; telefon: string; instagram: string; notatka: string };

/** Parser CSV: średnik, przecinek albo tabulator; cudzysłowy; BOM; \r\n. */
export function parsujCsv(tekst: string): string[][] {
  const t = tekst.replace(/^﻿/, "");
  const pierwsza = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((s) => [s, pierwsza.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const wiersze: string[][] = [];
  let pole = "";
  let wiersz: string[] = [];
  let wCudz = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (wCudz) {
      if (c === '"' && t[i + 1] === '"') {
        pole += '"';
        i++;
      } else if (c === '"') wCudz = false;
      else pole += c;
    } else if (c === '"') wCudz = true;
    else if (c === sep) {
      wiersz.push(pole);
      pole = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      wiersz.push(pole);
      pole = "";
      if (wiersz.some((x) => x.trim())) wiersze.push(wiersz);
      wiersz = [];
    } else pole += c;
  }
  wiersz.push(pole);
  if (wiersz.some((x) => x.trim())) wiersze.push(wiersz);
  return wiersze;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]/g, "");

const NAGLOWKI: Record<keyof NowaKlientka | "nazwisko" | "pelne", string[]> = {
  pelne: ["imieinazwisko", "klient", "klientka", "name", "fullname", "nazwa", "displayname", "kontakt"],
  imie: ["imie", "firstname", "givenname", "imiona"],
  nazwisko: ["nazwisko", "lastname", "familyname", "surname"],
  telefon: ["telefon", "tel", "phone", "nrtelefonu", "numertelefonu", "phonenumber", "mobile", "komorka", "telefonkomorkowy", "phone1value"],
  instagram: ["instagram", "ig"],
  notatka: ["notatka", "notatki", "uwagi", "notes", "note", "opis"],
};

function kolumna(naglowki: string[], klucz: keyof typeof NAGLOWKI): number {
  const n = naglowki.map(norm);
  return n.findIndex((h) => NAGLOWKI[klucz].includes(h) || NAGLOWKI[klucz].some((k) => k.length > 4 && h.startsWith(k)));
}

const cyfry9 = (t: string) => t.replace(/\D/g, "").slice(-9);

/** Zamienia wiersze CSV na klientki; pomija puste i te, które już są (po numerze albo imieniu). */
export function klientkiZCsv(
  wiersze: string[][],
  istniejace: { imie: string; telefon: string }[] = [],
): { nowe: NowaKlientka[]; pominiete: number; rozpoznane: string[] } {
  const [nag = [], ...dane] = wiersze;
  const k = {
    pelne: kolumna(nag, "pelne"),
    imie: kolumna(nag, "imie"),
    nazwisko: kolumna(nag, "nazwisko"),
    telefon: kolumna(nag, "telefon"),
    instagram: kolumna(nag, "instagram"),
    notatka: kolumna(nag, "notatka"),
  };
  // bez rozpoznanego nagłówka: 1. kolumna = imię i nazwisko, 2. = telefon
  const bezNaglowka = k.pelne < 0 && k.imie < 0 && k.telefon < 0;
  const wiersz = bezNaglowka ? wiersze : dane;
  if (bezNaglowka) {
    k.pelne = 0;
    k.telefon = 1;
  }
  const rozpoznane = (Object.entries(k) as [string, number][]).filter(([, i]) => i >= 0).map(([n]) => n);

  const telefony = new Set(istniejace.map((x) => cyfry9(x.telefon)).filter((x) => x.length === 9));
  const imiona = new Set(istniejace.filter((x) => !x.telefon).map((x) => x.imie.trim().toLowerCase()));
  const nowe: NowaKlientka[] = [];
  let pominiete = 0;
  const pole = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  for (const r of wiersz) {
    const imie = (pole(r, k.pelne) || [pole(r, k.imie), pole(r, k.nazwisko)].filter(Boolean).join(" ")).replace(/\s+/g, " ").slice(0, 80);
    const telefon = pole(r, k.telefon).replace(/[^\d+ ]/g, "").trim().slice(0, 20);
    if (!imie) {
      pominiete++;
      continue;
    }
    const t9 = cyfry9(telefon);
    if ((t9.length === 9 && telefony.has(t9)) || (!telefon && imiona.has(imie.toLowerCase()))) {
      pominiete++;
      continue;
    }
    if (t9.length === 9) telefony.add(t9);
    else imiona.add(imie.toLowerCase());
    nowe.push({
      imie,
      telefon,
      instagram: pole(r, k.instagram).replace(/^@/, "").slice(0, 60),
      notatka: pole(r, k.notatka).slice(0, 2000),
    });
  }
  return { nowe, pominiete, rozpoznane };
}
