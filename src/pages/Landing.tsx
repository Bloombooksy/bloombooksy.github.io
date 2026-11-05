import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, CalendarPlus, Check, FileUp, Link2, Repeat, ShieldCheck, Smartphone, Users, Wallet } from "lucide-react";
import { BOOKSY, DEMO, OFERTA, kosztBloomly, kosztBooksy } from "../lib/oferta";
import { CSS, NaglowekMarketing, PrzyciskDemo, StopkaMarketing } from "../components/Marketing";

const zl = (n: number) => `${new Intl.NumberFormat("pl-PL").format(Math.round(n))} zł`;

/** Strona sprzedażowa Bloomly (dla niezalogowanych pod adresem głównym). */
export default function Landing() {
  return (
    <div className="ld min-h-dvh">
      <style>{CSS}</style>
      <NaglowekMarketing />

      <Hero />
      <Funkcje />
      <Kalkulator />
      <Cennik />
      <JakZaczac />
      <Pytania />

      <StopkaMarketing />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div>
        <h1 className="ld-h1">Papierowy kalendarz zostaw na pamiątkę.</h1>
        <p className="ld-lead mt-6">
          Bloomly to kalendarz wizyt dla stylistek i salonów: klientki zapisują się same przez Twój link, dostają przypomnienie dzień przed wizytą, a Ty po każdej
          wizycie jednym tapnięciem wpisujesz utarg. Bez prowizji od klientek i bez portalu, który pokazuje im konkurencję.
        </p>
        <div className="mt-8 flex flex-wrap items-start gap-3">
          <PrzyciskDemo />
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-jasny">
            Załóż salon – {OFERTA.probaDni} dni za darmo
          </Link>
        </div>
        <Link to="/jak-to-dziala" className="mt-5 inline-block text-[16px] font-semibold underline decoration-[var(--malina)] decoration-2 underline-offset-4">
          Zobacz krok po kroku, jak klientka się zapisuje
        </Link>
        <p className="mt-4 text-[14px] text-[var(--grafit-2)]">
          Od {OFERTA.miesiecznie} zł miesięcznie. Bez umowy na czas określony. Działa na telefonie i komputerze, bez instalowania.
        </p>
      </div>
      <Ilustracja />
    </section>
  );
}

/** Kartka z prawdziwego papierowego kalendarza obok tego samego dnia w aplikacji. */
function Ilustracja() {
  const wpisy = [
    ["8³⁰", "rzęsy", false],
    ["10⁰⁰", "Daria", true],
    ["11³⁰", "Daria", false],
    ["13⁰⁰", "Natalka 676", false],
    ["14³⁰", "Albena", false],
  ] as const;
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[460px] sm:h-[470px]" aria-hidden>
      <div className="ld-kartka">
        <div className="ld-kartka-gora">
          <span>Czwartek</span>
          <b>5</b>
        </div>
        {wpisy.map(([g, kto, skreslone], i) => (
          <div key={i} className="ld-wpis">
            <span>{g}</span>
            <span className={skreslone ? "ld-skreslone" : ""}>{kto}</span>
          </div>
        ))}
      </div>
      <div className="ld-telefon">
        <div className="flex items-baseline justify-between">
          <b className="text-[19px]">Dziś</b>
          <span className="text-[12px] text-[var(--grafit-2)]">czwartek, 5 listopada</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="ld-kafel">
            <small>Klientki</small>
            <b>2 / 5</b>
          </div>
          <div className="ld-kafel ld-kafel-ink">
            <small>Utarg</small>
            <b>320 zł</b>
          </div>
        </div>
        {[
          ["08:30", "Rzęsy 1:1", "Kasia", true],
          ["11:30", "Daria", "Ola", true],
          ["13:00", "Natalka", "Kasia", false],
        ].map(([g, kto, osoba, zrobione]) => (
          <div key={g as string} className="ld-wizyta">
            <b>{g}</b>
            <span className="min-w-0 flex-1 truncate">
              {kto}
              <small>{osoba}</small>
            </span>
            <span className={`ld-ptaszek ${zrobione ? "ld-ptaszek-on" : ""}`}>
              <Check className="size-4" strokeWidth={3} />
            </span>
          </div>
        ))}
        <div className="ld-zapis">
          <BellRing className="size-4 shrink-0" /> Nowy zapis: Albena, 14:30
        </div>
      </div>
    </div>
  );
}

