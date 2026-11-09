import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, Plus } from "lucide-react";
import { useCzyWlascicielka, useJa, useWizyty, useZespol, type WizytaZKlientka } from "../lib/dane";
import { dodajDni, dzienKey } from "../lib/czas";
import { podsumuj, zl } from "../lib/pieniadze";
import { Kafelek, Ladowanie, Pusto } from "../components/ui";
import { PasekDnia, tytulDnia } from "../components/PasekDnia";
import { WizytaKarta } from "../components/WizytaKarta";
import { WizytaForm } from "../components/WizytaForm";
import { ZakonczForm } from "../components/ZakonczForm";
import { Oczekujace } from "../components/Oczekujace";
import { WyborOsoby, useWybranaOsoba } from "../components/WyborOsoby";
import { PierwszeKroki } from "../components/PierwszeKroki";

/** Ekran „Dziś”: lista klientek, odhaczanie z kwotą, licznik i utarg dnia. */
export function Dzis() {
  const [params, setParams] = useSearchParams();
  const dzis = dzienKey();
  const dzien = params.get("d") ?? dzis;
  const ustaw = (k: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (k === dzis) n.delete("d");
        else n.set("d", k);
        return n;
      },
      { replace: true },
    );
  const [osoba, setOsoba] = useWybranaOsoba();
  const { aktywni, wiele } = useZespol();
  const osoby = new Map(aktywni.map((p) => [p.id, p]));
  const { data: wizytyDnia = [], isLoading } = useWizyty(dzien, dzien);
  const wizyty = osoba ? wizytyDnia.filter((w) => w.pracownik_id === osoba) : wizytyDnia;
  const [edycja, setEdycja] = useState<WizytaZKlientka | "nowa" | null>(null);
  const [koniec, setKoniec] = useState<WizytaZKlientka | null>(null);

  const wlascicielka = useCzyWlascicielka();
  const ja = useJa();
  // osoba z zespołu widzi w kafelkach tylko swój utarg
  const p = podsumuj(wlascicielka ? wizyty : wizyty.filter((w) => w.pracownik_id === ja));
  const aktywne = wizyty.filter((w) => w.status !== "odwolana");
  const wszystkie = p.zrobione + p.zaplanowane;
  const { tytul, podtytul } = tytulDnia(dzien);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PasekDnia
        tytul={tytul}
        podtytul={podtytul}
        czyDzis={dzien === dzis}
        onPoprz={() => ustaw(dodajDni(dzien, -1))}
        onNast={() => ustaw(dodajDni(dzien, 1))}
        onDzis={() => ustaw(dzis)}
      />

      {dzien === dzis && <PierwszeKroki />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kafelek etykieta="Klientki" wartosc={`${p.zrobione} / ${wszystkie}`} podpis={p.zaplanowane ? `zostało ${p.zaplanowane}` : wszystkie ? "wszystkie zrobione" : "brak wizyt"} />
        <Kafelek akcent etykieta="Utarg" wartosc={zl(p.razem)} podpis={p.napiwki ? `w tym napiwki ${zl(p.napiwki)}` : p.prognoza > p.razem ? `plan na dziś ${zl(p.prognoza)}` : undefined} />
        <div className="col-span-2 sm:col-span-1">
          <Kafelek
            etykieta="Płatności"
            wartosc={<span className="text-[17px]">{p.wgPlatnosci.gotowka ? `${zl(p.wgPlatnosci.gotowka)} got.` : "—"}</span>}
            podpis={[p.wgPlatnosci.karta && `karta ${zl(p.wgPlatnosci.karta)}`, p.wgPlatnosci.blik && `BLIK ${zl(p.wgPlatnosci.blik)}`, p.wgPlatnosci.przelew && `przelew ${zl(p.wgPlatnosci.przelew)}`].filter(Boolean).join(" · ") || "gotówka do kasetki"}
          />
        </div>
      </div>

      <WyborOsoby wartosc={osoba} onZmien={setOsoba} />

      {dzien === dzis && <Oczekujace />}

      {isLoading ? (
        <Ladowanie />
      ) : aktywne.length === 0 && wizyty.length === 0 ? (
        <Pusto ikona={<CalendarPlus className="size-8 text-linia" />}>
          Ten dzień jest wolny.
          <button className="btn-glowny mt-2" onClick={() => setEdycja("nowa")}>
            Dodaj wizytę
          </button>
        </Pusto>
      ) : (
        <div className="space-y-2.5">
          {wizyty.map((w) => (
            <WizytaKarta key={w.id} w={w} osoba={!osoba && wiele ? osoby.get(w.pracownik_id) : undefined} onOtworz={() => setEdycja(w)} onZakoncz={() => setKoniec(w)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setEdycja("nowa")}
        className="fixed right-5 bottom-24 z-10 grid size-14 place-items-center rounded-full bg-atrament text-krem shadow-xl hover:bg-mokka md:bottom-8"
        aria-label="Nowa wizyta"
      >
        <Plus className="size-7" />
      </button>

      {edycja && <WizytaForm wizyta={edycja === "nowa" ? undefined : edycja} dzien={dzien} pracownik={osoba || undefined} onClose={() => setEdycja(null)} />}
      {koniec && <ZakonczForm wizyta={koniec} onClose={() => setKoniec(null)} />}
    </div>
  );
}
