// Wybór jednego dnia. Zapis dopiero po OK.

import React, { useState } from 'react';
import type { AppTheme } from '../../constants/theme';
import { OknoKalendarza, PoleDaty, SiatkaKalendarza } from '../ui/Kalendarz';

export function formatujDzienIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  wartosc: string;
  onZatwierdz: (iso: string) => void;
  /** Najwcześniejszy dzień do wyboru (ISO). */
  min?: string;
  accessibilityLabel?: string;
  /** Zachowane dla zgodności – kolory bierze z useMotyw. */
  theme?: AppTheme;
}

export function KalendarzDnia({ wartosc, onZatwierdz, min, accessibilityLabel = 'Wybierz datę raportu' }: Props) {
  const [otwarty, setOtwarty] = useState(false);
  const [wybrany, setWybrany] = useState(wartosc);
  const [rok, setRok] = useState(Number(wartosc.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(wartosc.slice(5, 7)) - 1);

  const otworz = () => {
    setWybrany(wartosc);
    setRok(Number(wartosc.slice(0, 4)));
    setMiesiac(Number(wartosc.slice(5, 7)) - 1);
    setOtwarty(true);
  };

  return (
    <>
      <PoleDaty tekst={formatujDzienIso(wartosc)} onPress={otworz} accessibilityLabel={accessibilityLabel} />
      <OknoKalendarza
        widoczny={otwarty}
        podpis={formatujDzienIso(wybrany)}
        etykietaOk="Zatwierdź datę"
        onZamknij={() => setOtwarty(false)}
        onOk={() => { onZatwierdz(wybrany); setOtwarty(false); }}
      >
        <SiatkaKalendarza
          rok={rok}
          miesiac={miesiac}
          min={min}
          onZmienMiesiac={(r, m) => { setRok(r); setMiesiac(m); }}
          stanDnia={(iso) => ({ wybrany: iso === wybrany })}
          onWybierz={setWybrany}
        />
      </OknoKalendarza>
    </>
  );
}
