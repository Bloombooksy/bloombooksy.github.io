// Przypomnienia o jutrzejszych wizytach. Woła ją pg_cron co godzinę (nagłówek x-cron-klucz).
// Pakiet Premium: SMS (do miesięcznego limitu salonu), potem mail. Pakiet Start: mail.
// Bez SMSAPI_TOKEN / RESEND_API_KEY działa w trybie testowym: nic nie wysyła, oznacza wizyty jako "test".
import { createClient } from "jsr:@supabase/supabase-js@2";

const APP = Deno.env.get("APP_URL") ?? "https://app.bloomly.com.pl";
const NADAWCA_MAIL = Deno.env.get("MAIL_OD") ?? "powiadomienia@bloomly.com.pl";

const DNI = ["nd", "pon", "wt", "śr", "czw", "pt", "sob"];
const DNI_PELNE = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const MIES = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const PL: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  "–": "-", "—": "-", "„": '"', "”": '"', "’": "'",
};
const bezPl = (t: string) => t.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”’]/g, (c) => PL[c] ?? c);
const html = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

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
  return {
    data: `${DNI[dow]} ${+p.day}.${p.month}`,
    dataPelna: `${DNI_PELNE[dow]}, ${+p.day} ${MIES[+p.month - 1]}`,
    godzina: `${p.hour}:${p.minute}`,
  };
}

type Wiersz = {
  wizyta_id: string; kod: string; start: string; strefa: string; usluga: string; salon_id: string; salon: string;
  kolor: string; adres: string; salon_telefon: string; szablon: string; nadawca: string; pakiet: string;
  sms_limit: number; sms_w_miesiacu: number; imie: string; telefon: string; zgoda: boolean; email: string;
};

