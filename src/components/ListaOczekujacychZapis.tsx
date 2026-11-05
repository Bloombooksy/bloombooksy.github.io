import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { supabase, komunikat } from "../lib/supabase";
import { dodajDni, dzienKey } from "../lib/czas";
import { normalizujTelefon } from "../lib/sms";
import { Blad } from "./ui";

/** Na stronie zapisów: „Nie ma pasującego terminu? Daj znać, gdy się zwolni”. */
export function ListaOczekujacychZapis({
  token,
  uslugaId,
  osobaId,
  dzien,
  imie: imie0,
  telefon: tel0,
}: {
  token: string;
  uslugaId: string;
  osobaId: string;
  dzien: string;
  imie: string;
  telefon: string;
}) {
  const dzis = dzienKey();
  const [otwarte, setOtwarte] = useState(false);
  const [od, setOd] = useState(dzien || dzis);
  const [doDnia, setDoDnia] = useState(dodajDni(dzien || dzis, 14));
  const [imie, setImie] = useState(imie0);
  const [telefon, setTelefon] = useState(tel0);
  const [email, setEmail] = useState("");
  const [uwagi, setUwagi] = useState("");
  const [blad, setBlad] = useState("");
  const [wysylam, setWysylam] = useState(false);
  const [gotowe, setGotowe] = useState(false);

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (!normalizujTelefon(telefon)) return setBlad("Sprawdź numer telefonu.");
    setWysylam(true);
    const { error } = await supabase.rpc("zapisy_lista_dopisz", {
      p_token: token,
      p_usluga: uslugaId || null,
      p_od: od,
      p_do: doDnia,
      p_imie: imie,
      p_telefon: telefon,
      p_email: email.trim(),
      p_uwagi: uwagi,
      p_pracownik: osobaId || null,
    });
    setWysylam(false);
    if (error) return setBlad(komunikat(error));
    setGotowe(true);
  }

  if (gotowe)
    return (
      <p className="flex gap-3 rounded-2xl bg-ziel-jasny p-4 text-[15px] text-ziel">
        <Check className="mt-0.5 size-5 shrink-0" />
        <span>
          Jesteś na liście oczekujących.{" "}
          {email.trim() ? "Gdy zwolni się termin, dostaniesz maila – kto pierwszy, ten lepszy." : "Gdy zwolni się termin, salon da Ci znać."}
        </span>
      </p>
    );

  if (!otwarte)
    return (
      <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-linia p-3.5 text-[15px] font-semibold text-mokka" onClick={() => setOtwarte(true)}>
        <BellRing className="size-4" /> Nie ma pasującego terminu? Daj znać, gdy się zwolni
      </button>
    );

  return (
    <form onSubmit={zapisz} className="karta space-y-3 p-4">
      <p className="font-bold">Lista oczekujących</p>
      <p className="text-[14px] text-szary">Gdy ktoś odwoła wizytę w tych dniach, damy Ci znać.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="etykieta">Od</span>
          <input type="date" required className="pole" min={dzis} value={od} onChange={(e) => setOd(e.target.value)} />
        </label>
        <label className="block">
          <span className="etykieta">Do</span>
          <input type="date" required className="pole" min={od} max={dodajDni(od, 62)} value={doDnia} onChange={(e) => setDoDnia(e.target.value)} />
        </label>
      </div>
      <input aria-label="Imię i nazwisko" required minLength={2} maxLength={80} autoComplete="name" className="pole" placeholder="Imię i nazwisko" value={imie} onChange={(e) => setImie(e.target.value)} />
      <input aria-label="Telefon" required type="tel" inputMode="tel" autoComplete="tel" className="pole" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
      <input aria-label="E-mail" type="email" inputMode="email" autoComplete="email" maxLength={120} className="pole" placeholder="E-mail – dostaniesz wiadomość od razu" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input aria-label="Uwagi" maxLength={300} className="pole" placeholder="Uwagi (opcjonalnie) – np. tylko po 16:00" value={uwagi} onChange={(e) => setUwagi(e.target.value)} />
      <Blad>{blad}</Blad>
      <button className="btn-glowny w-full" disabled={wysylam}>
        {wysylam ? "Zapisuję…" : "Zapisz mnie na listę"}
      </button>
    </form>
  );
}
