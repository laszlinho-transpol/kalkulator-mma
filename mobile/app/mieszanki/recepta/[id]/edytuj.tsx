import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { FormularzRecepty } from '../../../../src/components/mieszanki/FormularzRecepty';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useMieszankiStore } from '../../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../../src/stores/wytwornieStore';

export default function EdycjaReceptyScreen() {
  const id = useRouteId();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const recepta = useMieszankiStore((s) => s.mieszanki.find((m) => m.id === id));
  const edytujMieszanke = useMieszankiStore((s) => s.edytujMieszanke);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);

  if (!recepta) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader tytul="Edytuj recepturę" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/mieszanki') }} />
        <Text style={{ padding: 24, color: theme.colors.textSecondary }}>Nie znaleziono recepty.</Text>
      </View>
    );
  }

  return (
    <FormularzRecepty
      theme={theme}
      tytul="Edytuj receptę"
      wsteczDo={`/mieszanki/recepta/${recepta.id}`}
      poczatek={recepta}
      onZapisz={async (dane) => {
        await edytujMieszanke(recepta.id, { ...dane, wytwórnia: wytwornie.find((w) => w.id === dane.wytworniaId)?.nazwa });
        router.replace(`/mieszanki/recepta/${recepta.id}` as never);
      }}
    />
  );
}
