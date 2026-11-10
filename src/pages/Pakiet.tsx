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
      <h1 className="naglowek">Opłaty i SMS</h1>

      <section className={`karta space-y-1 p-5 ${p.aktywny ? "" : "border-[#8a2f3a]"}`}>
        <p className="text-[13px] font-bold text-szary">Twoje Bloomly</p>
        <p className="font-serif text-3xl font-semibold">{premium ? `Obsługa + pakiet ${p.sms_limit} SMS` : oplacone ? "Obsługa" : "Okres próbny"}</p>
        {!p.aktywny ? (
          <p className="text-[15px] font-semibold text-[#8a2f3a]">
            {oplacone ? "Opłacony okres" : "Okres próbny"} skończył się {data(koniec)}. Wizyty i klientki są bezpieczne, ale nowych wizyt nie dodasz,
            dopóki nie opłacisz obsługi.
          </p>
        ) : oplacone ? (
          <p className="text-[15px] text-szary">Opłacony do {data(koniec)}.</p>
        ) : (
          <p className={`text-[15px] ${zostalo <= 3 ? "font-semibold text-bursztyn" : "text-szary"}`}>
            Okres próbny: {zostalo <= 0 ? "kończy się dziś" : `zostało ${zostalo} ${zostalo === 1 ? "dzień" : "dni"}`} (do {data(koniec)}).
          </p>
        )}
        <p className="pt-2 text-[14px] text-szary">
          Żeby wykupić Bloomly, opłacić obsługę albo dobrać pakiet SMS, napisz do nas – na start rozliczamy się fakturą i przelewem. Przed końcem okresu próbnego odezwiemy się sami.
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

      <section className="karta divide-y divide-linia p-0">
        <div className="flex items-baseline justify-between gap-3 p-4">
          <div>
            <p className="font-bold">Aplikacja Bloomly</p>
            <p className="text-[14px] text-szary">Płacisz raz – z pomocą w przeniesieniu kalendarza</p>
          </div>
          <p className="shrink-0 font-serif text-xl font-semibold">{OFERTA.jednorazowo} zł</p>
        </div>
        <div className="flex items-baseline justify-between gap-3 p-4">
          <div>
            <p className="font-bold">Obsługa</p>
            <p className="text-[14px] text-szary">Serwer, przypomnienia mailem, kopie danych, aktualizacje, pomoc. Cały zespół w cenie.</p>
          </div>
          <p className="shrink-0 font-serif text-xl font-semibold">
            {OFERTA.obsluga} zł <span className="font-sans text-[13px] font-normal text-szary">/ mies.</span>
          </p>
        </div>
      </section>

      <section className="karta p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-bold">
            <MessageSquareText className="size-5" /> Pakiety SMS – jeśli chcesz
          </p>
          {OFERTA.smsWkrotce && <span className="rounded-full bg-piasek px-2.5 py-0.5 text-[12px] font-bold text-mokka">wkrótce</span>}
        </div>
        <ul className="mt-3 divide-y divide-linia">
          {OFERTA.pakietySms.map((k) => (
            <li key={k.sms} className="flex items-baseline justify-between gap-3 py-2.5">
              <span>
                {k.sms} SMS {premium && p.sms_limit === k.sms && <b className="ml-1 rounded-full bg-atrament px-2 py-0.5 text-[12px] text-krem">Twój</b>}
              </span>
              <span className="whitespace-nowrap font-semibold">{k.cena} zł / mies.</span>
            </li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1.5 text-[14px] text-szary">
          <li className="flex gap-2"><Smartphone className="mt-0.5 size-4 shrink-0" /> Bez pakietu: SMS ze swojego telefonu jednym kliknięciem, bez limitu i za darmo.</li>
          <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" /> Po wykorzystaniu pakietu przypomnienia idą mailem.</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" /> SMS-y podpisane nazwą Twojego salonu.</li>
        </ul>
      </section>

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
