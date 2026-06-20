// ============================================================
// EMPTY STATE – widok pustej listy z ikoną, tytułem i akcją
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';
import { AnimatedCard } from './AnimatedCard';

interface EmptyStateProps {
  ikona: string;
  tytul: string;
  opis: string;
  przyciskTekst?: string;
  onPrzycisk?: () => void;
  drugPrzyciskTekst?: string;
  onDrugPrzycisk?: () => void;
}

export function EmptyState({
  ikona, tytul, opis, przyciskTekst, onPrzycisk, drugPrzyciskTekst, onDrugPrzycisk,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <AnimatedCard delay={100}>
      <View style={styles.container}>
        <View style={[styles.ikonaTlo, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Text style={styles.ikona}>{ikona}</Text>
        </View>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>{tytul}</Text>
        <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>{opis}</Text>

        {przyciskTekst && onPrzycisk && (
          <TouchableOpacity
            style={[styles.przycisk, { backgroundColor: theme.colors.primary }]}
            onPress={onPrzycisk}
          >
            <Text style={styles.przyciskTekst}>{przyciskTekst}</Text>
          </TouchableOpacity>
        )}

        {drugPrzyciskTekst && onDrugPrzycisk && (
          <TouchableOpacity
            style={[styles.drugPrzycisk, { borderColor: theme.colors.border }]}
            onPress={onDrugPrzycisk}
          >
            <Text style={[styles.drugPrzyciskTekst, { color: theme.colors.textSecondary }]}>
              {drugPrzyciskTekst}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 12,
  },
  ikonaTlo: {
    width: 90,
    height: 90,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ikona: { fontSize: 46 },
  tytul: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  opis: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  przycisk: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    minWidth: 200,
    alignItems: 'center',
  },
  przyciskTekst: { color: '#fff', fontSize: 16, fontWeight: '700' },
  drugPrzycisk: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  drugPrzyciskTekst: { fontSize: 14, fontWeight: '600' },
});
