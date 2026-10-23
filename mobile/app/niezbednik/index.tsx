// ============================================================
// NIEZBĘDNIK MASIARZA – menu kalkulatorów
// ============================================================

import React from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { PozycjaListy } from '../../src/components/ui/Karta';

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
          <PozycjaListy
            key={k.id}
            tytul={k.tytul}
            podtytul={k.podtytul}
            ikona={k.ikona}
            kolor={k.kolor}
            onPress={() => router.push(k.sciezka as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 10 },
});
