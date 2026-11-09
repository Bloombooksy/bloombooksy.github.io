// Import kalendarza ze zdjęcia lub zrzutu ekranu: model Claude odczytuje wizyty i klientki,
// aplikacja pokazuje podgląd do poprawienia, a zapis robi dopiero właścicielka.
// Wymaga sekretu ANTHROPIC_API_KEY. Model można zmienić sekretem IMPORT_MODEL.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = Deno.env.get("IMPORT_MODEL") ?? "claude-sonnet-5-5";
const MAX_ZDJEC = 6;
const MAX_BAJTOW = 4_500_000; // na jedno zdjęcie po base64

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const odp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const NARZEDZIE = {
  name: "zapisz_odczyt",
  description: "Zapisuje wizyty i klientki odczytane ze zdjęć kalendarza salonu.",
  input_schema: {
    type: "object",
    properties: {
      wizyty: {
        type: "array",
        items: {
          type: "object",
          properties: {
            data: { type: "string", description: "Dzień wizyty YYYY-MM-DD" },
            godzina: { type: "string", description: "Godzina rozpoczęcia HH:MM (24 h)" },
            czas_min: { type: ["integer", "null"], description: "Czas trwania w minutach, jeśli widać godzinę końca" },
            imie: { type: "string", description: "Imię i/lub nazwisko klientki tak, jak zapisano" },
            telefon: { type: ["string", "null"] },
            usluga: { type: ["string", "null"], description: "Usługa – najlepiej jedna z nazw z cennika salonu" },
            cena: { type: ["number", "null"] },
            notatka: { type: ["string", "null"], description: "Dopiski, np. kolor, zdobienia" },
            skreslona: { type: "boolean", description: "Wpis przekreślony / odwołany" },
            pewnosc: { type: "string", enum: ["wysoka", "srednia", "niska"], description: "Jak pewny jest odczyt (pismo ręczne!)" },
          },
          required: ["data", "godzina", "imie", "skreslona", "pewnosc"],
        },
      },
      klientki: {
        type: "array",
        description: "Kontakty bez terminu (np. zrzut listy kontaktów)",
        items: { type: "object", properties: { imie: { type: "string" }, telefon: { type: ["string", "null"] } }, required: ["imie"] },
      },
      uwagi: { type: "string", description: "Krótko, po polsku: czego nie dało się odczytać" },
    },
    required: ["wizyty", "klientki"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return odp({ blad: "Tylko POST" }, 405);

  const klucz = Deno.env.get("ANTHROPIC_API_KEY");
  if (!klucz) return odp({ blad: "Import ze zdjęcia nie jest jeszcze włączony (brak klucza AI)." }, 503);

  // tylko zalogowany zespół salonu
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: kontekst } = await db.rpc("moj_kontekst");
  const salon = (kontekst as { salon?: { id: string; nazwa: string } } | null)?.salon;
  if (!salon) return odp({ blad: "Zaloguj się do salonu." }, 401);

  let body: { obrazy?: { typ: string; dane: string }[]; dzis?: string; uslugi?: string[] };
  try {
    body = await req.json();
  } catch {
    return odp({ blad: "Złe dane" }, 400);
  }
  const obrazy = (body.obrazy ?? []).slice(0, MAX_ZDJEC);
  if (!obrazy.length) return odp({ blad: "Dodaj zdjęcie kalendarza." }, 400);
  for (const o of obrazy) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(o.typ)) return odp({ blad: "Obsługiwane są zdjęcia JPG, PNG i WebP." }, 400);
    if (o.dane.length > MAX_BAJTOW) return odp({ blad: "Zdjęcie jest za duże." }, 400);
  }
  const dzis = /^\d{4}-\d{2}-\d{2}$/.test(body.dzis ?? "") ? body.dzis! : new Date().toISOString().slice(0, 10);
  const uslugi = (body.uslugi ?? []).slice(0, 60).map((u) => String(u).slice(0, 80));

  const polecenie = `Na zdjęciach jest kalendarz wizyt salonu beauty „${salon.nazwa}” – papierowy terminarz (pismo ręczne), wydruk albo zrzut ekranu z innej aplikacji (np. Booksy, Google Kalendarz, notatki w telefonie).
Dzisiaj jest ${dzis}. Jeśli na stronie nie ma roku, przyjmij najbliższy sensowny rok (terminy z przeszłości do ok. 2 miesięcy wstecz zostaw w przeszłości, resztę w przyszłości).
Cennik salonu (dopasuj usługę do jednej z tych nazw, jeśli to możliwe): ${uslugi.length ? uslugi.join("; ") : "brak – wpisz usługę tak, jak zapisano"}.
Zasady:
- Każdy wpis z godziną to jedna wizyta. Godzina „830” albo „8³⁰” to 08:30.
- Wpis przekreślony oznacz skreslona=true.
- Nie zgaduj imion ani telefonów – jeśli coś jest nieczytelne, wpisz to, co widać, i daj pewnosc="niska".
- Skróty usług rozwiń wg cennika (np. „hybr” → Manicure hybrydowy, „uzup” → Uzupełnienie).
- Kontakty bez terminu (lista klientek) wpisz do „klientki”.
Wywołaj narzędzie zapisz_odczyt dokładnie raz.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": klucz, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      tools: [NARZEDZIE],
      tool_choice: { type: "tool", name: "zapisz_odczyt" },
      messages: [
        {
          role: "user",
          content: [
            ...obrazy.map((o) => ({ type: "image", source: { type: "base64", media_type: o.typ, data: o.dane } })),
            { type: "text", text: polecenie },
          ],
        },
      ],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log("[import] błąd API", r.status, JSON.stringify(j).slice(0, 500));
    return odp({ blad: r.status === 429 ? "Za dużo zdjęć naraz – spróbuj za minutę." : "Nie udało się odczytać zdjęcia. Spróbuj ponownie albo z innym zdjęciem." }, 502);
  }
  const wynik = (j.content ?? []).find((c: { type: string }) => c.type === "tool_use")?.input;
  if (!wynik) return odp({ blad: "Nie znalazłam wizyt na zdjęciu." }, 422);
  console.log(`[import] salon ${salon.id}: ${wynik.wizyty?.length ?? 0} wizyt, ${wynik.klientki?.length ?? 0} klientek, tokeny ${j.usage?.input_tokens}/${j.usage?.output_tokens}`);
  return odp(wynik);
});
