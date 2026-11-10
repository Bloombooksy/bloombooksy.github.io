import { describe, expect, it } from "vitest";
import { kosztBloomly, kosztBooksy } from "./oferta";

describe("kalkulator oszczędności", () => {
  it("Booksy dla jednej osoby: 145 zł netto × 1,23 × 12", () => {
    expect(kosztBooksy(1).razem).toBe(2140);
  });
  it("dopłata za osoby kończy się na 9. osobie", () => {
    expect(kosztBooksy(12).abonament).toBe(kosztBooksy(9).abonament);
    expect(kosztBooksy(3).abonament).toBe(Math.round((145 + 70) * 1.23 * 12));
  });
  it("prowizja Boost ma limit 250 zł netto za klientkę", () => {
    expect(kosztBooksy(1, 1, 2000).boost).toBe(Math.round(250 * 1.23 * 12));
    expect(kosztBooksy(1, 2, 100).boost).toBe(Math.round(45 * 1.23 * 2 * 12));
  });
  it("Bloomly: 249 zł raz + 29 zł obsługi miesięcznie", () => {
    expect(kosztBloomly()).toEqual({ pierwszyRok: 249 + 12 * 29, kolejnyRok: 348 });
  });
});
