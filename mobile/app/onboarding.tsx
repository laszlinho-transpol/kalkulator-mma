// ============================================================
// ONBOARDING – pierwsze uruchomienie aplikacji
// ============================================================

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, useColorScheme, StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { lightTheme, darkTheme, type AppTheme } from '../src/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const KLUCZ_ONBOARDING = '@mma:onboardingComplete';

interface Slajd {
  id: string;
  ikona: string;
  tytul: string;
  opis: string;
  kolor: string;
  tloKolor: string;
}

const SLAJDY: Slajd[] = [
  {
    id: '1',
    ikona: '⬛',
    tytul: 'Witaj w Kalkulatorze MMA',
    opis: 'Twój cyfrowy asystent na budowie drogi. Planuj wbudowywanie mieszanek mineralno-asfaltowych, kontroluj postęp i generuj raporty — wszystko offline.',
    kolor: '#E8A020',
    tloKolor: '#E8A02015',
  },
  {
    id: '2',
    ikona: '🧱',
    tytul: 'Baza Mieszanek',
    opis: 'Dodaj receptury mieszanek asfaltowych (AC22P, SMA11 i inne) z ciężarem objętościowym. Będziesz je wybierać przy każdym planie wbudowywania.',
    kolor: '#E8A020',
    tloKolor: '#E8A02015',
  },
  {
    id: '3',
    ikona: '📋',
    tytul: 'Planuj dzień roboczy',
    opis: 'Stwórz plan z działkami roboczymi. Dodaj figury geometryczne — kalkulator obliczy powierzchnię, ilość ton i liczbę samochodów-wywrotek.',
    kolor: '#2E86AB',
    tloKolor: '#2E86AB15',
  },
  {
    id: '4',
    ikona: '🚧',
    tytul: 'Kontrola na żywo',
    opis: 'W trybie Live śledź postęp na szkicu. Wpisuj tony i metry z każdego auta — aplikacja pokaże bilans, grubość warstwy i wygeneruje raport PDF.',
    kolor: '#22C55E',
    tloKolor: '#22C55E15',
  },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [aktywnyIdx, setAktywnyIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const zakonczOnboarding = async () => {
    await AsyncStorage.setItem(KLUCZ_ONBOARDING, 'true');
    router.replace('/');
  };

  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== aktywnyIdx) {
      setAktywnyIdx(idx);
    }
  };

  const przejdzDalej = () => {
    if (aktywnyIdx < SLAJDY.length - 1) {
      scrollRef.current?.scrollTo({ x: (aktywnyIdx + 1) * SCREEN_W, animated: true });
    } else {
      zakonczOnboarding();
    }
  };

  const slajd = SLAJDY[aktywnyIdx];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Przycisk Pomiń */}
      <TouchableOpacity
        style={styles.pominBtn}
        onPress={zakonczOnboarding}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[styles.pominTekst, { color: theme.colors.textSecondary }]}>Pomiń</Text>
      </TouchableOpacity>

      {/* Slajdy */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLAJDY.map((s, idx) => (
          <SlajdView key={s.id} slajd={s} theme={theme} isActive={idx === aktywnyIdx} />
        ))}
      </ScrollView>

      {/* Dolna nawigacja */}
      <View style={styles.dolnaNav}>
        {/* Dots */}
        <View style={styles.dotsWrap}>
          {SLAJDY.map((_, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === aktywnyIdx ? slajd.kolor : theme.colors.border,
                  width: idx === aktywnyIdx ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Przycisk Dalej / Start */}
        <TouchableOpacity
          style={[styles.btnDalej, { backgroundColor: slajd.kolor }]}
          onPress={przejdzDalej}
          activeOpacity={0.85}
        >
          <Text style={styles.btnDalejTekst}>
            {aktywnyIdx === SLAJDY.length - 1 ? 'Zacznij pracę →' : 'Dalej →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SlajdView({ slajd, theme, isActive }: { slajd: Slajd; theme: AppTheme; isActive: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    if (isActive) {
      opacity.setValue(0);
      translateY.setValue(30);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={[styles.slajd, { width: SCREEN_W }]}>
      {/* Ikona w kółku */}
      <Animated.View
        style={[
          styles.ikonaWrap,
          { backgroundColor: slajd.tloKolor, opacity, transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.ikona}>{slajd.ikona}</Text>
      </Animated.View>

      {/* Tekst */}
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={[styles.slajdTytul, { color: theme.colors.text }]}>{slajd.tytul}</Text>
        <Text style={[styles.slajdOpis, { color: theme.colors.textSecondary }]}>{slajd.opis}</Text>
      </Animated.View>

      {/* Dekoracyjna linia na dole */}
      <View style={[styles.dekoracja, { backgroundColor: slajd.kolor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pominBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 24,
    zIndex: 10,
  },
  pominTekst: { fontSize: 16, fontWeight: '500' },
  scrollView: { flex: 1 },
  slajd: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 160,
    gap: 24,
  },
  ikonaWrap: {
    width: 130,
    height: 130,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ikona: { fontSize: 64 },
  slajdTytul: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  slajdOpis: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  dekoracja: {
    position: 'absolute',
    bottom: 160,
    width: 48,
    height: 4,
    borderRadius: 2,
  },
  dolnaNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    gap: 20,
    alignItems: 'center',
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btnDalej: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnDalejTekst: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export { KLUCZ_ONBOARDING };
