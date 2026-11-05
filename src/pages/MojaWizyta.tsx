import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CalendarPlus, CalendarX2, Clock, Hourglass, MapPin, Phone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { dzienKey, godzina, opisDnia } from "../lib/czas";
import { linkGoogle, pobierzIcs, type Wydarzenie } from "../lib/kalendarz";
import { ladnyTelefon } from "../lib/sms";
import type { StatusWizyty } from "../lib/database.types";
import { Blad, Ladowanie } from "../components/ui";
import { Ekran } from "../components/EkranKlientki";

type Info = {
  salon: string;
  kolor?: string;
  pracownik?: string | null;
  zadatek?: number | null;
  zadatek_wplacony?: boolean;
  zadatek_instrukcja?: string | null;
  info?: string;
  adres: string;
  telefon: string;
  usluga: string;
  start: string;
  koniec: string;
  status: StatusWizyty;
  imie: string;
  odwolala_klientka: boolean;
  mozna_odwolac: boolean;
  zapisy_token: string | null;
};

const STAN: Record<StatusWizyty, { txt: string; opis: string; cls: string; ikona: typeof Clock }> = {
  oczekuje: { txt: "Czeka na potwierdzenie", opis: "Dam znać, gdy potwierdzę termin. Ta strona też się zaktualizuje.", cls: "bg-bursztyn-jasny text-bursztyn", ikona: Hourglass },
  potwierdzona: { txt: "Wizyta potwierdzona", opis: "Do zobaczenia! Dzień wcześniej dostaniesz przypomnienie.", cls: "bg-ziel-jasny text-ziel", ikona: CalendarCheck2 },
  zrealizowana: { txt: "Wizyta odbyła się", opis: "Dziękuję i zapraszam ponownie!", cls: "bg-piasek text-mokka", ikona: CalendarCheck2 },
  odwolana: { txt: "Wizyta odwołana", opis: "Ten termin jest już wolny.", cls: "bg-roz-jasny text-[#8a2f3a]", ikona: CalendarX2 },
  nieobecnosc: { txt: "Wizyta się nie odbyła", opis: "Jeśli to pomyłka – zadzwoń.", cls: "bg-roz-jasny text-[#8a2f3a]", ikona: CalendarX2 },
};

