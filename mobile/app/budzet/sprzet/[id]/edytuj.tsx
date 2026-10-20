import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { FormularzSprzetu } from '../../../../src/components/budzet/FormularzSprzetu';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useFirmyStore } from '../../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../../src/stores/sprzetStore';

export default function EdytujSprzetScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const maszyna = useSprzetStore((s) => s.sprzet.find((pozycja) => pozycja.id === id));
  const firmy = useFirmyStore((s) => s.firmy);
  const znajdzLubDodaj = useFirmyStore((s) => s.znajdzLubDodaj);
  const aktualizujSprzet = useSprzetStore((s) => s.aktualizujSprzet);
  const firma = firmy.find((f) => f.id === maszyna?.firmaId);

  if (!maszyna) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader tytul="Edytuj sprzęt" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/sprzet') }} />
        <Text style={{ padding: 24, color: theme.colors.textSecondary }}>Nie znaleziono sprzętu.</Text>
      </View>
    );
  }

  return (
    <FormularzSprzetu
      theme={theme}
      tytul="Edytuj sprzęt"
      wsteczDo={`/budzet/sprzet/${maszyna.id}`}
      etykietaZapisu="Zapisz sprzęt"
      poczatek={{
        rodzajId: maszyna.rodzajId,
        numer: maszyna.numer,
        firma: firma?.nazwa,
        stawki: maszyna.stawki,
        spalanieLnaMth: maszyna.spalanieLnaMth,
      }}
      onZapisz={async (dane) => {
        const firmaId = await znajdzLubDodaj(dane.firmaNazwa);
        await aktualizujSprzet(maszyna.id, {
          rodzajId: dane.rodzajId,
          numer: dane.numer,
          firmaId,
          stawki: dane.stawki,
          spalanieLnaMth: dane.spalanieLnaMth,
        });
        router.replace(`/budzet/sprzet/${maszyna.id}` as never);
      }}
    />
  );
}
