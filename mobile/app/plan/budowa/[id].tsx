// ============================================================
// EKRAN: BUDOWA W PLANOWANIU – nowy plan albo zapisane
// ============================================================

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { usePlanyStore } from '../../../src/stores/planyStore';
import { useBudowyStore } from '../../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { karta, tekstTytul, tekstPodtytul } from '../../../src/constants/layout';
import { komentarzPlanuBudowy, tytulPlanuBudowy } from '../../../src/utils/planZBudowy';
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

  const potwierdźUsunięcie = (plan: Plan) => Alert.alert(
    'Usuń plan',
    `Usunąć „${tytulPlanuBudowy(plan)}”?`,
    [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => usunPlan(plan.id) },
    ],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={budowa.kodBudowy}
        podtytul={budowa.nazwaInwestycji}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[karta, { backgroundColor: `${theme.colors.primary}14`, borderColor: theme.colors.primary }]}
          onPress={() => router.push({ pathname: '/plan/nowy', params: { budowaId: budowa.id } } as any)}
        >
          <Text style={[tekstTytul, { color: theme.colors.primary }]}>Dodaj nowy plan</Text>
          <Text style={[tekstPodtytul, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Data, obszar, kilometraż, warstwa i recepta z projektu budowy.
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sekcja, { color: theme.colors.textSecondary }]}>
          Zapisane ({zapisane.length})
        </Text>
        {zapisane.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
            Brak zapisanych planów tej budowy.
          </Text>
        ) : zapisane.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push(`/plan/${item.id}` as any)}
          >
            <View style={styles.kartaNaglowek}>
              <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
                {tytulPlanuBudowy(item)}
              </Text>
              <TouchableOpacity onPress={() => potwierdźUsunięcie(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 13 }}>Usuń</Text>
              </TouchableOpacity>
            </View>
            <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {komentarzPlanuBudowy(item) || `${item.dzialki.length} działki`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  sekcja: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginTop: 8, marginBottom: 8, textTransform: 'uppercase' },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8, alignItems: 'center' },
});
