import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, UserRound } from "lucide-react";
import { useGodzinyPracownikow, usePracownicy, useSalon, useSalonId, useUslugi, useUslugiPracownicy, useZapis } from "../lib/dane";
import type { PracownikRow } from "../lib/database.types";
import { DNI } from "../lib/czas";
import { KOLORY_OSOB } from "../lib/branze";
import { adresAplikacji } from "../lib/wiadomosci";
import { komunikat, supabase } from "../lib/supabase";
import { Blad, Ladowanie, Modal, Przelacznik } from "../components/ui";
import { Wstecz } from "../components/Wstecz";

/** Zespół salonu: każda osoba ma swój kalendarz, godziny i usługi; może dostać własne konto. */
export default function Zespol() {
  const { data = [], isLoading } = usePracownicy();
  const [edycja, setEdycja] = useState<PracownikRow | "nowa" | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <div className="flex items-center justify-between">
        <h1 className="naglowek">Zespół</h1>
        <button className="btn-glowny" onClick={() => setEdycja("nowa")}>
          <Plus className="size-5" /> Dodaj osobę
        </button>
      </div>
      <p className="text-[14px] text-szary">
        Każda osoba ma swój kalendarz – dwie stylistki mogą przyjmować klientki o tej samej godzinie. Klientki przy zapisach wybierają osobę albo „ktokolwiek”.
      </p>
      {isLoading ? (
        <Ladowanie />
      ) : (
        <ul className="karta divide-y divide-linia">
          {data.map((p) => (
            <li key={p.id}>
              <button onClick={() => setEdycja(p)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-piasek/30 ${p.aktywny ? "" : "opacity-50"}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full font-serif text-lg font-semibold text-white" style={{ background: p.kolor }}>
                  {p.imie.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.imie}</span>
                  <span className="block truncate text-[13px] text-szary">
                    {p.rola === "wlascicielka"
                      ? "Właścicielka"
                      : p.user_id
                        ? "Ma konto"
                        : p.email
                          ? `Zaproszona: ${p.email}`
                          : "Bez konta (kalendarz prowadzisz Ty)"}
                    {!p.aktywny && " · nieaktywna"}
                    {p.aktywny && !p.w_zapisach && " · bez zapisów online"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edycja && <OsobaModal p={edycja === "nowa" ? null : edycja} liczba={data.length} onClose={() => setEdycja(null)} />}
    </div>
  );
}

type Dzien = { wl: boolean; od: string; do: string };

function OsobaModal({ p, liczba, onClose }: { p: PracownikRow | null; liczba: number; onClose: () => void }) {
  const salonId = useSalonId();
  const { data: salon } = useSalon();
  const qc = useQueryClient();
  const api = useZapis("pracownicy", ["pracownicy", "kontekst"]);
  const { data: uslugi = [] } = useUslugi();
  const { data: przypisania = [] } = useUslugiPracownicy();
  const { data: godzinyOsob = [] } = useGodzinyPracownikow();
  const wlascicielka = p?.rola === "wlascicielka";

  const [f, setF] = useState({
    imie: p?.imie ?? "",
    kolor: p?.kolor ?? KOLORY_OSOB[liczba % KOLORY_OSOB.length]!,
    email: p?.email ?? "",
    aktywny: p?.aktywny ?? true,
    w_zapisach: p?.w_zapisach ?? true,
  });
  // usługi: pusty zbiór = wszystkie
  const [wybrane, setWybrane] = useState<Set<string>>(new Set());
  const [wszystkieUslugi, setWszystkieUslugi] = useState(true);
  const [wlasneGodziny, setWlasneGodziny] = useState(false);
  const [dni, setDni] = useState<Dzien[]>(() => Array.from({ length: 7 }, (_, i) => ({ wl: i < 5, od: "09:00", do: "17:00" })));
  const [blad, setBlad] = useState("");
  const [zapisuje, setZapisuje] = useState(false);
  const [skopiowano, setSkopiowano] = useState(false);

  useEffect(() => {
    if (!p) return;
    const moje = przypisania.filter((x) => x.pracownik_id === p.id).map((x) => x.usluga_id);
    // usługa bez żadnych przypisań = robią ją wszyscy
    const ograniczone = uslugi.filter((u) => przypisania.some((x) => x.usluga_id === u.id));
    const robi = uslugi.filter((u) => !ograniczone.includes(u) || moje.includes(u.id)).map((u) => u.id);
    setWybrane(new Set(robi));
    setWszystkieUslugi(robi.length === uslugi.length);
    const g = godzinyOsob.filter((x) => x.pracownik_id === p.id);
    setWlasneGodziny(g.length > 0);
    if (g.length)
      setDni(
        Array.from({ length: 7 }, (_, i) => {
          const r = g.find((x) => x.dzien === i + 1);
          return r ? { wl: true, od: r.od_godz.slice(0, 5), do: r.do_godz.slice(0, 5) } : { wl: false, od: "09:00", do: "17:00" };
        }),
      );
  }, [p, przypisania, uslugi, godzinyOsob]);

  const zaproszenie = `Cześć! Dodałam Cię do zespołu ${salon?.nazwa ?? ""} w Bloomly. Załóż konto na adres ${f.email.trim()} tutaj: ${adresAplikacji()} – po zalogowaniu zobaczysz swój kalendarz.`;

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (wlasneGodziny && dni.some((d) => d.wl && d.od >= d.do)) return setBlad("Godzina końca musi być po godzinie początku.");
    setZapisuje(true);
    try {
      const wiersz = { ...f, imie: f.imie.trim(), email: f.email.trim().toLowerCase() || null };
      const osoba = p ? await api.zmien.mutateAsync({ id: p.id, ...wiersz }) : await api.dodaj.mutateAsync({ ...wiersz, salon_id: salonId, kolejnosc: liczba });

      // kto robi które usługi: zapisujemy przypisania tylko dla usług, których ta osoba NIE robi wszystkich
      await zapiszUslugi(osoba.id);

      const r1 = await supabase.from("godziny_pracownikow").delete().eq("pracownik_id", osoba.id);
      if (r1.error) throw r1.error;
      if (wlasneGodziny) {
        const wiersze = dni.flatMap((d, i) => (d.wl ? [{ pracownik_id: osoba.id, dzien: i + 1, od_godz: d.od, do_godz: d.do }] : []));
        if (wiersze.length) {
          const r2 = await supabase.from("godziny_pracownikow").insert(wiersze);
          if (r2.error) throw r2.error;
        }
      }
      await qc.invalidateQueries({ queryKey: ["godziny_pracownikow"] });
      await qc.invalidateQueries({ queryKey: ["uslugi_pracownicy"] });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    } finally {
      setZapisuje(false);
    }
  }

  /** Usługa z przypisaniami = tylko te osoby. Gdy ktoś przestaje robić usługę, którą robili wszyscy,
   *  przypisujemy ją jawnie pozostałym aktywnym osobom. */
  async function zapiszUslugi(osobaId: string) {
    const { data: zespol = [] } = await supabase.from("pracownicy").select("id").eq("salon_id", salonId).eq("aktywny", true);
    const inni = (zespol ?? []).map((x) => x.id).filter((id) => id !== osobaId);
    for (const u of uslugi) {
      const obecne = przypisania.filter((x) => x.usluga_id === u.id).map((x) => x.pracownik_id);
      const robi = wszystkieUslugi || wybrane.has(u.id);
      let nowe: string[];
      if (obecne.length === 0) nowe = robi ? [] : inni;
      else nowe = robi ? [...new Set([...obecne, osobaId])] : obecne.filter((id) => id !== osobaId);
      // wszyscy aktywni robią usługę → wracamy do „bez ograniczeń”
      if (nowe.length && [...inni, osobaId].every((id) => nowe.includes(id))) nowe = [];
      const takieSame = nowe.length === obecne.length && nowe.every((id) => obecne.includes(id));
      if (takieSame) continue;
      const d = await supabase.from("uslugi_pracownicy").delete().eq("usluga_id", u.id);
      if (d.error) throw d.error;
      if (nowe.length) {
        const i = await supabase.from("uslugi_pracownicy").insert(nowe.map((pid) => ({ usluga_id: u.id, pracownik_id: pid })));
        if (i.error) throw i.error;
      }
    }
  }

  async function usun() {
    if (!p || !window.confirm(`Usunąć ${p.imie} z zespołu? Jeśli ma wizyty, zostanie tylko wyłączona.`)) return;
    try {
      await api.usun.mutateAsync(p.id);
      onClose();
    } catch {
      // ma wizyty (klucz obcy) → wyłączamy zamiast usuwać
      await api.zmien.mutateAsync({ id: p.id, aktywny: false });
      onClose();
    }
  }

  return (
    <Modal
      tytul={p ? p.imie : "Nowa osoba w zespole"}
      onClose={onClose}
      stopka={
        <div className="flex gap-2">
          {p && !wlascicielka && (
            <button type="button" className="btn-cichy text-[#8a2f3a]" onClick={usun}>
              Usuń
            </button>
          )}
          <button form="osoba-form" disabled={zapisuje} className="btn-glowny flex-1">
            {zapisuje ? "Zapisuję…" : "Zapisz"}
          </button>
        </div>
      }
    >
      <form id="osoba-form" onSubmit={zapisz} className="space-y-5">
        <label className="block">
          <span className="etykieta">Imię (widzą je klientki)</span>
          <input required maxLength={60} className="pole" value={f.imie} onChange={(e) => setF({ ...f, imie: e.target.value })} />
        </label>
        <div>
          <span className="etykieta">Kolor w kalendarzu</span>
          <div className="flex flex-wrap gap-2">
            {KOLORY_OSOB.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`Kolor ${k}`}
                aria-pressed={f.kolor === k}
                onClick={() => setF({ ...f, kolor: k })}
                className="size-9 rounded-full ring-offset-2 ring-offset-papier aria-pressed:ring-2 aria-pressed:ring-atrament"
                style={{ background: k }}
              />
            ))}
          </div>
        </div>

        {!wlascicielka && (
          <div className="rounded-2xl bg-piasek/50 p-4">
            <label className="block">
              <span className="etykieta">E-mail do logowania (opcjonalnie)</span>
              <input
                type="email"
                className="pole"
                placeholder="Gdy podasz, ta osoba sama zobaczy swój kalendarz"
                disabled={!!p?.user_id}
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </label>
            {p?.user_id ? (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ziel">
                <UserRound className="size-4" /> Konto połączone
              </p>
            ) : (
              f.email.includes("@") && (
                <button
                  type="button"
                  className="btn-jasny mt-3 w-full"
                  onClick={async () => {
                    await navigator.clipboard.writeText(zaproszenie);
                    setSkopiowano(true);
                  }}
                >
                  <Copy className="size-4" /> {skopiowano ? "Skopiowano – wklej jej w SMS-ie" : "Kopiuj zaproszenie"}
                </button>
              )
            )}
            <p className="mt-2 text-[12px] text-szary">Osoba z zespołu widzi kalendarz i klientki, ale nie zmienia cennika ani ustawień i nie widzi utargu całego salonu.</p>
          </div>
        )}

        <Przelacznik wl={f.w_zapisach} onZmien={(v) => setF({ ...f, w_zapisach: v })} etykieta="Przyjmuje zapisy online" opis="Klientki mogą ją wybrać na stronie zapisów" />
        {!wlascicielka && <Przelacznik wl={f.aktywny} onZmien={(v) => setF({ ...f, aktywny: v })} etykieta="Aktywna" opis="Wyłącz, gdy ktoś odchodzi – historia wizyt zostaje" />}

        {uslugi.length > 0 && (
          <section>
            <Przelacznik wl={wszystkieUslugi} onZmien={setWszystkieUslugi} etykieta="Wykonuje wszystkie usługi" />
            {!wszystkieUslugi && (
              <div className="mt-2 grid gap-1.5">
                {uslugi
                  .filter((u) => u.aktywna)
                  .map((u) => (
                    <label key={u.id} className="flex items-center gap-3 rounded-xl border border-linia px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="size-5 accent-[#2a211d]"
                        checked={wybrane.has(u.id)}
                        onChange={(e) => {
                          const n = new Set(wybrane);
                          if (e.target.checked) n.add(u.id);
                          else n.delete(u.id);
                          setWybrane(n);
                        }}
                      />
                      <span className="text-[15px]">{u.nazwa}</span>
                    </label>
                  ))}
              </div>
            )}
          </section>
        )}

        <section>
          <Przelacznik wl={wlasneGodziny} onZmien={setWlasneGodziny} etykieta="Własne godziny pracy" opis="Inaczej obowiązują godziny salonu" />
          {wlasneGodziny && (
            <div className="mt-2 space-y-1.5">
              {dni.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <label className="flex w-36 items-center gap-2">
                    <input type="checkbox" className="size-5 accent-[#2a211d]" checked={d.wl} onChange={(e) => setDni(dni.map((x, j) => (j === i ? { ...x, wl: e.target.checked } : x)))} />
                    <span className={`text-[14px] font-semibold ${d.wl ? "" : "text-szary"}`}>{DNI[i + 1]}</span>
                  </label>
                  {d.wl && (
                    <>
                      <input type="time" step={900} aria-label={`${DNI[i + 1]} od`} className="pole w-26 py-2" value={d.od} onChange={(e) => setDni(dni.map((x, j) => (j === i ? { ...x, od: e.target.value } : x)))} />
                      <span className="text-szary">–</span>
                      <input type="time" step={900} aria-label={`${DNI[i + 1]} do`} className="pole w-26 py-2" value={d.do} onChange={(e) => setDni(dni.map((x, j) => (j === i ? { ...x, do: e.target.value } : x)))} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <Blad>{blad}</Blad>
      </form>
    </Modal>
  );
}
