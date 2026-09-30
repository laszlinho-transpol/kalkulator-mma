import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { WarstwaKonstrukcji } from '../../types';
import type { AppTheme } from '../../constants/theme';

const KOLORY: Record<string, string> = {
  sma: '#27272A',
  wiazaca: '#3F3F46',
  podbudowa: '#57534E',
  klsm: '#A8A29E',
  inna: '#64748B',
};

interface Props {
  warstwy: WarstwaKonstrukcji[];
  theme: AppTheme;
  szerokosc?: number;
}

/** Przekrój warstw (ścieralna u góry). Klikany nagłówek konstrukcji. */
export function PrzekrojKonstrukcji({ warstwy, theme, szerokosc = 280 }: Props) {
  const posortowane = useMemo(
    () => [...warstwy].sort((a, b) => a.kolejnosc - b.kolejnosc),
    [warstwy],
  );

  if (posortowane.length === 0) {
    return (
      <View style={[styles.puste, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Brak warstw – rozwiń i dodaj</Text>
      </View>
    );
  }

  const sumaH = posortowane.reduce((s, w) => s + Math.max(w.gruboscCm, 1), 0);
  const maxOds = Math.max(0, ...posortowane.map((w) => w.odsadzkaCm));
  const pad = 10;
  const rysW = szerokosc - pad * 2;
  const rysH = Math.max(72, Math.min(132, posortowane.length * 22));
  const bazaW = rysW * 0.7;
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
    <View style={[styles.wrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: szerokosc }]}>
      <Svg width={szerokosc} height={svgH}>
        {rects.map((r) => (
          <React.Fragment key={r.w.id}>
            <Rect
              x={r.x}
              y={r.y}
              width={r.szer}
              height={Math.max(r.h - 0.8, 4)}
              fill={KOLORY[r.w.kategoria] ?? KOLORY.inna}
              rx={3}
            />
            <SvgText
              x={r.x + r.szer / 2}
              y={r.y + Math.max(r.h / 2 + 4, 12)}
              fontSize={11}
              fontWeight="700"
              fill="#F8FAFC"
              textAnchor="middle"
            >
              {`${r.w.nazwa}  ${r.w.gruboscCm} cm${r.w.odsadzkaCm ? `  +${r.w.odsadzkaCm}` : ''}`}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  puste: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minWidth: 160,
    alignItems: 'center',
  },
});
