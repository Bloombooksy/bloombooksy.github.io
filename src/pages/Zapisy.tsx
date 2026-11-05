import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Link2Off } from "lucide-react";
import { supabase } from "../lib/supabase";
import { DNI_KROTKO, dodajDni, dzienKey, dzienTygodnia, godzina, opisCzasu, opisDnia } from "../lib/czas";
import { zl } from "../lib/pieniadze";
import { normalizujTelefon } from "../lib/sms";
import { Blad, Ladowanie } from "../components/ui";
import { Ekran } from "../components/EkranKlientki";

type Osoba = { id: string; imie: string; kolor: string };
type Info = {
  salon: string;
  kolor?: string;
  zadatek?: { kwota: number; tryb: "nowe" | "wszyscy" } | null;
  horyzont_dni: number;
  dni_pracy: number[];
  uslugi: { id: string; nazwa: string; czas_min: number; cena: number; pracownicy?: string[] }[];
  pracownicy?: Osoba[];
};
type Wynik = { id: string; kod: string; salon: string; usluga: string; start: string };
type Wolny = { start: string; pracownik_id: string };

/** Publiczna strona zapisów (link salonu) – bez logowania, widać tylko wolne godziny. */
export default function Zapisy() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const info = useQuery({
    queryKey: ["zapisy-info", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("zapisy_info", { p_token: token });
      if (error) throw error;
      return data as Info | null;
    },
  });
  const [uslugaId, setUslugaId] = useState("");
  // "" = ktokolwiek
  const [osobaId, setOsobaId] = useState("");
  const [dzien, setDzien] = useState("");
  const [start, setStart] = useState("");
  // link wysłany przez Madzię może mieć już imię i numer klientki
  const [imie, setImie] = useState(params.get("imie") ?? "");
  const [telefon, setTelefon] = useState(params.get("tel") ?? "");
  const [email, setEmail] = useState("");
  const [notatka, setNotatka] = useState("");
  const [blad, setBlad] = useState("");
  const [wysylam, setWysylam] = useState(false);
  const dalej = useRef<HTMLDivElement>(null);

  const dzis = dzienKey();
  const dni = useMemo(() => {
    if (!info.data) return [];
    return Array.from({ length: info.data.horyzont_dni + 1 }, (_, i) => dodajDni(dzis, i)).filter((d) => info.data!.dni_pracy.includes(dzienTygodnia(d)));
  }, [info.data, dzis]);

  const wolne = useQuery({
    enabled: !!uslugaId && !!dzien,
    queryKey: ["zapisy-wolne", token, uslugaId, dzien, osobaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("zapisy_wolne_v2", {
        p_token: token,
        p_usluga: uslugaId,
        p_dzien: dzien,
        p_pracownik: osobaId || null,
      });
      if (error) throw error;
      return (data ?? []) as Wolny[];
    },
  });

  useEffect(() => {
    if (start) dalej.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [start]);

  const usluga = info.data?.uslugi.find((u) => u.id === uslugaId);
  // osoby, które robią wybraną usługę (pusta lista przypisań = wszyscy)
  const osoby = useMemo(() => {
    const wszyscy = info.data?.pracownicy ?? [];
    const tylko = usluga?.pracownicy ?? [];
    return tylko.length ? wszyscy.filter((p) => tylko.includes(p.id)) : wszyscy;
  }, [info.data, usluga]);
  const wyborOsoby = osoby.length > 1;
  const imieOsoby = (id: string) => info.data?.pracownicy?.find((p) => p.id === id)?.imie;
  const wybranyTermin = wolne.data?.find((w) => w.start === start);

  async function zarezerwuj(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (!normalizujTelefon(telefon)) return setBlad("Podaj poprawny numer telefonu.");
    setWysylam(true);
    const { data, error } = await supabase.rpc("zapisy_rezerwuj_v3", {
      p_token: token,
      p_usluga: uslugaId,
      p_start: start,
      p_imie: imie,
      p_telefon: telefon,
      p_notatka: notatka,
      p_pracownik: osobaId || wybranyTermin?.pracownik_id || null,
      p_email: email.trim(),
    });
    setWysylam(false);
    if (error) {
      setBlad(error.message);
      setStart("");
      void wolne.refetch();
      return;
    }
    nav(`/wizyta/${(data as Wynik).kod}?nowa`);
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

  const nr = (krok: number) => (wyborOsoby || krok < 2 ? krok : krok - 1);

  return (
    <Ekran kolor={info.data.kolor}>
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
                setOsobaId("");
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

      {usluga && wyborOsoby && (
        <Krok nr={2} tytul="Do kogo?">
          <div className="flex flex-wrap gap-2">
            {[{ id: "", imie: "Ktokolwiek", kolor: "" }, ...osoby].map((p) => (
              <button
                key={p.id || "ktokolwiek"}
                onClick={() => {
                  setOsobaId(p.id);
                  setStart("");
                }}
                aria-pressed={osobaId === p.id}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-semibold ${osobaId === p.id ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier hover:border-mokka"}`}
              >
                {p.kolor && <span className="size-2.5 rounded-full" style={{ background: p.kolor }} />}
                {p.imie}
              </button>
            ))}
          </div>
          {!osobaId && <p className="mt-2 text-[13px] text-szary">Pokażemy najwięcej wolnych terminów u wszystkich osób.</p>}
        </Krok>
      )}

      {usluga && (
        <Krok nr={nr(3)} tytul="Wybierz dzień">
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
        <Krok nr={nr(4)} tytul={`Wolne godziny · ${opisDnia(dzien)}`}>
          {wolne.isLoading ? (
            <Ladowanie />
          ) : !wolne.data?.length ? (
            <p className="rounded-2xl bg-piasek/60 p-4 text-center text-szary">Tego dnia nie ma już wolnych godzin – wybierz inny dzień.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {wolne.data.map((t) => (
                <button
                  key={t.start}
                  onClick={() => setStart(t.start)}
                  aria-pressed={start === t.start}
                  className={`rounded-xl border py-2.5 font-semibold ${start === t.start ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier hover:border-mokka"}`}
                >
                  {godzina(t.start)}
                </button>
              ))}
            </div>
          )}
        </Krok>
      )}

      {blad && !start && <Blad>{blad}</Blad>}

      {start && usluga && (
        <div ref={dalej} className="scroll-mt-4">
          <Krok nr={nr(5)} tytul="Twoje dane">
            <form onSubmit={zarezerwuj} className="space-y-3">
              <p className="rounded-2xl bg-piasek/60 px-4 py-3 text-[15px]">
                <b>{usluga.nazwa}</b> · {opisDnia(dzien)}, {godzina(start)}
                {wyborOsoby && wybranyTermin && <> · u {imieOsoby(wybranyTermin.pracownik_id)}</>}
              </p>
              <input aria-label="Imię i nazwisko" required minLength={2} maxLength={80} autoComplete="name" className="pole" placeholder="Imię i nazwisko" value={imie} onChange={(e) => setImie(e.target.value)} />
              <input aria-label="Telefon" required type="tel" inputMode="tel" autoComplete="tel" className="pole" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
              <input aria-label="E-mail (opcjonalnie)" type="email" inputMode="email" autoComplete="email" maxLength={120} className="pole" placeholder="E-mail (opcjonalnie)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <textarea aria-label="Wiadomość" rows={2} maxLength={500} className="pole resize-none" placeholder="Wiadomość (opcjonalnie) – np. kolor, zdobienia" value={notatka} onChange={(e) => setNotatka(e.target.value)} />
              {info.data.zadatek && (
                <p className="rounded-xl bg-bursztyn-jasny px-3.5 py-2.5 text-[14px] text-bursztyn">
                  {info.data.zadatek.tryb === "wszyscy" ? "Do zapisu online potrzebny jest" : "Nowe klientki wpłacają"} zadatek{" "}
                  <b>{info.data.zadatek.kwota} zł</b> – po zapisie zobaczysz, jak go wpłacić. Zadatek jest częścią ceny.
                </p>
              )}
              <p className="text-[13px] text-szary">Telefon i e-mail służą tylko do potwierdzenia wizyty i przypomnienia dzień wcześniej.</p>
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