/** Strona wizyty dla klientki (link z potwierdzenia): status na żywo, dodanie do kalendarza, odwołanie. */
export default function MojaWizyta() {
  const { kod = "" } = useParams();
  const [params] = useSearchParams();
  const nowa = params.has("nowa");
  const qc = useQueryClient();
  const [blad, setBlad] = useState("");
  const [odwoluje, setOdwoluje] = useState(false);
  const { data: w, isLoading } = useQuery({
    queryKey: ["wizyta", kod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wizyta_info", { p_kod: kod });
      if (error) throw error;
      return data as Info | null;
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <Ladowanie />;
  if (!w)
    return (
      <Ekran>
        <CalendarX2 className="mx-auto size-10 text-szary" />
        <h1 className="naglowek mt-3 text-center">Nie znalazłam tej wizyty</h1>
        <p className="mt-2 text-center text-szary">Sprawdź, czy link jest pełny, albo zadzwoń do salonu.</p>
      </Ekran>
    );

  const stan = STAN[w.status];
  const I = stan.ikona;
  const aktualna = w.status === "oczekuje" || w.status === "potwierdzona";
  const wydarzenie: Wydarzenie = {
    tytul: `${w.usluga || "Wizyta"} – ${w.salon}`,
    start: w.start,
    koniec: w.koniec,
    miejsce: w.adres,
    opis: `${w.salon}${w.telefon ? `, tel. ${w.telefon}` : ""}\nSzczegóły wizyty: ${window.location.href.split("?")[0]}`,
    uid: kod,
  };

  async function odwolaj() {
    if (!window.confirm("Na pewno odwołać wizytę? Termin zwolni się dla innych.")) return;
    setBlad("");
    setOdwoluje(true);
    const { data, error } = await supabase.rpc("wizyta_odwolaj", { p_kod: kod });
    setOdwoluje(false);
    if (error) return setBlad(error.message);
    qc.setQueryData(["wizyta", kod], data);
  }

  return (
    <Ekran kolor={w.kolor}>
      <header className="text-center">
        <p className="text-[12px] font-bold tracking-[0.2em] text-zloto uppercase">{w.salon}</p>
        <h1 className="mt-1 font-serif text-[30px] leading-tight font-semibold">
          {nowa ? `Dziękuję${w.imie ? `, ${w.imie}` : ""}!` : `${w.imie ? `${w.imie}, ` : ""}Twoja wizyta`}
        </h1>
      </header>

      <section className="karta overflow-hidden">
        <div className={`flex items-start gap-3 px-5 py-4 ${stan.cls}`}>
          <I className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">{stan.txt}</p>
            <p className="text-[14px] opacity-90">{w.odwolala_klientka ? "Odwołałaś tę wizytę." : stan.opis}</p>
          </div>
        </div>
        <div className={`space-y-3 px-5 py-5 ${aktualna ? "" : "opacity-60"}`}>
          <p className="font-serif text-[26px] leading-tight font-semibold first-letter:uppercase">{opisDnia(dzienKey(w.start))}</p>
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <Clock className="size-5 text-szary" /> {godzina(w.start)} – {godzina(w.koniec)}
          </p>
          {w.usluga && (
            <p className="text-[16px] text-szary">
              {w.usluga}
              {w.pracownik && <> · u {w.pracownik}</>}
            </p>
          )}
          {w.adres && (
            <a className="flex items-center gap-2 text-[15px] underline decoration-linia underline-offset-4" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.adres)}`}>
              <MapPin className="size-5 text-szary" /> {w.adres}
            </a>
          )}
          {w.telefon && (
            <a className="flex items-center gap-2 text-[15px] underline decoration-linia underline-offset-4" href={`tel:${w.telefon}`}>
              <Phone className="size-5 text-szary" /> {ladnyTelefon(w.telefon)}
            </a>
          )}
        </div>
      </section>

      {aktualna && w.info && (
        <section className="karta p-4">
          <p className="text-[13px] font-bold text-szary">Od salonu</p>
          <p className="mt-1 whitespace-pre-line text-[15px]">{w.info}</p>
        </section>
      )}

      {aktualna && w.zadatek != null && (
        <section className={`rounded-2xl p-4 ${w.zadatek_wplacony ? "bg-ziel-jasny text-ziel" : "border border-bursztyn/30 bg-bursztyn-jasny text-bursztyn"}`}>
          {w.zadatek_wplacony ? (
            <p className="font-bold">Zadatek {w.zadatek} zł wpłacony ✓</p>
          ) : (
            <>
              <p className="text-[17px] font-bold">Wpłać zadatek {w.zadatek} zł</p>
              <p className="mt-1 text-[15px] text-atrament">{w.zadatek_instrukcja || "Salon poda Ci, jak go wpłacić."}</p>
              <p className="mt-2 text-[13px]">Zadatek jest częścią ceny wizyty. Gdy salon go odnotuje, zobaczysz tu potwierdzenie.</p>
            </>
          )}
        </section>
      )}

      {aktualna && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <CalendarPlus className="size-5 text-zloto" /> Dodaj do swojego kalendarza
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <a className="btn-glowny" href={linkGoogle(wydarzenie)} target="_blank" rel="noreferrer">
              Google
            </a>
            <button className="btn-glowny" onClick={() => pobierzIcs(wydarzenie, "wizyta-bloom-beauty.ics")}>
              iPhone / Outlook
            </button>
          </div>
          <p className="text-[13px] text-szary">Telefon przypomni Ci o wizycie dzień wcześniej i 2 godziny przed.</p>
        </section>
      )}

      <Blad>{blad}</Blad>
      <div className="space-y-2 border-t border-linia pt-5">
        {w.zapisy_token && (
          <Link to={`/zapisy/${w.zapisy_token}`} className="btn-jasny w-full">
            {aktualna ? "Umów kolejną wizytę" : "Wybierz nowy termin"}
          </Link>
        )}
        {w.mozna_odwolac && (
          <button className="btn-cichy w-full text-[#8a2f3a]" disabled={odwoluje} onClick={odwolaj}>
            {odwoluje ? "Odwołuję…" : "Odwołaj wizytę"}
          </button>
        )}
        {aktualna && !w.mozna_odwolac && <p className="text-center text-[13px] text-szary">Chcesz odwołać? Zadzwoń – na odwołanie przez internet jest już za późno.</p>}
      </div>
      <p className="text-center text-[13px] text-szary">Zapisz ten link – zawsze sprawdzisz tu swoją wizytę.</p>
    </Ekran>
  );
}


