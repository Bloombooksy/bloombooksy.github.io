import { describe, expect, it } from "vitest";
import { bezPolskichZnakow, DOMYSLNY_SZABLON, ladnyTelefon, liczbaCzesci, normalizujTelefon, renderSzablon } from "./sms";

describe("treść przypomnienia", () => {
  const txt = renderSzablon(DOMYSLNY_SZABLON, {
    imie: "Ola Nowak",
    data: "środa 4.11",
    godzina: "10:30",
    usluga: "Manicure hybrydowy",
    salon: "Bloom Beauty",
  });

  it("wstawia dane klientki (samo imię)", () => {
    expect(txt).toBe("Hej Ola! Przypominam o wizycie jutro (środa 4.11) o 10:30 – Manicure hybrydowy. Do zobaczenia! Bloom Beauty");
  });

  it("mieści się w jednym SMS-ie po usunięciu polskich znaków", () => {
    expect(bezPolskichZnakow(txt)).toContain("sroda 4.11) o 10:30 - Manicure");
    expect(liczbaCzesci(txt)).toBe(1);
    expect(liczbaCzesci("x".repeat(161))).toBe(2);
  });
});

describe("numery telefonów", () => {
  it.each([
    ["690 017 099", "48690017099"],
    ["+48 690-017-099", "48690017099"],
    ["0048690017099", "48690017099"],
    ["+420 601 123 456", "420601123456"],
    ["12345", null],
    ["", null],
  ])("%s → %s", (we, wy) => expect(normalizujTelefon(we)).toBe(wy));

  it("wyświetla polski numer bez kierunkowego", () => {
    expect(ladnyTelefon("+48690017099")).toBe("690 017 099");
  });
});
