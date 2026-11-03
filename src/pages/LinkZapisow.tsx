import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, RefreshCw, Send } from "lucide-react";
import { useSalon, useZmienSalon } from "../lib/dane";
import { komunikat, supabase } from "../lib/supabase";
import { Blad, Przelacznik } from "../components/ui";
import { Wstecz } from "../components/Wstecz";
import type { SalonRow } from "../lib/database.types";
import { linkZapisow } from "../lib/wiadomosci";

export default function LinkZapisow() {
  const { data: s } = useSalon();
  const zmien = useZmienSalon();
  const qc = useQueryClient();
  const [nazwa, setNazwa] = useState("");
  const [adres, setAdres] = useState("");
  const [tel, setTel] = useState("");
  const [skopiowano, setSkopiowano] = useState(false);
  const [blad, setBlad] = useState("");
  useEffect(() => {
    setNazwa(s?.nazwa ?? "");
    setAdres(s?.adres ?? "");
    setTel(s?.telefon ?? "");
  }, [s?.nazwa, s?.adres, s?.telefon]);
  if (!s) return null;
  const link = linkZapisow(s.zapisy_token);
  const tekst = `Hej! Tu możesz sama zapisać się do mnie na paznokcie 💅 ${link}`;

  const ustaw = (z: Partial<Omit<SalonRow, "id">>) =>
    zmien.mutate({ id: s.id, ...z }, { onError: (e) => setBlad(komunikat(e)) });

  async function kopiuj() {
    await navigator.clipboard.writeText(link);
    setSkopiowano(true);
    setTimeout(() => setSkopiowano(false), 2000);
  }

  async function nowyLink() {
    if (!window.confirm("Stary link przestanie działać. Wygenerować nowy?")) return;
    const { error } = await supabase.rpc("nowy_link_zapisow");
    if (error) return setBlad(komunikat(error));
    await qc.invalidateQueries({ queryKey: ["salon"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Wstecz />
      <h1 className="naglowek">Zapisy przez link</h1>
      <p className="text-[15px] text-szary">
        Wyślij ten link znajomym – zobaczą tylko wolne godziny (bez nazwisk innych klientek) i same wybiorą termin. Zapis pojawi się u Ciebie jako
        „do potwierdzenia”, a klientka dostanie swoją stronę wizyty z przyciskiem „Dodaj do kalendarza”. Konkretnej klientce najprościej wysłać link z
        jej karty w zakładce Klientki – będzie miała już wpisane imię i numer.
      </p>

      <div className="karta space-y-4 p-4">
        <Przelacznik wl={s.zapisy_wlaczone} onZmien={(v) => ustaw({ zapisy_wlaczone: v })} etykieta="Zapisy włączone" opis="Wyłącz na czas urlopu albo gdy masz komplet" />
        <div className={s.zapisy_wlaczone ? "" : "pointer-events-none opacity-40"}>
          <div className="rounded-xl bg-piasek/60 px-3.5 py-3 font-mono text-[13px] break-all">{link}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="btn-glowny" onClick={kopiuj}>
              <Copy className="size-4" /> {skopiowano ? "Skopiowano" : "Kopiuj"}
            </button>
            {"share" in navigator ? (
              <button className="btn-jasny" onClick={() => navigator.share({ title: s.nazwa, text: tekst }).catch(() => {})}>
                <Send className="size-4" /> Wyślij
              </button>
            ) : (
              <a className="btn-jasny" href={`sms:?&body=${encodeURIComponent(tekst)}`}>
                <Send className="size-4" /> SMS
              </a>
            )}
            <a className="btn-jasny" href={link} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Podgląd
            </a>
            <button className="btn-jasny" onClick={nowyLink}>
              <RefreshCw className="size-4" /> Nowy link
            </button>
          </div>
        </div>
      </div>

      <div className="karta space-y-4 p-4">
        <div>
          <label className="etykieta" htmlFor="nz">
            Nazwa widoczna dla klientek
          </label>
          <input id="nz" className="pole" value={nazwa} onChange={(e) => setNazwa(e.target.value)} onBlur={() => nazwa.trim() && nazwa !== s.nazwa && ustaw({ nazwa: nazwa.trim() })} />
        </div>
        <div>
          <label className="etykieta" htmlFor="ad">
            Adres salonu (w kalendarzu klientki i na mapie)
          </label>
          <input id="ad" className="pole" value={adres} onChange={(e) => setAdres(e.target.value)} onBlur={() => adres !== s.adres && ustaw({ adres: adres.trim() })} />
        </div>
        <div>
          <label className="etykieta" htmlFor="tl">
            Telefon do salonu (widzi go klientka)
          </label>
          <input id="tl" type="tel" className="pole" value={tel} onChange={(e) => setTel(e.target.value)} onBlur={() => tel !== s.telefon && ustaw({ telefon: tel.trim() })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Wybor etykieta="Najwcześniej" wartosc={s.zapisy_wyprzedzenie_h} onZmien={(v) => ustaw({ zapisy_wyprzedzenie_h: v })} opcje={[[2, "2 h przed"], [12, "12 h przed"], [24, "dzień przed"], [48, "2 dni przed"]]} />
          <Wybor etykieta="Najpóźniej" wartosc={s.zapisy_horyzont_dni} onZmien={(v) => ustaw({ zapisy_horyzont_dni: v })} opcje={[[14, "2 tygodnie"], [30, "miesiąc"], [60, "2 miesiące"], [90, "3 miesiące"]]} />
          <Wybor etykieta="Godziny co" wartosc={s.krok_min} onZmien={(v) => ustaw({ krok_min: v })} opcje={[[15, "15 min"], [30, "30 min"], [60, "godzinę"]]} />
        </div>
      </div>
      <Blad>{blad}</Blad>
    </div>
  );
}

function Wybor({ etykieta, wartosc, opcje, onZmien }: { etykieta: string; wartosc: number; opcje: [number, string][]; onZmien: (v: number) => void }) {
  const lista = opcje.some(([v]) => v === wartosc) ? opcje : [...opcje, [wartosc, String(wartosc)] as [number, string]];
  return (
    <label>
      <span className="etykieta">{etykieta}</span>
      <select className="pole" value={wartosc} onChange={(e) => onZmien(+e.target.value)}>
        {lista.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
