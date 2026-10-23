import React, { useState } from 'react';
import type { AppTheme } from '../../constants/theme';
import { useMotyw } from '../../hooks/useMotyw';
import { wyborDnia, type FazaKalendarza } from '../../utils/zakresDat';
import { OknoKalendarza, PoleDaty, SiatkaKalendarza } from '../ui/Kalendarz';

function formatujDzien(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function etykietaZakresu(od: string, doDnia: string): string {
  if (od === doDnia) return formatujDzien(od);
  return `${formatujDzien(od)} – ${formatujDzien(doDnia)}`;
}

interface Props {
  od: string;
  doDnia: string;
  onZatwierdz: (od: string, doDnia: string) => void;
  /** Zachowane dla zgodności – kolory bierze z useMotyw. */
  theme?: AppTheme;
}

export function KalendarzZakresu({ od, doDnia, onZatwierdz }: Props) {
  const theme = useMotyw();
  const [otwarty, setOtwarty] = useState(false);
  const [faza, setFaza] = useState<FazaKalendarza>('gotowy');
  const [robOd, setRobOd] = useState(od);
  const [robDo, setRobDo] = useState(doDnia);
  const [rok, setRok] = useState(Number(od.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(od.slice(5, 7)) - 1);

  const otworz = () => {
    setRobOd(od);
    setRobDo(doDnia);
    setFaza('gotowy');
    setRok(Number(od.slice(0, 4)));
    setMiesiac(Number(od.slice(5, 7)) - 1);
    setOtwarty(true);
  };

  const klik = (dzien: string) => {
    const next = wyborDnia(faza, robOd, dzien);
    setFaza(next.faza);
    setRobOd(next.od);
    setRobDo(next.do);
  };

  return (
    <>
      <PoleDaty
        tekst={etykietaZakresu(od, doDnia)}
        onPress={otworz}
        accessibilityLabel={`Wybierz datę, teraz ${etykietaZakresu(od, doDnia)}`}
        tlo={theme.colors.card}
      />
      <OknoKalendarza
        widoczny={otwarty}
        podpis={etykietaZakresu(robOd, robDo)}
        etykietaOk="Zatwierdź zakres dat"
        onZamknij={() => setOtwarty(false)}
        onOk={() => { onZatwierdz(robOd, robDo); setOtwarty(false); }}
      >
        <SiatkaKalendarza
          rok={rok}
          miesiac={miesiac}
          onZmienMiesiac={(r, m) => { setRok(r); setMiesiac(m); }}
          stanDnia={(iso) => ({ wybrany: iso === robOd || iso === robDo, wZakresie: iso >= robOd && iso <= robDo })}
          onWybierz={klik}
        />
      </OknoKalendarza>
    </>
  );
}
