import { useState } from "react";
import { supabase, komunikat } from "../lib/supabase";
import { Blad } from "../components/ui";
import { Logo } from "../components/Layout";

type Tryb = "logowanie" | "rejestracja" | "reset";

export function Logowanie() {
  const [tryb, setTryb] = useState<Tryb>("logowanie");
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [info, setInfo] = useState("");
  const [czeka, setCzeka] = useState(false);

  async function wyslij(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    setInfo("");
    setCzeka(true);
    const powrot = window.location.href.split("#")[0];
    try {
      if (tryb === "logowanie") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: haslo });
        if (error) throw error;
      } else if (tryb === "rejestracja") {
        const { data, error } = await supabase.auth.signUp({ email, password: haslo, options: { emailRedirectTo: powrot } });
        if (error) throw error;
        if (!data.session) setInfo("Konto założone. Kliknij link w mailu, żeby je potwierdzić, a potem się zaloguj.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: powrot });
        if (error) throw error;
        setInfo("Wysłałam link do zmiany hasła – sprawdź skrzynkę.");
      }
    } catch (err) {
      setBlad(komunikat(err));
    } finally {
      setCzeka(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-3 text-[15px] text-szary">Twoje wizyty, utarg i zapisy w jednym miejscu.</p>
        </div>
        <form onSubmit={wyslij} className="karta space-y-4 p-5">
          <div>
            <label className="etykieta" htmlFor="em">
              E-mail
            </label>
            <input id="em" type="email" required autoComplete="email" className="pole" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {tryb !== "reset" && (
            <div>
              <label className="etykieta" htmlFor="ha">
                Hasło
              </label>
              <input
                id="ha"
                type="password"
                required
                minLength={8}
                autoComplete={tryb === "rejestracja" ? "new-password" : "current-password"}
                className="pole"
                value={haslo}
                onChange={(e) => setHaslo(e.target.value)}
              />
            </div>
          )}
          <Blad>{blad}</Blad>
          {info && <p className="rounded-xl bg-ziel-jasny px-3.5 py-2.5 text-[14px] font-medium text-ziel">{info}</p>}
          <button disabled={czeka} className="btn-glowny w-full">
            {tryb === "logowanie" ? "Zaloguj się" : tryb === "rejestracja" ? "Załóż konto" : "Wyślij link"}
          </button>
        </form>
        <div className="mt-4 flex justify-center gap-4 text-[14px] text-szary">
          {tryb !== "logowanie" && (
            <button className="underline" onClick={() => setTryb("logowanie")}>
              Mam konto
            </button>
          )}
          {tryb !== "rejestracja" && (
            <button className="underline" onClick={() => setTryb("rejestracja")}>
              Pierwszy raz? Załóż konto
            </button>
          )}
          {tryb === "logowanie" && (
            <button className="underline" onClick={() => setTryb("reset")}>
              Nie pamiętam hasła
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
