// ============================================================
// EMPTY STATE – widok pustej listy z ikoną, tytułem i akcją
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { Przycisk } from '../ui/Przycisk';

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
  const theme = useMotyw();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={[styles.ikonaTlo, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Text style={styles.ikona}>{ikona}</Text>
        </View>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>{tytul}</Text>
        <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>{opis}</Text>

        {przyciskTekst && onPrzycisk ? (
          <Przycisk tekst={przyciskTekst} onPress={onPrzycisk} style={styles.przycisk} />
        ) : null}
        {drugPrzyciskTekst && onDrugPrzycisk ? (
          <Przycisk wariant="drugi" tekst={drugPrzyciskTekst} onPress={onDrugPrzycisk} style={styles.przycisk} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 24,
    gap: 12,
    width: '100%',
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
  przycisk: { minWidth: 220, alignSelf: 'center' },
});
