import { useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Blad, Modal } from "./ui";
import { useKlientki, useSalonId, useUslugi, useZapis, type WizytaZKlientka } from "../lib/dane";
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
  onClose,
}: {
  wizyta?: WizytaZKlientka;
  dzien?: string;
  start?: string;
  onClose: () => void;
}) {
  const salonId = useSalonId();
  const { data: uslugi = [] } = useUslugi();
  const { data: klientki = [] } = useKlientki();
  const wizytyApi = useZapis("wizyty", ["wizyty"]);
  const klientkiApi = useZapis("klientki", ["klientki"]);

  const [klientkaId, setKlientkaId] = useState<string | null>(wizyta?.klientka_id ?? null);
  const [szukaj, setSzukaj] = useState(wizyta?.klientka?.imie ?? "");
  const [telefon, setTelefon] = useState("");
  const [podpowiedzi, setPodpowiedzi] = useState(false);
  const [uslugaId, setUslugaId] = useState(wizyta?.usluga_id ?? "");
  const [data, setData] = useState(wizyta ? dzienKey(wizyta.start) : (dzien ?? dzienKey()));
  const [godz, setGodz] = useState(wizyta ? godzina(wizyta.start) : (start ?? "10:00"));
  const [czas, setCzas] = useState(
    wizyta ? Math.round((+new Date(wizyta.koniec) - +new Date(wizyta.start)) / 60000) : 60,
  );
  const [cena, setCena] = useState(wizyta ? String(wizyta.cena) : "");
  const [notatka, setNotatka] = useState(wizyta?.notatka ?? "");
  const [blad, setBlad] = useState("");
  const [zapisuje, setZapisuje] = useState(false);

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
        klientka_id: kId,
        usluga_id: usluga?.id ?? null,
        usluga_nazwa: usluga?.nazwa ?? wizyta?.usluga_nazwa ?? "",
        start: s.toISOString(),
        koniec: new Date(+s + czas * 60000).toISOString(),
        cena: kwotaCeny,
        notatka: notatka.trim(),
      };
      if (wizyta) await wizytyApi.zmien.mutateAsync({ id: wizyta.id, ...wiersz });
      else await wizytyApi.dodaj.mutateAsync({ ...wiersz, salon_id: salonId, status: "potwierdzona", zrodlo: "panel" });
      onClose();
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
