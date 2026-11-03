import type { StatusWizyty } from "../lib/database.types";

export const STATUS: Record<StatusWizyty, { txt: string; cls: string }> = {
  oczekuje: { txt: "Do potwierdzenia", cls: "bg-bursztyn-jasny text-bursztyn" },
  potwierdzona: { txt: "Umówiona", cls: "bg-piasek text-mokka" },
  zrealizowana: { txt: "Zrobione", cls: "bg-ziel-jasny text-ziel" },
  odwolana: { txt: "Odwołana", cls: "bg-piasek/60 text-szary line-through" },
  nieobecnosc: { txt: "Nie przyszła", cls: "bg-roz-jasny text-[#8a2f3a]" },
};

export function Status({ s }: { s: StatusWizyty }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${STATUS[s].cls}`}>
      {STATUS[s].txt}
    </span>
  );
}
