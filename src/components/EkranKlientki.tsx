/** Strony klientek w kolorze salonu (przyciski i numery kroków). */
export function Ekran({ children, kolor }: { children: React.ReactNode; kolor?: string | undefined }) {
  const styl = kolor ? ({ "--color-atrament": kolor, "--color-zloto": kolor, "--color-mokka": kolor } as React.CSSProperties) : undefined;
  return (
    <div style={styl} className="mx-auto min-h-dvh max-w-md space-y-7 px-5 py-10">
      {children}
      <p className="pt-6 text-center text-[12px] text-szary">
        Zapisy przez <span className="font-serif font-semibold">Bloomly</span>
      </p>
    </div>
  );
}
