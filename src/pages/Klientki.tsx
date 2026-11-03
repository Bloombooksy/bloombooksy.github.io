import { useMemo, useState } from "react";
import { AtSign, Phone, Plus, Search, Users } from "lucide-react";
import { useHistoriaKlientki, useKlientki, useSalon, useSalonId, useZapis } from "../lib/dane";
import { linkZapisow, trescZaproszenia } from "../lib/wiadomosci";
import { WyslijSms } from "../components/WyslijSms";
import type { KlientkaRow } from "../lib/database.types";
import { dzienKey, godzina, krotkaData } from "../lib/czas";
import { podsumuj, zl } from "../lib/pieniadze";
import { ladnyTelefon, normalizujTelefon } from "../lib/sms";
import { komunikat } from "../lib/supabase";
import { Blad, Ladowanie, Modal, Przelacznik, Pusto } from "../components/ui";
import { Status } from "../components/status";

export default function Klientki() {
  const { data = [], isLoading } = useKlientki();
  const [q, setQ] = useState("");
  const [otwarta, setOtwarta] = useState<KlientkaRow | "nowa" | null>(null);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    const c = t.replace(/\D/g, "");
    return t ? data.filter((k) => k.imie.toLowerCase().includes(t) || (c.length >= 3 && k.telefon.replace(/\D/g, "").includes(c))) : data;
  }, [q, data]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="naglowek">Klientki</h1>
        <button className="btn-glowny" onClick={() => setOtwarta("nowa")}>
          <Plus className="size-5" /> Dodaj
        </button>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-szary" />
        <input className="pole pl-11" placeholder={`Szukaj wśród ${data.length} klientek`} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {isLoading ? (
        <Ladowanie />
      ) : lista.length === 0 ? (
        <Pusto ikona={<Users className="size-8 text-linia" />}>{q ? "Nikogo takiego nie ma." : "Klientki pojawią się tu same, gdy dodasz pierwszą wizytę."}</Pusto>
      ) : (
        <ul className="karta divide-y divide-linia">
          {lista.map((k) => (
            <li key={k.id}>
              <button onClick={() => setOtwarta(k)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-piasek/30">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-piasek font-serif text-lg font-semibold text-mokka">{k.imie.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{k.imie}</span>
                  <span className="block truncate text-[13px] text-szary">{[k.telefon && ladnyTelefon(k.telefon), k.instagram && `@${k.instagram.replace(/^@/, "")}`].filter(Boolean).join(" · ") || "brak kontaktu"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {otwarta && <KlientkaModal k={otwarta === "nowa" ? null : otwarta} onClose={() => setOtwarta(null)} />}
    </div>
  );
}

function KlientkaModal({ k, onClose }: { k: KlientkaRow | null; onClose: () => void }) {
  const salonId = useSalonId();
  const { data: salon } = useSalon();
  const api = useZapis("klientki", ["klientki", "wizyty"]);
  const { data: historia = [] } = useHistoriaKlientki(k?.id ?? null);
  const [f, setF] = useState({
    imie: k?.imie ?? "",
    telefon: k?.telefon ?? "",
    instagram: k?.instagram ?? "",
    notatka: k?.notatka ?? "",
    zgoda_sms: k?.zgoda_sms ?? true,
  });
  const [blad, setBlad] = useState("");
  const p = podsumuj(historia);

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (f.telefon && !normalizujTelefon(f.telefon)) return setBlad("Sprawdź numer telefonu.");
    const row = { ...f, imie: f.imie.trim(), instagram: f.instagram.trim().replace(/^@/, "") };
    try {
      if (k) await api.zmien.mutateAsync({ id: k.id, ...row });
      else await api.dodaj.mutateAsync({ ...row, salon_id: salonId });
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  async function usun() {
    if (!k || !window.confirm(`Usunąć ${k.imie}? Jej wizyty zostaną w kalendarzu bez nazwiska.`)) return;
    try {
      await api.usun.mutateAsync(k.id);
      onClose();
    } catch (err) {
      setBlad(komunikat(err));
    }
  }

  return (
    <Modal
      tytul={k ? k.imie : "Nowa klientka"}
      onClose={onClose}
      stopka={
        <div className="flex gap-2">
          {k && (
            <button type="button" className="btn-cichy text-[#8a2f3a]" onClick={usun}>
              Usuń
            </button>
          )}
          <button form="kl-form" className="btn-glowny flex-1">
            Zapisz
          </button>
        </div>
      }
    >
      <form id="kl-form" onSubmit={zapisz} className="space-y-4">
        {k && k.telefon && salon?.zapisy_wlaczone && (
          <WyslijSms className="w-full" glowny telefon={k.telefon} tresc={trescZaproszenia(k.imie, linkZapisow(salon.zapisy_token, { imie: k.imie, telefon: k.telefon }))}>
            Wyślij link do zapisów
          </WyslijSms>
        )}
        {k && (
          <div className="flex gap-2">
            {k.telefon && (
              <a href={`tel:${k.telefon}`} className="btn-jasny flex-1">
                <Phone className="size-4" /> Zadzwoń
              </a>
            )}
            {k.instagram && (
              <a href={`https://instagram.com/${k.instagram}`} target="_blank" rel="noreferrer" className="btn-jasny flex-1">
                <AtSign className="size-4" /> Instagram
              </a>
            )}
          </div>
        )}
        <div>
          <label className="etykieta" htmlFor="k-i">
            Imię i nazwisko
          </label>
          <input id="k-i" required className="pole" value={f.imie} onChange={(e) => setF({ ...f, imie: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etykieta" htmlFor="k-t">
              Telefon
            </label>
            <input id="k-t" type="tel" inputMode="tel" className="pole" value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} />
          </div>
          <div>
            <label className="etykieta" htmlFor="k-ig">
              Instagram
            </label>
            <input id="k-ig" className="pole" placeholder="@nazwa" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="etykieta" htmlFor="k-n">
            Notatka
          </label>
          <textarea id="k-n" rows={2} className="pole resize-none" placeholder="np. ulubiony kolor, alergie, kształt" value={f.notatka} onChange={(e) => setF({ ...f, notatka: e.target.value })} />
        </div>
        <Przelacznik wl={f.zgoda_sms} onZmien={(v) => setF({ ...f, zgoda_sms: v })} etykieta="Przypomnienia SMS" opis="SMS dzień przed wizytą" />
        <Blad>{blad}</Blad>

        {k && historia.length > 0 && (
          <section className="border-t border-linia pt-4">
            <h3 className="text-[13px] font-bold tracking-wide text-szary uppercase">Historia</h3>
            <p className="mt-1 text-[14px]">
              {p.zrobione} {p.zrobione === 1 ? "wizyta" : "wizyt"} · razem {zl(p.razem)}
              {p.nieobecne > 0 && <span className="text-[#8a2f3a]"> · nie przyszła {p.nieobecne}×</span>}
            </p>
            <ul className="mt-2 space-y-1.5">
              {historia.slice(0, 12).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{krotkaData(dzienKey(w.start))}</span> {godzina(w.start)} · {w.usluga_nazwa || "wizyta"}
                  </span>
                  {w.status === "zrealizowana" ? <span className="shrink-0 font-semibold">{zl(Number(w.kwota ?? w.cena))}</span> : <Status s={w.status} />}
                </li>
              ))}
            </ul>
          </section>
        )}
      </form>
    </Modal>
  );
}
