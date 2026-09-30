import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

interface Props {
  theme: AppTheme;
  km: string;
  m: string;
  onKm: (v: string) => void;
  onM: (v: string) => void;
  editable?: boolean;
  compact?: boolean;
  mini?: boolean;
}

/** Dwa wąskie okienka: [km] + [m]. Na webie type=text + inputMode, żeby dało się wpisać cyfry. */
export function PoleKilometraz({ theme, km, m, onKm, onM, editable = true, compact, mini }: Props) {
  const web = Platform.OS === 'web';
  const pole = (wartosc: string, onChange: (v: string) => void, max: number, szer: 'km' | 'm') => (
    <TextInput
      style={[
        styl.input,
        mini ? (szer === 'km' ? styl.kmMini : styl.mMini) : szer === 'km' ? styl.km : styl.m,
        compact && !mini ? (szer === 'km' ? styl.kmCompact : styl.mCompact) : null,
        {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.border,
          color: theme.colors.text,
          opacity: editable ? 1 : 0.55,
        },
      ]}
      value={wartosc}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, '').slice(0, max))}
      keyboardType={web ? 'default' : 'number-pad'}
      inputMode="numeric"
      autoComplete="off"
      placeholder={szer === 'km' ? '0' : '000'}
      placeholderTextColor={theme.colors.textSecondary}
      editable={editable}
      maxLength={max}
      selectTextOnFocus
    />
  );

  return (
    <View style={[styl.wrap, mini && styl.wrapMini]}>
      {pole(km, onKm, 4, 'km')}
      <Text style={[styl.plus, mini && styl.plusMini, { color: theme.colors.textSecondary }]}>+</Text>
      {pole(m, onM, 3, 'm')}
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
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  wrapMini: { gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
    minWidth: 0,
  },
  km: { width: 64, paddingHorizontal: 4 },
  m: { width: 72, paddingHorizontal: 4 },
  kmCompact: { width: 56, paddingHorizontal: 4 },
  mCompact: { width: 64, paddingHorizontal: 4 },
  kmMini: { width: 48, paddingHorizontal: 2, paddingVertical: 6, fontSize: 14, borderRadius: 8 },
  mMini: { width: 56, paddingHorizontal: 2, paddingVertical: 6, fontSize: 14, borderRadius: 8 },
  plus: { fontSize: 18, fontWeight: '300', width: 14, textAlign: 'center' },
  plusMini: { fontSize: 14, width: 10 },
});
