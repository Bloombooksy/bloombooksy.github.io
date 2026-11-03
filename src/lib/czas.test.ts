import { describe, expect, it } from "vitest";
import { dodajDni, dniMiesiaca, dzienKey, dzienTygodnia, godzina, opisDnia, tydzien, wStrefie, wzglednie } from "./czas";

describe("czas w strefie salonu", () => {
  it("zamienia polską godzinę na UTC – zimą +1h, latem +2h", () => {
    expect(wStrefie("2026-01-15", "09:00").toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(wStrefie("2026-07-15", "09:00").toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("radzi sobie z dniem zmiany czasu", () => {
    // 29.03.2026 o 2:00 zegarki przeskakują na 3:00
    expect(wStrefie("2026-03-29", "10:00").toISOString()).toBe("2026-03-29T08:00:00.000Z");
    expect(wStrefie("2026-10-25", "10:00").toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });

  it("dzień i godzina liczone w Polsce, nie w UTC", () => {
    const pozno = new Date("2026-11-03T23:30:00Z"); // w Polsce już 4.11, 00:30
    expect(dzienKey(pozno)).toBe("2026-11-04");
    expect(godzina(pozno)).toBe("00:30");
  });

  it("tydzień zaczyna się w poniedziałek", () => {
    expect(dzienTygodnia("2026-11-08")).toBe(7);
    expect(tydzien("2026-11-04")).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });

  it("przechodzi przez koniec miesiąca i roku", () => {
    expect(dodajDni("2026-12-31", 1)).toBe("2027-01-01");
    expect(dniMiesiaca("2028-02-10")).toHaveLength(29);
  });

  it("opisuje dzień po polsku", () => {
    expect(opisDnia("2026-11-04")).toBe("środa, 4 listopada");
    expect(wzglednie("2026-11-05", "2026-11-04")).toBe("jutro");
    expect(wzglednie("2026-11-09", "2026-11-04")).toBeNull();
  });
});
