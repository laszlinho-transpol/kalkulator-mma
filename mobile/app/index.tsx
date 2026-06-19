// ============================================================
// EKRAN GŁÓWNY – 4 kafelki nawigacyjne
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { lightTheme, darkTheme } from '../src/constants/theme';

interface Kafelek {
  id: string;
  tytul: string;
  podtytul: string;
  ikona: string;
  sciezka: string;
  kolor: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const plany = usePlanyStore((s) => s.plany);
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');

  const kafelki: Kafelek[] = [
    {
      id: 'mieszanki',
      tytul: 'Mieszanki',
      podtytul: 'Baza MMA',
      ikona: '🧱',
      sciezka: '/mieszanki',
      kolor: '#E8A020',
    },
    {
      id: 'plan',
      tytul: 'Zaplanuj\nMasę',
      podtytul: 'Zaplanuj dzień',
      ikona: '📋',
      sciezka: '/plan',
      kolor: '#2E86AB',
    },
    {
      id: 'wbudowywanie',
      tytul: 'Wbudowywanie',
      podtytul: 'Live Tracker',
      ikona: '🚧',
      sciezka: '/wbudowywanie',
      kolor: '#22C55E',
    },
    {
      id: 'archiwum',
      tytul: 'Archiwum',
      podtytul: 'Raporty',
      ikona: '📁',
      sciezka: '/archiwum',
      kolor: '#8B5CF6',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.logoTekst, { color: theme.colors.primary }]}>⬛ MMA</Text>
        <Text style={[styles.logoOpis, { color: theme.colors.textSecondary }]}>
          Kalkulator Mieszanek Asfaltowych
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.zawartosc}
        showsVerticalScrollIndicator={false}
      >
        {/* Statystyki */}
        <View style={styles.statystykiRzad}>
          <View style={[styles.statystykiKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statystykiLiczba, { color: theme.colors.text }]}>
              {mieszanki.length}
            </Text>
            <Text style={[styles.statystykiOpis, { color: theme.colors.textSecondary }]}>
              Ilość{'\n'}Mieszanek
            </Text>
          </View>
          <View style={[styles.statystykiKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statystykiLiczba, { color: theme.colors.success }]}>
              {aktywne.length}
            </Text>
            <Text style={[styles.statystykiOpis, { color: theme.colors.textSecondary }]}>
              Aktywne
            </Text>
          </View>
          <View style={[styles.statystykiKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statystykiLiczba, { color: theme.colors.textSecondary }]}>
              {archiwalne.length}
            </Text>
            <Text style={[styles.statystykiOpis, { color: theme.colors.textSecondary }]}>
              Archiwum
            </Text>
          </View>
        </View>

        {/* Kafelki nawigacyjne */}
        <View style={styles.siatkaDuza}>
          {kafelki.map((kafelek) => (
            <TouchableOpacity
              key={kafelek.id}
              style={[
                styles.kafelek,
                {
                  backgroundColor: theme.colors.tileBackground,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.tileShadow,
                },
              ]}
              onPress={() => router.push(kafelek.sciezka as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.ikonaTlo, { backgroundColor: `${kafelek.kolor}20` }]}>
                <Text style={styles.ikona}>{kafelek.ikona}</Text>
              </View>
              <Text
                style={[styles.kafelekTytul, { color: theme.colors.text }]}
                numberOfLines={2}
                adjustsFontSizeToFit={false}
              >
                {kafelek.tytul}
              </Text>
              <Text style={[styles.kafelekPodtytul, { color: kafelek.kolor }]}>
                {kafelek.podtytul}
              </Text>
              <View style={[styles.pasekKoloru, { backgroundColor: kafelek.kolor }]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  naglowek: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  logoTekst: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoOpis: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  zawartosc: {
    padding: 16,
    gap: 16,
  },
  statystykiRzad: {
    flexDirection: 'row',
    gap: 10,
  },
  statystykiKarta: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statystykiLiczba: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  statystykiOpis: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  siatkaDuza: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kafelek: {
    width: '47.5%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'space-between',
  },
  ikonaTlo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ikona: {
    fontSize: 26,
  },
  kafelekTytul: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
  },
  kafelekPodtytul: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
  },
  pasekKoloru: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
