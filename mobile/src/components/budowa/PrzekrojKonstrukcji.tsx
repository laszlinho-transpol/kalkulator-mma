import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { WarstwaKonstrukcji } from '../../types';
import type { AppTheme } from '../../constants/theme';
import { odsadzkiWarstwy } from '../../utils/projektBudowy';

const KOLORY: Record<string, string> = {
  sma: '#27272A',
  wiazaca: '#3F3F46',
  podbudowa: '#57534E',
  klsm: '#A8A29E',
  inna: '#64748B',
};

/** Min. wysokość wiersza opisu – cienkie warstwy (SMA 4 cm) nie mogą ścinać czcionki. */
const MIN_WIERSZ = 40;

interface Props {
  warstwy: WarstwaKonstrukcji[];
  theme: AppTheme;
  szerokoscSzkicu?: number;
}

/** Przekrój warstw – opisy obok szkicu, każdy wiersz ma wysokość pod dwie linie tekstu. */
export function PrzekrojKonstrukcji({ warstwy, theme, szerokoscSzkicu = 132 }: Props) {
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
  const maxOds = Math.max(0, ...posortowane.map((w) => {
    const o = odsadzkiWarstwy(w);
    return o.lewa + o.prawa;
  }));
  const pad = 8;
  const rysW = szerokoscSzkicu - pad * 2;
  const bazaW = rysW * 0.72;
  const skalaW = maxOds > 0 ? (rysW - bazaW) / maxOds : 0;
  const proporcH = Math.max(MIN_WIERSZ * posortowane.length, 88);

  let y = pad;
  const rects = posortowane.map((w) => {
    const ods = odsadzkiWarstwy(w);
    const h = Math.max((Math.max(w.gruboscCm, 1) / Math.max(sumaH, 1)) * proporcH, MIN_WIERSZ);
    const szer = bazaW + (ods.lewa + ods.prawa) * skalaW;
    const x = pad + (rysW - szer) / 2;
    const item = { w, x, y, h, szer, ods };
    y += h;
    return item;
  });

  const svgH = y + pad;

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
      <Svg width={szerokoscSzkicu} height={svgH}>
        {rects.map((r) => (
          <Rect
            key={r.w.id}
            x={r.x}
            y={r.y}
            width={r.szer}
            height={Math.max(r.h - 1.2, 8)}
            fill={KOLORY[r.w.kategoria] ?? KOLORY.inna}
            rx={3}
          />
        ))}
      </Svg>
      <View style={[styles.opisy, { paddingVertical: pad }]}>
        {rects.map((r) => (
          <View key={r.w.id} style={[styles.wierszOpisu, { minHeight: r.h, height: r.h }]}>
            <Text style={[styles.opisNazwa, { color: theme.colors.text }]} numberOfLines={1}>
              {r.w.nazwa}
            </Text>
            <Text style={[styles.opisWymiary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {r.w.gruboscCm} cm
              {r.ods.lewa || r.ods.prawa ? ` · ods. L ${r.ods.lewa} / P ${r.ods.prawa} cm` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  opisy: {
    flex: 1,
    paddingRight: 10,
    paddingLeft: 6,
    justifyContent: 'flex-start',
  },
  wierszOpisu: {
    justifyContent: 'center',
    paddingVertical: 2,
  },
  opisNazwa: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
  opisWymiary: { fontSize: 11, fontWeight: '600', lineHeight: 14, marginTop: 1 },
  puste: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minWidth: 160,
    alignItems: 'center',
  },
});
