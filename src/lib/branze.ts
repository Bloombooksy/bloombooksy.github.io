import type { Branza } from "./database.types";

/** Branże, dla których kreator ma gotowy cennik startowy (szablony usług są w funkcji bazy zaloz_salon). */
export const BRANZE: Record<Branza, { nazwa: string; ikona: string }> = {
  paznokcie: { nazwa: "Paznokcie", ikona: "💅" },
  rzesy_brwi: { nazwa: "Rzęsy i brwi", ikona: "👁️" },
  fryzjer: { nazwa: "Fryzjer", ikona: "✂️" },
  barber: { nazwa: "Barber", ikona: "💈" },
  kosmetyka: { nazwa: "Kosmetyka", ikona: "🧴" },
  masaz: { nazwa: "Masaż", ikona: "💆" },
  inne: { nazwa: "Inne", ikona: "✨" },
};

export const KOLORY_SALONU = ["#b98a4e", "#c9707a", "#7a5a47", "#4f7a5b", "#6b7fa8", "#9b6fa6", "#2a211d", "#5e8c8c"];

/** Kolory osób w zespole (paski w kalendarzu). */
export const KOLORY_OSOB = ["#7a5a47", "#c9707a", "#4f7a5b", "#6b7fa8", "#9b6fa6", "#d29a6a", "#5e8c8c", "#b98a4e"];

/** Adres zapisów salonu: małe litery, cyfry i myślniki, bez polskich znaków. */
export function slugify(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function poprawnySlug(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s);
}
