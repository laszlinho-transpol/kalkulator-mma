// ============================================================
// SEKCJA ZWIJANA – nagłówek + zawartość (domyślnie zwinięta)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { naglowekGrupy } from '../../constants/layout';

interface CollapsibleSectionProps {
  tytul: string;
  liczba: number;
  theme: AppTheme;
  ikona?: string;
  domyslnieRozwinieta?: boolean;
  /** Pojedynczy wiersz bez zwijania (np. „bez wytwórni”) */
  plaski?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  tytul, liczba, theme, ikona = '▸', domyslnieRozwinieta = false, plaski = false, children,
}: CollapsibleSectionProps) {
  const [rozwinieta, setRozwinieta] = useState(domyslnieRozwinieta || plaski);

  if (plaski) {
    return (
      <View style={styles.plaskiWrap}>
        <View style={[styles.plaskiNaglowek, { backgroundColor: `${theme.colors.textSecondary}15`, borderColor: theme.colors.border }]}>
          <Text style={[styles.plaskiTekst, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {ikona !== '▸' ? `${ikona} ` : ''}{tytul} ({liczba})
          </Text>
        </View>
        <View style={styles.zawartosc}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[naglowekGrupy, { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.border }]}
        onPress={() => setRozwinieta((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tytul, { color: theme.colors.primary }]} numberOfLines={2}>
          {ikona !== '▸' ? `${ikona} ` : ''}{tytul}
        </Text>
        <View style={styles.prawo}>
          <Text style={[styles.liczba, { color: theme.colors.textSecondary }]}>{liczba}</Text>
          <Text style={[styles.strzalka, { color: theme.colors.primary }]}>{rozwinieta ? '▼' : '▶'}</Text>
        </View>
      </TouchableOpacity>
      {rozwinieta && <View style={styles.zawartosc}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  plaskiWrap: { marginBottom: 10 },
  plaskiNaglowek: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  plaskiTekst: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  tytul: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
  prawo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liczba: { fontSize: 13, fontWeight: '600' },
  strzalka: { fontSize: 12, fontWeight: '700' },
  zawartosc: { gap: 8, paddingLeft: 4 },
});
