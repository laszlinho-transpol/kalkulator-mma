// ============================================================
// EKRAN: ARCHIWUM – zakończone roboty, raporty PDF
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
} from 'react-native';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import type { Plan } from '../../src/types';

export default function ArchiwumScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { plany } = usePlanyStore();
  const { wpisyDlaPlanu } = useLiveStore();
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const renderujPlan = ({ item, index }: { item: Plan; index: number }) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);

    return (
      <AnimatedCard key={item.id} delay={index * 70}>
      <TouchableOpacity
        style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/archiwum/${item.id}` as any)}
      >
        <View style={styles.kartaNaglowek}>
          <Text style={[styles.kartaData, { color: theme.colors.text }]}>
            {formatujDate(item.dataWbudowywania)}
          </Text>
          <View style={[styles.znaczekZakonczone, { backgroundColor: `${theme.colors.textSecondary}20` }]}>
            <Text style={[styles.znaczekTekst, { color: theme.colors.textSecondary }]}>✓ Zakończone</Text>
          </View>
        </View>
        {wpisy.length > 0 && (
          <Text style={[styles.kartaSuma, { color: theme.colors.textSecondary }]}>
            {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
          </Text>
        )}
        <Text style={[styles.kartaInfo, { color: theme.colors.textSecondary }]}>
          {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'} • Dotknij, aby zobaczyć szczegóły
        </Text>
      </TouchableOpacity>
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Archiwum</Text>
        <View style={{ width: 60 }} />
      </View>

      {archiwalne.length === 0 ? (
        <EmptyState
          ikona="📁"
          tytul="Archiwum jest puste"
          opis="Po zakończeniu realizacji planu (przycisk 'Zakończ i Archiwizuj') trafi on tutaj automatycznie."
        />
      ) : (
        <FlatList
          data={archiwalne}
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
  lista: { padding: 16, gap: 12 },
  karta: { borderRadius: 14, padding: 16, borderWidth: 1 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kartaData: { fontSize: 16, fontWeight: '700', flex: 1 },
  znaczekZakonczone: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  znaczekTekst: { fontSize: 12, fontWeight: '600' },
  kartaSuma: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  kartaInfo: { fontSize: 13 },
  puste: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pusteIkona: { fontSize: 56, marginBottom: 16 },
  pusteTytul: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  pusteOpis: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
