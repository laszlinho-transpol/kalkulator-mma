// ============================================================
// EKRAN: WBUDOWYWANIE – lista aktywnych planów (realizacja)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import { AppHeader } from '../../src/components/common/AppHeader';
import type { Plan } from '../../src/types';

export default function WbudowywanieScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany } = usePlanyStore();
  const { wpisyDlaPlanu } = useLiveStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');

  const formatujDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });

  const renderujPlan = ({ item, index }: { item: Plan; index: number }) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);

    return (
      <AnimatedCard key={item.id} delay={index * 70}>
        <TouchableOpacity
          style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => router.push(`/wbudowywanie/${item.id}` as any)}
        >
          <View style={[styles.pasekStatusu, { backgroundColor: theme.colors.success }]} />
          <View style={styles.kartaZawartosc}>
            <View style={styles.kartaNaglowek}>
              <Text style={[styles.kartaData, { color: theme.colors.text }]}>{formatujDate(item.dataWbudowywania)}</Text>
              <View style={[styles.znaczekAktywny, { backgroundColor: `${theme.colors.success}20` }]}>
                <Text style={[styles.znaczekTekst, { color: theme.colors.success }]}>● Aktywny</Text>
              </View>
            </View>
            <Text style={[styles.kartaInfo, { color: theme.colors.textSecondary }]}>{item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'}</Text>
            {wpisy.length > 0 && (
              <Text style={[styles.postepTekst, { color: theme.colors.primary }]}>
                {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Wbudowywanie"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />

      {aktywne.length === 0 ? (
        <EmptyState
          ikona="🛣️"
          tytul="Brak aktywnych planów"
          opis="Najpierw utwórz plan w sekcji Zaplanuj Masę. Aktywne plany pojawią się tutaj."
          przyciskTekst="Przejdź do planowania"
          onPrzycisk={() => router.push('/plan')}
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
  karta: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  pasekStatusu: { width: 4 },
  kartaZawartosc: { flex: 1, padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kartaData: { fontSize: 15, fontWeight: '700', flex: 1 },
  znaczekAktywny: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  znaczekTekst: { fontSize: 12, fontWeight: '600' },
  kartaInfo: { fontSize: 13, marginBottom: 4 },
  postepTekst: { fontSize: 13, fontWeight: '600' },
});
