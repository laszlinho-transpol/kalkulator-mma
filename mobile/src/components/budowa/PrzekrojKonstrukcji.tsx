import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { WarstwaKonstrukcji } from '../../types';
import type { AppTheme } from '../../constants/theme';

const KOLORY: Record<string, string> = {
  sma: '#3F3F46',
  wiazaca: '#52525B',
  podbudowa: '#71717A',
  klsm: '#A8A29E',
  inna: '#94A3B8',
};

interface Props {
  warstwy: WarstwaKonstrukcji[];
  theme: AppTheme;
  szerokosc?: number;
}

/** Mały przekrój warstw – wysokość ~ grubość, szerokość ~ odsadzka. */
export function PrzekrojKonstrukcji({ warstwy, theme, szerokosc = 168 }: Props) {
  const posortowane = useMemo(
    () => [...warstwy].sort((a, b) => a.kolejnosc - b.kolejnosc),
    [warstwy],
  );

  if (posortowane.length === 0) {
    return (
      <View style={[styles.puste, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Brak warstw</Text>
      </View>
    );
  }

  const sumaH = posortowane.reduce((s, w) => s + Math.max(w.gruboscCm, 1), 0);
  const maxOds = Math.max(0, ...posortowane.map((w) => w.odsadzkaCm));
  const pad = 8;
  const etykietaW = 72;
  const rysW = szerokosc - etykietaW - pad * 2;
  const rysH = 86;
  const bazaW = rysW * 0.62;
  const skalaW = maxOds > 0 ? (rysW - bazaW) / maxOds : 0;
  const skalaH = rysH / Math.max(sumaH, 1);
  const ox = pad;

  let y = pad;
  const rects = posortowane.map((w) => {
    const h = Math.max(w.gruboscCm, 1) * skalaH;
    const szer = bazaW + w.odsadzkaCm * skalaW;
    const x = ox + (rysW - szer) / 2;
    const item = { w, x, y, h, szer };
    y += h;
    return item;
  });

  const svgH = rysH + pad * 2;

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
      <Svg width={szerokosc} height={svgH}>
        {rects.map((r) => (
          <Rect
            key={r.w.id}
            x={r.x}
            y={r.y}
            width={r.szer}
            height={Math.max(r.h - 0.6, 1)}
            fill={KOLORY[r.w.kategoria] ?? KOLORY.inna}
            rx={2}
          />
        ))}
        {rects.map((r) => (
          <SvgText
            key={`t-${r.w.id}`}
            x={ox + rysW + 6}
            y={r.y + r.h / 2 + 3}
            fontSize={9}
            fontWeight="700"
            fill={theme.colors.text}
          >
            {`${r.w.nazwa} ${r.w.gruboscCm} cm`}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  puste: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minWidth: 120,
    alignItems: 'center',
  },
});
