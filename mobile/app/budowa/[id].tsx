// ============================================================
// SZABLON BUDOWY – PROJEKT + WYKONANIE
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { SekcjaPzt } from '../../src/components/budowa/SekcjaPzt';
import { SekcjaLegenda } from '../../src/components/budowa/SekcjaLegenda';
import { SekcjaKonstrukcje } from '../../src/components/budowa/SekcjaKonstrukcje';
import { SekcjaPrzedmiar } from '../../src/components/budowa/SekcjaPrzedmiar';
import { pustyProjektBudowy, zsynchronizujLegendeProjektu } from '../../src/utils/projektBudowy';
import type { ProjektBudowy } from '../../src/types';

export default function BudowaSzablonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === id));
  const zapiszProjekt = useBudowyStore((s) => s.zapiszProjekt);
  const [mapaAktywna, setMapaAktywna] = useState(false);
  const [blokadaPodgladu, setBlokadaPodgladu] = useState(false);

  useEffect(() => {
    if (budowa && !budowa.projekt) {
      void zapiszProjekt(budowa.id, pustyProjektBudowy());
    }
  }, [budowa, zapiszProjekt]);

  useEffect(() => {
    if (!budowa?.projekt) return;
    const next = zsynchronizujLegendeProjektu(budowa.projekt);
    if (next !== budowa.projekt) {
      void zapiszProjekt(budowa.id, next);
    }
  }, [budowa?.id, budowa?.projekt, zapiszProjekt]);

  const projekt: ProjektBudowy = useMemo(
    () => budowa?.projekt ?? pustyProjektBudowy(),
    [budowa?.projekt],
  );

  if (!budowa) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Budowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>Nie znaleziono budowy.</Text>
      </View>
    );
  }

  const onZmien = (p: ProjektBudowy) => {
    void zapiszProjekt(budowa.id, zsynchronizujLegendeProjektu(p));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={budowa.kodBudowy}
        podtytul={budowa.nazwaInwestycji}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24, gap: 4 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={!blokadaPodgladu && !mapaAktywna}
      >
        <CollapsibleSection
          tytul="1. PROJEKT"
          liczba={projekt.arkusze.length}
          theme={theme}
          ikona="📐"
          domyslnieRozwinieta
        >
          <CollapsibleSection
            tytul="1.1 PZT"
            liczba={projekt.arkusze.length}
            theme={theme}
            ikona="🗺️"
            domyslnieRozwinieta
          >
            <SekcjaPzt
              projekt={projekt}
              theme={theme}
              onZmien={onZmien}
              blokadaPodgladu={blokadaPodgladu}
              onBlokadaPodgladu={setBlokadaPodgladu}
              onDotykZmiana={setMapaAktywna}
            />
          </CollapsibleSection>
          <CollapsibleSection
            tytul="1.2 Legenda"
            liczba={projekt.legenda.length}
            theme={theme}
            ikona="🎨"
          >
            <SekcjaLegenda projekt={projekt} theme={theme} onZmien={onZmien} />
          </CollapsibleSection>
          <CollapsibleSection
            tytul="1.3 Konstrukcje"
            liczba={projekt.konstrukcje.length}
            theme={theme}
            ikona="🧱"
          >
            <SekcjaKonstrukcje projekt={projekt} theme={theme} onZmien={onZmien} />
          </CollapsibleSection>
          <CollapsibleSection
            tytul="1.4 Przedmiar"
            liczba={projekt.konstrukcje.length}
            theme={theme}
            ikona="📊"
          >
            <SekcjaPrzedmiar
              projekt={projekt}
              theme={theme}
              kodBudowy={budowa.kodBudowy}
              onZmien={onZmien}
            />
          </CollapsibleSection>
        </CollapsibleSection>

        <CollapsibleSection
          tytul="2. WYKONANIE"
          liczba={3}
          theme={theme}
          ikona="🚧"
        >
          <Placeholder nr="2.1" tytul="Raporty dzienne" />
          <Placeholder nr="2.2" tytul="Liniówka" />
          <Placeholder nr="2.3" tytul="Zaawansowanie" />
        </CollapsibleSection>
      </ScrollView>
    </View>
  );
}

function Placeholder({ nr, tytul }: { nr: string; tytul: string }) {
  const colorScheme = useColorScheme();
  const t = colorScheme === 'dark' ? darkTheme : lightTheme;
  return (
    <View style={[styles.placeholder, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
      <Text style={{ color: t.colors.text, fontWeight: '800' }}>{nr} {tytul}</Text>
      <Text style={{ color: t.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
        Szczegóły w następnym etapie.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
});
