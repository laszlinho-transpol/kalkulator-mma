import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { PROMIEN } from '../../constants/styl';
import { Ikona, type NazwaIkony } from './Ikona';
import { Naciskany } from './Naciskany';

export type WariantPrzycisku = 'glowny' | 'drugi' | 'niebezpieczny' | 'tekst';

interface Props {
  tekst: string;
  onPress: () => void;
  wariant?: WariantPrzycisku;
  ikona?: NazwaIkony;
  maly?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Przycisk akcji. Główny – jeden na kartę/ekran; drugi – akcje pomocnicze; tekst – linki w karcie. */
export function Przycisk({ tekst, onPress, wariant = 'glowny', ikona, maly, disabled, accessibilityLabel, style }: Props) {
  const theme = useMotyw();
  const kolory = {
    glowny: { tlo: theme.colors.primary, ramka: theme.colors.primary, tekst: '#1A1A1A' },
    drugi: { tlo: `${theme.colors.info}12`, ramka: theme.colors.info, tekst: theme.colors.info },
    niebezpieczny: { tlo: `${theme.colors.danger}10`, ramka: theme.colors.danger, tekst: theme.colors.danger },
    tekst: { tlo: 'transparent', ramka: 'transparent', tekst: theme.colors.primary },
  }[wariant];

  return (
    <Naciskany
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? tekst}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        maly && styles.maly,
        wariant === 'tekst' && styles.tekstowy,
        { backgroundColor: kolory.tlo, borderColor: kolory.ramka },
        style,
      ]}
    >
      <View style={styles.wnetrze}>
        {ikona ? <Ikona nazwa={ikona} kolor={kolory.tekst} rozmiar={maly ? 16 : 18} /> : null}
        <Text style={[styles.tekst, maly && styles.tekstMaly, { color: kolory.tekst }]} numberOfLines={1}>{tekst}</Text>
      </View>
    </Naciskany>
  );
}

/** Okrągły przycisk z samą ikoną (nagłówek, „+” w sekcji). */
export function PrzyciskIkony({ ikona, onPress, accessibilityLabel, kolor, tlo, rozmiar = 36 }: {
  ikona: NazwaIkony;
  onPress: () => void;
  accessibilityLabel: string;
  kolor?: string;
  tlo?: string;
  rozmiar?: number;
}) {
  const theme = useMotyw();
  return (
    <Naciskany
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={[styles.okragly, { width: rozmiar, height: rozmiar, borderRadius: rozmiar / 2, backgroundColor: tlo ?? `${theme.colors.primary}18` }]}
    >
      <Ikona nazwa={ikona} kolor={kolor ?? theme.colors.primary} rozmiar={Math.round(rozmiar * 0.55)} />
    </Naciskany>
  );
}

const styles = StyleSheet.create({
  btn: { borderWidth: 1, borderRadius: PROMIEN.m, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  maly: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  tekstowy: { paddingVertical: 6, paddingHorizontal: 4, borderWidth: 0 },
  wnetrze: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tekst: { fontWeight: '800', fontSize: 15 },
  tekstMaly: { fontSize: 13 },
  okragly: { alignItems: 'center', justifyContent: 'center' },
});
