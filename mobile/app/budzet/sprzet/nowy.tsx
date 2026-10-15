import React from 'react';
import { useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FormularzSprzetu } from '../../../src/components/budzet/FormularzSprzetu';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { rodzajPoId } from '../../../src/budzet/rodzajeSprzetu';
import { useFirmyStore } from '../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

function parametr(wartosc?: string | string[]): string {
  if (Array.isArray(wartosc)) return wartosc[0] ?? '';
  return wartosc ?? '';
}

export default function NowySprzetScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const start = parametr(useLocalSearchParams<{ rodzaj?: string | string[] }>().rodzaj);
  const znajdzLubDodaj = useFirmyStore((s) => s.znajdzLubDodaj);
  const dodajSprzet = useSprzetStore((s) => s.dodajSprzet);

  return (
    <FormularzSprzetu
      theme={theme}
      tytul="Nowy sprzęt"
      wsteczDo="/budzet/sprzet"
      etykietaZapisu="Zapisz sprzęt"
      poczatek={rodzajPoId(start) ? { rodzajId: start, stawki: {} } : undefined}
      onZapisz={async (dane) => {
        const firmaId = await znajdzLubDodaj(dane.firmaNazwa);
        const id = await dodajSprzet({
          rodzajId: dane.rodzajId,
          numer: dane.numer,
          firmaId,
          stawki: dane.stawki,
          spalanieLnaMth: dane.spalanieLnaMth,
        });
        router.replace(`/budzet/sprzet/${id}` as never);
      }}
    />
  );
}
