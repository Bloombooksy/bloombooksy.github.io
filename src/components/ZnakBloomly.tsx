/** Znak Bloomly: pięć płatków i ✓ w środku („salon rozkwita, wizyta zrobiona”). */
export function ZnakBloomly({ size = 24, platek = "#c2185b", srodek = "#1f1d2b", check = "#fff" }: { size?: number; platek?: string; srodek?: string; check?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path transform="rotate(0 50 50)" d="M50 46 C 33 37, 30 13, 50 4 C 70 13, 67 37, 50 46 Z" fill={platek}/><path transform="rotate(72 50 50)" d="M50 46 C 33 37, 30 13, 50 4 C 70 13, 67 37, 50 46 Z" fill={platek}/><path transform="rotate(144 50 50)" d="M50 46 C 33 37, 30 13, 50 4 C 70 13, 67 37, 50 46 Z" fill={platek}/><path transform="rotate(216 50 50)" d="M50 46 C 33 37, 30 13, 50 4 C 70 13, 67 37, 50 46 Z" fill={platek}/><path transform="rotate(288 50 50)" d="M50 46 C 33 37, 30 13, 50 4 C 70 13, 67 37, 50 46 Z" fill={platek}/><circle cx="50" cy="50" r="15.5" fill={srodek}/><path d="M43.2 50.6l4.6 4.6l9.2-9.8" fill="none" stroke={check} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
