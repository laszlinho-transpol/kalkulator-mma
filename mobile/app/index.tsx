// ============================================================
// EKRAN GŁÓWNY – 4 kafelki nawigacyjne z animacjami
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useColorScheme, Animated, Dimensions, Image,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { lightTheme, darkTheme, type AppTheme } from '../src/constants/theme';
import { AnimatedCounter } from '../src/components/common/AnimatedCounter';

const { width: SCREEN_W } = Dimensions.get('window');

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
  { id: 'mieszanki', tytul: 'Mieszanki', podtytul: 'Baza MMA', ikona: '🏭', sciezka: '/mieszanki', kolor: '#E8A020', delay: 0 },
  { id: 'plan', tytul: 'Zaplanuj Masę', podtytul: 'Zaplanuj dzień', ikona: '📋', sciezka: '/plan', kolor: '#2E86AB', delay: 80 },
  { id: 'wbudowywanie', tytul: 'Wbudowywanie', podtytul: 'Live Tracker', ikona: '🛣️', sciezka: '/wbudowywanie', kolor: '#22C55E', delay: 160 },
  { id: 'archiwum', tytul: 'Archiwum', podtytul: 'Raporty', ikona: '📁', sciezka: '/archiwum', kolor: '#8B5CF6', delay: 240 },
];

const NIEZBEDNIK: Kafelek[] = [
  { id: 'obmiar', tytul: 'Obmiar PZT', podtytul: 'XFDF · obszary · kolejność', ikona: '🗺️', sciezka: '/obmiar', kolor: '#0D9488', delay: 0 },
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

  const animacje = useRef(KAFELKI.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
    scale: new Animated.Value(1),
  }))).current;
  const animacjeNz = useRef(NIEZBEDNIK.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
    scale: new Animated.Value(1),
  }))).current;

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    KAFELKI.forEach((k, idx) => {
      Animated.parallel([
        Animated.timing(animacje[idx].opacity, { toValue: 1, duration: 400, delay: 200 + k.delay, useNativeDriver: true }),
        Animated.spring(animacje[idx].translateY, { toValue: 0, delay: 200 + k.delay, useNativeDriver: true, friction: 8, tension: 80 }),
      ]).start();
    });
    NIEZBEDNIK.forEach((k, idx) => {
      Animated.parallel([
        Animated.timing(animacjeNz[idx].opacity, { toValue: 1, duration: 400, delay: 500 + k.delay, useNativeDriver: true }),
        Animated.spring(animacjeNz[idx].translateY, { toValue: 0, delay: 500 + k.delay, useNativeDriver: true, friction: 8, tension: 80 }),
      ]).start();
    });
  }, []);

  const handleKafelekPress = (kafelek: Kafelek, idx: number, animSet = animacje) => {
    Animated.sequence([
      Animated.spring(animSet[idx].scale, { toValue: 0.95, useNativeDriver: true, speed: 60 }),
      Animated.spring(animSet[idx].scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    setTimeout(() => router.push(kafelek.sciezka as any), 80);
  };

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
        <View style={{ width: 44 }} />
        <View style={styles.naglowekSrodek}>
          <Image source={require('../assets/icon.png')} style={styles.ikonaApp} />
          <Text style={[styles.logoTekst, { color: theme.colors.text }]}>Kalkulator MMA</Text>
          <Text style={[styles.logoOpis, { color: theme.colors.textSecondary }]}>Niezbędnik masiarza</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/ustawienia' as any)} style={styles.btnUstawienia}>
          <Text style={[styles.btnUstawieniaTekst, { color: theme.colors.textSecondary }]}>⚙</Text>
        </TouchableOpacity>
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
          {KAFELKI.map((kafelek, idx) => (
            <Animated.View
              key={kafelek.id}
              style={{
                opacity: animacje[idx].opacity,
                transform: [{ translateY: animacje[idx].translateY }, { scale: animacje[idx].scale }],
                width: '47.5%',
              }}
            >
              <TouchableOpacity
                style={[styles.kafelek, { backgroundColor: theme.colors.tileBackground, borderColor: theme.colors.border }]}
                onPress={() => handleKafelekPress(kafelek, idx)}
                activeOpacity={1}
              >
                <View style={[styles.ikonaTlo, { backgroundColor: `${kafelek.kolor}20` }]}>
                  <Text style={styles.ikona}>{kafelek.ikona}</Text>
                </View>
                <Text
                  style={[styles.kafelekTytul, { color: theme.colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {kafelek.tytul}
                </Text>
                <Text style={[styles.kafelekPodtytul, { color: kafelek.kolor }]} numberOfLines={1}>
                  {kafelek.podtytul}
                </Text>
                <View style={[styles.pasekKoloru, { backgroundColor: kafelek.kolor }]} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.separator, { borderColor: theme.colors.border }]}>
          <View style={[styles.sepLinia, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sepTekst, { color: theme.colors.textSecondary }]}>Niezbędnik masiarza</Text>
          <View style={[styles.sepLinia, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={styles.siatkaDuza}>
          {NIEZBEDNIK.map((kafelek, idx) => (
            <Animated.View
              key={kafelek.id}
              style={{
                opacity: animacjeNz[idx].opacity,
                transform: [{ translateY: animacjeNz[idx].translateY }, { scale: animacjeNz[idx].scale }],
                width: '47.5%',
              }}
            >
              <TouchableOpacity
                style={[styles.kafelek, { backgroundColor: theme.colors.tileBackground, borderColor: theme.colors.border }]}
                onPress={() => handleKafelekPress(kafelek, idx, animacjeNz)}
                activeOpacity={1}
              >
                <View style={[styles.ikonaTlo, { backgroundColor: `${kafelek.kolor}20` }]}>
                  <Text style={styles.ikona}>{kafelek.ikona}</Text>
                </View>
                <Text style={[styles.kafelekTytul, { color: theme.colors.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{kafelek.tytul}</Text>
                <Text style={[styles.kafelekPodtytul, { color: kafelek.kolor }]} numberOfLines={2}>{kafelek.podtytul}</Text>
                <View style={[styles.pasekKoloru, { backgroundColor: kafelek.kolor }]} />
              </TouchableOpacity>
            </Animated.View>
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
    <View style={[styles.statystykiKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
  btnUstawienia: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btnUstawieniaTekst: { fontSize: 22 },
  zawartosc: { padding: 14, gap: 14 },
  statystykiRzad: { flexDirection: 'row', gap: 10 },
  statystykiKarta: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statystykiLiczba: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  statystykiOpis: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  siatkaDuza: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kafelek: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#00000015',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 148,
    justifyContent: 'space-between',
  },
  ikonaTlo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ikona: { fontSize: 26 },
  kafelekTytul: { fontSize: 16, fontWeight: '700', lineHeight: 20, flex: 1 },
  kafelekPodtytul: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 10 },
  pasekKoloru: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});
