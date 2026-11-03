import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Clock, Link2Off } from "lucide-react";
import { supabase } from "../lib/supabase";
import { DNI_KROTKO, dodajDni, dzienKey, dzienTygodnia, godzina, opisCzasu, opisDnia } from "../lib/czas";
import { zl } from "../lib/pieniadze";
import { normalizujTelefon } from "../lib/sms";
import { Blad, Ladowanie } from "../components/ui";

type Info = {
  salon: string;
  horyzont_dni: number;
  dni_pracy: number[];
  uslugi: { id: string; nazwa: string; czas_min: number; cena: number }[];
};
type Wynik = { id: string; salon: string; usluga: string; start: string };

/** Publiczna strona zapisów dla znajomych (tajny link) – bez logowania, widać tylko wolne godziny. */
export default function Zapisy() {
  const { token = "" } = useParams();
  const info = useQuery({
    queryKey: ["zapisy-info", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("zapisy_info", { p_token: token });
      if (error) throw error;
      return data as Info | null;
    },
  });
  const [uslugaId, setUslugaId] = useState("");
  const [dzien, setDzien] = useState("");
  const [start, setStart] = useState("");
  const [imie, setImie] = useState("");
  const [telefon, setTelefon] = useState("");
  const [notatka, setNotatka] = useState("");
  const [blad, setBlad] = useState("");
  const [wysylam, setWysylam] = useState(false);
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const dalej = useRef<HTMLDivElement>(null);

  const dzis = dzienKey();
  const dni = useMemo(() => {
    if (!info.data) return [];
    return Array.from({ length: info.data.horyzont_dni + 1 }, (_, i) => dodajDni(dzis, i)).filter((d) => info.data!.dni_pracy.includes(dzienTygodnia(d)));
  }, [info.data, dzis]);

  const wolne = useQuery({
    enabled: !!uslugaId && !!dzien,
    queryKey: ["zapisy-wolne", token, uslugaId, dzien],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("zapisy_wolne", { p_token: token, p_usluga: uslugaId, p_dzien: dzien });
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });

  useEffect(() => {
    if (start) dalej.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [start]);

  const usluga = info.data?.uslugi.find((u) => u.id === uslugaId);

  async function zarezerwuj(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (!normalizujTelefon(telefon)) return setBlad("Podaj poprawny numer telefonu.");
    setWysylam(true);
    const { data, error } = await supabase.rpc("zapisy_rezerwuj", {
      p_token: token,
      p_usluga: uslugaId,
      p_start: start,
      p_imie: imie,
      p_telefon: telefon,
      p_notatka: notatka,
    });
    setWysylam(false);
    if (error) {
      setBlad(error.message);
      setStart("");
      void wolne.refetch();
      return;
    }
    setWynik(data as Wynik);
  }

  if (info.isLoading) return <Ladowanie />;
  if (!info.data)
    return (
      <Ekran>
        <Link2Off className="mx-auto size-10 text-szary" />
        <h1 className="naglowek mt-3 text-center">Link jest nieaktywny</h1>
        <p className="mt-2 text-center text-szary">Zapisy są wyłączone albo link się zmienił. Napisz bezpośrednio, żeby umówić wizytę.</p>
      </Ekran>
    );

  if (wynik)
    return (
      <Ekran>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-ziel-jasny text-ziel">
          <CalendarCheck2 className="size-8" />
        </div>
        <h1 className="naglowek mt-4 text-center">Dziękuję, {imie.trim().split(" ")[0]}!</h1>
        <p className="mt-2 text-center text-[16px]">
          <b>{wynik.usluga}</b>
          <br />
          {opisDnia(dzienKey(wynik.start))}, godz. {godzina(wynik.start)}
        </p>
        <p className="mt-4 rounded-2xl bg-bursztyn-jasny p-4 text-center text-[15px] text-bursztyn">
          Termin czeka na potwierdzenie – dam znać. Dzień przed wizytą dostaniesz SMS z przypomnieniem.
        </p>
      </Ekran>
    );

  return (
    <Ekran>
      <header className="text-center">
        <p className="text-[12px] font-bold tracking-[0.2em] text-zloto uppercase">Zapisy online</p>
        <h1 className="mt-1 font-serif text-[34px] leading-tight font-semibold">{info.data.salon}</h1>
      </header>

      <Krok nr={1} tytul="Wybierz usługę">
        {info.data.uslugi.length === 0 && <p className="text-szary">Brak usług do zapisu.</p>}
        <div className="grid gap-2">
          {info.data.uslugi.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setUslugaId(u.id);
                setStart("");
              }}
              aria-pressed={uslugaId === u.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${uslugaId === u.id ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier hover:border-mokka"}`}
            >
              <span>
                <span className="block font-bold">{u.nazwa}</span>
                <span className={`flex items-center gap-1 text-[13px] ${uslugaId === u.id ? "text-krem/70" : "text-szary"}`}>
                  <Clock className="size-3.5" /> {opisCzasu(u.czas_min)}
                </span>
              </span>
              {Number(u.cena) > 0 && <span className="font-serif text-lg font-semibold">{zl(Number(u.cena))}</span>}
            </button>
          ))}
        </div>
      </Krok>

      {usluga && (
        <Krok nr={2} tytul="Wybierz dzień">
          <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2">
            {dni.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDzien(d);
                  setStart("");
                }}
                aria-pressed={dzien === d}
                className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 ${dzien === d ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier"}`}
              >
                <span className="text-[11px] font-bold uppercase opacity-70">{DNI_KROTKO[dzienTygodnia(d)]}</span>
                <span className="font-serif text-xl font-semibold">{+d.slice(8)}</span>
                <span className="text-[11px] opacity-70">{["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"][+d.slice(5, 7) - 1]}</span>
              </button>
            ))}
          </div>
        </Krok>
      )}

      {usluga && dzien && (
        <Krok nr={3} tytul={`Wolne godziny · ${opisDnia(dzien)}`}>
          {wolne.isLoading ? (
            <Ladowanie />
          ) : !wolne.data?.length ? (
            <p className="rounded-2xl bg-piasek/60 p-4 text-center text-szary">Tego dnia nie ma już wolnych godzin – wybierz inny dzień.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {wolne.data.map((t) => (
                <button
                  key={t}
                  onClick={() => setStart(t)}
                  aria-pressed={start === t}
                  className={`rounded-xl border py-2.5 font-semibold ${start === t ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier hover:border-mokka"}`}
                >
                  {godzina(t)}
                </button>
              ))}
            </div>
          )}
        </Krok>
      )}

      {blad && !start && <Blad>{blad}</Blad>}

      {start && usluga && (
        <div ref={dalej} className="scroll-mt-4">
          <Krok nr={4} tytul="Twoje dane">
            <form onSubmit={zarezerwuj} className="space-y-3">
              <p className="rounded-2xl bg-piasek/60 px-4 py-3 text-[15px]">
                <b>{usluga.nazwa}</b> · {opisDnia(dzien)}, {godzina(start)}
              </p>
              <input aria-label="Imię i nazwisko" required minLength={2} maxLength={80} autoComplete="name" className="pole" placeholder="Imię i nazwisko" value={imie} onChange={(e) => setImie(e.target.value)} />
              <input aria-label="Telefon" required type="tel" inputMode="tel" autoComplete="tel" className="pole" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
              <textarea aria-label="Wiadomość" rows={2} maxLength={500} className="pole resize-none" placeholder="Wiadomość (opcjonalnie) – np. kolor, zdobienia" value={notatka} onChange={(e) => setNotatka(e.target.value)} />
              <p className="text-[13px] text-szary">Numer służy tylko do potwierdzenia wizyty i przypomnienia SMS dzień wcześniej.</p>
              <Blad>{blad}</Blad>
              <button disabled={wysylam} className="btn-glowny w-full">
                {wysylam ? "Zapisuję…" : "Zapisz mnie"}
              </button>
            </form>
          </Krok>
        </div>
      )}
    </Ekran>
  );
}

function Ekran({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md space-y-7 px-5 py-10">{children}</div>;
}

function Krok({ nr, tytul, children }: { nr: number; tytul: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2.5 text-[15px] font-bold">
        <span className="grid size-6 place-items-center rounded-full bg-zloto text-[12px] text-white">{nr}</span>
        <span className="first-letter:uppercase">{tytul}</span>
      </h2>
      {children}
    </section>
  );
}
