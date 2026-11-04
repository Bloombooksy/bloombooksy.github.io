import { useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Blad, Modal } from "./ui";
import { useJa, useKlientki, useSalon, useSalonId, useUslugi, useZapis, useZespol, type WizytaZKlientka } from "../lib/dane";
import { linkWizyty, smsHref, trescWizyty } from "../lib/wiadomosci";
import { WyslijSms } from "./WyslijSms";
import { dzienKey, godzina, opisCzasu, wStrefie } from "../lib/czas";
import { komunikat } from "../lib/supabase";
import { parsujKwote } from "../lib/pieniadze";
import { normalizujTelefon } from "../lib/sms";
import type { StatusWizyty } from "../lib/database.types";

const CZASY = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];

/** Nowa wizyta (z podpowiedzianą datą/godziną) albo edycja istniejącej. */
export function WizytaForm({
  wizyta,
  dzien,
  start,
  pracownik,
  szablon,
  onClose,
}: {
  wizyta?: WizytaZKlientka;
  dzien?: string;
  start?: string;
  pracownik?: string;
  /** nowa wizyta na wzór poprzedniej (np. „kolejna za 3 tygodnie”) */
  szablon?: { klientka_id: string | null; imie: string; usluga_id: string | null; czas: number; cena: number };
  onClose: () => void;
}) {
  const salonId = useSalonId();
  const ja = useJa();
  const { aktywni, wiele } = useZespol();
  const [osoba, setOsoba] = useState(wizyta?.pracownik_id ?? pracownik ?? ja);
  const { data: uslugi = [] } = useUslugi();
  const { data: klientki = [] } = useKlientki();
  const wizytyApi = useZapis("wizyty", ["wizyty"]);
  const klientkiApi = useZapis("klientki", ["klientki"]);

  const [klientkaId, setKlientkaId] = useState<string | null>(wizyta?.klientka_id ?? szablon?.klientka_id ?? null);
  const [szukaj, setSzukaj] = useState(wizyta?.klientka?.imie ?? szablon?.imie ?? "");
  const [telefon, setTelefon] = useState("");
  const [podpowiedzi, setPodpowiedzi] = useState(false);
  const [uslugaId, setUslugaId] = useState(wizyta?.usluga_id ?? szablon?.usluga_id ?? "");
  const [data, setData] = useState(wizyta ? dzienKey(wizyta.start) : (dzien ?? dzienKey()));
  const [godz, setGodz] = useState(wizyta ? godzina(wizyta.start) : (start ?? "10:00"));
  const [czas, setCzas] = useState(
    wizyta ? Math.round((+new Date(wizyta.koniec) - +new Date(wizyta.start)) / 60000) : (szablon?.czas ?? 60),
  );
  const [cena, setCena] = useState(wizyta ? String(wizyta.cena) : szablon ? String(szablon.cena) : "");
  const [notatka, setNotatka] = useState(wizyta?.notatka ?? "");
  const [blad, setBlad] = useState("");
  const [zapisuje, setZapisuje] = useState(false);
  const [dodana, setDodana] = useState<{ kod: string; start: string; usluga: string; imie: string; telefon: string } | null>(null);
  const { data: salon } = useSalon();

  const aktywne = uslugi.filter((u) => u.aktywna || u.id === uslugaId);
  const pasujace = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    if (!q) return klientki.slice(0, 6);
    const cyfry = q.replace(/\D/g, "");
    return klientki
      .filter((k) => k.imie.toLowerCase().includes(q) || (cyfry.length >= 3 && k.telefon.replace(/\D/g, "").includes(cyfry)))
      .slice(0, 6);
  }, [szukaj, klientki]);
  const nowa = !klientkaId && szukaj.trim().length > 0;
  const czasy = CZASY.includes(czas) ? CZASY : [...CZASY, czas].sort((a, b) => a - b);

  function wybierzUsluge(id: string) {
    setUslugaId(id);
    const u = uslugi.find((x) => x.id === id);
    if (u) {
      setCzas(u.czas_min);
      setCena(String(u.cena));
    }
  }

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (!szukaj.trim()) return setBlad("Wpisz klientkę.");
    if (nowa && telefon && !normalizujTelefon(telefon)) return setBlad("Sprawdź numer telefonu.");
    const kwotaCeny = parsujKwote(cena) ?? 0;
    const s = wStrefie(data, godz);
    const usluga = uslugi.find((u) => u.id === uslugaId);
    setZapisuje(true);
    try {
      let kId = klientkaId;
      if (nowa) {
        const k = await klientkiApi.dodaj.mutateAsync({ salon_id: salonId, imie: szukaj.trim(), telefon: telefon.trim() });
        kId = k.id;
      }
      const wiersz = {
        pracownik_id: osoba || ja,
        klientka_id: kId,
        usluga_id: usluga?.id ?? null,
        usluga_nazwa: usluga?.nazwa ?? wizyta?.usluga_nazwa ?? "",
        start: s.toISOString(),
        koniec: new Date(+s + czas * 60000).toISOString(),
        cena: kwotaCeny,
        notatka: notatka.trim(),
      };
      const tel = nowa ? telefon.trim() : (klientki.find((k) => k.id === kId)?.telefon ?? "");
      if (wizyta) {
        await wizytyApi.zmien.mutateAsync({ id: wizyta.id, ...wiersz });
        onClose();
      } else {
        const w = await wizytyApi.dodaj.mutateAsync({ ...wiersz, salon_id: salonId, status: "potwierdzona", zrodlo: "panel" });
        // od razu proponujemy SMS z linkiem do wizyty – klientka doda ją sobie do kalendarza
        if (tel) setDodana({ kod: w.kod, start: w.start, usluga: w.usluga_nazwa, imie: szukaj.trim(), telefon: tel });
        else onClose();
      }
    } catch (err) {
      setBlad(komunikat(err));
    } finally {
      setZapisuje(false);
    }
  }

  async function ustawStatus(status: StatusWizyty) {
    if (!wizyta) return;
    try {
      await wizytyApi.zmien.mutateAsync({ id: wizyta.id, status });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  async function usun() {
    if (!wizyta || !window.confirm("Usunąć tę wizytę na stałe?")) return;
    try {
      await wizytyApi.usun.mutateAsync(wizyta.id);
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  if (dodana) {
    const tresc = trescWizyty({ ...dodana, salon: salon?.nazwa ?? "", link: linkWizyty(dodana.kod) });
    return (
      <Modal tytul="Wizyta dodana ✓" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-[15px]">
            Wyślij <b>{dodana.imie}</b> SMS z terminem – w linku doda wizytę do swojego kalendarza jednym tapnięciem.
          </p>
          <p className="rounded-2xl rounded-bl-md bg-[#e9e3dc] p-3.5 text-[14px]">{tresc}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-jasny" onClick={onClose}>
              Nie teraz
            </button>
            <a className="btn-glowny" href={smsHref(dodana.telefon, tresc)} onClick={() => setTimeout(onClose, 300)}>
              Wyślij SMS
            </a>
          </div>
        </div>
      </Modal>
    );
  }

  const telKlientki = wizyta?.klientka?.telefon ?? "";
  const aktualna = wizyta && (wizyta.status === "potwierdzona" || wizyta.status === "oczekuje");

  return (
    <Modal
      tytul={wizyta ? "Wizyta" : "Nowa wizyta"}
      onClose={onClose}
      stopka={
        <div className="flex gap-2">
          {wizyta && (
            <button type="button" onClick={usun} className="btn-cichy px-3 text-[#8a2f3a]" aria-label="Usuń wizytę">
              <Trash2 className="size-5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-jasny flex-1">
            Anuluj
          </button>
          <button form="wizyta-form" disabled={zapisuje} className="btn-glowny flex-[2]">
            {zapisuje ? "Zapisuję…" : wizyta ? "Zapisz zmiany" : "Dodaj wizytę"}
          </button>
        </div>
      }
    >
      <form id="wizyta-form" onSubmit={zapisz} className="space-y-4">
        <div className="relative">
          <label className="etykieta" htmlFor="kl">
            Klientka
          </label>
          <input
            id="kl"
            className="pole"
            autoComplete="off"
            placeholder="Imię albo numer telefonu"
            value={szukaj}
            onChange={(e) => {
              setSzukaj(e.target.value);
              setKlientkaId(null);
              setPodpowiedzi(true);
            }}
            onFocus={() => setPodpowiedzi(true)}
            onBlur={() => setTimeout(() => setPodpowiedzi(false), 150)}
          />
          {podpowiedzi && pasujace.length > 0 && !klientkaId && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-linia bg-papier shadow-lg">
              {pasujace.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setKlientkaId(k.id);
                      setSzukaj(k.imie);
                      setPodpowiedzi(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-piasek/50"
                  >
                    <span className="font-semibold">{k.imie}</span>
                    <span className="text-[13px] text-szary">{k.telefon}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {nowa && (
            <div className="mt-2 rounded-xl bg-piasek/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-mokka">
                <UserPlus className="size-4" /> Nowa klientka – dodam ją do listy
              </p>
              <input
                className="pole"
                type="tel"
                inputMode="tel"
                placeholder="Telefon (do przypomnień SMS)"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
              />
            </div>
          )}
        </div>

        {wiele && (
          <div>
            <span className="etykieta">Kto przyjmuje</span>
            <div className="flex flex-wrap gap-2">
              {aktywni.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={osoba === p.id}
                    onClick={() => setOsoba(p.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-semibold ${
                      osoba === p.id ? "border-atrament bg-atrament text-krem" : "border-linia bg-papier"
                    }`}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: p.kolor }} />
                    {p.imie}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div>
          <label className="etykieta" htmlFor="us">
            Usługa
          </label>
          <select id="us" className="pole" value={uslugaId} onChange={(e) => wybierzUsluge(e.target.value)}>
            <option value="">{wizyta?.usluga_nazwa && !wizyta.usluga_id ? wizyta.usluga_nazwa : "— wybierz —"}</option>
            {aktywne.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nazwa} · {u.czas_min} min · {u.cena} zł
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etykieta" htmlFor="dt">
              Dzień
            </label>
            <input id="dt" type="date" required className="pole" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label className="etykieta" htmlFor="gd">
              Godzina
            </label>
            <input id="gd" type="time" required step={300} className="pole" value={godz} onChange={(e) => setGodz(e.target.value)} />
          </div>
          <div>
            <label className="etykieta" htmlFor="cz">
              Czas trwania
            </label>
            <select id="cz" className="pole" value={czas} onChange={(e) => setCzas(+e.target.value)}>
              {czasy.map((m) => (
                <option key={m} value={m}>
                  {opisCzasu(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etykieta" htmlFor="cn">
              Cena (zł)
            </label>
            <input id="cn" inputMode="decimal" className="pole" placeholder="0" value={cena} onChange={(e) => setCena(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="etykieta" htmlFor="nt">
            Notatka
          </label>
          <textarea id="nt" rows={2} className="pole resize-none" placeholder="np. kolor, zdobienia, uwagi" value={notatka} onChange={(e) => setNotatka(e.target.value)} />
        </div>

        {wizyta && aktualna && telKlientki && (
          <WyslijSms className="w-full"
            telefon={telKlientki}
            tresc={trescWizyty({ imie: wizyta.klientka?.imie ?? "", start: wizyta.start, usluga: wizyta.usluga_nazwa, salon: salon?.nazwa ?? "", link: linkWizyty(wizyta.kod) })}
          >
            Wyślij klientce SMS z wizytą
          </WyslijSms>
        )}
        {wizyta && wizyta.zadatek != null && (
          <label className="flex items-center justify-between gap-3 rounded-xl bg-piasek/50 px-3.5 py-3">
            <span className="text-[15px]">
              Zadatek <b>{wizyta.zadatek} zł</b> {wizyta.zadatek_wplacony ? "wpłacony" : "– jeszcze nie wpłacony"}
            </span>
            <input
              type="checkbox"
              className="size-5 accent-[#4f7a5b]"
              checked={wizyta.zadatek_wplacony}
              onChange={(e) => wizytyApi.zmien.mutate({ id: wizyta.id, zadatek_wplacony: e.target.checked }, { onSuccess: onClose })}
              aria-label="Zadatek wpłacony"
            />
          </label>
        )}
        {wizyta?.odwolala_klientka && <p className="rounded-xl bg-roz-jasny px-3.5 py-2.5 text-[14px] font-semibold text-[#8a2f3a]">Klientka sama odwołała tę wizytę.</p>}
        {wizyta && wizyta.status !== "zrealizowana" && (
          <div className="flex flex-wrap gap-2">
            {wizyta.status === "oczekuje" && (
              <button type="button" className="btn-zielony" onClick={() => ustawStatus("potwierdzona")}>
                Potwierdź
              </button>
            )}
            {wizyta.status !== "odwolana" ? (
              <button type="button" className="btn-jasny" onClick={() => ustawStatus("odwolana")}>
                Odwołaj wizytę
              </button>
            ) : (
              <button type="button" className="btn-jasny" onClick={() => ustawStatus("potwierdzona")}>
                Przywróć wizytę
              </button>
            )}
          </div>
        )}
        <Blad>{blad}</Blad>
      </form>
    </Modal>
  );
}
