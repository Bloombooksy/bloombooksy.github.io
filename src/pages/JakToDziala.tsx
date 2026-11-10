import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, CalendarCheck2, Check, ChevronLeft, Clock, Hourglass, Link2, MessageSquareText, Palette, Smartphone } from "lucide-react";
import { CSS, NaglowekMarketing, PrzyciskDemo, StopkaMarketing } from "../components/Marketing";
import { DEMO, OFERTA, kosztBloomly, kosztBooksy } from "../lib/oferta";

const zl = (n: number) => `${new Intl.NumberFormat("pl-PL").format(Math.round(n))} zł`;
const SALON = "Studio Bloom";
const KOLOR = "#c9707a";
const LINK = "app.bloomly.com.pl/#/zapisy/demo";

/** „Jak to działa” – droga klientki od SMS-a z linkiem do przypomnienia, krok po kroku na telefonie. */
export default function JakToDziala() {
  return (
    <div className="ld min-h-dvh">
      <style>{CSS + CSS_JAK}</style>
      <NaglowekMarketing />
      <section className="mx-auto max-w-6xl px-5 pt-8 pb-6 lg:pt-14">
        <h1 className="ld-h1 max-w-[14ch]">Masz już swoje klientki. Niech zapisują się same.</h1>
        <p className="ld-lead mt-6">
          Wysyłasz jeden link. Klientka sama wybiera godzinę, dodaje wizytę do swojego kalendarza, a dzień wcześniej dostaje przypomnienie. Ty tylko
          potwierdzasz. Zobacz, jak to wygląda u niej i u Ciebie.
        </p>
      </section>
      <Przebieg />
      <BazaKlientek />
      <TwojSalon />
      <Sms />
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="ld-h2 max-w-2xl">Sprawdź sama, zanim cokolwiek zapłacisz.</h2>
        <p className="ld-lead mt-4">
          Salon demo ma trzy osoby w zespole i wizyty na dwa tygodnie. Strona zapisów demo działa naprawdę – możesz się na niej zapisać jak klientka.
        </p>
        <div className="mt-8 flex flex-wrap items-start gap-3">
          <PrzyciskDemo />
          <Link to={`/zapisy/${DEMO.slug}`} className="ld-btn ld-btn-jasny">
            <Smartphone className="size-4" /> Zapisz się jak klientka
          </Link>
          <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-malina">
            Załóż salon – {OFERTA.probaDni} dni za darmo
          </Link>
        </div>
      </section>
      <StopkaMarketing />
    </div>
  );
}

/* ------------------------------------------------------------ krok po kroku */

type Krok = { kto: "Ty" | "Klientka"; tytul: string; opis: string; ekran: () => ReactNode };

const KROKI: Krok[] = [
  {
    kto: "Ty",
    tytul: "Wysyłasz link",
    opis: "W karcie klientki stukasz „Wyślij link do zapisów”. Otwierają się Twoje SMS-y z gotową treścią – naciskasz tylko „Wyślij”. Link możesz też wkleić na Instagram.",
    ekran: () => <EkranSms wiadomosci={[{ od: "ja", tekst: <>Hej Ola! Tu możesz sama wybrać wolny termin na paznokcie: <u>{LINK}</u></> }]} />,
  },
  {
    kto: "Klientka",
    tytul: "Wybiera usługę i godzinę",
    opis: "Link otwiera Twoją stronę zapisów, w kolorach salonu. Klientka widzi tylko wolne godziny – nigdy nazwisk innych klientek.",
    ekran: () => <EkranZapisy />,
  },
  {
    kto: "Klientka",
    tytul: "Zostawia imię i numer",
    opis: "Jeśli wysłałaś link z jej karty, imię i telefon są już wpisane. Bez zakładania konta i bez instalowania aplikacji.",
    ekran: () => <EkranDane />,
  },
  {
    kto: "Klientka",
    tytul: "Dodaje wizytę do kalendarza",
    opis: "Od razu dostaje swoją stronę wizyty: termin, adres z mapą, Twój telefon. Jednym tapnięciem wpisuje wizytę do kalendarza w telefonie.",
    ekran: () => <EkranWizyta />,
  },
  {
    kto: "Ty",
    tytul: "Potwierdzasz jednym tapnięciem",
    opis: "U Ciebie pojawia się „Nowy zapis”. Stukasz „Potwierdź” i wysyłasz klientce SMS z potwierdzeniem – też gotowy do wysłania.",
    ekran: () => <EkranPanel />,
  },
  {
    kto: "Klientka",
    tytul: "Dostaje przypomnienie dzień przed",
    opis: "Dzień przed wizytą Bloomly wysyła jej mail z godziną i linkiem do odwołania. Z pakietem SMS – automatyczny SMS. Mniej zapomnianych wizyt, zero pisania z Twojej strony.",
    ekran: () => (
      <EkranSms
        nadawca={SALON}
        wiadomosci={[
          { od: "salon", tekst: <>Hej Ola! Przypominam o wizycie jutro (pt 7.11) o 11:30 – Manicure hybrydowy. Do zobaczenia! {SALON}</>, czas: "czw 10:00" },
        ]}
      />
    ),
  },
];

