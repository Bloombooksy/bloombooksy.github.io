/** Cennik i dane sprzedażowe Bloomly – jedno miejsce do zmiany cen na stronie. */
export const OFERTA = {
  miesiecznie: 49, // zł za salon z jedną osobą – pakiet Start
  premium: 69, // zł za salon z jedną osobą – pakiet Premium (automatyczne SMS)
  premiumWkrotce: true, // SMS-y ruszą po założeniu konta SMSAPI
  zaOsobe: 15, // zł/mies. za każdą kolejną osobę w zespole
  rokZaMiesiecy: 10, // płatność roczna = 10 miesięcy (2 gratis)
  wdrozenieOd: 150, // zł jednorazowo: przeniesienie kalendarza, cennik, wygląd
  probaDni: 14,
  smsWCenie: 100, // automatyczne przypomnienia SMS w miesiącu (Premium)
  kontaktEmail: "", // uzupełnić, gdy będzie skrzynka w domenie (pusty = sekcja kontaktu ukryta)
};

/** Konto demo – dane odświeżane co noc. Hasło jest publiczne celowo (to tylko przykładowy salon). */
export const DEMO = { email: "demo@bloomly.example", haslo: "bloomly-demo-2026", slug: "demo" };

/** Cennik Booksy Biz (biz.booksy.com/pl-pl/cennik, stan na listopad 2026), kwoty netto. */
export const BOOKSY = {
  abonamentNetto: 145,
  zaOsobeNetto: 35,
  platneOsobyMax: 9, // od 10. pracownika bez dopłat
  boostProcent: 0.45,
  boostLimitNetto: 250,
  vat: 1.23,
};

export function kosztBloomly(osoby: number) {
  const mies = OFERTA.miesiecznie + OFERTA.zaOsobe * Math.max(0, osoby - 1);
  return { miesiecznie: mies, rocznie: mies * OFERTA.rokZaMiesiecy };
}

/** Roczny koszt Booksy (brutto): abonament + dopłaty za osoby + prowizje Boost od nowych klientek. */
export function kosztBooksy(osoby: number, noweKlientkiMies = 0, sredniaCena = 0) {
  const doplaty = Math.min(Math.max(0, osoby - 1), BOOKSY.platneOsobyMax - 1);
  const abonament = (BOOKSY.abonamentNetto + BOOKSY.zaOsobeNetto * doplaty) * BOOKSY.vat * 12;
  const prowizja = Math.min(BOOKSY.boostProcent * sredniaCena, BOOKSY.boostLimitNetto) * BOOKSY.vat;
  const boost = noweKlientkiMies * prowizja * 12;
  return { abonament: Math.round(abonament), boost: Math.round(boost), razem: Math.round(abonament) + Math.round(boost) };
}

/** Aktualna wersja regulaminu – zmiana wymusza ponowną akceptację przez właścicielki salonów. */
export const REGULAMIN = {
  wersja: "2026-11-szkic",
  regulamin: "/dokumenty/regulamin.html",
  prywatnosc: "/dokumenty/prywatnosc.html",
  powierzenie: "/dokumenty/powierzenie.html",
};
