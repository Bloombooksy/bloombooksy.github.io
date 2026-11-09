import { describe, expect, it } from "vitest";
import { dopasujUsluge, wierszeZOdczytu, znajdzKlientke } from "./importZdjecia";

const uslugi = [
  { id: "u1", nazwa: "Manicure hybrydowy", czas_min: 90, cena: 130 },
  { id: "u2", nazwa: "Uzupełnienie żelu", czas_min: 120, cena: 160 },
  { id: "u3", nazwa: "Pedicure hybrydowy", czas_min: 90, cena: 140 },
];
const klientki = [
  { id: "k1", imie: "Daria Nowak", telefon: "690 017 099" },
  { id: "k2", imie: "Ola", telefon: "" },
];

describe("import ze zdjęcia", () => {
  it("dopasowuje skróty usług do cennika", () => {
    expect(dopasujUsluge("hybryda", uslugi)?.id).toBe("u1");
    expect(dopasujUsluge("uzupelnienie", uslugi)?.id).toBe("u2");
    expect(dopasujUsluge("Pedicure hybrydowy", uslugi)?.id).toBe("u3");
    expect(dopasujUsluge("rzęsy 2D", uslugi)).toBeNull();
    expect(dopasujUsluge("", uslugi)).toBeNull();
  });

  it("znajduje klientkę po numerze albo jednoznacznym imieniu", () => {
    expect(znajdzKlientke("Daria", "+48690017099", klientki)?.id).toBe("k1");
    expect(znajdzKlientke("ola", "", klientki)?.id).toBe("k2");
    expect(znajdzKlientke("Kasia", "", klientki)).toBeNull();
  });

  it("odznacza skreślone, przeszłe i zajęte terminy, a wiersze sortuje po czasie", () => {
    const w = wierszeZOdczytu(
      {
        wizyty: [
          { data: "2026-11-12", godzina: "13:00", imie: "Ola", usluga: "hybr", skreslona: false, pewnosc: "wysoka" },
          { data: "2026-11-12", godzina: "8:30", imie: "Daria", usluga: "uzupełnienie", skreslona: false, pewnosc: "srednia" },
          { data: "2026-11-12", godzina: "10:00", imie: "Kasia", skreslona: true, pewnosc: "wysoka" },
          { data: "2026-11-01", godzina: "10:00", imie: "Ewa", skreslona: false, pewnosc: "wysoka" },
          { data: "2026-11-13", godzina: "11:00", imie: "Iza", skreslona: false, pewnosc: "niska" },
          { data: "zła", godzina: "25:00", imie: "X", skreslona: false, pewnosc: "niska" },
        ],
        klientki: [],
      },
      uslugi,
      klientki,
      [{ start: "", klucz: "2026-11-13 11:00" }],
      "2026-11-09",
    );
    expect(w.map((x) => `${x.data} ${x.godzina} ${x.imie} ${x.wlaczony}`)).toEqual([
      "2026-11-01 10:00 Ewa false",
      "2026-11-12 08:30 Daria true",
      "2026-11-12 10:00 Kasia false",
      "2026-11-12 13:00 Ola true",
      "2026-11-13 11:00 Iza false",
    ]);
    const daria = w.find((x) => x.imie === "Daria")!;
    expect(daria.klientka_id).toBe("k1");
    expect(daria.usluga_id).toBe("u2");
    expect(daria.czas_min).toBe(120);
    expect(daria.cena).toBe(160);
    expect(w.find((x) => x.imie === "Iza")!.duplikat).toBe(true);
    expect(w.find((x) => x.imie === "Kasia")!.notatka).toContain("skreślona");
  });
});
