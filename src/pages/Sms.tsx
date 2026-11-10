import { useEffect, useState } from "react";
import { MessageSquareText, Smartphone } from "lucide-react";
import { usePakiet, useSalon, useWizyty, useZmienSalon } from "../lib/dane";
import { linkWizyty, trescPrzypomnienia } from "../lib/wiadomosci";
import { WyslijSms } from "../components/WyslijSms";
import { Link } from "react-router-dom";
import {
  dodajDni,
  DNI_KROTKO,
  dzienKey,
  dzienTygodnia,
  godzina,
  krotkaData,
} from "../lib/czas";
import {
  bezPolskichZnakow,
  DOMYSLNY_SZABLON,
  liczbaCzesci,
  renderSzablon,
} from "../lib/sms";
import { komunikat } from "../lib/supabase";
import { Blad, Przelacznik } from "../components/ui";
import { Wstecz } from "../components/Wstecz";
import { odmiana } from "../lib/czas";

const ZMIENNE = ["{imie}", "{data}", "{godzina}", "{usluga}", "{salon}"];
const OPIS_STATUSU: Record<string, string> = {
  brak: "czeka na wysyłkę",
  wyslany: "SMS wysłany ✓",
  mail: "mail wysłany ✓",
  test: "tryb testowy (nie wyszedł)",
  blad: "błąd",
  pominiety: "bez przypomnienia",
};

