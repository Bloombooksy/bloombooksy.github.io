import { BellRing } from "lucide-react";
import { useOczekujace, useZapis } from "../lib/dane";
import { dzienKey, godzina, opisDnia } from "../lib/czas";
import { ladnyTelefon } from "../lib/sms";

/** Zapisy z tajnego linku – Madzia potwierdza albo odrzuca jednym tapnięciem. */
export function Oczekujace() {
  const { data = [] } = useOczekujace();
  const api = useZapis("wizyty", ["wizyty"]);
  if (!data.length) return null;
  return (
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
              <button className="btn-zielony min-h-10" disabled={api.zmien.isPending} onClick={() => api.zmien.mutate({ id: w.id, status: "potwierdzona" })}>
                Potwierdź
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
