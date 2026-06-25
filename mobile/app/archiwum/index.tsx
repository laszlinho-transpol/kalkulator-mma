// ============================================================
// EKRAN: ARCHIWUM – zakończone roboty pogrupowane po budowach
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { AppHeader } from '../../src/components/common/AppHeader';
import { grupujPoKluczu } from '../../src/utils/grouping';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import type { Plan } from '../../src/types';

export default function ArchiwumScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany } = usePlanyStore();
  const { budowy } = useBudowyStore();
  const { wpisyDlaPlanu } = useLiveStore();
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const grupy = useMemo(() => {
    const posortowane = [...archiwalne].sort(
      (a, b) => new Date(b.dataWbudowywania).getTime() - new Date(a.dataWbudowywania).getTime(),
    );
    const zKluczem = posortowane.map((p) => {
      const b = p.budowaId ? budowy.find((x) => x.id === p.budowaId) : undefined;
      const klucz = b ? `${b.kodBudowy} – ${b.nazwaInwestycji}` : undefined;
      return { plan: p, kluczGrupy: klucz };
    });
    return grupujPoKluczu(zKluczem, (x) => x.kluczGrupy, 'Archiwum bez budowy').map((g) => ({
      ...g,
      elementy: g.elementy.map((x) => x.plan),
    }));
  }, [archiwalne, budowy]);

  const renderujPlan = (item: Plan) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);

    return (
      <TouchableOpacity
        key={item.id}
        style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/archiwum/${item.id}` as any)}
      >
        <View style={styles.kartaNaglowek}>
          <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
            {formatujDate(item.dataWbudowywania)}
          </Text>
          <View style={[styles.znaczekZakonczone, { backgroundColor: `${theme.colors.textSecondary}20` }]}>
            <Text style={[styles.znaczekTekst, { color: theme.colors.textSecondary }]}>✓ Zakończone</Text>
          </View>
        </View>
        {wpisy.length > 0 && (
          <Text style={[styles.kartaSuma, { color: theme.colors.primary }]}>
            {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
          </Text>
        )}
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'} • Dotknij, aby zobaczyć raport
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Archiwum" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />

      {archiwalne.length === 0 ? (
        <EmptyState
          ikona="📁"
          tytul="Archiwum jest puste"
          opis="Po zakończeniu realizacji planu (przycisk „Zakończ i archiwizuj” w trybie Live) trafi on tutaj automatycznie."
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {grupy.map((grupa) => (
            <CollapsibleSection
              key={grupa.klucz}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏗️"
              plaski={grupa.bezPrzypisania}
            >
              {grupa.elementy.map(renderujPlan)}
            </CollapsibleSection>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  znaczekZakonczone: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  znaczekTekst: { fontSize: 11, fontWeight: '600' },
  kartaSuma: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
});
