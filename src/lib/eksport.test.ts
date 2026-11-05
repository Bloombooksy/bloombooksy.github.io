import { describe, expect, it } from "vitest";
import { dataCsv, doCsv } from "./eksport";

describe("eksport CSV", () => {
  it("dodaje BOM, rozdziela średnikiem i cytuje pola ze średnikiem, cudzysłowem i nową linią", () => {
    const csv = doCsv(["Imię", "Notatka"], [["Ola", 'lubi "french"; bez zdobień'], ["Kasia", "linia1\nlinia2"], ["Ewa", null]]);
    expect(csv.startsWith("﻿Imię;Notatka\r\n")).toBe(true);
    expect(csv).toContain('Ola;"lubi ""french""; bez zdobień"\r\n');
    expect(csv).toContain('Kasia;"linia1\nlinia2"\r\n');
    expect(csv).toContain("Ewa;\r\n");
  });

  it("zapisuje datę w strefie salonu", () => {
    expect(dataCsv("2026-11-07T10:30:00Z")).toBe("2026-11-07 11:30");
    expect(dataCsv(null)).toBe("");
  });
});
