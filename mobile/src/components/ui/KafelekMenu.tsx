import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { CZAS, PROMIEN, cien } from '../../constants/styl';
import { Naciskany } from './Naciskany';

interface Props {
  tytul: string;
  podtytul: string;
  ikona?: string;
  /** Rysunek zamiast ikony (np. schemat kalkulatora). */
  rysunek?: React.ReactNode;
  kolor: string;
  onPress: () => void;
  /** Opóźnienie wjazdu kafelka [ms] – kafelki pojawiają się kolejno. */
  opoznienie?: number;
  szerokosc?: DimensionValue;
}

/** Kafelek menu (ekran główny, Budżet): ikona, tytul, podpis w kolorze działu, pasek na dole. */
export function KafelekMenu({ tytul, podtytul, ikona, rysunek, kolor, onPress, opoznienie = 0, szerokosc = '47.5%' }: Props) {
  const theme = useMotyw();
  const wejscie = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(wejscie, {
      toValue: 1,
      duration: CZAS.wejscie + 120,
      delay: opoznienie,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [wejscie, opoznienie]);

  return (
    <Animated.View
      style={{
        width: szerokosc,
        opacity: wejscie,
        transform: [{ translateY: wejscie.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <Naciskany
        accessibilityRole="button"
        accessibilityLabel={tytul}
        onPress={onPress}
        style={[styles.kafelek, cien(theme), { backgroundColor: theme.colors.tileBackground, borderColor: theme.colors.border }]}
      >
        {rysunek ? (
          <View style={[styles.rysunekTlo, { backgroundColor: `${kolor}14` }]}>{rysunek}</View>
        ) : (
          <View style={[styles.ikonaTlo, { backgroundColor: `${kolor}20` }]}>
            <Text style={styles.ikona}>{ikona}</Text>
          </View>
        )}
        <Text style={[styles.tytul, { color: theme.colors.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
          {tytul}
        </Text>
        <Text style={[styles.podtytul, { color: kolor }]} numberOfLines={2}>{podtytul}</Text>
        <View style={[styles.pasek, { backgroundColor: kolor }]} />
      </Naciskany>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kafelek: {
    borderRadius: PROMIEN.l,
    padding: 16,
    borderWidth: 1,
    minHeight: 148,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ikonaTlo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ikona: { fontSize: 26 },
  rysunekTlo: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 10 },
  tytul: { fontSize: 16, fontWeight: '800', lineHeight: 20, flex: 1 },
  podtytul: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 10 },
  pasek: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
});
