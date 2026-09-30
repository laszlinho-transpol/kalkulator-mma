import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
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
  szerokoscSzkicu?: number;
}

/** Przekrój warstw – opisy obok szkicu, żeby cienkie warstwy (np. SMA 4 cm) były czytelne. */
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
  const maxOds = Math.max(0, ...posortowane.map((w) => w.odsadzkaCm));
  const pad = 8;
  const rysW = szerokoscSzkicu - pad * 2;
  const rysH = Math.max(88, Math.min(140, posortowane.length * 28));
  const bazaW = rysW * 0.72;
  const skalaW = maxOds > 0 ? (rysW - bazaW) / maxOds : 0;
  const skalaH = rysH / Math.max(sumaH, 1);

  let y = pad;
  const rects = posortowane.map((w) => {
    const h = Math.max(Math.max(w.gruboscCm, 1) * skalaH, 6);
    const szer = bazaW + w.odsadzkaCm * skalaW;
    const x = pad + (rysW - szer) / 2;
    const item = { w, x, y, h, szer };
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
            height={Math.max(r.h - 0.8, 4)}
            fill={KOLORY[r.w.kategoria] ?? KOLORY.inna}
            rx={3}
          />
        ))}
      </Svg>
      <View style={[styles.opisy, { paddingVertical: pad }]}>
        {rects.map((r) => (
          <View key={r.w.id} style={{ height: r.h, justifyContent: 'center' }}>
            <Text style={[styles.opisNazwa, { color: theme.colors.text }]} numberOfLines={2}>
              {r.w.nazwa}
            </Text>
            <Text style={[styles.opisWymiary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {r.w.gruboscCm} cm
              {r.w.odsadzkaCm ? ` · odsadzka ${r.w.odsadzkaCm} cm` : ''}
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
    alignItems: 'stretch',
  },
  opisy: {
    flex: 1,
    paddingRight: 10,
    paddingLeft: 4,
    justifyContent: 'flex-start',
  },
  opisNazwa: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
  opisWymiary: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  puste: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minWidth: 160,
    alignItems: 'center',
  },
});
