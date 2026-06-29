// ============================================================
// NIEZBĘDNIK MASIARZA – menu kalkulatorów
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { AppHeader } from '../../src/components/common/AppHeader';

const KAFELKI = [
  { id: 'masa', tytul: 'Masa i sprzęt', podtytul: 'Szybkie sprawdzenie', ikona: '🧮', sciezka: '/niezbednik/masa', kolor: '#E8A020' },
  { id: 'geodezja', tytul: 'Geodezja i pomiary', podtytul: 'Pomiary niwelatorem', ikona: '📐', sciezka: '/niezbednik/geodezja', kolor: '#2E86AB' },
  { id: 'notatnik', tytul: 'Notatnik', podtytul: 'Brudnopis drogowca', ikona: '📝', sciezka: '/niezbednik/notatnik', kolor: '#8B5CF6' },
];

export default function NiezbednikScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Niezbędnik masiarza" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 16 }]}>
        {KAFELKI.map((k) => (
          <TouchableOpacity
            key={k.id}
            style={[styles.kafelek, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push(k.sciezka as any)}
          >
            <View style={[styles.ikonaTlo, { backgroundColor: `${k.kolor}20` }]}>
              <Text style={styles.ikona}>{k.ikona}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tytul, { color: theme.colors.text }]} numberOfLines={2}>{k.tytul}</Text>
              <Text style={[styles.podtytul, { color: k.kolor }]} numberOfLines={2}>{k.podtytul}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  kafelek: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 16 },
  ikonaTlo: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ikona: { fontSize: 28 },
  tytul: { fontSize: 16, fontWeight: '700' },
  podtytul: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
