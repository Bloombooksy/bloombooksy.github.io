import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellRing, CalendarPlus, Check, FileUp, Link2, Smartphone, Users, Wallet } from "lucide-react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/caveat/500.css";
import { supabase, komunikat } from "../lib/supabase";
import { BOOKSY, DEMO, OFERTA, kosztBloomly, kosztBooksy } from "../lib/oferta";

const zl = (n: number) => `${new Intl.NumberFormat("pl-PL").format(Math.round(n))} zł`;

/** Strona sprzedażowa Bloomly (dla niezalogowanych pod adresem głównym). */
export default function Landing() {
  return (
    <div className="ld min-h-dvh">
      <style>{CSS}</style>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="ld-logo">Bloomly</span>
        <nav className="flex items-center gap-2">
          <Link to="/logowanie" className="ld-btn ld-btn-cichy">
            Zaloguj się
          </Link>
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-ink ld-szeroki">
            Załóż salon
          </Link>
        </nav>
      </header>

      <Hero />
      <Funkcje />
      <Kalkulator />
      <Cennik />
      <JakZaczac />
      <Pytania />

      <footer className="ld-stopka">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-4 px-5 py-10">
          <span className="ld-logo text-[22px]">Bloomly</span>
          <p className="text-[14px]">Kalendarz i zapisy online dla salonów beauty. Dane przechowywane w UE.</p>
          {OFERTA.kontaktEmail && (
            <a className="underline" href={`mailto:${OFERTA.kontaktEmail}`}>
              {OFERTA.kontaktEmail}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}

function PrzyciskDemo({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const [czeka, setCzeka] = useState(false);
  const [blad, setBlad] = useState("");
  async function wejdz() {
    setCzeka(true);
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO.email, password: DEMO.haslo });
    setCzeka(false);
    if (error) return setBlad(komunikat(error));
    nav("/");
  }
  return (
    <span className="inline-flex flex-col">
      <button className={`ld-btn ld-btn-ink ${className}`} onClick={wejdz} disabled={czeka}>
        {czeka ? "Otwieram…" : "Zobacz salon demo"}
      </button>
      {blad && <span className="mt-1 text-[13px] text-[var(--malina)]">{blad}</span>}
    </span>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div>
        <h1 className="ld-h1">Papierowy kalendarz zostaw na pamiątkę.</h1>
        <p className="ld-lead mt-6">
          Bloomly to kalendarz wizyt dla stylistek i salonów: klientki zapisują się same przez Twój link, dostają przypomnienie SMS, a Ty po każdej
          wizycie jednym tapnięciem wpisujesz utarg. Bez prowizji od klientek i bez portalu, który pokazuje im konkurencję.
        </p>
        <div className="mt-8 flex flex-wrap items-start gap-3">
          <PrzyciskDemo />
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-jasny">
            Załóż salon – {OFERTA.probaDni} dni za darmo
          </Link>
        </div>
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
  { ikona: BellRing, tytul: "Przypomnienia SMS", opis: `Dzień przed wizytą klientka dostaje SMS z godziną. ${OFERTA.smsWCenie} SMS-ów miesięcznie w cenie.` },
  { ikona: CalendarPlus, tytul: "Wizyta w kalendarzu klientki", opis: "Po zapisie klientka jednym tapnięciem dodaje wizytę do kalendarza Google lub iPhone’a. Może też sama ją odwołać." },
  { ikona: Users, tytul: "Cały zespół w jednym miejscu", opis: "Każda osoba ma swój grafik i usługi. Dwie stylistki przyjmują o tej samej godzinie, a klientka wybiera, do kogo idzie." },
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
    `${OFERTA.smsWCenie} przypomnień SMS miesięcznie`,
    "Strona wizyty dla klientki z dodaniem do kalendarza",
    "Import klientek i podsumowania miesiąca",
    "Pomoc na czacie i telefonicznie",
  ];
  return (
    <section className="ld-pas" aria-labelledby="cena">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 id="cena" className="ld-h2">
            Jedna cena. Wszystko w środku.
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
        <div className="ld-cena">
          <p className="text-[16px] font-semibold">Salon z jedną osobą</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="ld-cena-liczba">{OFERTA.miesiecznie} zł</span>
            <span className="text-[17px]">miesięcznie</span>
          </p>
          <p className="mt-1 text-[16px]">
            albo <b>{OFERTA.miesiecznie * OFERTA.rokZaMiesiecy} zł za rok</b> – dwa miesiące gratis
          </p>
          <hr className="my-6 border-[var(--linia)]" />
          <p className="text-[16px]">
            Każda kolejna osoba w zespole: <b>+{OFERTA.zaOsobe} zł</b> miesięcznie.
          </p>
          <p className="mt-2 text-[16px]">
            Przeniesienie kalendarza, cennika i klientek za Ciebie: <b>od {OFERTA.wdrozenieOd} zł</b> jednorazowo.
          </p>
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-malina mt-8 w-full">
            Załóż salon – {OFERTA.probaDni} dni za darmo
          </Link>
          <p className="mt-3 text-center text-[13px] text-[var(--grafit-2)]">Na okres próbny nie potrzebujesz karty.</p>
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

const CSS = `
.ld {
  --papier: #fdf8f8; --tlo-2: #f7e9ee; --grafit: #1f1d2b; --grafit-2: #57536a;
  --malina: #c2185b; --dlugopis: #2d3a9e; --linia: #e5d6dc; --linia-kartki: #cfd8ee;
  background: var(--papier); color: var(--grafit);
  font-family: "Manrope Variable", ui-sans-serif, system-ui, sans-serif;
}
.ld-logo { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.03em; }
.ld-h1 { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; font-size: clamp(42px, 7vw, 76px); line-height: 0.98; letter-spacing: -0.035em; max-width: 12ch; }
.ld-h2 { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 750; font-size: clamp(30px, 4.2vw, 46px); line-height: 1.05; letter-spacing: -0.025em; }
.ld-h3 { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -0.01em; }
.ld-lead { font-size: 19px; line-height: 1.6; color: var(--grafit-2); max-width: 36em; }
.ld-pas { background: var(--tlo-2); }
.ld-stopka { background: var(--grafit); color: #e9e5ef; }
.ld-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border-radius: 999px; font-weight: 700; font-size: 16px; transition: transform .15s, background .15s; }
.ld-btn:active { transform: scale(.98); }
.ld-btn { white-space: nowrap; }
.ld-szeroki { display: none; } @media (min-width: 640px) { .ld-szeroki { display: inline-flex; } }
.ld-btn:focus-visible { outline: 3px solid var(--malina); outline-offset: 3px; }
.ld-btn-ink { background: var(--grafit); color: #fff; } .ld-btn-ink:hover { background: #38344b; }
.ld-btn-malina { background: var(--malina); color: #fff; } .ld-btn-malina:hover { background: #a3134c; }
.ld-btn-jasny { border: 1.5px solid var(--grafit); } .ld-btn-jasny:hover { background: #fff; }
.ld-btn-cichy:hover { background: var(--tlo-2); }
.ld-btn:disabled { opacity: .6; }

.ld-kartka { position: absolute; left: 10px; top: 6px; width: 68%; height: 92%; background: #fff; transform: rotate(-4deg);
  border-radius: 4px 14px 14px 4px; box-shadow: 0 1px 0 #ead7de, 0 18px 40px -18px rgba(70,20,45,.35);
  border-left: 10px solid var(--malina); padding: 18px 18px 18px 22px;
  background-image: repeating-linear-gradient(#fff 0 47px, var(--linia-kartki) 47px 48px); background-position: 0 58px; }
.ld-kartka-gora { display: flex; justify-content: space-between; align-items: baseline; height: 48px; font-weight: 700; color: var(--grafit); }
.ld-kartka-gora b { font-size: 40px; font-weight: 400; font-family: "Bricolage Grotesque Variable", sans-serif; }
.ld-wpis { display: flex; gap: 14px; height: 48px; align-items: center; font-family: "Caveat", cursive; font-size: 27px; color: var(--dlugopis); }
.ld-wpis span:first-child { width: 58px; }
.ld-skreslone { position: relative; color: #6b74b8; }
.ld-skreslone::after { content: ""; position: absolute; left: -6px; right: -8px; top: 52%; height: 2.5px; background: var(--dlugopis); transform: rotate(-8deg); border-radius: 2px; }

.ld-telefon { position: absolute; right: 0; bottom: 0; width: 62%; min-width: 250px; background: #fff; border-radius: 28px; padding: 18px 16px 16px;
  border: 1px solid var(--linia); box-shadow: 0 30px 60px -24px rgba(31,29,43,.45); }
.ld-kafel { border: 1px solid var(--linia); border-radius: 14px; padding: 8px 10px; }
.ld-kafel small { display: block; font-size: 11px; color: var(--grafit-2); font-weight: 700; }
.ld-kafel b { font-family: "Bricolage Grotesque Variable", sans-serif; font-size: 21px; }
.ld-kafel-ink { background: var(--grafit); color: #fff; border-color: var(--grafit); } .ld-kafel-ink small { color: #cfcbe0; }
.ld-wizyta { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 9px 10px; border-radius: 12px; background: #faf6f7; font-size: 14px; }
.ld-wizyta small { display: block; font-size: 12px; color: var(--grafit-2); }
.ld-ptaszek { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; border: 1.5px solid var(--linia); color: #c9c2cc; }
.ld-ptaszek-on { background: #2f7a55; border-color: #2f7a55; color: #fff; }
.ld-zapis { display: flex; gap: 8px; align-items: center; margin-top: 10px; padding: 9px 10px; border-radius: 12px; background: #fde9f0; color: var(--malina); font-size: 13px; font-weight: 700; }

.ld-wynik { background: #fff; border: 1px solid var(--linia); border-radius: 24px; padding: 28px; display: grid; gap: 18px; align-content: start; }
.ld-wynik-wiersz { display: flex; justify-content: space-between; align-items: baseline; font-size: 17px; }
.ld-wynik-wiersz b { font-family: "Bricolage Grotesque Variable", sans-serif; font-size: 26px; }
.ld-wynik-suma { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; border-top: 2px solid var(--grafit); padding-top: 18px; font-weight: 700; }
.ld-wynik-suma strong { font-family: "Bricolage Grotesque Variable", sans-serif; font-size: clamp(40px, 6vw, 58px); line-height: 1; color: var(--malina); letter-spacing: -0.03em; }
.ld-liczba { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; font-size: 28px; }
.ld-suwak { accent-color: var(--malina); height: 28px; }
.ld-cena { background: #fff; border-radius: 24px; padding: 32px; border: 1px solid var(--linia); }
.ld-cena-liczba { font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: -0.04em; }
.ld-nr { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; border: 2px solid var(--malina); color: var(--malina);
  font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; font-size: 20px; }
.ld-faq summary::-webkit-details-marker { display: none; }
@media (prefers-reduced-motion: reduce) { .ld * { transition: none !important; } }
`;