const FUNKCJE = [
  { ikona: Link2, tytul: "Zapisy przez Twój link", opis: "Wklejasz go w bio na Instagramie albo wysyłasz SMS-em. Klientka widzi tylko wolne godziny i sama wybiera termin." },
  { ikona: Wallet, tytul: "Utarg dnia bez liczenia", opis: "Po wizycie stukasz ✓, wpisujesz kwotę i napiwek. Widzisz, ile zarobiłaś dziś, w tym tygodniu i w miesiącu – osobno gotówka, karta i BLIK." },
  { ikona: BellRing, tytul: "Przypomnienia dzień przed", opis: `Mail z godziną i linkiem do odwołania, a SMS z Twojego telefonu jednym tapnięciem. W Premium ${OFERTA.smsWCenie} automatycznych SMS-ów miesięcznie.` },
  { ikona: CalendarPlus, tytul: "Wizyta w kalendarzu klientki", opis: "Po zapisie klientka jednym tapnięciem dodaje wizytę do kalendarza Google lub iPhone’a. Może też sama ją odwołać." },
  { ikona: Users, tytul: "Cały zespół w jednym miejscu", opis: "Każda osoba ma swój grafik i usługi. Dwie stylistki przyjmują o tej samej godzinie, a klientka wybiera, do kogo idzie." },
  { ikona: ShieldCheck, tytul: "Zadatek i koniec z „nie przyszła”", opis: "Nowe albo wybrane klientki wpłacają zadatek BLIK-iem prosto na Twój telefon. Klientkę, która znika bez słowa, blokujesz w zapisach online." },
  { ikona: Repeat, tytul: "Kolejna wizyta jednym tapnięciem", opis: "Po wizycie Bloomly proponuje termin za 2, 3, 4 lub 6 tygodni i SMS z prośbą o opinię w Google." },
  { ikona: FileUp, tytul: "Przeprowadzka w jeden wieczór", opis: "Klientki przenosisz z Booksy, telefonu albo Excela plikiem CSV. Papierowy kalendarz możemy przepisać za Ciebie." },
];

