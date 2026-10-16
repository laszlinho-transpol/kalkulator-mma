import React from 'react';
import { useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FormularzRecepty } from '../../../src/components/mieszanki/FormularzRecepty';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { useMieszankiStore } from '../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../src/stores/wytwornieStore';

export default function NowaReceptaScreen() {
  const { wytwornia } = useLocalSearchParams<{ wytwornia?: string }>();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const dodajMieszanke = useMieszankiStore((s) => s.dodajMieszanke);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const startowa = wytwornie.find((w) => w.id === wytwornia)?.id;

  return (
    <FormularzRecepty
      theme={theme}
      tytul="Nowa recepta"
      wsteczDo={startowa ? `/mieszanki/wytwornia/${startowa}?zakladka=mieszanki` : '/mieszanki'}
      poczatek={{ wytworniaId: startowa }}
      onZapisz={async (dane) => {
        const id = await dodajMieszanke({ ...dane, wytwórnia: wytwornie.find((w) => w.id === dane.wytworniaId)?.nazwa });
        router.replace(`/mieszanki/recepta/${id}` as never);
      }}
    />
  );
}
