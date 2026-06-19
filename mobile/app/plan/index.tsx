// ============================================================
// EKRAN: ZAPLANUJ MASĘ – lista planów aktywnych + przycisk nowy
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import type { Plan } from '../../src/types';

export default function PlanListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { plany, usunPlan } = usePlanyStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');

  const formatujDate = (isoDate: string): string => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const potwierdźUsunięcie = (plan: Plan) => {
    Alert.alert(
      'Usuń plan',
      `Czy na pewno chcesz usunąć plan z ${formatujDate(plan.dataWbudowywania)}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń', style: 'destructive', onPress: () => usunPlan(plan.id) },
      ],
    );
  };

  const renderujPlan = ({ item }: { item: Plan }) => (
    <TouchableOpacity
      style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/plan/${item.id}` as any)}
    >
      <View style={styles.kartaNaglowek}>
        <Text style={[styles.kartaData, { color: theme.colors.text }]}>
          {formatujDate(item.dataWbudowywania)}
        </Text>
        <TouchableOpacity onPress={() => potwierdźUsunięcie(item)}>
          <Text style={[styles.usunTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.kartaInfo, { color: theme.colors.textSecondary }]}>
        {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'}
        {' • '}Tonaż auta: {item.tonazAuta} t
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Zaplanuj Masę</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.przyciskNowy, { backgroundColor: theme.colors.secondary }]}
            onPress={() => router.push('/plan/import' as any)}
          >
            <Text style={styles.przyciskNowyTekst}>↓ Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.przyciskNowy, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/plan/nowy' as any)}
          >
            <Text style={styles.przyciskNowyTekst}>+ Nowy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {aktywne.length === 0 ? (
        <View style={styles.puste}>
          <Text style={styles.pusteIkona}>📋</Text>
          <Text style={[styles.pusteTytul, { color: theme.colors.text }]}>Brak aktywnych planów</Text>
          <Text style={[styles.pusteOpis, { color: theme.colors.textSecondary }]}>
            Utwórz nowy plan, aby zaplanować dzień wbudowywania.
          </Text>
          <TouchableOpacity
            style={[styles.przyciskPuste, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/plan/nowy' as any)}
          >
            <Text style={styles.przyciskPusteTekst}>Utwórz pierwszy plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={aktywne}
          keyExtractor={(item) => item.id}
          renderItem={renderujPlan}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  wstecz: { fontSize: 17 },
  tytul: { fontSize: 17, fontWeight: '700' },
  przyciskNowy: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  przyciskNowyTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
  lista: { padding: 16, gap: 12 },
  karta: { borderRadius: 14, padding: 16, borderWidth: 1 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  kartaData: { fontSize: 16, fontWeight: '700', flex: 1 },
  usunTekst: { fontSize: 14, fontWeight: '600' },
  kartaInfo: { fontSize: 13 },
  puste: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pusteIkona: { fontSize: 56, marginBottom: 16 },
  pusteTytul: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  pusteOpis: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  przyciskPuste: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  przyciskPusteTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
