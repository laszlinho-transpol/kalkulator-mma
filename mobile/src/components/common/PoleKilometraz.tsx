import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

interface Props {
  theme: AppTheme;
  km: string;
  m: string;
  onKm: (v: string) => void;
  onM: (v: string) => void;
  editable?: boolean;
  compact?: boolean;
}

/** Dwa okienka: [km] + [m]. Puste km = 0 (np. 450 → 0+450). */
export function PoleKilometraz({ theme, km, m, onKm, onM, editable = true, compact }: Props) {
  return (
    <View style={styl.wrap}>
      <TextInput
        style={[
          styl.input,
          compact ? styl.kmCompact : styl.km,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            opacity: editable ? 1 : 0.55,
          },
        ]}
        value={km}
        onChangeText={(v) => onKm(v.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        editable={editable}
        maxLength={4}
      />
      <Text style={[styl.plus, { color: theme.colors.textSecondary }]}>+</Text>
      <TextInput
        style={[
          styl.input,
          compact ? styl.mCompact : styl.m,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            opacity: editable ? 1 : 0.55,
          },
        ]}
        value={m}
        onChangeText={(v) => onM(v.replace(/[^0-9]/g, '').slice(0, 3))}
        keyboardType="numeric"
        placeholder="000"
        placeholderTextColor={theme.colors.textSecondary}
        editable={editable}
        maxLength={3}
      />
    </View>
  );
}

export function parsujPolaKilometraza(kmStr: string, mStr: string): { km: number; m: number } {
  const km = parseInt(kmStr, 10);
  const m = parseInt(mStr, 10);
  return {
    km: Number.isFinite(km) ? km : 0,
    m: Number.isFinite(m) ? Math.min(999, m) : 0,
  };
}

export function polaZKilometraza(km?: number, m?: number): { km: string; m: string } {
  if (km == null && m == null) return { km: '', m: '' };
  return {
    km: String(km ?? 0),
    m: String(m ?? 0).padStart(3, '0'),
  };
}

const styl = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 140 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  km: { flex: 2, paddingHorizontal: 10 },
  m: { flex: 1.2, paddingHorizontal: 8 },
  kmCompact: { width: 56, paddingHorizontal: 6 },
  mCompact: { width: 64, paddingHorizontal: 6 },
  plus: { fontSize: 20, fontWeight: '300' },
});
