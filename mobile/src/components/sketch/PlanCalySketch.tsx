// ============================================================
// SZKIC CAŁEGO PLANU – jeden ciągły odcinek dnia (LIVE)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Svg, {
  Rect as SvgRect, Line as SvgLine, Text as SvgText,
  G as SvgG, Circle as SvgCircle, Polygon as SvgPolygon, Path as SvgPath,
  Defs, ClipPath,
} from 'react-native-svg';
import { lightTheme, darkTheme } from '../../constants/theme';
import {
  obliczPowierzchniFigury, dlugoscFigury, sredniaSzerokoscFigury, formatLiczby,
} from '../../utils/calculations';
import {
  SKETCH_LEFT_MARGIN as LEFT_MARGIN,
  SKETCH_BLOCK_W as SKETCH_W,
  SKETCH_SVG_W as SVG_W,
  SKETCH_PAD,
  obliczWysokosciFigur,
  metryDoY,
} from '../../utils/sketchLayout';
import type { FiguraWCiaguPlanu, MarkerPlanuCiaglego } from '../../utils/planCiagly';
import type { Figura, WpisLive } from '../../types';

const PAD_TOP = SKETCH_PAD.top;
const PAD_BOT = SKETCH_PAD.bot;

function PaverTopSVG({ x, y, szer }: { x: number; y: number; szer: number }) {
  const W = szer * 0.85;
  const CW = szer * 0.55;
  const CL = 22;
  return (
    <SvgG transform={`translate(${x - CW / 2}, ${y - CL / 2})`}>
      <SvgRect x={(CW - W) / 2} y={CL - 3} width={W} height={6} rx="2" fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x="0" y="3" width={CW} height={CL - 6} rx="3" fill="#d4900f" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x={CW * 0.2} y="5" width={CW * 0.6} height={CL - 12} rx="2" fill="#c4860f" />
      <SvgPolygon points={`0,3 ${CW},3 ${CW / 2},0`} fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x={-5} y="2" width="5" height={CL - 4} rx="2" fill="#1a1a1a" />
      <SvgRect x={CW} y="2" width="5" height={CL - 4} rx="2" fill="#1a1a1a" />
    </SvgG>
  );
}

function TruckTopSVG({ x, y, nrAuta }: { x: number; y: number; nrAuta: number }) {
  return (
    <SvgG transform={`translate(${x - 18}, ${y - 10})`}>
      <SvgRect x="5" y="0" width="26" height="10" rx="2" fill="#c4860f" />
      <SvgRect x="2" y="10" width="32" height="16" rx="2" fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
      <SvgText x="18" y="21" fontSize={nrAuta >= 10 ? '8' : '9'} fontWeight="900" fill="#1a1a1a" textAnchor="middle">{String(nrAuta)}</SvgText>
      <SvgCircle cx="7" cy="10" r="4" fill="#1a1a1a" />
      <SvgCircle cx="29" cy="10" r="4" fill="#1a1a1a" />
      <SvgCircle cx="7" cy="26" r="4" fill="#1a1a1a" />
      <SvgCircle cx="29" cy="26" r="4" fill="#1a1a1a" />
    </SvgG>
  );
}

function maxSzerokoscFigury(figura: Figura): number {
  switch (figura.typ) {
    case 'prostokat': return figura.szerokosc;
    case 'trapez': return Math.max(figura.szerokosc1, figura.szerokosc2);
    case 'trojkat': return figura.szerokosc;
    case 'pierscien': return figura.szerokosc * 1.5;
    case 'wjazd': return figura.s;
    default: return 1;
  }
}

function szerNaPix(szer: number, maxSzer: number): number {
  return Math.max(6, (szer / maxSzer) * SKETCH_W);
}

