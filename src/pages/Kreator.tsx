import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOut } from "lucide-react";
import { komunikat, supabase } from "../lib/supabase";
import type { Branza } from "../lib/database.types";
import { BRANZE, KOLORY_SALONU } from "../lib/branze";
import { Blad } from "../components/ui";
import { Logo } from "../components/Layout";
import { ZgodaRegulamin } from "../components/PasekPakietu";
import { REGULAMIN } from "../lib/oferta";

/** Pierwsze logowanie: salon zakłada się sam w minutę – nazwa, branża (gotowy cennik), kolor. */
export default function Kreator() {
  const qc = useQueryClient();
  const [nazwa, setNazwa] = useState("");
  const [imie, setImie] = useState("");
  const [branza, setBranza] = useState<Branza>("paznokcie");
  const [kolor, setKolor] = useState(KOLORY_SALONU[0]!);
  const [blad, setBlad] = useState("");
  const [czeka, setCzeka] = useState(false);
  const [zgoda, setZgoda] = useState(false);

  async function zaloz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (!zgoda) return setBlad("Zaakceptuj regulamin, żeby założyć salon.");
    setCzeka(true);
    const { error } = await supabase.rpc("zaloz_salon", { p_nazwa: nazwa, p_branza: branza, p_kolor: kolor, p_imie: imie });
    if (!error) await supabase.rpc("akceptuj_regulamin", { p_wersja: REGULAMIN.wersja });
    setCzeka(false);
    if (error) return setBlad(komunikat(error));
    await qc.invalidateQueries();
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo maly />
        <button className="btn-cichy min-h-9 px-2 text-[14px]" onClick={() => supabase.auth.signOut()}>
          <LogOut className="size-4" /> Wyloguj
        </button>
      </div>
      <h1 className="naglowek">Załóż swój salon</h1>
      <p className="mt-2 text-[15px] text-szary">
        Minuta i gotowe – dostaniesz przykładowy cennik dla swojej branży, który potem dowolnie zmienisz. Jeśli ktoś zaprosił Cię do swojego zespołu,
        poproś o zaproszenie na adres, którym się logujesz.
      </p>

      <form onSubmit={zaloz} className="mt-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etykieta">Nazwa salonu</span>
            <input required maxLength={80} className="pole" placeholder="np. Studio Paznokci Ola" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
          </label>
          <label>
            <span className="etykieta">Twoje imię</span>
            <input maxLength={60} className="pole" placeholder="np. Ola" value={imie} onChange={(e) => setImie(e.target.value)} />
          </label>
        </div>

        <fieldset>
          <legend className="etykieta">Czym się zajmujesz?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(BRANZE) as Branza[]).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={branza === b}
                onClick={() => setBranza(b)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${branza === b ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier hover:border-mokka"}`}
              >
                <span className="block text-xl" aria-hidden>
                  {BRANZE[b].ikona}
                </span>
                <span className="mt-1 block text-[14px] font-bold">{BRANZE[b].nazwa}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="etykieta">Kolor salonu (widzą go klientki przy zapisach)</legend>
          <div className="flex flex-wrap gap-2">
            {KOLORY_SALONU.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`Kolor ${k}`}
                aria-pressed={kolor === k}
                onClick={() => setKolor(k)}
                className="grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-krem aria-pressed:ring-2 aria-pressed:ring-atrament"
                style={{ background: k }}
              >
                {kolor === k && <Check className="size-5 text-white" />}
              </button>
            ))}
          </div>
        </fieldset>

        <ZgodaRegulamin zgoda={zgoda} onZmien={setZgoda} />
        <p className="text-[13px] text-szary">Masz 14 dni za darmo, bez podawania karty. Potem wybierasz pakiet: Start albo Premium.</p>
        <Blad>{blad}</Blad>
        <button disabled={czeka} className="btn-glowny w-full">
          {czeka ? "Zakładam…" : "Załóż salon"}
        </button>
      </form>
    </div>
  );
}
