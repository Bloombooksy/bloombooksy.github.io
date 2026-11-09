import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, X } from "lucide-react";
import { useCzyWlascicielka, useGodziny, useKlientki, useSalon, useUslugi } from "../lib/dane";

const KLUCZ = "bloomly-pierwsze-kroki-ukryte";

/** Lista startowa dla nowego salonu – znika sama, gdy wszystko jest zrobione (albo po „Ukryj”). */
export function PierwszeKroki() {
  const wlascicielka = useCzyWlascicielka();
  const { data: s } = useSalon();
  const { data: uslugi } = useUslugi();
  const { data: godziny } = useGodziny();
  const { data: klientki } = useKlientki();
  const [ukryte, setUkryte] = useState(() => {
    try {
      return localStorage.getItem(KLUCZ) === "1";
    } catch {
      return false;
    }
  });
  if (!wlascicielka || !s || !uslugi || !godziny || !klientki || ukryte) return null;

  const kroki = [
    { ok: uslugi.some((u) => u.aktywna), txt: "Dodaj usługi i ceny", to: "/uslugi" },
    { ok: godziny.length > 0, txt: "Ustaw godziny pracy", to: "/godziny" },
    { ok: klientki.length >= 5, txt: "Przenieś klientki – ze zdjęcia kalendarza albo z pliku", to: "/klientki" },
    { ok: s.zapisy_wlaczone && !!s.slug, txt: "Włącz zapisy online i wklej link w bio", to: "/link" },
    { ok: s.sms_wlaczone, txt: "Włącz przypomnienia dzień przed wizytą", to: "/sms" },
  ];
  const zrobione = kroki.filter((k) => k.ok).length;
  if (zrobione === kroki.length) return null;

  const ukryj = () => {
    setUkryte(true);
    try {
      localStorage.setItem(KLUCZ, "1");
    } catch {
      /* tryb prywatny */
    }
  };

  return (
    <section className="karta p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">Pierwsze kroki</h2>
          <p className="text-[13px] text-szary">
            Zrobione {zrobione} z {kroki.length} – zajmie to ok. 10 minut.
          </p>
        </div>
        <button className="grid size-8 place-items-center rounded-full text-szary hover:bg-piasek" aria-label="Ukryj pierwsze kroki" onClick={ukryj}>
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-piasek">
        <div className="h-full rounded-full bg-ziel transition-all" style={{ width: `${(zrobione / kroki.length) * 100}%` }} />
      </div>
      <ul className="mt-2 divide-y divide-linia">
        {kroki.map((k) => (
          <li key={k.to}>
            <Link to={k.to} className="flex items-center gap-3 py-2.5">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${k.ok ? "bg-ziel text-white" : "border-2 border-linia"}`}>{k.ok && <Check className="size-4" />}</span>
              <span className={`flex-1 text-[15px] ${k.ok ? "text-szary line-through" : "font-semibold"}`}>{k.txt}</span>
              {!k.ok && <ChevronRight className="size-4 text-szary" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
