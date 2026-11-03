import { describe, expect, it } from "vitest";
import { linkGoogle, plikIcs } from "./kalendarz";
import { linkWizyty, linkZapisow, smsHref, trescWizyty, trescZaproszenia } from "./wiadomosci";

const e = {
  tytul: "Manicure hybrydowy – Bloom Beauty",
  start: "2026-11-07T08:00:00Z",
  koniec: "2026-11-07T09:30:00Z",
  miejsce: "ul. Wróblewskiego 8, 32-600 Oświęcim",
  uid: "abc",
};

describe("dodawanie do kalendarza", () => {
  it("link Google ma daty w UTC i adres", () => {
    const u = new URL(linkGoogle(e));
    expect(u.searchParams.get("dates")).toBe("20261107T080000Z/20261107T093000Z");
    expect(u.searchParams.get("location")).toBe(e.miejsce);
  });

  it("plik .ics jest poprawny i ma przypomnienie", () => {
    const ics = plikIcs(e, "2026-11-04T00:00:00Z");
    expect(ics).toContain("DTSTART:20261107T080000Z\r\n");
    expect(ics).toContain("LOCATION:ul. Wróblewskiego 8\\, 32-600 Oświęcim");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});

describe("wiadomości do klientek", () => {
  const baza = "https://hpogodala2912.github.io/bloombeauty-terminarz/";

  it("link do zapisów z imieniem i numerem", () => {
    expect(linkZapisow("tok", { imie: "Ola Nowak", telefon: "690 000 001" }, baza)).toBe(
      `${baza}#/zapisy/tok?imie=Ola+Nowak&tel=690+000+001`,
    );
    expect(linkZapisow("tok", undefined, baza)).toBe(`${baza}#/zapisy/tok`);
  });

  it("SMS otwiera się z numerem i treścią", () => {
    expect(smsHref("690 000 001", "Hej!")).toBe("sms:+48690000001?&body=Hej!");
  });

  it("treść potwierdzenia", () => {
    const t = trescWizyty({ imie: "Ola Nowak", start: "2026-11-07T08:00:00Z", usluga: "Manicure", salon: "Bloom Beauty", link: linkWizyty("k1", baza) });
    expect(t).toBe(`Hej Ola! Potwierdzam wizytę: sob 7.11, godz. 09:00 – Manicure. Szczegóły i dodanie do kalendarza: ${baza}#/wizyta/k1 Bloom Beauty`);
    expect(trescZaproszenia("", "L")).toBe("Hej! Tu możesz sama wybrać wolny termin na paznokcie: L");
  });
});
