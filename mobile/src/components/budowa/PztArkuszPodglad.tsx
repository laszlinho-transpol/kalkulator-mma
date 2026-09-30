import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Polygon, Polyline, Rect } from 'react-native-svg';
import type { ArkuszPzt } from '../../types';
import { bboxWielokata } from '../../utils/obmiarGeometry';
import { formatujKmM } from '../../utils/projektBudowy';
import type { AppTheme } from '../../constants/theme';

function hexDoRgba(hex: string | undefined, alpha: number): string {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return `rgba(232,160,32,${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

interface Props {
  arkusz: ArkuszPzt;
  theme: AppTheme;
  wysokosc?: number;
}

export function PztArkuszPodglad({ arkusz, theme, wysokosc = 210 }: Props) {
  const geometria = useMemo(() => {
    const pts = arkusz.obszary.flatMap((o) => [
      ...o.wierzcholkiPdf,
      ...(o.krawedzniki ?? []).flatMap((k) => k.wierzcholkiPdf),
    ]);
    const bbox = bboxWielokata(pts);
    const pad = Math.max(bbox.szer, bbox.wys) * 0.05 || 8;
    return { bbox, pad, viewW: bbox.szer + pad * 2, viewH: bbox.wys + pad * 2 };
  }, [arkusz]);

  if (arkusz.obszary.length === 0) {
    return (
      <View style={[styles.puste, { borderColor: theme.colors.border, height: wysokosc }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Brak obszarów na arkuszu</Text>
      </View>
    );
  }

  const { bbox, pad, viewW, viewH } = geometria;
  const pivotY = bbox.minY + bbox.maxY;

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <View style={styles.nag}>
        <Text style={[styles.nazwa, { color: theme.colors.text }]} numberOfLines={1}>
          {arkusz.nazwa}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          {formatujKmM(arkusz.kilometrazPoczatkowyM)} → {formatujKmM(arkusz.kilometrazKoncowyM)}
        </Text>
      </View>
      <Svg
        width="100%"
        height={wysokosc}
        viewBox={`${bbox.minX - pad} ${bbox.minY - pad} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Rect
          x={bbox.minX - pad}
          y={bbox.minY - pad}
          width={viewW}
          height={viewH}
          fill={theme.dark ? '#111827' : '#F8FAFC'}
        />
        <G transform={`translate(0 ${pivotY}) scale(1 -1)`}>
          {arkusz.obszary.map((o) => (
            <Polygon
              key={o.id}
              points={o.wierzcholkiPdf.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={hexDoRgba(o.kolorWypelnienia, 0.45)}
              stroke={o.kolorWypelnienia || '#E8A020'}
              strokeWidth={Math.max(viewW, viewH) * 0.0015}
            />
          ))}
          {arkusz.obszary.flatMap((o) =>
            (o.krawedzniki ?? []).map((k) => (
              <Polyline
                key={k.id}
                points={k.wierzcholkiPdf.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={k.kolor || '#FF0000'}
                strokeWidth={Math.max(viewW, viewH) * 0.0022}
              />
            )),
          )}
        </G>
      </Svg>
      <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
        {arkusz.obszary.length} obszar(ów) · {arkusz.obszary.reduce((n, o) => n + (o.krawedzniki?.length ?? 0), 0)} krawężników
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  nag: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 2 },
  nazwa: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, paddingHorizontal: 12, paddingBottom: 8 },
  puste: { borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
