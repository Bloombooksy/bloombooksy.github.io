import { useEffect, useState } from "react";
import { DEMO } from "../lib/oferta";
import { Link } from "react-router-dom";
import { ZmianaHasla } from "../components/ZmianaHasla";
import { BarChart3, BellRing, ChevronRight, Clock, Database, Gem, KeyRound, Link2, LogOut, Sparkles, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCzyWlascicielka, useSalon } from "../lib/dane";

const POZYCJE = [
  { to: "/podsumowanie", txt: "Podsumowanie", opis: "Utarg tygodnia i miesiąca", ikona: BarChart3, kazdy: true },
  { to: "/zespol", txt: "Zespół", opis: "Osoby, ich godziny i usługi", ikona: Users },
  { to: "/uslugi", txt: "Usługi i cennik", opis: "Czas trwania, ceny, kolory", ikona: Sparkles },
  { to: "/godziny", txt: "Godziny pracy i urlopy", opis: "Kiedy przyjmujesz klientki", ikona: Clock },
  { to: "/link", txt: "Zapisy online", opis: "Link dla klientek, adres, wygląd", ikona: Link2 },
  { to: "/sms", txt: "Przypomnienia", opis: "Mail lub SMS dzień przed wizytą", ikona: BellRing },
  { to: "/pakiet", txt: "Pakiet i płatność", opis: "Okres próbny, pakiet Start lub Premium", ikona: Gem },
  { to: "/dane", txt: "Twoje dane", opis: "Pobierz klientki i wizyty, usuń salon", ikona: Database },
];

export default function Wiecej() {
  const { data: salon } = useSalon();
  const wlascicielka = useCzyWlascicielka();
  const [haslo, setHaslo] = useState(false);
  const [demo, setDemo] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setDemo(data.user?.email === DEMO.email));
  }, []);
  const pozycje = POZYCJE.filter((p) => wlascicielka || ("kazdy" in p && p.kazdy));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="naglowek">{salon?.nazwa ?? "Więcej"}</h1>
      <ul className="karta divide-y divide-linia">
        {pozycje.map(({ to, txt, opis, ikona: I }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-4 px-4 py-4 hover:bg-piasek/30">
              <span className="grid size-10 place-items-center rounded-xl bg-piasek text-mokka">
                <I className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-bold">{txt}</span>
                <span className="block text-[13px] text-szary">{opis}</span>
              </span>
              <ChevronRight className="size-5 text-szary" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        {!demo && (
          <button className="btn-jasny" onClick={() => setHaslo(true)}>
            <KeyRound className="size-4" /> Zmień hasło
          </button>
        )}
        <button className="btn-jasny" onClick={() => supabase.auth.signOut()}>
          <LogOut className="size-4" /> Wyloguj
        </button>
      </div>
      {haslo && <ZmianaHasla onClose={() => setHaslo(false)} />}
    </div>
  );
}
