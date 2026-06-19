// ============================================================
// EKRAN GŁÓWNY – 4 kafelki nawigacyjne z animacjami
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useColorScheme, SafeAreaView, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

const KAFELKI: Kafelek[] = [
  { id: 'mieszanki', tytul: 'Mieszanki', podtytul: 'Baza MMA', ikona: '🧱', sciezka: '/mieszanki', kolor: '#E8A020', delay: 0 },
  { id: 'plan', tytul: 'Zaplanuj\nMasę', podtytul: 'Zaplanuj dzień', ikona: '📋', sciezka: '/plan', kolor: '#2E86AB', delay: 80 },
  { id: 'wbudowywanie', tytul: 'Wbudowywanie', podtytul: 'Live Tracker', ikona: '🚧', sciezka: '/wbudowywanie', kolor: '#22C55E', delay: 160 },
  { id: 'archiwum', tytul: 'Archiwum', podtytul: 'Raporty', ikona: '📁', sciezka: '/archiwum', kolor: '#8B5CF6', delay: 240 },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const plany = usePlanyStore((s) => s.plany);
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');

  // Animacje kafelków
  const animacje = useRef(KAFELKI.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
    scale: new Animated.Value(1),
  }))).current;

  // Animacja nagłówka
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Nagłówek
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Kafelki kaskadowo
    KAFELKI.forEach((k, idx) => {
      Animated.parallel([
        Animated.timing(animacje[idx].opacity, {
          toValue: 1,
          duration: 400,
          delay: 200 + k.delay,
          useNativeDriver: true,
        }),
        Animated.spring(animacje[idx].translateY, {
          toValue: 0,
          delay: 200 + k.delay,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }),
      ]).start();
    });
  }, []);

  const handleKafelekPress = (kafelek: Kafelek, idx: number) => {
    // Animacja "wciśnięcia"
    Animated.sequence([
      Animated.spring(animacje[idx].scale, { toValue: 0.95, useNativeDriver: true, speed: 60 }),
      Animated.spring(animacje[idx].scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    setTimeout(() => router.push(kafelek.sciezka as any), 80);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Nagłówek z animacją */}
      <Animated.View
        style={[
          styles.naglowek,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
          { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
        ]}
      >
        <Text style={[styles.logoTekst, { color: theme.colors.primary }]}>⬛ MMA</Text>
        <Text style={[styles.logoOpis, { color: theme.colors.textSecondary }]}>
          Kalkulator Mieszanek Asfaltowych
        </Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.zawartosc}
        showsVerticalScrollIndicator={false}
      >
        {/* Statystyki z animowanymi licznikami */}
        <Animated.View
          style={[
            styles.statystykiRzad,
            { opacity: headerAnim },
          ]}
        >
          <StatKarta
            liczba={mieszanki.length}
            opis={'Ilość\nMieszanek'}
            theme={theme}
            kolor={theme.colors.text}
            delay={100}
          />
          <StatKarta
            liczba={aktywne.length}
            opis={'Aktywne'}
            theme={theme}
            kolor={theme.colors.success}
            delay={200}
          />
          <StatKarta
            liczba={archiwalne.length}
            opis={'Archiwum'}
            theme={theme}
            kolor={theme.colors.textSecondary}
            delay={300}
          />
        </Animated.View>

        {/* Kafelki nawigacyjne */}
        <View style={styles.siatkaDuza}>
          {KAFELKI.map((kafelek, idx) => (
            <Animated.View
              key={kafelek.id}
              style={{
                opacity: animacje[idx].opacity,
                transform: [
                  { translateY: animacje[idx].translateY },
                  { scale: animacje[idx].scale },
                ],
                width: '47.5%',
              }}
            >
              <TouchableOpacity
                style={[
                  styles.kafelek,
                  {
                    backgroundColor: theme.colors.tileBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => handleKafelekPress(kafelek, idx)}
                activeOpacity={1}
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
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatKarta({ liczba, opis, theme, kolor, delay }: {
  liczba: number;
  opis: string;
  theme: AppTheme;
  kolor: string;
  delay: number;
}) {
  return (
    <View style={[styles.statystykiKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <AnimatedCounter
        wartosc={liczba}
        czas={800}
        delay={delay}
        style={{ ...styles.statystykiLiczba, color: kolor }}
      />
      <Text style={[styles.statystykiOpis, { color: theme.colors.textSecondary }]}>{opis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  logoTekst: { fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  logoOpis: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  zawartosc: { padding: 16, gap: 16 },
  statystykiRzad: { flexDirection: 'row', gap: 10 },
  statystykiKarta: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statystykiLiczba: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  statystykiOpis: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  siatkaDuza: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kafelek: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#00000015',
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
  ikona: { fontSize: 26 },
  kafelekTytul: { fontSize: 17, fontWeight: '700', lineHeight: 22, flex: 1 },
  kafelekPodtytul: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 10 },
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
