import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { wstecz } from '../../src/budzet/nawigacja';

const KAFELKI = [
  { tytul: 'Sprzęt', podtytul: 'Maszyny i raporty', ikona: '🚜', sciezka: '/budzet/sprzet', kolor: '#B45309' },
  { tytul: 'Pracownicy', podtytul: 'Osoby do raportów', ikona: '👷', sciezka: '/budzet/pracownicy', kolor: '#2E86AB' },
  { tytul: 'Firmy', podtytul: 'Z kart sprzętu', ikona: '🏢', sciezka: '/budzet/firmy', kolor: '#0D9488' },
  { tytul: 'Grupa bitumiczna', podtytul: 'W kolejnym kroku', ikona: '🛣️', sciezka: '/budzet/grupa-bitumiczna', kolor: '#8B5CF6' },
];

export default function BudzetScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Budżet"
        podtytul="Sprzęt, ludzie i firmy"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/') }}
      />
      <ScrollView contentContainerStyle={[styles.siatka, { paddingBottom: insets.bottom + 24 }]}>
        {KAFELKI.map((kafelek) => (
          <TouchableOpacity
            key={kafelek.tytul}
            accessibilityLabel={kafelek.tytul}
            style={[styles.kafelek, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push(kafelek.sciezka as never)}
          >
            <View style={[styles.ikonaTlo, { backgroundColor: `${kafelek.kolor}20` }]}>
              <Text style={styles.ikona}>{kafelek.ikona}</Text>
            </View>
            <Text style={[styles.tytul, { color: theme.colors.text }]}>{kafelek.tytul}</Text>
            <Text style={[styles.podtytul, { color: kafelek.kolor }]}>{kafelek.podtytul}</Text>
            <View style={[styles.pasek, { backgroundColor: kafelek.kolor }]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  siatka: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16, gap: 12 },
  kafelek: { width: '47%', borderRadius: 16, borderWidth: 1, padding: 14, minHeight: 148, overflow: 'hidden' },
  ikonaTlo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ikona: { fontSize: 26 },
  tytul: { fontSize: 16, fontWeight: '800' },
  podtytul: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  pasek: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
});
