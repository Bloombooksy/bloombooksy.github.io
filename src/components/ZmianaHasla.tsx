import { useState } from "react";
import { komunikat, supabase } from "../lib/supabase";
import { Blad, Modal } from "./ui";

/** Zmiana hasła zalogowanej osoby (np. po tymczasowym haśle od administratora). */
export function ZmianaHasla({ onClose }: { onClose: () => void }) {
  const [haslo, setHaslo] = useState("");
  const [powtorz, setPowtorz] = useState("");
  const [blad, setBlad] = useState("");
  const [gotowe, setGotowe] = useState(false);
  const [czeka, setCzeka] = useState(false);

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    if (haslo.length < 8) return setBlad("Hasło musi mieć co najmniej 8 znaków.");
    if (haslo !== powtorz) return setBlad("Hasła się różnią.");
    setCzeka(true);
    const { error } = await supabase.auth.updateUser({ password: haslo });
    setCzeka(false);
    if (error) return setBlad(error.message.includes("different from the old") ? "Nowe hasło musi być inne niż obecne." : komunikat(error));
    setGotowe(true);
  }

  return (
    <Modal
      tytul="Zmień hasło"
      onClose={onClose}
      stopka={
        gotowe ? (
          <button className="btn-glowny w-full" onClick={onClose}>
            Gotowe
          </button>
        ) : (
          <button form="haslo-form" disabled={czeka} className="btn-glowny w-full">
            {czeka ? "Zapisuję…" : "Zapisz nowe hasło"}
          </button>
        )
      }
    >
      {gotowe ? (
        <p className="rounded-2xl bg-ziel-jasny p-4 text-[15px] font-semibold text-ziel">Hasło zmienione ✓ Następnym razem zaloguj się nowym hasłem.</p>
      ) : (
        <form id="haslo-form" onSubmit={zapisz} className="space-y-4">
          <label className="block">
            <span className="etykieta">Nowe hasło (min. 8 znaków)</span>
            <input type="password" autoComplete="new-password" required className="pole" value={haslo} onChange={(e) => setHaslo(e.target.value)} />
          </label>
          <label className="block">
            <span className="etykieta">Powtórz hasło</span>
            <input type="password" autoComplete="new-password" required className="pole" value={powtorz} onChange={(e) => setPowtorz(e.target.value)} />
          </label>
          <Blad>{blad}</Blad>
        </form>
      )}
    </Modal>
  );
}
