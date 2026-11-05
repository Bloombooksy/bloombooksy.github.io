import { Check, MessageSquareText, Phone } from "lucide-react";
import { Status } from "./status";
import type { WizytaZKlientka } from "../lib/dane";
import { godzina } from "../lib/czas";
import { zl } from "../lib/pieniadze";
import { ladnyTelefon } from "../lib/sms";

const SMS_TXT: Record<string, string> = {
  wyslany: "SMS wysłany",
  mail: "Przypomnienie mailem",
  test: "Przypomnienie (tryb testowy)",
  blad: "Przypomnienie: błąd",
  pominiety: "Bez przypomnienia",
};

export function WizytaKarta({
  w,
  osoba,
  onOtworz,
  onZakoncz,
}: {
  w: WizytaZKlientka;
  /** imię i kolor osoby – pokazujemy, gdy w salonie pracuje kilka osób */
  osoba?: { imie: string; kolor: string } | undefined;
  onOtworz: () => void;
  onZakoncz: () => void;
}) {
  const zrobiona = w.status === "zrealizowana";
  const wygaszona = w.status === "odwolana" || w.status === "nieobecnosc";
  return (
    <article className={`karta flex items-stretch gap-0 overflow-hidden ${wygaszona ? "opacity-60" : ""}`}>
      <button type="button" onClick={onOtworz} className="flex min-w-0 flex-1 gap-4 p-4 text-left hover:bg-piasek/30">
        <div className="w-16 shrink-0">
          <div className="font-serif text-[22px] leading-none font-semibold">{godzina(w.start)}</div>
          <div className="mt-1 text-[13px] text-szary">{godzina(w.koniec)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[16px] font-bold">{w.klientka?.imie ?? "—"}</span>
            {w.odwolala_klientka ? (
              <span className="rounded-full bg-roz-jasny px-2.5 py-1 text-[12px] font-bold text-[#8a2f3a]">Odwołała sama</span>
            ) : (
              w.status !== "potwierdzona" && <Status s={w.status} />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 truncate text-[14px] text-szary">
            {osoba && (
              <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: osoba.kolor }}>
                <span className="size-2 rounded-full" style={{ background: osoba.kolor }} />
                {osoba.imie} ·
              </span>
            )}
            <span className="truncate">{w.usluga_nazwa || "Wizyta"}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-szary">
            {zrobiona ? (
              <span className="font-bold text-ziel">
                {zl(Number(w.kwota ?? w.cena))}
                {w.napiwek > 0 && ` + ${zl(Number(w.napiwek))} napiwek`}
              </span>
            ) : (
              Number(w.cena) > 0 && <span>{zl(Number(w.cena))}</span>
            )}
            {w.zadatek != null && (
              <span className={`font-semibold ${w.zadatek_wplacony ? "text-ziel" : "text-bursztyn"}`}>
                zadatek {zl(Number(w.zadatek))} {w.zadatek_wplacony ? "✓" : "– czeka"}
              </span>
            )}
            {SMS_TXT[w.sms_status] && (
              <span className="inline-flex items-center gap-1">
                <MessageSquareText className="size-3.5" /> {SMS_TXT[w.sms_status]}
              </span>
            )}
            {w.notatka && <span className="truncate italic">„{w.notatka}”</span>}
          </div>
        </div>
      </button>
      <div className="flex flex-col border-l border-linia">
        {w.klientka?.telefon && (
          <a
            href={`tel:${w.klientka.telefon}`}
            className="grid flex-1 place-items-center px-4 text-szary hover:bg-piasek/40"
            aria-label={`Zadzwoń: ${ladnyTelefon(w.klientka.telefon)}`}
          >
            <Phone className="size-5" />
          </a>
        )}
        {!wygaszona && w.status !== "oczekuje" && (
          <button
            type="button"
            onClick={onZakoncz}
            aria-label={zrobiona ? "Popraw kwotę" : "Zrobione – wpisz kwotę"}
            className={`grid flex-1 place-items-center border-t border-linia px-4 first:border-t-0 ${
              zrobiona ? "bg-ziel-jasny text-ziel" : "text-szary hover:bg-ziel-jasny hover:text-ziel"
            }`}
          >
            <Check className="size-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </article>
  );
}
