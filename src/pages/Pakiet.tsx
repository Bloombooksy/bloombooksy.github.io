import { Check, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { dniDo, usePakiet } from "../lib/dane";
import { OFERTA, REGULAMIN } from "../lib/oferta";
import { Ladowanie } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

const data = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

/** Pakiet salonu: okres próbny, opłacony okres, licznik SMS i porównanie pakietów. */
export default function Pakiet() {
  const { data: p, isLoading } = usePakiet();
  if (isLoading || !p) return <Ladowanie />;

  const premium = p.pakiet === "premium";
  const oplacone = p.oplacone_do && new Date(p.oplacone_do) > new Date(p.proba_do);
  const koniec = oplacone ? p.oplacone_do! : p.proba_do;
  const zostalo = dniDo(koniec);
  const procent = Math.min(100, Math.round((p.sms_w_miesiacu / Math.max(1, p.sms_limit)) * 100));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Pakiet</h1>

      <section className={`karta space-y-1 p-5 ${p.aktywny ? "" : "border-[#8a2f3a]"}`}>
        <p className="text-[13px] font-bold text-szary">Twój pakiet</p>
        <p className="font-serif text-3xl font-semibold">{premium ? "Premium" : "Start"}</p>
        {!p.aktywny ? (
          <p className="text-[15px] font-semibold text-[#8a2f3a]">
            {oplacone ? "Opłacony okres" : "Okres próbny"} skończył się {data(koniec)}. Wizyty i klientki są bezpieczne, ale nowych wizyt nie dodasz,
            dopóki nie opłacisz pakietu.
          </p>
        ) : oplacone ? (
          <p className="text-[15px] text-szary">Opłacony do {data(koniec)}.</p>
        ) : (
          <p className={`text-[15px] ${zostalo <= 3 ? "font-semibold text-bursztyn" : "text-szary"}`}>
            Okres próbny: {zostalo <= 0 ? "kończy się dziś" : `zostało ${zostalo} ${zostalo === 1 ? "dzień" : "dni"}`} (do {data(koniec)}).
          </p>
        )}
        <p className="pt-2 text-[14px] text-szary">
          Żeby opłacić lub zmienić pakiet, napisz do nas – na start rozliczamy się fakturą i przelewem. Przed końcem okresu próbnego odezwiemy się sami.
        </p>
      </section>

      {premium && (
        <section className="karta space-y-2 p-5">
          <p className="font-bold">Automatyczne SMS-y w tym miesiącu</p>
          <div className="h-3 overflow-hidden rounded-full bg-piasek">
            <div className={`h-full rounded-full ${procent >= 80 ? "bg-bursztyn" : "bg-ziel"}`} style={{ width: `${procent}%` }} />
          </div>
          <p className="text-[14px] text-szary">
            {p.sms_w_miesiacu} z {p.sms_limit}. Po wykorzystaniu limitu przypomnienia pójdą mailem, a SMS możesz wysłać ze swojego telefonu przyciskiem
            przy wizycie – bez limitu.
          </p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          {
            nazwa: "Start",
            cena: OFERTA.miesiecznie,
            moj: !premium,
            punkty: [
              [Check, "Kalendarz, klientki, zespół, zapisy online, zadatki"],
              [Mail, "Przypomnienie mailem dzień przed wizytą"],
              [Smartphone, "SMS z Twojego telefonu jednym kliknięciem, bez limitu"],
            ],
          },
          {
            nazwa: "Premium",
            cena: OFERTA.premium,
            moj: premium,
            wkrotce: OFERTA.premiumWkrotce,
            punkty: [
              [Check, "Wszystko z pakietu Start"],
              [MessageSquareText, `${OFERTA.smsWCenie} automatycznych SMS-ów miesięcznie`],
              [Mail, "Po limicie przypomnienia idą mailem"],
            ],
          },
        ].map((k) => (
          <div key={k.nazwa} className={`karta p-5 ${k.moj ? "ring-2 ring-atrament" : ""}`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold">{k.nazwa}</p>
              {k.moj ? (
                <span className="rounded-full bg-atrament px-2.5 py-0.5 text-[12px] font-bold text-krem">Twój</span>
              ) : (
                k.wkrotce && <span className="rounded-full bg-piasek px-2.5 py-0.5 text-[12px] font-bold text-mokka">wkrótce</span>
              )}
            </div>
            <p className="mt-1 font-serif text-2xl font-semibold">
              {k.cena} zł <span className="font-sans text-[14px] font-normal text-szary">/ mies.</span>
            </p>
            <ul className="mt-3 space-y-2 text-[14px]">
              {k.punkty.map(([I, t]) => {
                const Ikona = I as typeof Check;
                return (
                  <li key={t as string} className="flex gap-2">
                    <Ikona className="mt-0.5 size-4 shrink-0 text-mokka" /> {t as string}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
      <p className="text-[13px] text-szary">
        +{OFERTA.zaOsobe} zł miesięcznie za każdą kolejną osobę w zespole. Płacąc za rok, płacisz za {OFERTA.rokZaMiesiecy} miesięcy.
      </p>

      <p className="text-[13px] text-szary">
        Dokumenty:{" "}
        <a className="underline" href={REGULAMIN.regulamin} target="_blank" rel="noreferrer">
          regulamin
        </a>
        ,{" "}
        <a className="underline" href={REGULAMIN.prywatnosc} target="_blank" rel="noreferrer">
          polityka prywatności
        </a>
        ,{" "}
        <a className="underline" href={REGULAMIN.powierzenie} target="_blank" rel="noreferrer">
          umowa powierzenia danych
        </a>
        {p.regulamin_akceptacja && <> · zaakceptowane {data(p.regulamin_akceptacja)}</>}
      </p>
    </div>
  );
}
