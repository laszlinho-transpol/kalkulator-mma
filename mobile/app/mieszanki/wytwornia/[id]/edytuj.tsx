import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { FormularzWytworni } from '../../../../src/components/mieszanki/FormularzWytworni';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useMieszankiStore } from '../../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../../src/stores/wytwornieStore';

export default function EdycjaWytworniScreen() {
  const id = useRouteId();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const wytwornia = useWytwornieStore((s) => s.wytwornie.find((w) => w.id === id));
  const edytujWytwornie = useWytwornieStore((s) => s.edytujWytwornie);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const edytujMieszanke = useMieszankiStore((s) => s.edytujMieszanke);

  if (!wytwornia) return <Text style={{ padding: 24, color: theme.colors.textSecondary }}>Nie znaleziono wytwórni.</Text>;

  return (
    <FormularzWytworni
      theme={theme}
      tytul="Edytuj wytwórnię"
      wsteczDo={`/mieszanki/wytwornia/${wytwornia.id}`}
      poczatek={wytwornia}
      onZapisz={async (dane) => {
        await edytujWytwornie(wytwornia.id, dane);
        if (dane.nazwa !== wytwornia.nazwa) {
          for (const m of mieszanki.filter((x) => x.wytworniaId === wytwornia.id)) {
            await edytujMieszanke(m.id, { wytwórnia: dane.nazwa });
          }
        }
        router.replace(`/mieszanki/wytwornia/${wytwornia.id}` as never);
      }}
    />
  );
}
