// ============================================================
// EKRAN: ZAPLANUJ MASĘ – lista budów (nowe budowy tylko w menu Budowa)
// ============================================================

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';

export default function PlanListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany } = usePlanyStore();
  const { budowy } = useBudowyStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const budowyAktywne = budowy.filter((b) => b.status !== 'archiwalna');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Zaplanuj masę"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />

      {budowyAktywne.length === 0 ? (
        <EmptyState
          ikona="🏗️"
          tytul="Brak budów"
          opis="Nowe inwestycje tworzysz tylko w menu Budowa. Potem wróć tutaj, wybierz budowę i zaplanuj masę."
          przyciskTekst="Przejdź do Budowa"
          onPrzycisk={() => router.push('/budowa' as any)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1 }}>Budowy</Text>
            <InfoTooltip tresc="Wybierz budowę, aby dodać nowy plan albo otworzyć zapisane." />
          </View>
          {budowyAktywne.map((b) => {
            const n = aktywne.filter((p) => p.budowaId === b.id).length;
            const ark = b.projekt?.arkusze.length ?? 0;
            return (
              <TouchableOpacity
                key={b.id}
                style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push(`/plan/budowa/${b.id}` as any)}
              >
                <Text style={[tekstTytul, { color: theme.colors.text }]}>{b.kodBudowy}</Text>
                <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {b.nazwaInwestycji}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
                  {n} {n === 1 ? 'plan' : 'planów'} · {ark} arkusz(y) PZT
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
});
