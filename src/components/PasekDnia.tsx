import { ChevronLeft, ChevronRight } from "lucide-react";
import { dzienKey, opisDnia, wzglednie } from "../lib/czas";

export function PasekDnia({
  tytul,
  podtytul,
  onPoprz,
  onNast,
  onDzis,
  czyDzis,
}: {
  tytul: string;
  podtytul?: string;
  onPoprz: () => void;
  onNast: () => void;
  onDzis: () => void;
  czyDzis: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <h1 className="naglowek truncate first-letter:uppercase">{tytul}</h1>
        {podtytul && <p className="text-[14px] text-szary first-letter:uppercase">{podtytul}</p>}
      </div>
      {!czyDzis && (
        <button className="btn-jasny min-h-10 px-3 text-[14px]" onClick={onDzis}>
          Dziś
        </button>
      )}
      <button className="btn-jasny size-10 min-h-10 px-0" onClick={onPoprz} aria-label="Wcześniej">
        <ChevronLeft className="size-5" />
      </button>
      <button className="btn-jasny size-10 min-h-10 px-0" onClick={onNast} aria-label="Później">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

export function tytulDnia(key: string) {
  const w = wzglednie(key, dzienKey());
  return { tytul: w ?? opisDnia(key, false), podtytul: w ? opisDnia(key) : opisDnia(key).split(",")[0] };
}
