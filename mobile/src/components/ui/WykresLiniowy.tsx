import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useMotyw } from '../../hooks/useMotyw';
import { PROMIEN } from '../../constants/styl';

export interface PunktWykresu {
  x: number;
  y: number;
  /** Pokaż wartość nad punktem (np. początek okresu). */
  znacznik?: boolean;
}

interface Props {
  punkty: PunktWykresu[];
  formatY: (y: number) => string;
  etykietyX?: Array<{ x: number; tekst: string }>;
  odniesienie?: { y: number; etykieta: string };
  wysokosc?: number;
  opis?: string;
}

const CZCIONKA = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const MARGINES = { gora: 22, dol: 26, lewy: 8, prawy: 8 };

/** Wykres liniowy z wypełnieniem – historia ceny, stawek itp. */
export function WykresLiniowy({ punkty, formatY, etykietyX = [], odniesienie, wysokosc = 190, opis }: Props) {
  const theme = useMotyw();
  const [szerokosc, setSzerokosc] = useState(0);
  if (punkty.length === 0) return null;

  const xs = punkty.map((p) => p.x);
  const ys = [...punkty.map((p) => p.y), ...(odniesienie ? [odniesienie.y] : [])];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const zakresY = Math.max(...ys) - Math.min(...ys);
  const zapas = zakresY > 0 ? zakresY * 0.15 : Math.max(1, Math.abs(ys[0]) * 0.05);
  const minY = Math.min(...ys) - zapas;
  const maxY = Math.max(...ys) + zapas;
  const w = Math.max(0, szerokosc - MARGINES.lewy - MARGINES.prawy);
  const h = wysokosc - MARGINES.gora - MARGINES.dol;
  const px = (x: number) => MARGINES.lewy + (maxX === minX ? w / 2 : ((x - minX) / (maxX - minX)) * w);
  const py = (y: number) => MARGINES.gora + (1 - (y - minY) / (maxY - minY)) * h;

  const linia = punkty.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
  const pole = `${linia} L${px(punkty[punkty.length - 1].x).toFixed(1)},${MARGINES.gora + h} L${px(punkty[0].x).toFixed(1)},${MARGINES.gora + h} Z`;

  return (
    <View
      accessibilityLabel={opis ?? 'Wykres'}
      style={[styles.ramka, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      onLayout={(e) => setSzerokosc(e.nativeEvent.layout.width)}
    >
      {szerokosc > 0 ? (
        <Svg width={szerokosc} height={wysokosc}>
          <Defs>
            <LinearGradient id="wypelnienie" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={theme.colors.primary} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((t) => (
            <Line
              key={t}
              x1={MARGINES.lewy} x2={MARGINES.lewy + w}
              y1={MARGINES.gora + t * h} y2={MARGINES.gora + t * h}
              stroke={theme.colors.border} strokeWidth={1}
            />
          ))}
          {odniesienie ? (
            <>
              <Line
                x1={MARGINES.lewy} x2={MARGINES.lewy + w} y1={py(odniesienie.y)} y2={py(odniesienie.y)}
                stroke={theme.colors.textSecondary} strokeWidth={1.2} strokeDasharray="5 4"
              />
              <SvgText fontFamily={CZCIONKA} x={MARGINES.lewy + 2} y={py(odniesienie.y) - 4} fontSize={10} fill={theme.colors.textSecondary}>
                {odniesienie.etykieta}
              </SvgText>
            </>
          ) : null}
          {punkty.length > 1 ? <Path d={pole} fill="url(#wypelnienie)" /> : null}
          <Path d={linia} stroke={theme.colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {punkty.filter((p) => p.znacznik).map((p) => (
            <React.Fragment key={`${p.x}-${p.y}`}>
              <Circle cx={px(p.x)} cy={py(p.y)} r={4.5} fill={theme.colors.card} stroke={theme.colors.primary} strokeWidth={2.5} />
              <SvgText
              fontFamily={CZCIONKA}
                x={Math.min(Math.max(px(p.x), MARGINES.lewy + 22), MARGINES.lewy + w - 22)}
                y={py(p.y) - 9}
                fontSize={11}
                fontWeight="700"
                fill={theme.colors.text}
                textAnchor="middle"
              >
                {formatY(p.y)}
              </SvgText>
            </React.Fragment>
          ))}
          {etykietyX.map((e, i) => (
            <SvgText
              fontFamily={CZCIONKA}
              key={`${e.x}-${i}`}
              x={px(e.x)}
              y={wysokosc - 8}
              fontSize={10}
              fill={theme.colors.textSecondary}
              textAnchor={i === 0 ? 'start' : i === etykietyX.length - 1 ? 'end' : 'middle'}
            >
              {e.tekst}
            </SvgText>
          ))}
        </Svg>
      ) : <View style={{ height: wysokosc }} />}
      {punkty.length === 1 ? (
        <Text style={[styles.uwaga, { color: theme.colors.textSecondary }]}>Jeden okres – dodaj kolejne, aby zobaczyć zmiany.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ramka: { borderWidth: 1, borderRadius: PROMIEN.m, overflow: 'hidden' },
  uwaga: { fontSize: 12, textAlign: 'center', paddingBottom: 8 },
});
