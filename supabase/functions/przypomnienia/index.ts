// Przypomnienia SMS o jutrzejszych wizytach. Woła ją pg_cron co godzinę (nagłówek x-cron-klucz).
// Bez sekretu SMSAPI_TOKEN działa w trybie testowym: nic nie wysyła, oznacza wizyty jako "test".
import { createClient } from "jsr:@supabase/supabase-js@2";

const DNI = ["nd", "pon", "wt", "śr", "czw", "pt", "sob"];
const PL: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  "–": "-", "—": "-", "„": '"', "”": '"', "’": "'",
};
const bezPl = (t: string) => t.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”’]/g, (c) => PL[c] ?? c);

function normalizujTelefon(t: string): string | null {
  let c = t.replace(/[^\d+]/g, "");
  if (c.startsWith("+")) c = c.slice(1);
  else if (c.startsWith("00")) c = c.slice(2);
  if (/^\d{9}$/.test(c)) c = `48${c}`;
  return /^\d{11,15}$/.test(c) ? c : null;
}

function czesci(iso: string, strefa: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: strefa, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  const dow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return { data: `${DNI[dow]} ${+p.day}.${p.month}`, godzina: `${p.hour}:${p.minute}` };
}

type Wiersz = {
  wizyta_id: string; start: string; strefa: string; usluga: string; salon: string;
  szablon: string; nadawca: string; imie: string; telefon: string; zgoda: boolean;
};

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: ok } = await db.rpc("sms_klucz_ok", { p_klucz: req.headers.get("x-cron-klucz") ?? "" });
  if (!ok) return new Response("Brak dostępu", { status: 401 });

  const token = Deno.env.get("SMSAPI_TOKEN");
  const { data, error } = await db.rpc("sms_do_wyslania");
  if (error) return Response.json({ blad: error.message }, { status: 500 });

  const wynik = { wyslane: 0, test: 0, pominiete: 0, bledy: 0 };
  for (const w of (data ?? []) as Wiersz[]) {
    const tel = normalizujTelefon(w.telefon);
    const oznacz = (sms_status: string, sms_blad: string | null = null) =>
      db.from("wizyty").update({ sms_status, sms_blad, sms_wyslano: new Date().toISOString() }).eq("id", w.wizyta_id).eq("sms_status", "brak");

    if (!tel || !w.zgoda) {
      await oznacz("pominiety", !tel ? "brak poprawnego numeru" : "brak zgody na SMS");
      wynik.pominiete++;
      continue;
    }
    const { data: d, godzina } = czesci(w.start, w.strefa);
    const tresc = bezPl(
      w.szablon
        .replaceAll("{imie}", w.imie.trim().split(/\s+/)[0] ?? "")
        .replaceAll("{data}", d)
        .replaceAll("{godzina}", godzina)
        .replaceAll("{usluga}", w.usluga)
        .replaceAll("{salon}", w.salon)
        .replace(/\s+/g, " ")
        .trim(),
    );

    if (!token) {
      console.log(`[test] ${tel}: ${tresc}`);
      await oznacz("test");
      wynik.test++;
      continue;
    }

    const body = new URLSearchParams({ to: tel, message: tresc, format: "json", encoding: "utf-8", normalize: "1" });
    if (w.nadawca) body.set("from", w.nadawca);
    try {
      const r = await fetch("https://api.smsapi.pl/sms.do", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && !j.error) {
        await oznacz("wyslany");
        wynik.wyslane++;
      } else {
        await oznacz("blad", String(j.message ?? `HTTP ${r.status}`).slice(0, 300));
        wynik.bledy++;
      }
    } catch (e) {
      await oznacz("blad", String(e).slice(0, 300));
      wynik.bledy++;
    }
  }
  return Response.json(wynik);
});
