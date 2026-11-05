import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hourglass } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useSalon, useUslugi } from "../lib/dane";
import { dzienKey, krotkaData } from "../lib/czas";
import { linkZapisow, trescZwolnienia } from "../lib/wiadomosci";
import { WyslijSms } from "./WyslijSms";

type Wpis = {
  id: string;
  imie: string;
  telefon: string;
  email: string;
  usluga_id: string | null;
  od: string;
  do_dnia: string;
  uwagi: string;
  powiadomiono: string | null;
};

/** W panelu: kto czeka na zwolniony termin. */
export function ListaOczekujacych() {
  const { data: salon } = useSalon();
  const { data: uslugi = [] } = useUslugi();
  const qc = useQueryClient();
  const [rozwin, setRozwin] = useState(false);
  const dzis = dzienKey();
  const { data: lista = [] } = useQuery({
    queryKey: ["lista-oczekujacych"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lista_oczekujacych")
        .select("id, imie, telefon, email, usluga_id, od, do_dnia, uwagi, powiadomiono")
        .eq("zalatwione", false)
        .gte("do_dnia", dzis)
        .order("od");
      if (error) throw error;
      return (data ?? []) as Wpis[];
    },
  });
  if (!lista.length || !salon) return null;

  async function zalatwione(id: string) {
    await supabase.from("lista_oczekujacych").update({ zalatwione: true }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["lista-oczekujacych"] });
  }

  const widoczne = rozwin ? lista : lista.slice(0, 3);
  return (
    <section className="karta p-4">
      <h2 className="flex items-center gap-2 font-bold">
        <Hourglass className="size-5 text-mokka" /> Lista oczekujących ({lista.length})
      </h2>
      <p className="mt-1 text-[13px] text-szary">Gdy odwołasz wizytę, osoby z e-mailem dostaną wiadomość same. Pozostałym wyślij SMS.</p>
      <ul className="mt-3 divide-y divide-linia">
        {widoczne.map((l) => {
          const usluga = uslugi.find((u) => u.id === l.usluga_id)?.nazwa ?? "dowolna usługa";
          return (
            <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{l.imie}</span>
                <span className="block truncate text-[13px] text-szary">
                  {usluga} · {krotkaData(l.od)}–{krotkaData(l.do_dnia)}
                  {l.uwagi && ` · ${l.uwagi}`}
                  {l.powiadomiono && " · dostała maila"}
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                {l.telefon && salon.zapisy_wlaczone && (
                  <WyslijSms className="min-h-9 px-3 text-[13px]" telefon={l.telefon} tresc={trescZwolnienia(l.imie, salon.nazwa, linkZapisow(salon.slug || salon.zapisy_token, { imie: l.imie, telefon: l.telefon }))}>
                    SMS
                  </WyslijSms>
                )}
                <button className="btn-jasny min-h-9 px-2.5" aria-label={`${l.imie} – załatwione`} title="Załatwione – usuń z listy" onClick={() => zalatwione(l.id)}>
                  <Check className="size-4" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {lista.length > 3 && (
        <button className="btn-cichy mt-1 w-full text-[14px]" onClick={() => setRozwin(!rozwin)}>
          {rozwin ? "Zwiń" : `Pokaż wszystkie (${lista.length})`}
        </button>
      )}
    </section>
  );
}
