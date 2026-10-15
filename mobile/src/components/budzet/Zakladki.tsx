import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

export type ZakladkaKarty = 'dane' | 'historia' | 'raporty';

const ZAKLADKI: [ZakladkaKarty, string][] = [
  ['dane', 'Dane'],
  ['historia', 'Historia stawek'],
  ['raporty', 'Raporty'],
];

export function Zakladki<T extends string = ZakladkaKarty>({ theme, aktywna, onZmien, zakladki }: {
  theme: AppTheme;
  aktywna: T;
  onZmien: (zakladka: T) => void;
  zakladki?: [T, string][];
}) {
  return (
    <View style={styles.zakladki}>
      {(zakladki ?? (ZAKLADKI as [T, string][])).map(([id, nazwa]) => {
        const on = aktywna === id;
        return (
          <TouchableOpacity
            key={id}
            accessibilityLabel={`Zakładka ${nazwa}`}
            onPress={() => onZmien(id)}
            style={[styles.zakladka, {
              borderColor: on ? theme.colors.primary : theme.colors.border,
              backgroundColor: on ? `${theme.colors.primary}22` : theme.colors.card,
            }]}
          >
            <Text style={{ color: theme.colors.text, fontWeight: on ? '800' : '600', textAlign: 'center', fontSize: 13 }}>{nazwa}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Gwiazdka({ theme, wlaczona, onPress, accessibilityLabel }: {
  theme: AppTheme;
  wlaczona?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!wlaczona }}
      onPress={onPress}
      hitSlop={10}
      style={styles.gwiazdka}
    >
      <Text style={[styles.gwiazdkaZnak, { color: wlaczona ? theme.colors.primary : theme.colors.textSecondary }]}>
        {wlaczona ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  zakladki: { flexDirection: 'row', gap: 8 },
  zakladka: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  gwiazdka: { paddingHorizontal: 6, paddingVertical: 2 },
  gwiazdkaZnak: { fontSize: 24, fontWeight: '700' },
});
