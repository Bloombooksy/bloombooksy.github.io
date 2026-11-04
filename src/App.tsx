import { lazy, Suspense, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Ladowanie } from "./components/ui";
import { Layout } from "./components/Layout";
import { Logowanie } from "./pages/Logowanie";
import { Dzis } from "./pages/Dzis";

const Kalendarz = lazy(() => import("./pages/Kalendarz"));
const Klientki = lazy(() => import("./pages/Klientki"));
const Wiecej = lazy(() => import("./pages/Wiecej"));
const Uslugi = lazy(() => import("./pages/Uslugi"));
const Godziny = lazy(() => import("./pages/Godziny"));
const Link = lazy(() => import("./pages/LinkZapisow"));
const Sms = lazy(() => import("./pages/Sms"));
const Podsumowanie = lazy(() => import("./pages/Podsumowanie"));
const Zapisy = lazy(() => import("./pages/Zapisy"));
const Landing = lazy(() => import("./pages/Landing"));
const JakToDziala = lazy(() => import("./pages/JakToDziala"));
const Zespol = lazy(() => import("./pages/Zespol"));
const MojaWizyta = lazy(() => import("./pages/MojaWizyta"));

function useSesja() {
  const [sesja, setSesja] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesja(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesja(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return sesja;
}

function Panel() {
  const sesja = useSesja();
  if (sesja === undefined) return <Ladowanie />;
  if (!sesja)
    return (
      <Suspense fallback={<Ladowanie />}>
        <Routes>
          <Route index element={<Landing />} />
          <Route path="logowanie" element={<Logowanie />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  return (
    <Layout>
      <Suspense fallback={<Ladowanie />}>
        <Routes>
          <Route index element={<Dzis />} />
          <Route path="kalendarz" element={<Kalendarz />} />
          <Route path="klientki" element={<Klientki />} />
          <Route path="wiecej" element={<Wiecej />} />
          <Route path="podsumowanie" element={<Podsumowanie />} />
          <Route path="uslugi" element={<Uslugi />} />
          <Route path="godziny" element={<Godziny />} />
          <Route path="link" element={<Link />} />
          <Route path="sms" element={<Sms />} />
          <Route path="zespol" element={<Zespol />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/zapisy/:token"
          element={
            <Suspense fallback={<Ladowanie />}>
              <Zapisy />
            </Suspense>
          }
        />
        <Route
          path="/jak-to-dziala"
          element={
            <Suspense fallback={<Ladowanie />}>
              <JakToDziala />
            </Suspense>
          }
        />
        <Route
          path="/wizyta/:kod"
          element={
            <Suspense fallback={<Ladowanie />}>
              <MojaWizyta />
            </Suspense>
          }
        />
        <Route path="/*" element={<Panel />} />
      </Routes>
    </HashRouter>
  );
}
