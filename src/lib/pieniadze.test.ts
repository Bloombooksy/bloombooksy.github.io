import { describe, expect, it } from "vitest";
import { parsujKwote, podsumuj } from "./pieniadze";

describe("podsumowanie dnia", () => {
  it("liczy klientki, utarg, napiwki i płatności", () => {
    const p = podsumuj([
      { status: "zrealizowana", kwota: 150, napiwek: 20, cena: 140, platnosc: "blik" },
      { status: "zrealizowana", kwota: null, napiwek: 0, cena: 120, platnosc: "gotowka" },
      { status: "potwierdzona", kwota: null, napiwek: 0, cena: 100, platnosc: null },
      { status: "oczekuje", kwota: null, napiwek: 0, cena: 90, platnosc: null },
      { status: "nieobecnosc", kwota: null, napiwek: 0, cena: 90, platnosc: null },
      { status: "odwolana", kwota: null, napiwek: 0, cena: 90, platnosc: null },
    ]);
    expect(p.zrobione).toBe(2);
    expect(p.utarg).toBe(270); // brak kwoty = cena z cennika
    expect(p.napiwki).toBe(20);
    expect(p.razem).toBe(290);
    expect(p.prognoza).toBe(390);
    expect(p.wgPlatnosci.blik).toBe(170);
    expect(p.wgPlatnosci.gotowka).toBe(120);
    expect(p.sredniaNaKlientke).toBe(145);
    expect([p.zaplanowane, p.oczekujace, p.nieobecne]).toEqual([1, 1, 1]);
  });

  it("pusty dzień to zera", () => {
    expect(podsumuj([]).sredniaNaKlientke).toBe(0);
  });
});

describe("wpisywanie kwot", () => {
  it.each([
    ["120", 120],
    ["120,50", 120.5],
    ["1 200 zł", 1200],
    ["", null],
    ["-5", null],
    ["abc", null],
  ])("%s → %s", (txt, out) => expect(parsujKwote(txt)).toBe(out));
});
