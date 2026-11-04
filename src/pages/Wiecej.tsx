import { Link } from "react-router-dom";
import { BarChart3, ChevronRight, Clock, Link2, LogOut, MessageSquareText, Sparkles, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCzyWlascicielka, useSalon } from "../lib/dane";

const POZYCJE = [
  { to: "/podsumowanie", txt: "Podsumowanie", opis: "Utarg tygodnia i miesiąca", ikona: BarChart3, kazdy: true },
  { to: "/zespol", txt: "Zespół", opis: "Osoby, ich godziny i usługi", ikona: Users },
  { to: "/uslugi", txt: "Usługi i cennik", opis: "Czas trwania, ceny, kolory", ikona: Sparkles },
  { to: "/godziny", txt: "Godziny pracy i urlopy", opis: "Kiedy przyjmujesz klientki", ikona: Clock },
  { to: "/link", txt: "Zapisy online", opis: "Link dla klientek, adres, wygląd", ikona: Link2 },
  { to: "/sms", txt: "Przypomnienia SMS", opis: "Wiadomość dzień przed wizytą", ikona: MessageSquareText },
];

export default function Wiecej() {
  const { data: salon } = useSalon();
  const wlascicielka = useCzyWlascicielka();
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
      <button className="btn-jasny w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" /> Wyloguj
      </button>
    </div>
  );
}
