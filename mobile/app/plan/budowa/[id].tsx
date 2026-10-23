// ============================================================
// EKRAN: BUDOWA W PLANOWANIU – nowy plan albo zapisane
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { usePlanyStore } from '../../../src/stores/planyStore';
import { useBudowyStore } from '../../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { Karta, Przycisk, Sekcja, TYPOGRAFIA } from '../../../src/components/ui';
import { komentarzPlanuBudowy, tytulPlanuBudowy } from '../../../src/utils/planZBudowy';
import { potwierdzAkcje } from '../../../src/utils/dialog';
import type { Plan } from '../../../src/types';

export default function PlanBudowaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === id));
  const { plany, usunPlan } = usePlanyStore();

  const zapisane = useMemo(() => {
    return plany
      .filter((p) => p.status === 'aktywny' && p.budowaId === id)
      .sort((a, b) => new Date(a.dataWbudowywania).getTime() - new Date(b.dataWbudowywania).getTime());
  }, [plany, id]);

  if (!budowa) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Zaplanuj masę" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <EmptyState ikona="🏗️" tytul="Nie znaleziono budowy" opis="Wróć do listy i wybierz inną inwestycję." />
      </View>
    );
  }

  const potwierdźUsunięcie = (plan: Plan) => potwierdzAkcje(
    'Usuń plan',
    `Usunąć „${tytulPlanuBudowy(plan)}”?`,
    () => { void usunPlan(plan.id); },
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={budowa.kodBudowy}
        podtytul={budowa.nazwaInwestycji}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}>
        <Sekcja tytul="Nowy plan" info="Data, obszar, kilometraż, warstwa i recepta z projektu budowy.">
          <Przycisk
            ikona="plus"
            tekst="Dodaj nowy plan"
            onPress={() => router.push({ pathname: '/plan/nowy', params: { budowaId: budowa.id } } as never)}
          />
        </Sekcja>

        <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Zapisane · {zapisane.length}
        </Text>
        {zapisane.length === 0 ? (
          <Karta podtytul="Brak zapisanych planów tej budowy." />
        ) : zapisane.map((item) => (
          <Karta
            key={item.id}
            tytul={tytulPlanuBudowy(item)}
            podtytul={komentarzPlanuBudowy(item) || `${item.dzialki.length} działki`}
            onPress={() => router.push(`/plan/${item.id}` as never)}
            akcje={[
              { tekst: 'Edytuj', onPress: () => router.push(`/plan/edytuj/${item.id}` as never), accessibilityLabel: `Edytuj plan ${tytulPlanuBudowy(item)}` },
              { tekst: 'Usuń', rodzaj: 'niebezpieczna', onPress: () => potwierdźUsunięcie(item), accessibilityLabel: `Usuń plan ${tytulPlanuBudowy(item)}` },
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: 10 },
});
