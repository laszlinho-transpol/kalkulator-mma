// ============================================================
// PODGLĄD WIELOKĄTA OBMIARU (SVG)
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Svg, { Polygon as SvgPolygon, Circle as SvgCircle, G as SvgG } from 'react-native-svg';
import { lightTheme, darkTheme } from '../../constants/theme';
import { bboxWielokata } from '../../utils/obmiarGeometry';
import { formatLiczby } from '../../utils/calculations';
import type { ObszarObmiaru } from '../../types';

const PAD = 12;

interface Props {
  obszar: ObszarObmiaru;
  szerokosc?: number;
  wysokosc?: number;
  pokazWezly?: boolean;
}

export function WielokatPodglad({
  obszar,
  szerokosc = 320,
  wysokosc = 220,
  pokazWezly = true,
}: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const pts = obszar.wierzcholkiM;

  const { path, circles } = useMemo(() => {
    if (pts.length < 3) return { path: '', circles: [] as { cx: number; cy: number; i: number }[] };
    const box = bboxWielokata(pts);
    const scale = Math.min(
      (szerokosc - PAD * 2) / Math.max(box.szer, 0.01),
      (wysokosc - PAD * 2) / Math.max(box.wys, 0.01),
    );
    const toSvg = (x: number, y: number) => ({
      // Y w PDF rośnie w dół – odwracamy do ekranu
      cx: PAD + (x - box.minX) * scale,
      cy: PAD + (box.maxY - y) * scale,
    });
    const mapped = pts.map((p, i) => {
      const s = toSvg(p.x, p.y);
      return { ...s, i };
    });
    return {
      path: mapped.map((p) => `${p.cx},${p.cy}`).join(' '),
      circles: mapped,
    };
  }, [pts, szerokosc, wysokosc]);

  if (pts.length < 3) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Za mało punktów</Text>
      </View>
    );
  }

  const fill = obszar.kolorWypelnienia ? `${obszar.kolorWypelnienia}55` : `${theme.colors.primary}33`;
  const stroke = obszar.kolorWypelnienia ?? theme.colors.primary;

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
      <Svg width={szerokosc} height={wysokosc}>
        <SvgPolygon points={path} fill={fill} stroke={stroke} strokeWidth={2} />
        {pokazWezly && (
          <SvgG>
            {circles.map((c) => (
              <SvgCircle
                key={c.i}
                cx={c.cx}
                cy={c.cy}
                r={c.i === 0 || c.i === circles.length - 1 ? 4 : 2.5}
                fill={c.i === 0 ? theme.colors.success : c.i === circles.length - 1 ? theme.colors.danger : stroke}
              />
            ))}
          </SvgG>
        )}
      </Svg>
      <Text style={[styles.podpis, { color: theme.colors.textSecondary }]}>
        {obszar.nazwa} · {formatLiczby(obszar.powierzchniaM2)} m² · {obszar.wierzcholkiM.length} węzłów
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', paddingBottom: 8 },
  pusty: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  podpis: { fontSize: 12, marginTop: 4 },
});
