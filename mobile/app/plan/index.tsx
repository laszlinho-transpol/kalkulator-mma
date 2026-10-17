// ============================================================
// EKRAN: ZAPLANUJ MASĘ – lista budów (nowe budowy tylko w menu Budowa)
// ============================================================

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { PozycjaListy, TYPOGRAFIA } from '../../src/components/ui';

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
          <View style={styles.naglowekListy}>
            <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, flex: 1 }]}>Budowy</Text>
            <InfoTooltip tresc="Wybierz budowę, aby dodać nowy plan albo otworzyć zapisane." />
          </View>
          {budowyAktywne.map((b) => {
            const n = aktywne.filter((p) => p.budowaId === b.id).length;
            const ark = b.projekt?.arkusze.length ?? 0;
            return (
              <PozycjaListy
                key={b.id}
                ikona="🏗️"
                kolor="#2E86AB"
                tytul={`${b.kodBudowy} · ${b.nazwaInwestycji}`}
                podtytul={`${n} ${n === 1 ? 'plan' : 'planów'} · arkusze PZT: ${ark}`}
                accessibilityLabel={`Budowa ${b.kodBudowy}`}
                onPress={() => router.push(`/plan/budowa/${b.id}` as never)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: 10 },
  naglowekListy: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
});
