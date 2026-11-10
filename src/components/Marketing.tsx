import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/caveat/500.css";
import { komunikat, supabase } from "../lib/supabase";
import { DEMO, OFERTA } from "../lib/oferta";
import { NapisBloomly, ZnakBloomly } from "./ZnakBloomly";

/** Wspólne elementy stron sprzedażowych Bloomly (strona główna, „Jak to działa”). */
export function NaglowekMarketing() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-5">
      <Link to="/" className="ld-logo inline-flex items-center gap-2" aria-label="Bloomly – strona główna">
        <ZnakBloomly size={30} />
        <span className="sm:hidden"><NapisBloomly height={20} /></span>
        <span className="hidden sm:inline"><NapisBloomly height={25} /></span>
      </Link>
      <nav className="flex items-center gap-0.5 sm:gap-2">
        <NavLink to="/jak-to-dziala" className={({ isActive }) => `ld-btn ld-btn-cichy px-2.5 sm:px-[22px] ${isActive ? "ld-aktywny" : ""}`}>
          Jak to działa
        </NavLink>
        <Link to="/logowanie" className="ld-btn ld-btn-cichy px-2.5 sm:px-[22px]">
          <span>
            Zaloguj<span className="ld-szeroki-txt">&nbsp;się</span>
          </span>
        </Link>
        <Link to="/logowanie?rejestracja" className="ld-btn ld-btn-ink ld-szeroki">
          Załóż salon
        </Link>
      </nav>
    </header>
  );
}

export function StopkaMarketing() {
  return (
    <footer className="ld-stopka">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-4 px-5 py-10">
        <span className="ld-logo inline-flex items-center gap-2 text-[22px]">
          <ZnakBloomly size={28} kartka="#ffffff" okno="#c2185b" kwiat="#ffffff" srodek="#c2185b" />
          <NapisBloomly height={22} />
        </span>
        <p className="text-[14px]">Kalendarz i zapisy online dla salonów beauty. Dane przechowywane w UE.</p>
        {OFERTA.kontaktEmail && (
          <a className="underline" href={`mailto:${OFERTA.kontaktEmail}`}>
            {OFERTA.kontaktEmail}
          </a>
        )}
      </div>
    </footer>
  );
}

let demoOtwarte = false; // kilka przycisków na stronie – logujemy raz

export function PrzyciskDemo({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const [czeka, setCzeka] = useState(false);
  const [blad, setBlad] = useState("");
  async function wejdz() {
    setCzeka(true);
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO.email, password: DEMO.haslo });
    setCzeka(false);
    if (error) return setBlad(komunikat(error));
    nav("/", { replace: true });
  }
  // link „…/#/?demo” ze strony bloomly.com.pl otwiera salon demo od razu
  const { search } = useLocation();
  useEffect(() => {
    if (!demoOtwarte && new URLSearchParams(search).has("demo")) {
      demoOtwarte = true;
      void wejdz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  return (
    <span className="inline-flex flex-col">
      <button className={`ld-btn ld-btn-ink ${className}`} onClick={wejdz} disabled={czeka}>
        {czeka ? "Otwieram…" : "Zobacz salon demo"}
      </button>
      {blad && <span className="mt-1 text-[13px] text-[var(--malina)]">{blad}</span>}
    </span>
  );
}


export const CSS = `
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
.ld-szeroki-txt { display: none; } @media (min-width: 640px) { .ld-szeroki-txt { display: inline; } }
.ld-szeroki { display: none; } @media (min-width: 640px) { .ld-szeroki { display: inline-flex; } }
.ld-btn:focus-visible { outline: 3px solid var(--malina); outline-offset: 3px; }
.ld-btn-ink { background: var(--grafit); color: #fff; } .ld-btn-ink:hover { background: #38344b; }
.ld-btn-malina { background: var(--malina); color: #fff; } .ld-btn-malina:hover { background: #a3134c; }
.ld-btn-jasny { border: 1.5px solid var(--grafit); } .ld-btn-jasny:hover { background: #fff; }
.ld-btn-cichy:hover, .ld-aktywny { background: var(--tlo-2); }
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