export default function Sms() {
  const { data: s } = useSalon();
  const { data: pakiet } = usePakiet();
  const premium = pakiet?.pakiet === "premium";
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
  const podgladRecznego = trescPrzypomnienia({
    imie: "Ola",
    start: `${jutro}T10:30:00`,
    usluga: "Manicure hybrydowy",
    salon: s.nazwa,
    link: linkWizyty("abc123"),
  });
  const doWyslania = wizyty.filter(
    (w) => w.status === "potwierdzona" || w.status === "oczekuje",
  );
  const ustaw = (z: Record<string, unknown>) =>
    zmien.mutate(
      { id: s.id, ...z },
      {
        onError: (e) => setBlad(komunikat(e)),
        onSuccess: () => setZapisano(true),
      },
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Przypomnienia</h1>
      <div className="karta space-y-1.5 p-4 text-[14px]">
        {premium ? (
          <p>
            <b>Pakiet SMS:</b> dzień przed wizytą klientka dostaje SMS (do{" "}
            {pakiet?.sms_limit} w miesiącu, wykorzystane:{" "}
            {pakiet?.sms_w_miesiacu}). Klientki bez zgody na SMS i po
            wyczerpaniu limitu dostają mail, jeśli podały e-mail.
          </p>
        ) : (
          <p>
            <b>Bez pakietu SMS:</b> dzień przed wizytą klientka dostaje mail z
            przypomnieniem, jeśli podała e-mail (przy zapisie online albo w jej
            karcie). Pozostałym wyślesz SMS ze swojego telefonu jednym
            kliknięciem – zobacz niżej, jak to działa.{" "}
            <Link to="/pakiet" className="font-semibold underline">
              Automatyczne SMS-y – pakiety od 25 zł miesięcznie
            </Link>
            .
          </p>
        )}
      </div>
      <div className="karta space-y-4 p-4">
        <Przelacznik
          wl={s.sms_wlaczone}
          onZmien={(v) => ustaw({ sms_wlaczone: v })}
          etykieta="Wysyłaj przypomnienia"
          opis={
            premium
              ? "Dzień przed wizytą: SMS, a gdy się nie da – mail"
              : "Dzień przed wizytą: mail do klientek z adresem e-mail"
          }
        />
        <Przelacznik
          wl={s.powrot_wlaczony}
          onZmien={(v) => ustaw({ powrot_wlaczony: v })}
          etykieta="„Czas na kolejną wizytę” mailem"
          opis="Po zwykłym czasie od usługi (ustawiasz w Usługach) – tylko do klientek, które się na to zgodziły"
        />
        <label className="block">
          <span className="etykieta">Godzina wysyłki (dzień wcześniej)</span>
          <select
            className="pole"
            value={s.sms_godzina}
            onChange={(e) => ustaw({ sms_godzina: +e.target.value })}
          >
            {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
      </div>

      {premium && (
        <div className="karta space-y-3 p-4">
          <label className="etykieta" htmlFor="sz">
            Treść automatycznego SMS-a
          </label>
          <textarea
            id="sz"
            rows={4}
            className="pole resize-y"
            value={szablon}
            onChange={(e) => {
              setSzablon(e.target.value);
              setZapisano(false);
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {ZMIENNE.map((z) => (
              <button
                key={z}
                type="button"
                className="rounded-full bg-piasek px-2.5 py-1 font-mono text-[12px] font-semibold text-mokka"
                onClick={() =>
                  setSzablon((t) => `${t}${t.endsWith(" ") ? "" : " "}${z}`)
                }
              >
                {z}
              </button>
            ))}
          </div>
          <div className="rounded-2xl rounded-bl-md bg-[#e9e3dc] p-3.5 text-[15px]">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-szary">
              <MessageSquareText className="size-3.5" /> Podgląd ·{" "}
              {s.sms_nadawca || "nadawca"}
            </div>
            {bezPolskichZnakow(podglad)}
          </div>
          <p
            className={`text-[13px] ${czesci > 1 ? "font-semibold text-bursztyn" : "text-szary"}`}
          >
            {bezPolskichZnakow(podglad).length} znaków ·{" "}
            {czesci === 1
              ? "1 SMS"
              : `${czesci} SMS-y – skróć treść, żeby płacić za jeden`}
            . Polskie znaki zamieniamy na zwykłe (ą→a), bo inaczej SMS mieści
            tylko 70 znaków.
          </p>
          <label className="block">
            <span className="etykieta">
              Nazwa nadawcy (max 11 znaków, rejestruje się ją w SMSAPI)
            </span>
            <input
              className="pole"
              maxLength={11}
              placeholder="np. BloomBeauty"
              value={nadawca}
              onChange={(e) => {
                setNadawca(e.target.value);
                setZapisano(false);
              }}
            />
          </label>
          <button
            className="btn-glowny w-full"
            disabled={zmien.isPending}
            onClick={() =>
              ustaw({
                sms_szablon: szablon.trim() || DOMYSLNY_SZABLON,
                sms_nadawca: nadawca.trim(),
              })
            }
          >
            {zapisano ? "Zapisano ✓" : "Zapisz treść"}
          </button>
          <Blad>{blad}</Blad>
        </div>
      )}

      <section className="karta space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <Smartphone className="size-5" /> SMS ze swojego telefonu
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-[14px]">
          <li>Klikasz przycisk <b>SMS</b> przy wizycie.</li>
          <li>Otwierają się Wiadomości w Twoim telefonie z numerem klientki i gotową treścią.</li>
          <li>Możesz coś dopisać i klikasz <b>Wyślij</b>.</li>
        </ol>
        <p className="text-[13px] text-szary">
          SMS idzie z Twojego numeru, więc klientka może od razu odpisać. Kosztuje
          tyle, co zwykły SMS w Twoim abonamencie – zwykle nic. Bez limitu. Najlepiej
          działa na telefonie; na komputerze tylko, jeśli umie wysyłać SMS-y (np. Mac
          połączony z iPhone’em).
        </p>
        <div className="rounded-2xl rounded-bl-md bg-[#e9e3dc] p-3.5 text-[15px]">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-szary">
            <MessageSquareText className="size-3.5" /> Przykład przypomnienia
          </div>
          {podgladRecznego}
        </div>
        <details className="text-[14px]">
          <summary className="cursor-pointer font-semibold">Gdzie jeszcze jest przycisk SMS</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-szary">
            <li>tutaj – przy jutrzejszych wizytach (przypomnienie)</li>
            <li>po dodaniu wizyty – potwierdzenie terminu</li>
            <li>przy wizycie z zapisów online, która czeka na potwierdzenie</li>
            <li>po zakończonej wizycie – prośba o opinię Google</li>
            <li>w karcie klientki – link do zapisów online</li>
            <li>w Klientkach, w sekcji „Czas na kolejną wizytę”</li>
            <li>na liście oczekujących – „zwolnił się termin”</li>
          </ul>
        </details>
      </section>

      <section className="karta p-4">
        <h2 className="font-bold">
          Jutro ({krotkaData(jutro)}) –{" "}
          {doWyslania.length
            ? odmiana(doWyslania.length, "wizyta", "wizyty", "wizyt")
            : "brak wizyt"}
        </h2>
        {doWyslania.length === 0 && (
          <p className="mt-1 text-[14px] text-szary">
            Gdy jutro będą wizyty, przy każdej pojawi się tu przycisk SMS z gotowym
            przypomnieniem.
          </p>
        )}
        <ul className="mt-2 space-y-1.5 text-[14px]">
          {doWyslania.map((w) => (
            <li key={w.id} className="flex justify-between gap-3">
              <span>
                {godzina(w.start)} · {w.klientka?.imie}
                {w.sms_status === "brak" && !premium && !w.klientka?.email && (
                  <span className="text-szary"> (brak e-maila)</span>
                )}
                {w.status === "oczekuje" && (
                  <span className="text-bursztyn">
                    {" "}
                    (niepotwierdzona – przypomnienie wyjdzie po potwierdzeniu)
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-szary">
                {OPIS_STATUSU[w.sms_status]}
                {w.klientka?.telefon && w.sms_status !== "wyslany" && (
                  <WyslijSms
                    className="min-h-8 px-2.5 text-[13px]"
                    telefon={w.klientka.telefon}
                    tresc={trescPrzypomnienia({
                      imie: w.klientka.imie,
                      start: w.start,
                      usluga: w.usluga_nazwa,
                      salon: s.nazwa,
                      link: linkWizyty(w.kod),
                    })}
                  >
                    SMS
                  </WyslijSms>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
