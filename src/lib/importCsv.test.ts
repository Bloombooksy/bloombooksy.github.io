import { describe, expect, it } from "vitest";
import { klientkiZCsv, parsujCsv } from "./importCsv";

describe("import klientek z CSV", () => {
  it("czyta eksport w stylu Booksy (średnik, BOM, cudzysłowy)", () => {
    const csv = '﻿Imię;Nazwisko;Telefon;Notatka\r\nOla;Nowak;"+48 690 000 001";"lubi ""french"""\r\nKasia;;690000002;\r\n';
    const { nowe, rozpoznane } = klientkiZCsv(parsujCsv(csv));
    expect(rozpoznane).toEqual(["imie", "nazwisko", "telefon", "notatka"]);
    expect(nowe).toEqual([
      { imie: "Ola Nowak", telefon: "+48 690 000 001", instagram: "", notatka: 'lubi "french"' },
      { imie: "Kasia", telefon: "690000002", instagram: "", notatka: "" },
    ]);
  });

  it("czyta kontakty Google (przecinek, angielskie nagłówki)", () => {
    const csv = "Name,Given Name,Phone 1 - Value\nEwa Zielińska,Ewa,600 100 200\n";
    expect(klientkiZCsv(parsujCsv(csv)).nowe[0]).toMatchObject({ imie: "Ewa Zielińska", telefon: "600 100 200" });
  });

  it("pomija duplikaty i klientki, które już są w aplikacji", () => {
    const csv = "Klientka;Telefon\nOla;690000001\nOla N.;+48690000001\nNowa;\nNowa;\nBasia;600000009\n";
    const r = klientkiZCsv(parsujCsv(csv), [{ imie: "Basia B", telefon: "600 000 009" }]);
    expect(r.nowe.map((k) => k.imie)).toEqual(["Ola", "Nowa"]);
    expect(r.pominiete).toBe(3);
  });

  it("plik bez nagłówka: imię, telefon", () => {
    expect(klientkiZCsv(parsujCsv("Ola Nowak,690000001\nKasia,690000002")).nowe).toHaveLength(2);
  });
});
