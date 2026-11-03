import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  tytul,
  onClose,
  children,
  stopka,
}: {
  tytul: string;
  onClose: () => void;
  children: ReactNode;
  stopka?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={tytul}
      className="m-0 mt-auto h-fit max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-papier p-0 text-atrament shadow-2xl backdrop:bg-atrament/40 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-linia px-5 py-4">
          <h2 className="font-serif text-xl font-semibold">{tytul}</h2>
          <button type="button" onClick={onClose} className="btn-cichy -mr-2 size-11 px-0" aria-label="Zamknij">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {stopka && <footer className="pb-safe border-t border-linia px-5 py-3">{stopka}</footer>}
      </div>
    </dialog>
  );
}

export function Kafelek({ etykieta, wartosc, podpis, akcent }: { etykieta: string; wartosc: ReactNode; podpis?: ReactNode; akcent?: boolean }) {
  return (
    <div className={akcent ? "rounded-2xl bg-atrament p-4 text-krem" : "karta p-4"}>
      <div className={`text-[12px] font-semibold tracking-wide uppercase ${akcent ? "text-krem/70" : "text-szary"}`}>{etykieta}</div>
      <div className="mt-1 font-serif text-[26px] leading-none font-semibold">{wartosc}</div>
      {podpis && <div className={`mt-1.5 text-[13px] ${akcent ? "text-krem/70" : "text-szary"}`}>{podpis}</div>}
    </div>
  );
}

export function Blad({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-roz-jasny px-3.5 py-2.5 text-[14px] font-medium text-[#8a2f3a]">
      {children}
    </p>
  );
}

export function Pusto({ ikona, children }: { ikona?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-linia px-6 py-10 text-center text-[15px] text-szary">
      {ikona}
      {children}
    </div>
  );
}

export function Ladowanie() {
  return (
    <div className="flex justify-center py-16" aria-label="Ładowanie">
      <span className="size-7 animate-spin rounded-full border-[3px] border-piasek border-t-mokka" />
    </div>
  );
}

export function Przelacznik({ wl, onZmien, etykieta, opis }: { wl: boolean; onZmien: (v: boolean) => void; etykieta: string; opis?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-[15px] font-semibold">{etykieta}</span>
        {opis && <span className="mt-0.5 block text-[13px] text-szary">{opis}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={wl} onChange={(e) => onZmien(e.target.checked)} />
      <span
        aria-hidden
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-linia transition peer-checked:bg-ziel peer-focus-visible:ring-2 peer-focus-visible:ring-zloto after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}