function FiguraKsztalt({
  figura, yFig, hFig, maxSzer, fill, stroke, strokeW,
}: {
  figura: Figura; yFig: number; hFig: number; maxSzer: number;
  fill: string; stroke: string; strokeW: number;
}) {
  const cx = LEFT_MARGIN + SKETCH_W / 2;
  switch (figura.typ) {
    case 'prostokat': {
      const w = szerNaPix(figura.szerokosc, maxSzer);
      return <SvgRect x={cx - w / 2} y={yFig} width={w} height={hFig} rx="2" fill={fill} stroke={stroke} strokeWidth={strokeW} />;
    }
    case 'trapez': {
      const w1 = szerNaPix(figura.szerokosc1, maxSzer);
      const w2 = szerNaPix(figura.szerokosc2, maxSzer);
      const pts = `${cx - w1 / 2},${yFig} ${cx + w1 / 2},${yFig} ${cx + w2 / 2},${yFig + hFig} ${cx - w2 / 2},${yFig + hFig}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} />;
    }
    case 'trojkat': {
      const w = szerNaPix(figura.szerokosc, maxSzer);
      const pts = `${cx - w / 2},${yFig} ${cx + w / 2},${yFig} ${cx},${yFig + hFig}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} />;
    }
    case 'pierscien': {
      const wZewn = szerNaPix(figura.szerokosc * 1.35, maxSzer);
      const wWewn = szerNaPix(figura.szerokosc * 0.55, maxSzer);
      const bulge = Math.min(hFig * 0.2, 14);
      const d = `M ${cx - wZewn / 2} ${yFig} Q ${cx} ${yFig + bulge} ${cx + wZewn / 2} ${yFig} L ${cx + wWewn / 2} ${yFig + hFig} Q ${cx} ${yFig + hFig - bulge} ${cx - wWewn / 2} ${yFig + hFig} Z`;
      return <SvgPath d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} />;
    }
    case 'wjazd': {
      const w = szerNaPix(figura.s, maxSzer);
      const udzialL = figura.L / Math.max(figura.L + figura.R1 + figura.R2, 1);
      const yL = yFig + hFig * Math.min(udzialL, 0.75);
      const pts = `${cx - w / 2},${yFig} ${cx + w / 2},${yFig} ${cx + w / 2},${yL} ${cx + w / 4},${yFig + hFig} ${cx - w / 4},${yFig + hFig} ${cx - w / 2},${yL}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} />;
    }
    default:
      return <SvgRect x={LEFT_MARGIN} y={yFig} width={SKETCH_W} height={hFig} fill={fill} stroke={stroke} strokeWidth={strokeW} />;
  }
}

export interface PlanCalySketchProps {
  figuryPlanu: FiguraWCiaguPlanu[];
  wykonaneMetryGlobalne: number;
  markery: MarkerPlanuCiaglego[];
  onTruckPress?: (wpis: WpisLive, idxGlobalny: number) => void;
}

export function PlanCalySketch({
  figuryPlanu,
  wykonaneMetryGlobalne,
  markery,
  onTruckPress,
}: PlanCalySketchProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const isDark = colorScheme === 'dark';

  if (figuryPlanu.length === 0) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={[styles.pustyTekst, { color: theme.colors.textSecondary }]}>Brak figur w planie</Text>
      </View>
    );
  }

  const figury = figuryPlanu.map((f) => f.figura);
  const heights = obliczWysokosciFigur(figury, 'live');
  const maxSzer = Math.max(...figury.map(maxSzerokoscFigury), 1);

  const cumHeights: number[] = [];
  let yAcc = PAD_TOP;
  for (const h of heights) { cumHeights.push(yAcc); yAcc += h; }
  const svgH = yAcc + PAD_BOT;

  const lacznaDl = figuryPlanu.reduce((s, f) => s + dlugoscFigury(f.figura), 0);
  const paverY = metryDoY(figury, heights, Math.min(wykonaneMetryGlobalne, lacznaDl));
  const isLive = wykonaneMetryGlobalne > 0 || markery.length > 0;

  const koniecDzialki = new Set<number>();
  for (let i = 0; i < figuryPlanu.length - 1; i++) {
    if (figuryPlanu[i].dzialkaId !== figuryPlanu[i + 1].dzialkaId) {
      koniecDzialki.add(i);
    }
  }

  return (
    <Svg width={SVG_W} height={svgH}>
      {figuryPlanu.map((fp, idx) => {
        const pow = obliczPowierzchniFigury(fp.figura);
        const yFig = cumHeights[idx];
        const hFig = heights[idx];
        const cx = LEFT_MARGIN + SKETCH_W / 2;
        const isEven = idx % 2 === 0;
        const fill = isEven ? '#E8A02020' : '#2E86AB20';
        const stroke = isEven ? '#E8A020' : '#2E86AB';
        const textColor = isDark ? '#9CA3AF' : '#6B7280';

        return (
          <SvgG key={`${fp.dzialkaId}-${fp.figura.id}`}>
            {idx === 0 || figuryPlanu[idx - 1].dzialkaId !== fp.dzialkaId ? (
              <SvgG>
                <SvgLine x1={LEFT_MARGIN - 8} y1={yFig - 4} x2={LEFT_MARGIN + SKETCH_W + 8} y2={yFig - 4} stroke={theme.colors.primary} strokeWidth="1" strokeDasharray="4,3" />
                <SvgText x={LEFT_MARGIN + SKETCH_W + 10} y={yFig + 2} fontSize="9" fontWeight="700" fill={theme.colors.primary}>{fp.dzialkaNazwa}</SvgText>
              </SvgG>
            ) : null}
            <FiguraKsztalt figura={fp.figura} yFig={yFig} hFig={hFig} maxSzer={maxSzer} fill={fill} stroke={stroke} strokeW={1.5} />
            <SvgText x={cx - 10} y={yFig + hFig / 2 + 5} fontSize="11" fontWeight="700" fill={isEven ? '#E8A020' : '#2E86AB'} textAnchor="middle">{idx + 1}</SvgText>
            <SvgText x={LEFT_MARGIN + SKETCH_W + 8} y={yFig + 4} fontSize="8" fill={textColor}>{formatLiczby(fp.metryGlobalneStart)} m</SvgText>
            {koniecDzialki.has(idx) && (
              <SvgLine x1={LEFT_MARGIN - 4} y1={yFig + hFig} x2={LEFT_MARGIN + SKETCH_W + 4} y2={yFig + hFig} stroke={textColor} strokeWidth="1" strokeDasharray="3,3" />
            )}
            {idx === figuryPlanu.length - 1 && (
              <SvgText x={LEFT_MARGIN + SKETCH_W + 8} y={yFig + hFig} fontSize="8" fill={textColor}>
                {formatLiczby(fp.metryGlobalneStart + dlugoscFigury(fp.figura))} m
              </SvgText>
            )}
          </SvgG>
        );
      })}

      {isLive && wykonaneMetryGlobalne > 0 && (
        <>
          <Defs>
            {figuryPlanu.map((fp, idx) => {
              const figStart = fp.metryGlobalneStart;
              const figLen = dlugoscFigury(fp.figura);
              const passedInFig = Math.min(Math.max(wykonaneMetryGlobalne - figStart, 0), figLen);
              if (passedInFig <= 0) return null;
              const yFig = cumHeights[idx];
              const hFig = heights[idx];
              const kolorLR = fp.figura.typ === 'wjazd' || fp.figura.typ === 'pierscien';
              const clipId = `clip-plan-${fp.dzialkaId}-${fp.figura.id}`;
              if (kolorLR) {
                const frac = passedInFig / Math.max(figLen, 1);
                return (
                  <ClipPath key={clipId} id={clipId}>
                    <SvgRect x={LEFT_MARGIN - 2} y={yFig} width={(SKETCH_W + 4) * frac} height={hFig} />
                  </ClipPath>
                );
              }
              const partialH = hFig * (passedInFig / Math.max(figLen, 1));
              return (
                <ClipPath key={clipId} id={clipId}>
                  <SvgRect x={LEFT_MARGIN - 2} y={yFig} width={SKETCH_W + 4} height={partialH} />
                </ClipPath>
              );
            })}
          </Defs>
          {figuryPlanu.map((fp, idx) => {
            const figStart = fp.metryGlobalneStart;
            const figLen = dlugoscFigury(fp.figura);
            const passedInFig = Math.min(Math.max(wykonaneMetryGlobalne - figStart, 0), figLen);
            if (passedInFig <= 0) return null;
            const yFig = cumHeights[idx];
            const hFig = heights[idx];
            const clipId = `clip-plan-${fp.dzialkaId}-${fp.figura.id}`;
            return (
              <SvgG key={`pass-${clipId}`} clipPath={`url(#${clipId})`}>
                <FiguraKsztalt figura={fp.figura} yFig={yFig} hFig={hFig} maxSzer={maxSzer} fill="#000000" stroke="#000000" strokeW={0} />
              </SvgG>
            );
          })}
          {paverY > PAD_TOP && (
            <SvgLine x1={LEFT_MARGIN - 4} y1={paverY} x2={LEFT_MARGIN + SKETCH_W + 4} y2={paverY} stroke="#E8A020" strokeWidth="2" />
          )}
          {paverY > PAD_TOP + 14 && (
            <PaverTopSVG x={LEFT_MARGIN + SKETCH_W / 2} y={paverY} szer={SKETCH_W - 4} />
          )}
          {markery.map((marker) => {
            const markerY = metryDoY(figury, heights, marker.metryKumulatywne);
            return (
              <SvgG key={marker.wpis.id}>
                <SvgLine x1={LEFT_MARGIN - 6} y1={markerY} x2={LEFT_MARGIN + SKETCH_W} y2={markerY} stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="4,3" />
                <SvgG onPress={() => onTruckPress?.(marker.wpis, marker.idxGlobalny)}>
                  <TruckTopSVG x={LEFT_MARGIN / 2} y={markerY} nrAuta={marker.wpis.numerAuta} />
                </SvgG>
              </SvgG>
            );
          })}
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  pusty: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  pustyTekst: { fontSize: 14 },
});
