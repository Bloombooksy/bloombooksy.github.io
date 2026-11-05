/** Linki i gotowe wiadomości, które Madzia wysyła klientkom z własnego telefonu (bez płatnej bramki SMS). */
import { DNI_KROTKO, dzienKey, dzienTygodnia, godzina, krotkaData } from "./czas";
import { normalizujTelefon } from "./sms";

export function adresAplikacji(href = window.location.href): string {
  return href.split("#")[0]!;
}

/** Link do zapisów; z imieniem i numerem klientka nie musi ich wpisywać. */
export function linkZapisow(token: string, klientka?: { imie?: string; telefon?: string }, baza = adresAplikacji()): string {
  const q = new URLSearchParams();
  if (klientka?.imie) q.set("imie", klientka.imie);
  if (klientka?.telefon) q.set("tel", klientka.telefon);
  const qs = q.toString();
  return `${baza}#/zapisy/${token}${qs ? `?${qs}` : ""}`;
}

export function linkWizyty(kod: string, baza = adresAplikacji()): string {
  return `${baza}#/wizyta/${kod}`;
}

/** Otwiera aplikację SMS z wpisanym odbiorcą i treścią (działa na iPhonie i Androidzie). */
export function smsHref(telefon: string, tresc: string): string {
  const n = normalizujTelefon(telefon);
  return `sms:${n ? `+${n}` : ""}?&body=${encodeURIComponent(tresc)}`;
}

const pierwsze = (imie: string) => imie.trim().split(/\s+/)[0] ?? "";

export function trescZaproszenia(imie: string, link: string): string {
  const i = pierwsze(imie);
  return `${i ? `Hej ${i}! ` : "Hej! "}Tu możesz sama wybrać wolny termin na paznokcie: ${link}`;
}

export function trescWizyty(w: { imie: string; start: string; usluga: string; salon: string; link: string }): string {
  const d = dzienKey(w.start);
  const i = pierwsze(w.imie);
  return (
    `${i ? `Hej ${i}! ` : ""}Potwierdzam wizytę: ${DNI_KROTKO[dzienTygodnia(d)]} ${krotkaData(d)}, godz. ${godzina(w.start)}` +
    `${w.usluga ? ` – ${w.usluga}` : ""}. Szczegóły i dodanie do kalendarza: ${w.link} ${w.salon}`
  );
}

export function trescProsbyOOpinie(imie: string, salon: string, link: string): string {
  const i = pierwsze(imie);
  return `${i ? `Dziękuję za wizytę, ${i}!` : "Dziękuję za wizytę!"} Będzie mi bardzo miło, jeśli zostawisz krótką opinię – to bardzo pomaga ${salon}: ${link}`;
}

/** Ręczne przypomnienie (SMS z telefonu salonu) o jutrzejszej wizycie. */
export function trescPrzypomnienia(w: { imie: string; start: string; usluga: string; salon: string; link: string }): string {
  const d = dzienKey(w.start);
  const i = pierwsze(w.imie);
  return (
    `${i ? `Hej ${i}! ` : ""}Przypominam o wizycie jutro (${DNI_KROTKO[dzienTygodnia(d)]} ${krotkaData(d)}), godz. ${godzina(w.start)}` +
    `${w.usluga ? ` – ${w.usluga}` : ""}. Szczegóły i odwołanie: ${w.link} ${w.salon}`
  );
}