function Funkcje() {
  return (
    <section className="ld-pas">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="ld-h2 max-w-2xl">Wszystko, co robisz w kalendarzu i na Messengerze, w jednym miejscu.</h2>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FUNKCJE.map(({ ikona: I, tytul, opis }) => (
            <div key={tytul}>
              <I className="size-7 text-[var(--malina)]" strokeWidth={1.75} />
              <h3 className="ld-h3 mt-4">{tytul}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--grafit-2)]">{opis}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kalkulator() {
  const [osoby, setOsoby] = useState(1);
  const [nowe, setNowe] = useState(0);
  const [cena, setCena] = useState(150);
  const booksy = kosztBooksy(osoby, nowe, cena);
  const bloomly = kosztBloomly(osoby);
  const roznica = booksy.razem - bloomly.rocznie;

  return (
    <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="kalk">
      <h2 id="kalk" className="ld-h2 max-w-2xl">
        Policz, ile zostaje w Twojej kieszeni.
      </h2>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-7">
          <Suwak etykieta="Ile osób przyjmuje klientki?" wartosc={osoby} min={1} max={10} onZmien={setOsoby} opis={osoby === 1 ? "tylko ja" : `${osoby} osoby w zespole`} />
          <Suwak
            etykieta="Nowe klientki z Booksy Boost w miesiącu"
            wartosc={nowe}
            min={0}
            max={20}
            onZmien={setNowe}
            opis={nowe ? `Booksy pobiera ${Math.round(BOOKSY.boostProcent * 100)}% pierwszej wizyty (max ${BOOKSY.boostLimitNetto} zł netto)` : "nie korzystam z Boost"}
          />
          {nowe > 0 && <Suwak etykieta="Średnia cena pierwszej wizyty" wartosc={cena} min={50} max={500} krok={10} onZmien={setCena} opis={zl(cena)} />}
        </div>
        <div className="ld-wynik">
          <div className="ld-wynik-wiersz">
            <span>Booksy przez rok</span>
            <b>{zl(booksy.razem)}</b>
          </div>
          {booksy.boost > 0 && (
            <p className="-mt-2 text-[14px] text-[var(--grafit-2)]">
              w tym {zl(booksy.abonament)} abonamentu i {zl(booksy.boost)} prowizji
            </p>
          )}
          <div className="ld-wynik-wiersz">
            <span>Bloomly przez rok</span>
            <b>{zl(bloomly.rocznie)}</b>
          </div>
          <div className="ld-wynik-suma">
            <span>Zostaje u Ciebie</span>
            <strong>{zl(Math.max(0, roznica))}</strong>
            <span className="text-[14px]">rocznie</span>
          </div>
          <p className="text-[12px] leading-snug text-[var(--grafit-2)]">
            Booksy: {BOOKSY.abonamentNetto} zł netto miesięcznie + {BOOKSY.zaOsobeNetto} zł netto za każdą kolejną osobę, plus VAT – według cennika
            biz.booksy.com z listopada 2026. Bloomly: płatność roczna.
          </p>
        </div>
      </div>
    </section>
  );
}

function Suwak({
  etykieta,
  wartosc,
  min,
  max,
  krok = 1,
  opis,
  onZmien,
}: {
  etykieta: string;
  wartosc: number;
  min: number;
  max: number;
  krok?: number;
  opis: string;
  onZmien: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-[16px] font-semibold">{etykieta}</span>
        <span className="ld-liczba">{wartosc}</span>
      </span>
      <input type="range" className="ld-suwak mt-3 w-full" min={min} max={max} step={krok} value={wartosc} onChange={(e) => onZmien(+e.target.value)} />
      <span className="mt-1 block text-[14px] text-[var(--grafit-2)]">{opis}</span>
    </label>
  );
}

function Cennik() {
  const w = [
    "Kalendarz i ekran dnia z utargiem",
    "Zapisy online przez Twój link",
    "Przypomnienia mailem i SMS z Twojego telefonu jednym tapnięciem",
    "Zadatki i blokowanie klientek, które nie przychodzą",
    "Strona wizyty dla klientki z dodaniem do kalendarza",
    "Import klientek i podsumowania miesiąca",
    "Pomoc na czacie i telefonicznie",
  ];
  return (
    <section className="ld-pas" aria-labelledby="cena">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 id="cena" className="ld-h2">
            Dwa pakiety. Bez ukrytych opłat.
          </h2>
          <ul className="mt-8 space-y-3">
            {w.map((x) => (
              <li key={x} className="flex gap-3 text-[17px]">
                <Check className="mt-1 size-5 shrink-0 text-[var(--malina)]" strokeWidth={2.5} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="ld-cena">
            <p className="text-[16px] font-semibold">Start</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="ld-cena-liczba">{OFERTA.miesiecznie} zł</span>
              <span className="text-[17px]">miesięcznie</span>
            </p>
            <p className="mt-1 text-[16px]">
              albo <b>{OFERTA.miesiecznie * OFERTA.rokZaMiesiecy} zł za rok</b> – dwa miesiące gratis
            </p>
          </div>
          <div className="ld-cena">
            <p className="flex items-center gap-2 text-[16px] font-semibold">
              Premium
              {OFERTA.premiumWkrotce && <span className="rounded-full bg-[var(--tlo-2)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--malina)]">wkrótce</span>}
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="ld-cena-liczba">{OFERTA.premium} zł</span>
              <span className="text-[17px]">miesięcznie</span>
            </p>
            <p className="mt-1 text-[16px]">
              Wszystko ze Startu + <b>{OFERTA.smsWCenie} automatycznych SMS-ów</b> miesięcznie, podpisanych nazwą salonu.
            </p>
          </div>
          <p className="text-[16px]">
            Każda kolejna osoba w zespole: <b>+{OFERTA.zaOsobe} zł</b> miesięcznie. Przeniesienie kalendarza, cennika i klientek za Ciebie:{" "}
            <b>od {OFERTA.wdrozenieOd} zł</b> jednorazowo.
          </p>
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-malina w-full">
            Załóż salon – {OFERTA.probaDni} dni za darmo
          </Link>
          <p className="text-center text-[13px] text-[var(--grafit-2)]">Na okres próbny nie potrzebujesz karty.</p>
        </div>
      </div>
    </section>
  );
}

function JakZaczac() {
  const kroki = [
    ["Załóż salon", "Wybierasz branżę – dostajesz gotowy cennik, który zmieniasz pod siebie. Trwa to minutę."],
    ["Dodaj klientki i wizyty", "Wgrywasz listę klientek z pliku albo dopisujesz je przy pierwszych wizytach."],
    ["Wyślij link", "Wklejasz link do zapisów na Instagram i wysyłasz stałym klientkom. Od teraz zapisują się same."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="start">
      <h2 id="start" className="ld-h2">
        Zaczynasz dziś wieczorem.
      </h2>
      <ol className="mt-10 grid gap-10 md:grid-cols-3">
        {kroki.map(([t, o], i) => (
          <li key={t}>
            <span className="ld-nr">{i + 1}</span>
            <h3 className="ld-h3 mt-3">{t}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--grafit-2)]">{o}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-wrap gap-3">
        <PrzyciskDemo />
        <Link to={`/zapisy/${DEMO.slug}`} className="ld-btn ld-btn-jasny">
          <Smartphone className="size-4" /> Zobacz zapisy oczami klientki
        </Link>
      </div>
    </section>
  );
}

function Pytania() {
  const pyt = [
    ["Czy klientki muszą coś instalować albo zakładać konto?", "Nie. Klikają w link, wybierają usługę i godzinę, wpisują imię i telefon. Tyle."],
    [
      "Czym to się różni od Booksy?",
      "Bloomly to Twój kalendarz, a nie portal z setkami salonów. Klientki zapisują się na Twojej stronie, w Twoich kolorach i nie widzą konkurencji obok. Nie pobieramy prowizji od nowych klientek.",
    ],
    ["Mogę przenieść klientki z Booksy?", "Tak. Pobierasz listę klientów z Booksy jako plik i wgrywasz go w zakładce Klientki. Osoby, które już masz, pomijamy."],
    ["Co z danymi klientek i RODO?", "Dane trzymamy na serwerach w Unii Europejskiej (Frankfurt). Z każdym salonem podpisujemy umowę powierzenia przetwarzania danych."],
    ["Co, jeśli zrezygnuję?", "Płacisz z miesiąca na miesiąc i możesz zrezygnować w każdej chwili. Na życzenie dostaniesz swoje dane w pliku."],
    ["Działa na iPhonie i Androidzie?", "Tak – to aplikacja w przeglądarce. Możesz dodać ją do ekranu głównego i otwierać jak zwykłą aplikację."],
  ];
  return (
    <section className="ld-pas" aria-labelledby="faq">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h2 id="faq" className="ld-h2">
          Pytania, które słyszymy najczęściej
        </h2>
        <div className="mt-8 divide-y divide-[var(--linia)] border-y border-[var(--linia)]">
          {pyt.map(([p, o]) => (
            <details key={p} className="ld-faq group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-semibold">
                {p}
                <span className="text-[24px] leading-none text-[var(--malina)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[16px] leading-relaxed text-[var(--grafit-2)]">{o}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
