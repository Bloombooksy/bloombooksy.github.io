import { useEffect, useRef } from "react";

/**
 * Przycisk / gest „Wstecz” w telefonie zamyka otwarte okno zamiast wychodzić ze strony.
 * Każde otwarte okno dokłada wpis do historii; „Wstecz” zdejmuje tylko najwyższe okno.
 */
const stos: number[] = [];
let licznik = 0;
let pominPop = 0;

export function useWsteczZamyka(onClose: () => void) {
  const zamknij = useRef(onClose);
  zamknij.current = onClose;

  useEffect(() => {
    const id = ++licznik;
    const adres = location.href;
    // gdy poprzednie okno właśnie zdejmuje swój wpis, dołóż nasz dopiero po nim
    let wpisDodany = false;
    let aktywne = true;
    const dodajWpis = () => {
      if (!aktywne) return;
      if (pominPop > 0) {
        const po = () => {
          window.removeEventListener("popstate", po);
          setTimeout(dodajWpis, 0);
        };
        window.addEventListener("popstate", po);
      } else {
        history.pushState(history.state, "");
        wpisDodany = true;
      }
    };
    dodajWpis();
    stos.push(id);
    let zamknietoGestem = false;

    const naPop = () => {
      if (pominPop > 0 || !wpisDodany) return;
      if (stos[stos.length - 1] !== id) return;
      zamknietoGestem = true;
      stos.pop();
      zamknij.current();
    };
    window.addEventListener("popstate", naPop);

    return () => {
      aktywne = false;
      window.removeEventListener("popstate", naPop);
      if (zamknietoGestem) return;
      const i = stos.indexOf(id);
      if (i >= 0) stos.splice(i, 1);
      if (!wpisDodany) return;
      // okno zamknięte krzyżykiem / zapisaniem – zdejmij nasz wpis, chyba że przeszłyśmy na inną stronę
      if (location.href === adres) {
        pominPop++;
        const zdejmij = () => {
          pominPop = Math.max(0, pominPop - 1);
          window.removeEventListener("popstate", zdejmij);
        };
        window.addEventListener("popstate", zdejmij);
        history.back();
      }
    };
  }, []);
}
