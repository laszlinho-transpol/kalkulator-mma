import React from 'react';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { FormularzWytworni } from '../../../src/components/mieszanki/FormularzWytworni';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { useWytwornieStore } from '../../../src/stores/wytwornieStore';

export default function NowaWytworniaScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const dodajWytwornie = useWytwornieStore((s) => s.dodajWytwornie);

  return (
    <FormularzWytworni
      theme={theme}
      tytul="Nowa wytwórnia"
      wsteczDo="/mieszanki"
      onZapisz={async (dane) => {
        const id = await dodajWytwornie(dane);
        router.replace(`/mieszanki/wytwornia/${id}` as never);
      }}
    />
  );
}
