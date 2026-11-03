import { useState } from "react";
import { BellRing, CalendarX2, Check } from "lucide-react";
import { useOczekujace, useOdwolanePrzezKlientki, useSalon, useZapis, type WizytaZKlientka } from "../lib/dane";
import { dzienKey, godzina, opisDnia } from "../lib/czas";
import { ladnyTelefon } from "../lib/sms";
import { linkWizyty, trescWizyty } from "../lib/wiadomosci";
import { WyslijSms } from "./WyslijSms";

const KLUCZ = "terminarz-odwolania-widziane";
function widziane(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KLUCZ) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Zapisy z tajnego linku – Madzia potwierdza albo odrzuca jednym tapnięciem i od razu wysyła klientce SMS z potwierdzeniem. */
export function Oczekujace() {
  const { data = [] } = useOczekujace();
  const { data: salon } = useSalon();
  const api = useZapis("wizyty", ["wizyty"]);
  const [potwierdzone, setPotwierdzone] = useState<WizytaZKlientka[]>([]);

  return (
    <>
      <OdwolanePrzezKlientki />
      {potwierdzone.map((w) => (
        <section key={w.id} className="rounded-2xl border border-ziel/25 bg-ziel-jasny p-4">
          <p className="flex gap-2 text-[15px]">
            <Check className="mt-0.5 size-5 shrink-0 text-ziel" />
            <span>
              <b>{w.klientka?.imie}</b> potwierdzona. Wyślij jej SMS z wizytą – jednym tapnięciem doda ją do swojego kalendarza.
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            {w.klientka?.telefon && (
              <WyslijSms
                glowny
                telefon={w.klientka.telefon}
                tresc={trescWizyty({ imie: w.klientka.imie, start: w.start, usluga: w.usluga_nazwa, salon: salon?.nazwa ?? "", link: linkWizyty(w.kod) })}
              >
                Wyślij SMS
              </WyslijSms>
            )}
            <button className="btn-cichy" onClick={() => setPotwierdzone((p) => p.filter((x) => x.id !== w.id))}>
              Gotowe
            </button>
          </div>
        </section>
      ))}
      {data.length > 0 && (
        <section className="rounded-2xl border border-bursztyn/30 bg-bursztyn-jasny p-4" aria-label="Zapisy do potwierdzenia">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-bursztyn">
            <BellRing className="size-4" /> Nowe zapisy do potwierdzenia ({data.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {data.map((w) => (
              <li key={w.id} className="rounded-xl bg-papier p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-bold">{w.klientka?.imie}</span>
                  <span className="text-[14px] text-szary">
                    {opisDnia(dzienKey(w.start))}, {godzina(w.start)}
                  </span>
                </div>
                <div className="text-[14px] text-szary">
                  {w.usluga_nazwa}
                  {w.klientka?.telefon && (
                    <>
                      {" · "}
                      <a className="underline" href={`tel:${w.klientka.telefon}`}>
                        {ladnyTelefon(w.klientka.telefon)}
                      </a>
                    </>
                  )}
                </div>
                {w.notatka && <p className="mt-1 text-[14px] italic">„{w.notatka}”</p>}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button className="btn-jasny min-h-10" disabled={api.zmien.isPending} onClick={() => api.zmien.mutate({ id: w.id, status: "odwolana" })}>
                    Odrzuć
                  </button>
                  <button
                    className="btn-zielony min-h-10"
                    disabled={api.zmien.isPending}
                    onClick={() =>
                      api.zmien.mutate({ id: w.id, status: "potwierdzona" }, { onSuccess: () => setPotwierdzone((p) => [...p, { ...w, status: "potwierdzona" }]) })
                    }
                  >
                    Potwierdź
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function OdwolanePrzezKlientki() {
  const { data = [] } = useOdwolanePrzezKlientki();
  const [ukryte, setUkryte] = useState(widziane);
  const nowe = data.filter((w) => !ukryte.includes(w.id));
  if (!nowe.length) return null;
  function ok() {
    const ids = [...ukryte, ...nowe.map((w) => w.id)].slice(-200);
    setUkryte(ids);
    try {
      localStorage.setItem(KLUCZ, JSON.stringify(ids));
    } catch {
      /* brak pamięci przeglądarki – trudno */
    }
  }
  return (
    <section className="rounded-2xl border border-roz/30 bg-roz-jasny p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#8a2f3a]">
        <CalendarX2 className="size-4" /> Klientki odwołały wizyty
      </h2>
      <ul className="mt-2 space-y-1 text-[15px]">
        {nowe.map((w) => (
          <li key={w.id}>
            <b>{w.klientka?.imie}</b> – {opisDnia(dzienKey(w.start))}, {godzina(w.start)} · {w.usluga_nazwa}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[13px] text-[#8a2f3a]/80">Te terminy są znowu wolne w zapisach.</p>
      <button className="btn-jasny mt-3 min-h-10" onClick={ok}>
        Rozumiem
      </button>
    </section>
  );
}
