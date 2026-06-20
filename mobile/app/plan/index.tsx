// ============================================================
// EKRAN: ZAPLANUJ MASĘ – lista planów aktywnych
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import { AppHeader } from '../../src/components/common/AppHeader';
import type { Plan } from '../../src/types';

export default function PlanListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany, usunPlan } = usePlanyStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');

  const formatujDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

  const potwierdźUsunięcie = (plan: Plan) => Alert.alert('Usuń plan', `Usunąć plan z ${formatujDate(plan.dataWbudowywania)}?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunPlan(plan.id) },
  ]);

  const renderujPlan = ({ item, index }: { item: Plan; index: number }) => (
    <AnimatedCard delay={index * 70}>
      <TouchableOpacity
        style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/plan/${item.id}` as any)}
      >
        <View style={styles.kartaNaglowek}>
          <Text style={[styles.kartaData, { color: theme.colors.text }]}>{formatujDate(item.dataWbudowywania)}</Text>
          <TouchableOpacity onPress={() => potwierdźUsunięcie(item)}>
            <Text style={[styles.usunTekst, { color: theme.colors.danger }]}>Usuń</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.kartaInfo, { color: theme.colors.textSecondary }]}>
          {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'} • Tonaż auta: {item.tonazAuta} t
        </Text>
      </TouchableOpacity>
    </AnimatedCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Zaplanuj Masę"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '↓ Import JSON', onPress: () => router.push('/plan/import' as any), kolor: theme.colors.secondary },
          { tekst: '+ Nowy plan', onPress: () => router.push('/plan/nowy' as any), kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {aktywne.length === 0 ? (
        <EmptyState
          ikona="📋"
          tytul="Brak aktywnych planów"
          opis="Utwórz nowy plan wbudowywania lub zaimportuj istniejący z JSON."
          przyciskTekst="+ Utwórz nowy plan"
          onPrzycisk={() => router.push('/plan/nowy' as any)}
          drugPrzyciskTekst="↓ Importuj z JSON"
          onDrugPrzycisk={() => router.push('/plan/import' as any)}
        />
      ) : (
        <FlatList
          data={aktywne}
          keyExtractor={(item) => item.id}
          renderItem={renderujPlan}
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 16, borderWidth: 1 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  kartaData: { fontSize: 16, fontWeight: '700', flex: 1 },
  usunTekst: { fontSize: 14, fontWeight: '600' },
  kartaInfo: { fontSize: 13 },
});
