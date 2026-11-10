/** Cennik i dane sprzedażowe Bloomly – jedno miejsce do zmiany cen na stronie. */
export const OFERTA = {
  jednorazowo: 249, // zł raz – zakup aplikacji dla salonu (z pomocą w przeniesieniu kalendarza)
  obsluga: 29, // zł/mies. za salon, bez względu na liczbę osób – serwer, maile, kopie danych, aktualizacje, pomoc
  probaDni: 14,
  smsWkrotce: true, // pakiety SMS ruszą po założeniu konta SMSAPI
  pakietySms: [
    { sms: 100, cena: 25 },
    { sms: 300, cena: 59 },
    { sms: 600, cena: 99 },
  ], // zł/mies., dobierane do obsługi
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

/** Koszt Bloomly: jednorazowy zakup + obsługa co miesiąc (liczba osób nie zmienia ceny). */
export function kosztBloomly() {
  const rokObslugi = OFERTA.obsluga * 12;
  return { pierwszyRok: OFERTA.jednorazowo + rokObslugi, kolejnyRok: rokObslugi };
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