function Przebieg() {
  const [i, setI] = useState(0);
  const k = KROKI[i]!;
  return (
    <section className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-12 lg:grid-cols-[1fr_auto] lg:gap-16" aria-label="Zapis krok po kroku">
      <ol className="space-y-1">
        {KROKI.map((x, n) => (
          <li key={x.tytul}>
            <button onClick={() => setI(n)} aria-current={n === i ? "step" : undefined} className={`jk-krok ${n === i ? "jk-krok-on" : ""}`}>
              <span className="jk-nr">{n + 1}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[var(--grafit-2)]">{x.kto}</span>
                <span className="block text-[18px] font-bold">{x.tytul}</span>
                {n === i && <span className="mt-1.5 block text-[15px] leading-relaxed text-[var(--grafit-2)]">{x.opis}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="order-first mx-auto flex flex-col items-center gap-4 lg:sticky lg:top-6 lg:order-none">
        <div className="jk-telefon" aria-live="polite">
          <div className="jk-wyspa" />
          <div key={i} className="jk-ekran">
            {k.ekran()}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="ld-btn ld-btn-jasny px-4" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Poprzedni krok">
            <ChevronLeft className="size-5" />
          </button>
          <button className="ld-btn ld-btn-ink" onClick={() => setI((i + 1) % KROKI.length)}>
            {i === KROKI.length - 1 ? "Od początku" : `Dalej: ${KROKI[i + 1]!.tytul.toLowerCase()}`}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ ekrany telefonu */

function EkranSms({ wiadomosci, nadawca = "Ola Nowak" }: { wiadomosci: { od: "ja" | "salon"; tekst: ReactNode; czas?: string }[]; nadawca?: string }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#eee] py-3 text-center">
        <div className="mx-auto grid size-9 place-items-center rounded-full bg-[#ddd] text-[14px] font-bold text-white" style={{ background: nadawca === SALON ? KOLOR : "#b9b4c4" }}>
          {nadawca.charAt(0)}
        </div>
        <div className="mt-1 text-[12px] font-semibold">{nadawca}</div>
      </div>
      <div className="flex-1 space-y-3 p-3">
        {wiadomosci.map((w, n) => (
          <div key={n}>
            {w.czas && <p className="mb-1 text-center text-[10px] text-[#999]">{w.czas}</p>}
            <p className={w.od === "ja" ? "jk-dymek jk-dymek-ja" : "jk-dymek"}>{w.tekst}</p>
          </div>
        ))}
      </div>
      <div className="m-3 rounded-full border border-[#e3e3e3] px-3 py-2 text-[12px] text-[#aaa]">Wiadomość</div>
    </div>
  );
}

function Strona({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-hidden bg-[#fdf8f8] px-4 py-5">
      <p className="text-center text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: KOLOR }}>
        Zapisy online
      </p>
      <p className="text-center text-[20px] font-bold">{SALON}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Pole({ wybrane, children }: { wybrane?: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border px-3 py-2 text-[12px]" style={wybrane ? { background: KOLOR, borderColor: KOLOR, color: "#fff" } : { borderColor: "#e5d6dc", background: "#fff" }}>
      {children}
    </div>
  );
}

function EkranZapisy() {
  return (
    <Strona>
      <Pole wybrane>
        <b>Manicure hybrydowy</b> · 1 h 30 min · 120 zł
      </Pole>
      <Pole>
        <b>Pedicure hybrydowy</b> · 1 h 30 min · 130 zł
      </Pole>
      <div className="flex gap-1.5 pt-1">
        {["czw 6", "pt 7", "sob 8", "pon 10"].map((d) => (
          <span key={d} className="flex-1 rounded-lg border py-1.5 text-center text-[11px] font-semibold" style={d === "pt 7" ? { background: KOLOR, color: "#fff", borderColor: KOLOR } : { borderColor: "#e5d6dc", background: "#fff" }}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["09:00", "09:30", "11:30", "12:00", "14:30", "15:00"].map((g) => (
          <span key={g} className="rounded-lg border py-1.5 text-center text-[11px] font-semibold" style={g === "11:30" ? { background: KOLOR, color: "#fff", borderColor: KOLOR } : { borderColor: "#e5d6dc", background: "#fff" }}>
            {g}
          </span>
        ))}
      </div>
    </Strona>
  );
}

function EkranDane() {
  return (
    <Strona>
      <div className="rounded-xl bg-[#f3e6ea] px-3 py-2 text-[12px]">
        <b>Manicure hybrydowy</b> · piątek, 7 listopada, 11:30
      </div>
      <Pole>Ola Nowak</Pole>
      <Pole>690 000 001</Pole>
      <Pole>
        <span className="text-[#999]">Wiadomość – np. kolor, zdobienia</span>
      </Pole>
      <div className="rounded-xl py-2.5 text-center text-[13px] font-bold text-white" style={{ background: KOLOR }}>
        Zapisz mnie
      </div>
    </Strona>
  );
}

function EkranWizyta() {
  return (
    <div className="h-full bg-[#fdf8f8] px-4 py-5">
      <p className="text-center text-[20px] font-bold">Dziękuję, Ola!</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#e5d6dc] bg-white text-[12px]">
        <div className="flex gap-2 bg-[#f8ead6] px-3 py-2 text-[#a8661c]">
          <Hourglass className="size-4 shrink-0" /> <b>Czeka na potwierdzenie</b>
        </div>
        <div className="space-y-1 px-3 py-3">
          <p className="text-[16px] font-bold">Piątek, 7 listopada</p>
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> 11:30 – 13:00 · Manicure hybrydowy
          </p>
          <p className="text-[#57536a] underline">ul. Przykładowa 1, Warszawa</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-bold">Dodaj do swojego kalendarza</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[12px] font-bold text-white">
        <span className="rounded-lg py-2 text-center" style={{ background: KOLOR }}>
          Google
        </span>
        <span className="rounded-lg py-2 text-center" style={{ background: KOLOR }}>
          iPhone
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] shadow-sm">
        <CalendarCheck2 className="size-4 text-[#2f7a55]" /> Dodano do kalendarza · przypomnienie 2 h przed
      </div>
    </div>
  );
}

function EkranPanel() {
  return (
    <div className="h-full bg-[#f7f1ea] px-3 py-4 text-[12px]">
      <p className="text-[18px] font-bold">Dziś</p>
      <div className="mt-2 rounded-xl border border-[#e7c99a] bg-[#f8ead6] p-2.5">
        <p className="flex items-center gap-1.5 font-bold text-[#a8661c]">
          <BellRing className="size-3.5" /> Nowe zapisy do potwierdzenia
        </p>
        <div className="mt-2 rounded-lg bg-white p-2">
          <p className="font-bold">Ola Nowak</p>
          <p className="text-[#76675d]">pt 7 listopada, 11:30 · Manicure hybrydowy</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-center font-bold">
            <span className="rounded-lg border border-[#e2d6c8] py-1.5">Odrzuć</span>
            <span className="rounded-lg bg-[#4f7a5b] py-1.5 text-white">Potwierdź</span>
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-[#4f7a5b]/30 bg-[#e3eee5] p-2.5">
        <p className="flex gap-1.5">
          <Check className="size-4 shrink-0 text-[#4f7a5b]" /> <span>Ola potwierdzona. Wyślij jej SMS z wizytą.</span>
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#2a211d] px-3 py-1.5 font-bold text-white">
          <MessageSquareText className="size-3.5" /> Wyślij SMS
        </span>
      </div>
      <div className="mt-2 rounded-xl border border-[#e2d6c8] bg-white p-2.5">
        <p>
          <b>09:00</b> Kasia Wiśniewska · Przedłużanie żelem
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ dlaczego przy własnej bazie klientek */

function BazaKlientek() {
  const booksy = kosztBooksy(1).razem;
  const bloomly = kosztBloomly().pierwszyRok;
  const wiersze = [
    ["Za co płacisz", "Abonament i portal, który ma przyprowadzać nowe klientki", "Kalendarz i Twoja własna strona zapisów"],
    ["Prowizja od nowej klientki", "45% pierwszej wizyty z Boost, maks. 250 zł netto", "0 zł"],
    ["Co klientka widzi po kliknięciu", "Aplikację Booksy z innymi salonami w okolicy", "Tylko Twój salon, w Twoich kolorach"],
    ["Czy klientka zakłada konto", "Tak, konto Booksy", "Nie, wpisuje imię i telefon"],
    ["Koszt przez pierwszy rok (1 osoba)", `${zl(booksy)} brutto`, `${zl(bloomly)} (${zl(OFERTA.jednorazowo)} raz + ${zl(OFERTA.obsluga)}/mies.), potem ${zl(OFERTA.obsluga * 12)} rocznie`],
  ];
  return (
    <section className="ld-pas">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="ld-h2 max-w-3xl">Gdy masz stałe klientki, nie potrzebujesz portalu.</h2>
        <p className="ld-lead mt-4">
          Booksy opłaca się najbardziej, gdy szukasz nowych klientek w jego aplikacji. Jeśli Twój kalendarz wypełniają stałe klientki, polecenia i
          Instagram, płacisz za coś, z czego nie korzystasz – a Twoje klientki przy każdym zapisie oglądają konkurencję obok Ciebie.
        </p>
        <div className="mt-10 overflow-x-auto">
          <table className="jk-tabela">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Booksy</th>
                <th scope="col" className="jk-my">
                  Bloomly
                </th>
              </tr>
            </thead>
            <tbody>
              {wiersze.map(([co, a, b]) => (
                <tr key={co}>
                  <th scope="row">{co}</th>
                  <td>{a}</td>
                  <td className="jk-my">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-[var(--grafit-2)]">Booksy według cennika biz.booksy.com z listopada 2026 (145 zł netto miesięcznie + VAT).</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ twój salon wszędzie */

function TwojSalon() {
  const elementy = [
    { ikona: Link2, tytul: "Link z nazwą salonu", opis: `Adres w stylu ${LINK} – do bio na Instagramie, wizytówki Google i SMS-ów.` },
    { ikona: Palette, tytul: "Twoje kolory i nazwa", opis: "Strona zapisów i strona wizyty klientki mają Twój kolor i nazwę salonu. Bez obcych logo i reklam." },
    { ikona: MessageSquareText, tytul: "Przypomnienia od salonu", opis: "Mail i SMS są podpisane nazwą Twojego salonu, a nie portalu." },
    { ikona: Smartphone, tytul: "Aplikacja na ekranie telefonu", opis: "Dodajesz Bloomly do ekranu głównego i otwierasz jak zwykłą aplikację – na iPhonie i Androidzie." },
  ];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="ld-h2">Twój salon wygląda wszędzie tak samo.</h2>
        <p className="ld-lead mt-4">
          Klientka od pierwszego SMS-a do przypomnienia ma do czynienia tylko z Twoim salonem. To trochę jak własny sklep zamiast stoiska w galerii.
        </p>
        <div className="mt-8 flex items-center gap-3" aria-hidden>
          {["#c9707a", "#b98a4e", "#4f7a5b", "#6b7fa8", "#9b6fa6"].map((k) => (
            <span key={k} className="size-9 rounded-full" style={{ background: k }} />
          ))}
          <span className="text-[14px] text-[var(--grafit-2)]">kolor wybierasz w ustawieniach</span>
        </div>
      </div>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {elementy.map(({ ikona: I, tytul, opis }) => (
          <div key={tytul}>
            <I className="size-7 text-[var(--malina)]" strokeWidth={1.75} />
            <h3 className="ld-h3 mt-3">{tytul}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--grafit-2)]">{opis}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ sms-y */

function Sms() {
  const wiersze = [
    ["Zaproszenie z linkiem do zapisów", "Kiedy chcesz", "Ty, ze swojego telefonu – treść jest gotowa", "0 zł (w Twoim abonamencie)"],
    ["Potwierdzenie wizyty z linkiem do kalendarza", "Po dodaniu lub potwierdzeniu wizyty", "Ty, jednym tapnięciem", "0 zł (w Twoim abonamencie)"],
    ["Przypomnienie mailem", "Dzień wcześniej, o godzinie, którą ustawisz", "Bloomly, automatycznie, w kolorach salonu", "W cenie (pakiet Start)"],
    ["Przypomnienie SMS", "Dzień wcześniej", "Ty jednym tapnięciem – albo Bloomly automatycznie z pakietem SMS", `0 zł z Twojego telefonu; pakiety od ${OFERTA.pakietySms[0]!.cena} zł za ${OFERTA.pakietySms[0]!.sms} SMS`],
    ["„Zwolnił się termin”", "Gdy ktoś odwoła wizytę", "Bloomly mailem do osób z listy oczekujących (albo Ty SMS-em)", "W cenie"],
    ["„Czas na kolejną wizytę”", "Po zwykłym czasie od usługi, np. 3 tygodnie po hybrydzie", "Bloomly mailem – tylko klientkom, które się zgodziły", "W cenie"],
    ["Prośba o opinię Google", "Po wizycie", "Ty, jednym tapnięciem", "0 zł (w Twoim abonamencie)"],
  ];
  return (
    <section className="ld-pas">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="ld-h2 max-w-3xl">Wiadomości: które, kiedy i ile kosztują.</h2>
        <div className="mt-10 overflow-x-auto">
          <table className="jk-tabela">
            <thead>
              <tr>
                <th scope="col">Wiadomość</th>
                <th scope="col">Kiedy</th>
                <th scope="col">Kto wysyła</th>
                <th scope="col">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {wiersze.map(([a, b, c, d]) => (
                <tr key={a}>
                  <th scope="row">{a}</th>
                  <td>{b}</td>
                  <td>{c}</td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-[var(--grafit-2)]">
          Treść przypomnienia ustawiasz sama, a podgląd pokazuje, ile SMS-ów zajmie. Polskie litery zamieniamy na zwykłe (ą → a), bo wtedy jeden SMS
          mieści 160 znaków zamiast 70 – klientka dostaje jedną wiadomość, a Ty płacisz za jedną.
        </p>
      </div>
    </section>
  );
}

const CSS_JAK = `
.jk-krok { display: flex; gap: 16px; width: 100%; text-align: left; padding: 14px 16px; border-radius: 18px; transition: background .15s; }
.jk-krok:hover { background: var(--tlo-2); }
.jk-krok-on { background: #fff; box-shadow: 0 1px 0 var(--linia), 0 10px 30px -18px rgba(70,20,45,.35); }
.jk-krok:focus-visible { outline: 3px solid var(--malina); outline-offset: 2px; }
.jk-nr { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 999px; border: 2px solid var(--linia);
  font-family: "Bricolage Grotesque Variable", sans-serif; font-weight: 800; color: var(--grafit-2); }
.jk-krok-on .jk-nr { border-color: var(--malina); background: var(--malina); color: #fff; }
.jk-telefon { position: relative; width: 290px; height: 580px; border-radius: 46px; background: #1f1d2b; padding: 12px;
  box-shadow: 0 40px 80px -30px rgba(31,29,43,.55); }
.jk-wyspa { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); width: 84px; height: 22px; border-radius: 999px; background: #1f1d2b; z-index: 2; }
.jk-ekran { height: 100%; border-radius: 36px; overflow: hidden; background: #fff; padding-top: 34px; animation: jk-pojaw .25s ease-out; }
@keyframes jk-pojaw { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.jk-dymek { max-width: 84%; padding: 9px 12px; border-radius: 18px 18px 18px 6px; background: #ececf0; font-size: 13px; line-height: 1.4; color: #1f1d2b; }
.jk-dymek-ja { margin-left: auto; border-radius: 18px 18px 6px 18px; background: #2f7cf6; color: #fff; }
.jk-tabela { width: 100%; min-width: 640px; border-collapse: collapse; background: #fff; border-radius: 20px; overflow: hidden; font-size: 15px; }
.jk-tabela th, .jk-tabela td { padding: 14px 18px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--linia); }
.jk-tabela thead th { font-family: "Bricolage Grotesque Variable", sans-serif; font-size: 18px; }
.jk-tabela tbody th { font-weight: 700; width: 26%; }
.jk-tabela tr:last-child th, .jk-tabela tr:last-child td { border-bottom: 0; }
.jk-my { background: #fdeef3; }
.jk-tabela td.jk-my { font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .jk-ekran { animation: none; } }
`;
