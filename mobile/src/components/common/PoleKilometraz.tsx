import React, { useEffect, useState } from 'react';
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

/**
 * Dwa wąskie okienka: [km] + [m].
 * Cyfry trzymamy w szkicu do rozmazania fokusu – parent nie dostaje
 * każdej literki i nie nadpisuje pola zerem z padStart.
 * Na webie type=text (nie number), żeby dało się wpisać.
 */
export function PoleKilometraz({ theme, km, m, onKm, onM, editable = true, compact, mini }: Props) {
  const web = Platform.OS === 'web';
  const [focus, setFocus] = useState<'km' | 'm' | null>(null);
  const [draftKm, setDraftKm] = useState(km);
  const [draftM, setDraftM] = useState(m);
  const draftKmRef = React.useRef(km);
  const draftMRef = React.useRef(m);

  useEffect(() => {
    if (focus !== 'km') setDraftKm(km);
  }, [km, focus]);
  useEffect(() => {
    if (focus !== 'm') setDraftM(m);
  }, [m, focus]);

  const tylkoCyfry = (v: string, max: number) => v.replace(/[^0-9]/g, '').slice(0, max);

  const pole = (
    wartosc: string,
    szkic: string,
    ktory: 'km' | 'm',
    onCommit: (v: string) => void,
    setSzkic: (v: string) => void,
    max: number,
  ) => {
    const pokaz = focus === ktory ? szkic : wartosc;
    const webProps = web
      ? ({
          type: 'text',
          inputMode: 'numeric',
          autoCorrect: 'off',
          spellCheck: false,
        } as Record<string, unknown>)
      : {};
    return (
      <TextInput
        style={[
          styl.input,
          mini ? (ktory === 'km' ? styl.kmMini : styl.mMini) : ktory === 'km' ? styl.km : styl.m,
          compact && !mini ? (ktory === 'km' ? styl.kmCompact : styl.mCompact) : null,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            opacity: editable ? 1 : 0.55,
          },
        ]}
        value={pokaz}
        onChangeText={(v) => {
          const c = tylkoCyfry(v, max);
          setSzkic(c);
          if (ktory === 'km') draftKmRef.current = c;
          else draftMRef.current = c;
        }}
        onFocus={() => {
          setFocus(ktory);
          setSzkic(wartosc);
          if (ktory === 'km') draftKmRef.current = wartosc;
          else draftMRef.current = wartosc;
        }}
        onBlur={() => {
          const c = tylkoCyfry(ktory === 'km' ? draftKmRef.current : draftMRef.current, max);
          setFocus(null);
          onCommit(c);
        }}
        keyboardType={web ? 'default' : 'number-pad'}
        autoComplete="off"
        placeholder={ktory === 'km' ? '0' : '000'}
        placeholderTextColor={theme.colors.textSecondary}
        editable={editable}
        maxLength={max}
        {...webProps}
      />
    );
  };

  return (
    <View style={[styl.wrap, mini && styl.wrapMini]}>
      {pole(km, draftKm, 'km', onKm, setDraftKm, 4)}
      <Text style={[styl.plus, mini && styl.plusMini, { color: theme.colors.textSecondary }]}>+</Text>
      {pole(m, draftM, 'm', onM, setDraftM, 3)}
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
