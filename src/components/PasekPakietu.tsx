import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { dniDo, useCzyWlascicielka, usePakiet } from "../lib/dane";
import { REGULAMIN } from "../lib/oferta";
import { komunikat, supabase } from "../lib/supabase";
import { Blad } from "./ui";

/** Zgoda na regulamin – pole wyboru z linkami do dokumentów (kreator i okno akceptacji). */
export function ZgodaRegulamin({ zgoda, onZmien }: { zgoda: boolean; onZmien: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-[14px]">
      <input type="checkbox" required className="mt-1 size-5 shrink-0 accent-[#c2185b]" checked={zgoda} onChange={(e) => onZmien(e.target.checked)} />
      <span>
        Akceptuję{" "}
        <a className="font-semibold underline" href={REGULAMIN.regulamin} target="_blank" rel="noreferrer">
          regulamin
        </a>{" "}
        i{" "}
        <a className="font-semibold underline" href={REGULAMIN.powierzenie} target="_blank" rel="noreferrer">
          umowę powierzenia danych
        </a>{" "}
        (dane moich klientek). Zapoznałam się z{" "}
        <a className="font-semibold underline" href={REGULAMIN.prywatnosc} target="_blank" rel="noreferrer">
          polityką prywatności
        </a>
        .
      </span>
    </label>
  );
}

/** Informacje nad treścią aplikacji: koniec okresu próbnego, limit SMS, akceptacja nowego regulaminu. */
export function PasekPakietu({ demo }: { demo: boolean }) {
  const wlascicielka = useCzyWlascicielka();
  const { data: p } = usePakiet();
  const qc = useQueryClient();
  const [zgoda, setZgoda] = useState(false);
  const [blad, setBlad] = useState("");
  const [czeka, setCzeka] = useState(false);
  if (!p || demo) return null;

  const koniec = p.oplacone_do && new Date(p.oplacone_do) > new Date(p.proba_do) ? p.oplacone_do : p.proba_do;
  const proba = koniec === p.proba_do;
  const zostalo = dniDo(koniec);
  const smsMalo = p.pakiet === "premium" && p.sms_limit > 0 && p.sms_w_miesiacu >= p.sms_limit * 0.8;

  async function akceptuj() {
    setBlad("");
    setCzeka(true);
    const { error } = await supabase.rpc("akceptuj_regulamin", { p_wersja: REGULAMIN.wersja });
    setCzeka(false);
    if (error) return setBlad(komunikat(error));
    await qc.invalidateQueries({ queryKey: ["pakiet"] });
  }

  return (
    <div className="mb-4 space-y-2">
      {wlascicielka && p.regulamin_wersja !== REGULAMIN.wersja && (
        <div className="karta space-y-3 p-4">
          <p className="font-bold">{p.regulamin_wersja ? "Zmienił się regulamin Bloomly" : "Zanim zaczniemy: regulamin"}</p>
          <ZgodaRegulamin zgoda={zgoda} onZmien={setZgoda} />
          <Blad>{blad}</Blad>
          <button className="btn-glowny w-full sm:w-auto" disabled={!zgoda || czeka} onClick={akceptuj}>
            {czeka ? "Zapisuję…" : "Akceptuję"}
          </button>
        </div>
      )}
      {!p.aktywny ? (
        <Link to="/pakiet" className="block rounded-2xl bg-[#fbebeb] px-4 py-3 text-[14px] text-[#8a2f3a]">
          <b>{proba ? "Okres próbny się skończył." : "Opłacony okres się skończył."}</b> Twoje dane są bezpieczne, ale nowych wizyt nie dodasz.{" "}
          <span className="font-bold underline">Zobacz pakiety</span>
        </Link>
      ) : (
        proba &&
        zostalo <= 3 && (
          <Link to="/pakiet" className="block rounded-2xl bg-bursztyn-jasny px-4 py-3 text-[14px] text-bursztyn">
            <b>Okres próbny: {zostalo <= 0 ? "ostatni dzień" : `zostało ${zostalo} ${zostalo === 1 ? "dzień" : "dni"}`}.</b>{" "}
            <span className="font-bold underline">Zobacz pakiety</span>
          </Link>
        )
      )}
      {smsMalo && wlascicielka && (
        <Link to="/pakiet" className="block rounded-2xl bg-bursztyn-jasny px-4 py-3 text-[14px] text-bursztyn">
          <b>
            {p.sms_w_miesiacu >= p.sms_limit
              ? "Limit automatycznych SMS-ów w tym miesiącu wykorzystany."
              : `Zostało ${p.sms_limit - p.sms_w_miesiacu} automatycznych SMS-ów w tym miesiącu.`}
          </b>{" "}
          Potem przypomnienia pójdą mailem, a SMS wyślesz ze swojego telefonu.
        </Link>
      )}
    </div>
  );
}
