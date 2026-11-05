import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { DEMO } from "../lib/oferta";
import { ZnakBloomly } from "./ZnakBloomly";
import { NavLink } from "react-router-dom";
import { CalendarDays, Menu, Sun, Users } from "lucide-react";
import { useKontekst } from "../lib/dane";
import { PasekPakietu } from "./PasekPakietu";

const Kreator = lazy(() => import("../pages/Kreator"));
import { Blad, Ladowanie } from "./ui";
import { komunikat, supabase } from "../lib/supabase";

const NAV = [
  { to: "/", txt: "Dziś", ikona: Sun, end: true },
  { to: "/kalendarz", txt: "Kalendarz", ikona: CalendarDays },
  { to: "/klientki", txt: "Klientki", ikona: Users },
  { to: "/wiecej", txt: "Więcej", ikona: Menu },
];

export function Logo({ maly }: { maly?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-serif font-semibold tracking-tight ${maly ? "text-lg" : "text-2xl"}`}>
      <ZnakBloomly size={maly ? 22 : 30} />
      <span>
        Bloom<span className="text-[#c2185b]">ly</span>
      </span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const k = useKontekst();
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setDemo(data.user?.email === DEMO.email));
  }, []);
  if (k.isSuccess && !k.data)
    return (
      <Suspense fallback={<Ladowanie />}>
        <Kreator />
      </Suspense>
    );
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-linia px-4 py-6 md:flex">
        <div className="mb-6 px-2">
          <Logo maly />
          {k.data && <p className="mt-1 truncate text-[13px] text-szary">{k.data.salon.nazwa}</p>}
        </div>
        {NAV.map(({ to, txt, ikona: I, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${isActive ? "bg-atrament text-krem" : "text-szary hover:bg-piasek/60 hover:text-atrament"}`
            }
          >
            <I className="size-5" /> {txt}
          </NavLink>
        ))}
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">
        {demo && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#fde9f0] px-4 py-3 text-[14px] text-[#8a1543]">
            <span>
              <b>Salon demo.</b> Klikaj śmiało – zmiany znikają co noc.
            </span>
            <button className="font-bold underline" onClick={() => supabase.auth.signOut()}>
              Wyjdź z demo
            </button>
          </div>
        )}
        {k.data && <PasekPakietu demo={demo} />}
        {k.isLoading ? <Ladowanie /> : k.error ? <Blad>{komunikat(k.error)}</Blad> : children}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-linia bg-papier/95 backdrop-blur md:hidden" aria-label="Menu">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, txt, ikona: I, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${isActive ? "text-atrament" : "text-szary"}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-14 place-items-center rounded-full ${isActive ? "bg-piasek" : ""}`}>
                    <I className="size-5" />
                  </span>
                  {txt}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
