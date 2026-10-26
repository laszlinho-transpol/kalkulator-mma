import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import type { RaportDzienny } from '../../raportyBudowy/typy';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { Karta, RamkaWyniku, SiatkaDanych, WierszDanych } from '../ui';
import { formatLiczby } from '../../utils/calculations';
import { obliczZaawansowanie, opisRoznicyTon } from '../../utils/zaawansowanie';
import { postepPrzypisan } from '../../utils/projektBudowy';

interface Props {
  projekt: ProjektBudowy;
  raporty: RaportDzienny[];
  theme: AppTheme;
}

export function SekcjaZaawansowanie({ projekt, raporty, theme }: Props) {
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wynik = useMemo(
    () => obliczZaawansowanie(projekt, raporty, mieszanki),
    [projekt, raporty, mieszanki],
  );
  const postep = postepPrzypisan(projekt);
  const kolorRoznicy = (n: number) => (n < -0.05 ? theme.colors.danger : n > 0.05 ? theme.colors.success : theme.colors.text);

  if (wynik.wiersze.length === 0) {
    return (
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Najpierw wgraj obszary na PZT i ustaw konstrukcje. Przedmiar policzy powierzchnie z odsadzkami, a tu pojawi się postęp z raportów.
      </Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <RamkaWyniku
        etykieta="Zaawansowanie powierzchni"
        wartosc={`${formatLiczby(wynik.procentM2, 1)}%`}
        accessibilityLabel="Procent zaawansowania powierzchni"
      />
      <SiatkaDanych pozycje={[
        { etykieta: 'Do zakrycia', wartosc: `${formatLiczby(wynik.zostaloM2, 0)} m²` },
        { etykieta: 'Zostało masy', wartosc: `${formatLiczby(wynik.zostaloT, 1)} t` },
        { etykieta: 'Wbudowano', wartosc: `${formatLiczby(wynik.wykonaneT, 1)} t` },
        {
          etykieta: 'Na wbudowanym',
          wartosc: opisRoznicyTon(wynik.roznicaT, wynik.wykonaneT, wynik.wykonaneM2),
          kolor: kolorRoznicy(wynik.roznicaT),
        },
      ]} />
      {postep.wszystkie > 0 && postep.przypisane < postep.wszystkie ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Przypisane konstrukcje: {postep.przypisane} z {postep.wszystkie} obszarów. Przedmiar mas liczy obszary z konstrukcją.
        </Text>
      ) : null}
      {wynik.wiersze.map((w) => (
        <Karta
          key={w.klucz}
          tytul={w.mieszanka ? `${w.nazwa} · ${w.mieszanka}` : w.nazwa}
          podtytul={`${formatLiczby(w.gruboscCm, 1)} cm`}
        >
          <WierszDanych etykieta="Przedmiar" wartosc={`${formatLiczby(w.przedmiarM2, 0)} m² · ${formatLiczby(w.przedmiarT, 1)} t`} />
          <WierszDanych etykieta="Wykonanie" wartosc={`${formatLiczby(w.wykonaneM2, 0)} m² · ${formatLiczby(w.wykonaneT, 1)} t`} />
          <WierszDanych etykieta="Do zakrycia" wartosc={`${formatLiczby(w.zostaloM2, 0)} m² · ${formatLiczby(w.zostaloT, 1)} t`} />
          <WierszDanych etykieta="Różnica" wartosc={opisRoznicyTon(w.roznicaT, w.wykonaneT, w.wykonaneM2)} kolor={kolorRoznicy(w.roznicaT)} />
        </Karta>
      ))}
    </View>
  );
}
