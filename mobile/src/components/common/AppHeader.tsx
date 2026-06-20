// ============================================================
// APP HEADER – nagłówek z bezpiecznym marginesem od status bar
// Tytuł w pierwszym wierszu, przyciski akcji w drugim
// ============================================================

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import type { AppTheme } from '../../constants/theme';

interface Przycisk {
  tekst: string;
  onPress: () => void;
  kolor?: string;
  tlo?: string;
  disabled?: boolean;
}

interface AppHeaderProps {
  tytul: string;
  podtytul?: string;
  przyciski?: Przycisk[];
  /** Przycisk w lewym górnym rogu (zazwyczaj Wstecz/Anuluj) */
  lewy?: Przycisk;
  /** Przycisk w prawym górnym rogu (jeden, opcjonalny) */
  prawy?: Przycisk;
}

export function AppHeader({ tytul, podtytul, przyciski, lewy, prawy }: AppHeaderProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const hasPrzyciski = przyciski && przyciski.length > 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: insets.top + 6 },
      ]}
    >
      {/* Wiersz 1: nawigacja lewo + tytuł + prawo */}
      <View style={styles.rzadTytul}>
        {lewy ? (
          <TouchableOpacity onPress={lewy.onPress} style={styles.przyciskLewy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.przyciskTekst, { color: lewy.kolor ?? theme.colors.primary }]}>{lewy.tekst}</Text>
          </TouchableOpacity>
        ) : <View style={styles.przyciskLewy} />}

        <View style={styles.tytulWrap}>
          <Text style={[styles.tytul, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {tytul}
          </Text>
          {podtytul ? <Text style={[styles.podtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>{podtytul}</Text> : null}
        </View>

        {prawy ? (
          <TouchableOpacity onPress={prawy.onPress} style={styles.przyciskPrawy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.przyciskTekst, { color: prawy.kolor ?? theme.colors.primary }]}>{prawy.tekst}</Text>
          </TouchableOpacity>
        ) : <View style={styles.przyciskPrawy} />}
      </View>

      {/* Wiersz 2: przyciski akcji (jeśli są) */}
      {hasPrzyciski && (
        <View style={styles.rzadPrzyciskow}>
          {przyciski!.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.btnAkcji,
                { backgroundColor: p.tlo ?? `${theme.colors.primary}15`, borderColor: p.tlo ? 'transparent' : theme.colors.border },
                p.disabled && { opacity: 0.4 },
              ]}
              onPress={p.onPress}
              disabled={p.disabled}
            >
              <Text style={[styles.btnAkcjiTekst, { color: p.kolor ?? theme.colors.primary }]} numberOfLines={1}>
                {p.tekst}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  rzadTytul: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  przyciskLewy: { width: 72, justifyContent: 'center' },
  przyciskPrawy: { width: 72, justifyContent: 'center', alignItems: 'flex-end' },
  przyciskTekst: { fontSize: 16, fontWeight: '600' },
  tytulWrap: { flex: 1, alignItems: 'center' },
  tytul: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  podtytul: { fontSize: 11, marginTop: 1 },
  rzadPrzyciskow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  btnAkcji: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnAkcjiTekst: { fontSize: 14, fontWeight: '700' },
});