function trescMaila(w: Wiersz, info = "") {
  const { dataPelna, godzina } = czesci(w.start, w.strefa);
  const imie = w.imie.trim().split(/\s+/)[0] ?? "";
  const kolor = /^#[0-9a-f]{6}$/i.test(w.kolor) ? w.kolor : "#c2185b";
  const link = `${APP}/#/wizyta/${w.kod}`;
  const temat = `Przypomnienie: jutro ${godzina} – ${w.salon}`;
  const tekst = [
    `Cześć${imie ? ` ${imie}` : ""}!`,
    `Przypominamy o wizycie jutro (${dataPelna}) o ${godzina}: ${w.usluga} w ${w.salon}.`,
    w.adres ? `Adres: ${w.adres}` : "",
    `Szczegóły i odwołanie: ${link}`,
    w.salon_telefon ? `Telefon do salonu: ${w.salon_telefon}` : "",
    info ? `\nOd salonu: ${info}` : "",
  ].filter(Boolean).join("\n");
  const body = `<div style="background:#fdf8f8;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#1f1d2b">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:28px 26px;border-top:6px solid ${kolor}">
    <p style="margin:0 0 6px;font-size:14px;color:#8a8796">${html(w.salon)}</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3">Do zobaczenia jutro${imie ? `, ${html(imie)}` : ""}!</h1>
    <p style="margin:0 0 4px;font-size:28px;font-weight:bold;color:${kolor}">${godzina}</p>
    <p style="margin:0 0 4px;font-size:16px">${html(dataPelna)}</p>
    <p style="margin:0 0 18px;font-size:16px;color:#4a4757">${html(w.usluga)}</p>
    ${w.adres ? `<p style="margin:0 0 18px;font-size:15px;color:#4a4757">📍 ${html(w.adres)}</p>` : ""}
    ${info ? `<p style="margin:0 0 18px;padding:12px 14px;border-radius:12px;background:#fdf8f8;font-size:15px;line-height:1.5;color:#1f1d2b;white-space:pre-line">${html(info)}</p>` : ""}
    <a href="${link}" style="display:inline-block;background:${kolor};color:#fff;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 24px;border-radius:999px">Szczegóły wizyty</a>
    <p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#8a8796">Nie możesz przyjść? Odwołaj wizytę pod tym samym linkiem${w.salon_telefon ? ` albo zadzwoń: ${html(w.salon_telefon)}` : ""}.</p>
  </div>
  <p style="max-width:480px;margin:14px auto 0;font-size:12px;color:#8a8796;text-align:center">Wiadomość wysłana przez Bloomly w imieniu salonu ${html(w.salon)}.</p>
</div>`;
  return { temat, tekst, body };
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: ok } = await db.rpc("sms_klucz_ok", { p_klucz: req.headers.get("x-cron-klucz") ?? "" });
  if (!ok) return new Response("Brak dostępu", { status: 401 });

  const smsToken = Deno.env.get("SMSAPI_TOKEN");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const { data, error } = await db.rpc("przypomnienia_do_wyslania");
  if (error) return Response.json({ blad: error.message }, { status: 500 });

  const wynik = { sms: 0, mail: 0, test: 0, pominiete: 0, bledy: 0 };
  const salonIds = [...new Set(((data ?? []) as Wiersz[]).map((w) => w.salon_id))];
  const infoSalonu: Record<string, string> = {};
  if (salonIds.length) {
    const { data: inf } = await db.from("salony").select("id, info_dla_klientki").in("id", salonIds);
    for (const x of inf ?? []) infoSalonu[x.id] = x.info_dla_klientki ?? "";
  }
  const wyslaneSms: Record<string, number> = {};

  for (const w of (data ?? []) as Wiersz[]) {
    const oznacz = (sms_status: string, sms_blad: string | null = null) =>
      db.from("wizyty").update({ sms_status, sms_blad, sms_wyslano: new Date().toISOString() }).eq("id", w.wizyta_id).eq("sms_status", "brak");

    const tel = normalizujTelefon(w.telefon);
    const juz = w.sms_w_miesiacu + (wyslaneSms[w.salon_id] ?? 0);
    let smsBlad = "";
    const smsMozna = w.pakiet === "premium" && tel && w.zgoda && juz < w.sms_limit;

    // 1) Premium: SMS w ramach limitu
    if (smsMozna) {
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
      if (!smsToken) {
        console.log(`[test sms] ${tel}: ${tresc}`);
        await oznacz("test", "SMS w trybie testowym");
        wynik.test++;
        continue;
      }
      const body = new URLSearchParams({ to: tel!, message: tresc, format: "json", encoding: "utf-8", normalize: "1" });
      if (w.nadawca) body.set("from", w.nadawca);
      try {
        const r = await fetch("https://api.smsapi.pl/sms.do", { method: "POST", headers: { Authorization: `Bearer ${smsToken}` }, body });
        const j = await r.json().catch(() => ({}));
        if (r.ok && !j.error) {
          await oznacz("wyslany");
          wyslaneSms[w.salon_id] = (wyslaneSms[w.salon_id] ?? 0) + 1;
          wynik.sms++;
          continue;
        }
        smsBlad = String(j.message ?? `HTTP ${r.status}`);
      } catch (e) {
        smsBlad = String(e);
      }
    }

    // 2) Mail (pakiet Start albo po wyczerpaniu limitu SMS)
    if (w.email) {
      const m = trescMaila(w, infoSalonu[w.salon_id]);
      if (!resendKey) {
        console.log(`[test mail] ${w.email}: ${m.temat}`);
        await oznacz("test", "mail w trybie testowym");
        wynik.test++;
        continue;
      }
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${w.salon.replace(/["<>]/g, "")} (Bloomly) <${NADAWCA_MAIL}>`,
            to: [w.email],
            subject: m.temat,
            html: m.body,
            text: m.tekst,
          }),
        });
        if (r.ok) {
          await oznacz("mail");
          wynik.mail++;
        } else {
          const j = await r.json().catch(() => ({}));
          await oznacz("blad", `mail: ${String(j.message ?? `HTTP ${r.status}`)}`.slice(0, 300));
          wynik.bledy++;
        }
      } catch (e) {
        await oznacz("blad", `mail: ${e}`.slice(0, 300));
        wynik.bledy++;
      }
      continue;
    }

    if (smsBlad) {
      await oznacz("blad", `sms: ${smsBlad}`.slice(0, 300));
      wynik.bledy++;
      continue;
    }

    // 3) Brak kanału – salon może wysłać SMS ręcznie
    const powod = w.pakiet === "premium" && tel && w.zgoda && juz >= w.sms_limit
      ? "wykorzystany limit SMS – wyślij ręcznie"
      : w.pakiet === "premium" && tel && !w.zgoda ? "brak zgody na SMS" : "brak e-maila – wyślij SMS ręcznie";
    await oznacz("pominiety", powod);
    wynik.pominiete++;
  }
  return Response.json(wynik);
});
