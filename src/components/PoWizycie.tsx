import { useState } from "react";
import { CalendarPlus, Check, Star } from "lucide-react";
import { Modal } from "./ui";
import { WizytaForm } from "./WizytaForm";
import { WyslijSms } from "./WyslijSms";
import { useHistoriaKlientki, useSalon, useZapis, type WizytaZKlientka } from "../lib/dane";
import { dodajDni, dzienKey, godzina, krotkaData, opisDnia } from "../lib/czas";
import { zl } from "../lib/pieniadze";
import { trescProsbyOOpinie } from "../lib/wiadomosci";

const ODSTEPY = [2, 3, 4, 6];

/** Ekran po zapisaniu wizyty: umów kolejną (paznokcie i rzęsy wracają co kilka tygodni) i poproś o opinię Google. */
export function PoWizycie({ wizyta, suma, onClose }: { wizyta: WizytaZKlientka; suma: number; onClose: () => void }) {
  const { data: salon } = useSalon();
  const { data: historia = [] } = useHistoriaKlientki(wizyta.klientka_id);
  const klientkiApi = useZapis("klientki", ["klientki"]);
  const [kolejna, setKolejna] = useState<string | null>(null);
  const [poprosiono, setPoprosiono] = useState(false);

  const k = wizyta.klientka;
  const nastepna = historia
    .filter((w) => w.id !== wizyta.id && +new Date(w.start) > Date.now() && (w.status === "potwierdzona" || w.status === "oczekuje"))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))[0];
  const czas = Math.round((+new Date(wizyta.koniec) - +new Date(wizyta.start)) / 60000);
  const dzien = dzienKey(wizyta.start);
  const juzProszona = k?.prosba_o_opinie;

  if (kolejna)
    return (
      <WizytaForm
        dzien={kolejna}
        start={godzina(wizyta.start)}
        pracownik={wizyta.pracownik_id}
        szablon={{ klientka_id: wizyta.klientka_id, imie: k?.imie ?? "", usluga_id: wizyta.usluga_id, czas, cena: Number(wizyta.cena) }}
        onClose={onClose}
      />
    );

  return (
    <Modal
      tytul="Zapisano ✓"
      onClose={onClose}
      stopka={
        <button className="btn-jasny w-full" onClick={onClose}>
          Gotowe
        </button>
      }
    >
      <div className="space-y-6">
        <p className="flex items-center gap-2 text-[16px]">
          <Check className="size-5 text-ziel" />
          <span>
            <b>{k?.imie ?? "Klientka"}</b> · {zl(suma)}
          </span>
        </p>

        <section>
          <h3 className="flex items-center gap-2 font-bold">
            <CalendarPlus className="size-5 text-mokka" /> Kolejna wizyta
          </h3>
          {nastepna ? (
            <p className="mt-2 rounded-xl bg-ziel-jasny px-3.5 py-2.5 text-[15px] text-ziel">
              Już umówiona: {opisDnia(dzienKey(nastepna.start))}, {godzina(nastepna.start)}
            </p>
          ) : (
            <>
              <p className="mt-1 text-[14px] text-szary">
                Ten sam dzień tygodnia i godzina ({godzina(wizyta.start)}), {wizyta.usluga_nazwa || "ta sama usługa"}:
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ODSTEPY.map((t) => (
                  <button key={t} className="btn-jasny flex-col gap-0 px-0 py-2 leading-tight" onClick={() => setKolejna(dodajDni(dzien, 7 * t))}>
                    <span className="text-[15px] font-bold">za {t} tyg.</span>
                    <span className="text-[12px] font-normal text-szary">{krotkaData(dodajDni(dzien, 7 * t))}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {salon?.link_opinii && k?.telefon && (
          <section>
            <h3 className="flex items-center gap-2 font-bold">
              <Star className="size-5 text-zloto" /> Opinia w Google
            </h3>
            {juzProszona || poprosiono ? (
              <p className="mt-2 text-[14px] text-szary">
                {poprosiono ? "Otwarto SMS z prośbą o opinię." : `Prośba o opinię wysłana ${krotkaData(dzienKey(juzProszona!))}.`}
              </p>
            ) : (
              <>
                <p className="mt-1 text-[14px] text-szary">Zadowolona klientka? Jednym SMS-em poproś ją o opinię – więcej opinii to wyżej w Google.</p>
                <div
                  className="mt-2"
                  onClick={() => {
                    setPoprosiono(true);
                    if (wizyta.klientka_id) klientkiApi.zmien.mutate({ id: wizyta.klientka_id, prosba_o_opinie: new Date().toISOString() });
                  }}
                >
                  <WyslijSms className="w-full" telefon={k.telefon} tresc={trescProsbyOOpinie(k.imie, salon.nazwa, salon.link_opinii)}>
                    Poproś o opinię
                  </WyslijSms>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
