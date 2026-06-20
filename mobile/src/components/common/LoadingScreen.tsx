// ============================================================
// EKRAN ŁADOWANIA – animowane logo MMA podczas startu aplikacji
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, useColorScheme,
} from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

interface LoadingScreenProps {
  widoczny: boolean;
  onUkryj?: () => void;
}

export function LoadingScreen({ widoczny, onUkryj }: LoadingScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const opacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pasekWidth = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animacja wejścia logo
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Pasek ładowania
    Animated.timing(pasekWidth, {
      toValue: W - 80,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    if (!widoczny) {
      // Fade out gdy dane gotowe
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start(() => onUkryj?.());
    }
  }, [widoczny]);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, opacity: containerOpacity },
      ]}
      pointerEvents={widoczny ? 'auto' : 'none'}
    >
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={[styles.ikonaTlo, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Text style={styles.ikonaEmoji}>⬛</Text>
        </View>
        <Text style={[styles.logoTekst, { color: theme.colors.primary }]}>MMA</Text>
        <Text style={[styles.logoOpis, { color: theme.colors.textSecondary }]}>
          Kalkulator Mieszanek Asfaltowych
        </Text>
      </Animated.View>

      {/* Pasek postępu */}
      <View style={[styles.pasekTlo, { backgroundColor: theme.colors.border }]}>
        <Animated.View
          style={[
            styles.pasekFill,
            { backgroundColor: theme.colors.primary, width: pasekWidth },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  logoWrap: { alignItems: 'center', gap: 12 },
  ikonaTlo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikonaEmoji: { fontSize: 52 },
  logoTekst: { fontSize: 42, fontWeight: '900', letterSpacing: 6 },
  logoOpis: { fontSize: 13, letterSpacing: 0.5 },
  pasekTlo: {
    width: W - 80,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pasekFill: { height: '100%', borderRadius: 2 },
});
