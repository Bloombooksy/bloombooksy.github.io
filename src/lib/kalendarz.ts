/** Dodawanie wizyty do kalendarza w telefonie klientki: Google Calendar (link) i plik .ics (iPhone, Outlook). */

export type Wydarzenie = { tytul: string; start: string; koniec: string; miejsce?: string; opis?: string; uid?: string };

/** 2026-11-07T08:00:00Z → 20261107T080000Z */
function utc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function linkGoogle(e: Wydarzenie): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.tytul, dates: `${utc(e.start)}/${utc(e.koniec)}` });
  if (e.miejsce) q.set("location", e.miejsce);
  if (e.opis) q.set("details", e.opis);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Treść pliku .ics z przypomnieniem 2 godziny wcześniej. */
export function plikIcs(e: Wydarzenie, teraz = new Date().toISOString()): string {
  const linie = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bloom Beauty//BloomBooksy//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid ?? utc(e.start)}@bloombooksy`,
    `DTSTAMP:${utc(teraz)}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.koniec)}`,
    `SUMMARY:${esc(e.tytul)}`,
    ...(e.miejsce ? [`LOCATION:${esc(e.miejsce)}`] : []),
    ...(e.opis ? [`DESCRIPTION:${esc(e.opis)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.tytul)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linie.join("\r\n") + "\r\n";
}

export function pobierzIcs(e: Wydarzenie, nazwa = "wizyta.ics") {
  const url = URL.createObjectURL(new Blob([plikIcs(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwa;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
