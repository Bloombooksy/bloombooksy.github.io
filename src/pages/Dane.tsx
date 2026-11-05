import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Undo2 } from "lucide-react";
import { usePakiet, useSalon } from "../lib/dane";
import { dataCsv, doCsv, pobierzPlik } from "../lib/eksport";
import { komunikat, supabase } from "../lib/supabase";
import { Blad } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

const STATUS: Record<string, string> = {
  oczekuje: "czeka na potwierdzenie",
  potwierdzona: "potwierdzona",
  zrealizowana: "zrobiona",
  odwolana: "odwołana",
  nieobecnosc: "nie przyszła",
};

/** Twoje dane: eksport do Excela (CSV) i usunięcie salonu. */
export default function Dane() {
  const { data: s } = useSalon();
  const { data: pakiet } = usePakiet();
  const qc = useQueryClient();
  const [czeka, setCzeka] = useState("");
  const [blad, setBlad] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [pokazUsun, setPokazUsun] = useState(false);
  if (!s) return null;

  const plik = (co: string) => `${co}-${(s.slug || "salon").replace(/[^a-z0-9-]/gi, "")}-${new Date().toISOString().slice(0, 10)}.csv`;

  async function klientki() {
    setBlad("");
    setCzeka("klientki");
    const { data, error } = await supabase
      .from("klientki")
      .select("imie, telefon, email, instagram, notatka, zgoda_sms, zablokowana, wymaga_zadatku, created_at")
      .eq("salon_id", s!.id)
      .order("imie")
      .limit(20000);
    setCzeka("");
    if (error) return setBlad(komunikat(error));
    pobierzPlik(
      plik("klientki"),
      doCsv(
        ["Imię i nazwisko", "Telefon", "E-mail", "Instagram", "Notatka", "Zgoda na SMS", "Zablokowana", "Wymaga zadatku", "Dodana"],
        (data ?? []).map((k) => [k.imie, k.telefon, k.email, k.instagram, k.notatka, k.zgoda_sms ? "tak" : "nie", k.zablokowana ? "tak" : "nie", k.wymaga_zadatku ? "tak" : "nie", dataCsv(k.created_at, s!.strefa)]),
      ),
    );
  }

  async function wizyty() {
    setBlad("");
    setCzeka("wizyty");
    const { data, error } = await supabase
      .from("wizyty")
      .select("start, koniec, status, usluga_nazwa, cena, kwota, napiwek, platnosc, zadatek, zadatek_wplacony, notatka, zrodlo, klientka:klientki(imie, telefon), osoba:pracownicy(imie)")
      .eq("salon_id", s!.id)
      .order("start")
      .limit(50000);
    setCzeka("");
    if (error) return setBlad(komunikat(error));
    type W = (typeof data)[number] & { klientka: { imie: string; telefon: string } | null; osoba: { imie: string } | null };
    pobierzPlik(
      plik("wizyty"),
      doCsv(
        ["Początek", "Koniec", "Klientka", "Telefon", "Osoba", "Usługa", "Status", "Cena", "Zapłaciła", "Napiwek", "Płatność", "Zadatek", "Zadatek wpłacony", "Notatka", "Źródło"],
        ((data ?? []) as W[]).map((w) => [
          dataCsv(w.start, s!.strefa),
          dataCsv(w.koniec, s!.strefa),
          w.klientka?.imie ?? "",
          w.klientka?.telefon ?? "",
          w.osoba?.imie ?? "",
          w.usluga_nazwa,
          STATUS[w.status] ?? w.status,
          w.cena,
          w.kwota,
          w.napiwek,
          w.platnosc,
          w.zadatek,
          w.zadatek != null ? (w.zadatek_wplacony ? "tak" : "nie") : "",
          w.notatka,
          w.zrodlo === "link" ? "zapis online" : "salon",
        ]),
      ),
    );
  }

  async function usun() {
    setBlad("");
    setCzeka("usun");
    const { error } = await supabase.rpc("usun_salon", { p_nazwa: nazwa });
    setCzeka("");
    if (error) return setBlad(komunikat(error));
    setPokazUsun(false);
    await qc.invalidateQueries();
  }

  async function cofnij() {
    setBlad("");
    setCzeka("cofnij");
    const { error } = await supabase.rpc("anuluj_usuniecie");
    setCzeka("");
    if (error) return setBlad(komunikat(error));
    await qc.invalidateQueries();
  }

  const doUsuniecia = pakiet?.do_usuniecia;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Twoje dane</h1>

      <section className="karta space-y-3 p-5">
        <h2 className="font-bold">Pobierz dane do Excela</h2>
        <p className="text-[14px] text-szary">
          Dane klientek i wizyt należą do Ciebie. Pobierzesz je od razu, w każdej chwili – pliki CSV otworzysz w Excelu, Google Sheets lub Numbers.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn border border-linia bg-papier" disabled={!!czeka} onClick={klientki}>
            <Download className="size-4" /> {czeka === "klientki" ? "Przygotowuję…" : "Klientki"}
          </button>
          <button className="btn border border-linia bg-papier" disabled={!!czeka} onClick={wizyty}>
            <Download className="size-4" /> {czeka === "wizyty" ? "Przygotowuję…" : "Wizyty i utarg"}
          </button>
        </div>
      </section>

      <section className="karta space-y-3 p-5">
        <h2 className="font-bold">Usuń salon</h2>
        {doUsuniecia ? (
          <>
            <p className="text-[15px] font-semibold text-[#8a2f3a]">
              Salon zostanie usunięty {new Date(doUsuniecia).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}. Do tego dnia
              możesz zmienić zdanie i pobrać dane.
            </p>
            <button className="btn border border-linia bg-papier" disabled={!!czeka} onClick={cofnij}>
              <Undo2 className="size-4" /> {czeka === "cofnij" ? "Cofam…" : "Cofnij usunięcie"}
            </button>
            <p className="text-[13px] text-szary">Po cofnięciu włącz z powrotem zapisy online i przypomnienia w ustawieniach.</p>
          </>
        ) : pokazUsun ? (
          <>
            <p className="text-[14px]">
              Zapisy online i przypomnienia wyłączą się od razu, a po 30 dniach usuniemy wszystkie dane salonu: klientki, wizyty, usługi i zespół. Przez
              te 30 dni możesz to cofnąć. Najpierw pobierz dane powyżej.
            </p>
            <label className="etykieta" htmlFor="usun-nazwa">
              Wpisz nazwę salonu: <b>{s.nazwa}</b>
            </label>
            <input id="usun-nazwa" className="pole" value={nazwa} onChange={(e) => setNazwa(e.target.value)} autoComplete="off" />
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn border border-linia bg-papier" onClick={() => setPokazUsun(false)}>
                Anuluj
              </button>
              <button
                className="btn bg-[#8a2f3a] text-white"
                disabled={!!czeka || nazwa.trim().toLowerCase() !== s.nazwa.trim().toLowerCase()}
                onClick={usun}
              >
                <Trash2 className="size-4" /> {czeka === "usun" ? "Usuwam…" : "Usuń salon"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px] text-szary">Kończysz z Bloomly? Usuniemy salon i dane po 30 dniach – do tego czasu możesz to cofnąć.</p>
            <button className="btn-cichy w-fit text-[#8a2f3a]" onClick={() => setPokazUsun(true)}>
              Usuń salon…
            </button>
          </>
        )}
      </section>

      <Blad>{blad}</Blad>
    </div>
  );
}
