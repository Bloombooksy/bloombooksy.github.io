import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useSalon, useWizyty, useZmienSalon } from "../lib/dane";
import { dodajDni, DNI_KROTKO, dzienKey, dzienTygodnia, godzina, krotkaData } from "../lib/czas";
import { bezPolskichZnakow, DOMYSLNY_SZABLON, liczbaCzesci, renderSzablon } from "../lib/sms";
import { komunikat } from "../lib/supabase";
import { Blad, Przelacznik } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

const ZMIENNE = ["{imie}", "{data}", "{godzina}", "{usluga}", "{salon}"];
const OPIS_STATUSU: Record<string, string> = {
  brak: "czeka na wysyłkę",
  wyslany: "wysłany ✓",
  test: "tryb testowy (nie wyszedł)",
  blad: "błąd",
  pominiety: "pominięty",
};

export default function Sms() {
  const { data: s } = useSalon();
  const zmien = useZmienSalon();
  const jutro = dodajDni(dzienKey(), 1);
  const { data: wizyty = [] } = useWizyty(jutro, jutro);
  const [szablon, setSzablon] = useState("");
  const [nadawca, setNadawca] = useState("");
  const [blad, setBlad] = useState("");
  const [zapisano, setZapisano] = useState(false);
  useEffect(() => {
    if (s) {
      setSzablon(s.sms_szablon);
      setNadawca(s.sms_nadawca);
    }
  }, [s]);
  if (!s) return null;

  const podglad = renderSzablon(szablon || DOMYSLNY_SZABLON, {
    imie: "Ola",
    data: `${DNI_KROTKO[dzienTygodnia(jutro)]} ${krotkaData(jutro)}`,
    godzina: "10:30",
    usluga: "Manicure hybrydowy",
    salon: s.nazwa,
  });
  const czesci = liczbaCzesci(podglad);
  const doWyslania = wizyty.filter((w) => w.status === "potwierdzona" || w.status === "oczekuje");
  const ustaw = (z: Record<string, unknown>) =>
    zmien.mutate({ id: s.id, ...z }, { onError: (e) => setBlad(komunikat(e)), onSuccess: () => setZapisano(true) });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Przypomnienia SMS</h1>
      <div className="karta space-y-4 p-4">
        <Przelacznik
          wl={s.sms_wlaczone}
          onZmien={(v) => ustaw({ sms_wlaczone: v })}
          etykieta="Wysyłaj przypomnienia"
          opis="Dzień przed wizytą, do klientek z numerem telefonu i zgodą na SMS"
        />
        <label className="block">
          <span className="etykieta">Godzina wysyłki (dzień wcześniej)</span>
          <select className="pole" value={s.sms_godzina} onChange={(e) => ustaw({ sms_godzina: +e.target.value })}>
            {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="karta space-y-3 p-4">
        <label className="etykieta" htmlFor="sz">
          Treść wiadomości
        </label>
        <textarea id="sz" rows={4} className="pole resize-y" value={szablon} onChange={(e) => {
          setSzablon(e.target.value);
          setZapisano(false);
        }} />
        <div className="flex flex-wrap gap-1.5">
          {ZMIENNE.map((z) => (
            <button key={z} type="button" className="rounded-full bg-piasek px-2.5 py-1 font-mono text-[12px] font-semibold text-mokka" onClick={() => setSzablon((t) => `${t}${t.endsWith(" ") ? "" : " "}${z}`)}>
              {z}
            </button>
          ))}
        </div>
        <div className="rounded-2xl rounded-bl-md bg-[#e9e3dc] p-3.5 text-[15px]">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-szary">
            <MessageSquareText className="size-3.5" /> Podgląd · {s.sms_nadawca || "nadawca"}
          </div>
          {bezPolskichZnakow(podglad)}
        </div>
        <p className={`text-[13px] ${czesci > 1 ? "font-semibold text-bursztyn" : "text-szary"}`}>
          {bezPolskichZnakow(podglad).length} znaków · {czesci === 1 ? "1 SMS" : `${czesci} SMS-y – skróć treść, żeby płacić za jeden`}. Polskie znaki zamieniamy na
          zwykłe (ą→a), bo inaczej SMS mieści tylko 70 znaków.
        </p>
        <label className="block">
          <span className="etykieta">Nazwa nadawcy (max 11 znaków, rejestruje się ją w SMSAPI)</span>
          <input className="pole" maxLength={11} placeholder="np. BloomBeauty" value={nadawca} onChange={(e) => {
            setNadawca(e.target.value);
            setZapisano(false);
          }} />
        </label>
        <button className="btn-glowny w-full" disabled={zmien.isPending} onClick={() => ustaw({ sms_szablon: szablon.trim() || DOMYSLNY_SZABLON, sms_nadawca: nadawca.trim() })}>
          {zapisano ? "Zapisano ✓" : "Zapisz treść"}
        </button>
        <Blad>{blad}</Blad>
      </div>

      <section className="karta p-4">
        <h2 className="font-bold">Jutro ({krotkaData(jutro)}) – {doWyslania.length ? `${doWyslania.length} przypomnień` : "brak wizyt"}</h2>
        <ul className="mt-2 space-y-1.5 text-[14px]">
          {doWyslania.map((w) => (
            <li key={w.id} className="flex justify-between gap-3">
              <span>
                {godzina(w.start)} · {w.klientka?.imie}
                {!w.klientka?.telefon && <span className="text-[#8a2f3a]"> (brak telefonu)</span>}
                {w.status === "oczekuje" && <span className="text-bursztyn"> (niepotwierdzona – SMS wyjdzie po potwierdzeniu)</span>}
              </span>
              <span className="shrink-0 text-szary">{OPIS_STATUSU[w.sms_status]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
