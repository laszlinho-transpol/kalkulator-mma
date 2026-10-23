// ============================================================
// EKRAN GŁÓWNY – kafelki nawigacyjne z animacjami
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  useColorScheme, Animated, Image,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { lightTheme, darkTheme, type AppTheme } from '../src/constants/theme';
import { AnimatedCounter } from '../src/components/common/AnimatedCounter';
import { KafelekMenu } from '../src/components/ui/KafelekMenu';
import { PrzyciskIkony } from '../src/components/ui/Przycisk';
import { cien } from '../src/constants/styl';


interface Kafelek {
  id: string;
  tytul: string;
  podtytul: string;
  ikona: string;
  sciezka: string;
  kolor: string;
  delay: number;
}

// Ikony: rozkładarka jako emoji zastępcze (ikona SVG jest w assets/svg/)
const KAFELKI: Kafelek[] = [
  { id: 'budowa', tytul: 'Budowa', podtytul: 'PZT · projekt · przedmiar', ikona: '🏗️', sciezka: '/budowa', kolor: '#C2410C', delay: 0 },
  { id: 'mieszanki', tytul: 'Mieszanki', podtytul: 'Baza MMA', ikona: '🏭', sciezka: '/mieszanki', kolor: '#E8A020', delay: 80 },
  { id: 'harmonogram', tytul: 'Harmonogram', podtytul: 'Plan tygodnia · TK', ikona: '📅', sciezka: '/harmonogram', kolor: '#2E86AB', delay: 160 },
  { id: 'wbudowywanie', tytul: 'Wbudowywanie', podtytul: 'Live Tracker', ikona: '🛣️', sciezka: '/wbudowywanie', kolor: '#22C55E', delay: 240 },
  { id: 'archiwum', tytul: 'Archiwum', podtytul: 'Raporty', ikona: '📁', sciezka: '/archiwum', kolor: '#8B5CF6', delay: 320 },
  { id: 'budzet', tytul: 'Budżet', podtytul: 'Sprzęt · pracownicy · firmy', ikona: '💰', sciezka: '/budzet', kolor: '#B45309', delay: 400 },
];

const NIEZBEDNIK: Kafelek[] = [
  { id: 'obmiar', tytul: 'Obmiar PZT', podtytul: 'Obszary · skala · LIVE', ikona: '🗺️', sciezka: '/obmiar', kolor: '#0D9488', delay: 0 },
  { id: 'masa', tytul: 'Masa i sprzęt', podtytul: 'Szybkie sprawdzenie', ikona: '🧮', sciezka: '/niezbednik/masa', kolor: '#E8A020', delay: 80 },
  { id: 'geodezja', tytul: 'Geodezja i pomiary', podtytul: 'Pomiary niwelatorem', ikona: '📐', sciezka: '/niezbednik/geodezja', kolor: '#2E86AB', delay: 160 },
  { id: 'notatnik', tytul: 'Notatnik', podtytul: 'Brudnopis drogowca', ikona: '📝', sciezka: '/niezbednik/notatnik', kolor: '#8B5CF6', delay: 240 },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const plany = usePlanyStore((s) => s.plany);
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Nagłówek z bezpiecznym marginesem */}
      <Animated.View
        style={[
          styles.naglowek,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 },
          { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
        ]}
      >
        <View style={{ width: 40 }} />
        <View style={styles.naglowekSrodek}>
          <Image source={require('../assets/icon.png')} style={styles.ikonaApp} />
          <Text style={[styles.logoTekst, { color: theme.colors.text }]}>Kalkulator MMA</Text>
          <Text style={[styles.logoOpis, { color: theme.colors.textSecondary }]}>Niezbędnik masiarza</Text>
        </View>
        <PrzyciskIkony
          ikona="ustawienia"
          accessibilityLabel="Ustawienia"
          onPress={() => router.push('/ustawienia' as never)}
          kolor={theme.colors.textSecondary}
          tlo={`${theme.colors.textSecondary}14`}
          rozmiar={40}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Statystyki */}
        <Animated.View style={[styles.statystykiRzad, { opacity: headerAnim }]}>
          <StatKarta liczba={mieszanki.length} opis={'Ilość\nMieszanek'} theme={theme} kolor={theme.colors.text} delay={100} />
          <StatKarta liczba={aktywne.length} opis={'Aktywne'} theme={theme} kolor={theme.colors.success} delay={200} />
          <StatKarta liczba={archiwalne.length} opis={'Archiwum'} theme={theme} kolor={theme.colors.textSecondary} delay={300} />
        </Animated.View>

        {/* Kafelki */}
        <View style={styles.siatkaDuza}>
          {KAFELKI.map((k) => (
            <KafelekMenu
              key={k.id}
              tytul={k.tytul}
              podtytul={k.podtytul}
              ikona={k.ikona}
              kolor={k.kolor}
              opoznienie={200 + k.delay}
              onPress={() => router.push(k.sciezka as never)}
            />
          ))}
        </View>

        <View style={[styles.separator, { borderColor: theme.colors.border }]}>
          <View style={[styles.sepLinia, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sepTekst, { color: theme.colors.textSecondary }]}>Niezbędnik masiarza</Text>
          <View style={[styles.sepLinia, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={styles.siatkaDuza}>
          {NIEZBEDNIK.map((k) => (
            <KafelekMenu
              key={k.id}
              tytul={k.tytul}
              podtytul={k.podtytul}
              ikona={k.ikona}
              kolor={k.kolor}
              opoznienie={500 + k.delay}
              onPress={() => router.push(k.sciezka as never)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatKarta({ liczba, opis, theme, kolor, delay }: {
  liczba: number; opis: string; theme: AppTheme; kolor: string; delay: number;
}) {
  return (
    <View style={[styles.statystykiKarta, cien(theme), { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <AnimatedCounter wartosc={liczba} czas={800} delay={delay} style={{ ...styles.statystykiLiczba, color: kolor }} />
      <Text style={[styles.statystykiOpis, { color: theme.colors.textSecondary }]}>{opis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  naglowekSrodek: { flex: 1, alignItems: 'center', gap: 4 },
  ikonaApp: { width: 44, height: 44, borderRadius: 12 },
  logoTekst: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  logoOpis: { fontSize: 12, letterSpacing: 0.3 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sepLinia: { flex: 1, height: 1 },
  sepTekst: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  zawartosc: { padding: 14, gap: 14 },
  statystykiRzad: { flexDirection: 'row', gap: 10 },
  statystykiKarta: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
  statystykiLiczba: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  statystykiOpis: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  siatkaDuza: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
