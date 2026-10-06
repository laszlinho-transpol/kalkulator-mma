// ============================================================
// SZKIC 2D – wizualizacja działki roboczej z trybem Live
// Rozkładarka: widok z góry (z lotu ptaka) – jak w specyfikacji PDF
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView, useColorScheme,
} from 'react-native';
import Svg, {
  Rect as SvgRect, Line as SvgLine, Text as SvgText,
  G as SvgG, Polygon as SvgPolygon, Path as SvgPath,
  Defs, ClipPath,
} from 'react-native-svg';
import { FILL_ULOZONE, MaszynaObmiaru } from './MaszynyObmiaru';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';
import {
  obliczPowierzchniFigury, dlugoscFigury, sredniaSzerokoscFigury, obliczWynikiDzialki, formatLiczby,
} from '../../utils/calculations';
import { obliczPikietazFigur, formatujPikietaz } from '../../utils/chainage';
import { NAZWY_FIGUR } from '../../constants';
import {
  SKETCH_LEFT_MARGIN as LEFT_MARGIN,
  SKETCH_BLOCK_W as SKETCH_W,
  SKETCH_SVG_W as SVG_W,
  SKETCH_PAD,
  obliczWysokosciFigur,
  cumMetryFigur,
  metryDoY,
  szerokoscObszaruSzkicuPx,
  type TrybSzkicu,
} from '../../utils/sketchLayout';
import type { DzialkaRobocza, Figura, WpisLive } from '../../types';

const PAD_TOP = SKETCH_PAD.top;
const PAD_BOT = SKETCH_PAD.bot;
/** Szkic figur idzie w dół kartki – przód maszyny (+X) obracamy o 90°. */
const ROT_UKLADANIA = 90;

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

function maxSzerokoscDzialki(figury: Figura[]): number {
  return Math.max(...figury.map(maxSzerokoscFigury), 1);
}

function szerNaPix(szer: number, maxSzer: number): number {
  return Math.max(6, (szer / maxSzer) * SKETCH_W);
}

function FiguraKsztalt({
  figura, yFig, hFig, maxSzer, fill, stroke, strokeW, onPress,
}: {
  figura: Figura; yFig: number; hFig: number; maxSzer: number;
  fill: string; stroke: string; strokeW: number; onPress: () => void;
}) {
  const cx = LEFT_MARGIN + SKETCH_W / 2;
  const x0 = LEFT_MARGIN;

  switch (figura.typ) {
    case 'prostokat': {
      const w = szerNaPix(figura.szerokosc, maxSzer);
      return (
        <SvgRect x={cx - w / 2} y={yFig} width={w} height={hFig} rx="2"
          fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />
      );
    }
    case 'trapez': {
      const w1 = szerNaPix(figura.szerokosc1, maxSzer);
      const w2 = szerNaPix(figura.szerokosc2, maxSzer);
      const pts = `${cx - w1 / 2},${yFig} ${cx + w1 / 2},${yFig} ${cx + w2 / 2},${yFig + hFig} ${cx - w2 / 2},${yFig + hFig}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />;
    }
    case 'trojkat': {
      const w = szerNaPix(figura.szerokosc, maxSzer);
      const pts = `${cx - w / 2},${yFig} ${cx + w / 2},${yFig} ${cx},${yFig + hFig}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />;
    }
    case 'pierscien': {
      const wZewn = szerNaPix(figura.szerokosc * 1.35, maxSzer);
      const wWewn = szerNaPix(figura.szerokosc * 0.55, maxSzer);
      const bulge = Math.min(hFig * 0.2, 14);
      const d = `M ${cx - wZewn / 2} ${yFig} Q ${cx} ${yFig + bulge} ${cx + wZewn / 2} ${yFig} L ${cx + wWewn / 2} ${yFig + hFig} Q ${cx} ${yFig + hFig - bulge} ${cx - wWewn / 2} ${yFig + hFig} Z`;
      return <SvgPath d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />;
    }
    case 'wjazd': {
      const w = szerNaPix(figura.s, maxSzer);
      const udzialL = figura.L / Math.max(figura.L + figura.R1 + figura.R2, 1);
      const yL = yFig + hFig * Math.min(udzialL, 0.75);
      const pts = `${cx - w / 2},${yFig} ${cx + w / 2},${yFig} ${cx + w / 2},${yL} ${cx + w / 4},${yFig + hFig} ${cx - w / 4},${yFig + hFig} ${cx - w / 2},${yL}`;
      return <SvgPolygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />;
    }
    default:
      return (
        <SvgRect x={x0} y={yFig} width={SKETCH_W} height={hFig}
          fill={fill} stroke={stroke} strokeWidth={strokeW} onPress={onPress} />
      );
  }
}


export interface WpisLiveMarker {
  wpis: WpisLive;
  metryKumulatywne: number;
}

interface DzialkaSketchProps {
  dzialka: DzialkaRobocza;
  ciezarObjetosciowy: number;
  wykonaneMetry?: number;
  markery?: WpisLiveMarker[];
  onTruckPress?: (wpis: WpisLive, idxWpisu: number) => void;
  /** standard = kompakt (plan, archiwum); live = px/m dla długich odcinków */
  trybSzkicu?: TrybSzkicu;
  /** false gdy rodzic owija szkic we własnym ScrollView (zakładka LIVE) */
  scrollowalny?: boolean;
  /** Unikalny prefiks ID clipPath (wymagany gdy kilka szkiców na ekranie) */
  idPrefix?: string;
}

export function DzialkaSketch({
  dzialka,
  ciezarObjetosciowy,
  wykonaneMetry = 0,
  markery = [],
  onTruckPress,
  trybSzkicu = 'standard',
  scrollowalny = true,
  idPrefix = '',
}: DzialkaSketchProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [selectedFigura, setSelectedFigura] = useState<Figura | null>(null);

  const { figury } = dzialka;
  if (figury.length === 0) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={[styles.pustyTekst, { color: theme.colors.textSecondary }]}>Dodaj figury, aby zobaczyć szkic</Text>
      </View>
    );
  }

  const heights = obliczWysokosciFigur(figury, trybSzkicu);
  const maxSzer = maxSzerokoscDzialki(figury);
  const pikietaze = obliczPikietazFigur(dzialka);
  const cumMetry = cumMetryFigur(figury);
  const cumHeights: number[] = [];
  let yAcc = PAD_TOP;
  for (const h of heights) { cumHeights.push(yAcc); yAcc += h; }
  const svgH = yAcc + PAD_BOT;

  const paverY = metryDoY(figury, heights, Math.min(wykonaneMetry, cumMetry[figury.length - 1] + dlugoscFigury(figury[figury.length - 1])));
  const isLiveMode = wykonaneMetry > 0 || markery.length > 0;
  const isDark = colorScheme === 'dark';
  const clipId = (figId: string) => `clip-pass-${idPrefix}${figId}`;

  const svgContent = (
        <Svg width={SVG_W} height={svgH}>
          {/* Bloki figur */}
          {figury.map((figura, idx) => {
            const pow = obliczPowierzchniFigury(figura);
            const yFig = cumHeights[idx];
            const hFig = heights[idx];
            const cx = LEFT_MARGIN + SKETCH_W / 2;
            const isEven = idx % 2 === 0;
            const fill = isEven ? '#E8A02020' : '#2E86AB20';
            const stroke = isEven ? '#E8A020' : '#2E86AB';

            return (
              <SvgG key={figura.id}>
                <FiguraKsztalt
                  figura={figura}
                  yFig={yFig}
                  hFig={hFig}
                  maxSzer={maxSzer}
                  fill={fill}
                  stroke={stroke}
                  strokeW={1.5}
                  onPress={() => setSelectedFigura(figura)}
                />
                <SvgText x={cx - 10} y={yFig + hFig / 2 + 5} fontSize="11" fontWeight="700" fill={isEven ? '#E8A020' : '#2E86AB'} textAnchor="middle">{idx + 1}</SvgText>
                <SvgText x={cx + 12} y={yFig + hFig / 2 + 5} fontSize="8" fill={isDark ? '#aaa' : '#555'} textAnchor="middle">{pow.toFixed(0)}m²</SvgText>
              </SvgG>
            );
          })}

          {/* Pikietaże */}
          {figury.map((_, idx) => {
            const pik = pikietaze[idx];
            const yFig = cumHeights[idx];
            const textColor = isDark ? '#9CA3AF' : '#6B7280';
            return (
              <SvgG key={`pik-${idx}`}>
                <SvgLine x1={LEFT_MARGIN + SKETCH_W} y1={yFig} x2={LEFT_MARGIN + SKETCH_W + 5} y2={yFig} stroke={textColor} strokeWidth="1" />
                <SvgText x={LEFT_MARGIN + SKETCH_W + 7} y={yFig + 4} fontSize="8" fill={textColor}>{formatujPikietaz(pik.poczatek)}</SvgText>
                {idx === figury.length - 1 && (
                  <>
                    <SvgLine x1={LEFT_MARGIN + SKETCH_W} y1={yFig + heights[idx]} x2={LEFT_MARGIN + SKETCH_W + 5} y2={yFig + heights[idx]} stroke={textColor} strokeWidth="1" />
                    <SvgText x={LEFT_MARGIN + SKETCH_W + 7} y={yFig + heights[idx] + 4} fontSize="8" fill={textColor}>{formatujPikietaz(pik.koniec)}</SvgText>
                  </>
                )}
              </SvgG>
            );
          })}

          {/* Live mode – zamalowanie przejechanych pól w kształcie figury */}
          {isLiveMode && wykonaneMetry > 0 && (
            <>
              <Defs>
                {figury.map((figura, idx) => {
                  const figStart = cumMetry[idx];
                  const figLen = dlugoscFigury(figura);
                  const passedInFig = Math.min(Math.max(wykonaneMetry - figStart, 0), figLen);
                  if (passedInFig <= 0) return null;
                  const yFig = cumHeights[idx];
                  const hFig = heights[idx];
                  const kolorLR = figura.typ === 'wjazd' || figura.typ === 'pierscien';
                  if (kolorLR) {
                    const frac = passedInFig / Math.max(figLen, 1);
                    return (
                      <ClipPath key={`clip-${figura.id}`} id={clipId(figura.id)}>
                        <SvgRect x={LEFT_MARGIN - 2} y={yFig} width={(SKETCH_W + 4) * frac} height={hFig} />
                      </ClipPath>
                    );
                  }
                  const partialH = hFig * (passedInFig / Math.max(figLen, 1));
                  return (
                    <ClipPath key={`clip-${figura.id}`} id={clipId(figura.id)}>
                      <SvgRect x={LEFT_MARGIN - 2} y={yFig} width={SKETCH_W + 4} height={partialH} />
                    </ClipPath>
                  );
                })}
              </Defs>
              {figury.map((figura, idx) => {
                const figStart = cumMetry[idx];
                const figLen = dlugoscFigury(figura);
                const passedInFig = Math.min(Math.max(wykonaneMetry - figStart, 0), figLen);
                if (passedInFig <= 0) return null;
                const yFig = cumHeights[idx];
                const hFig = heights[idx];
                return (
                  <SvgG key={`pass-${figura.id}`} clipPath={`url(#${clipId(figura.id)})`}>
                    <FiguraKsztalt
                      figura={figura}
                      yFig={yFig}
                      hFig={hFig}
                      maxSzer={maxSzer}
                      fill={FILL_ULOZONE}
                      stroke="none"
                      strokeW={0}
                      onPress={() => {}}
                    />
                  </SvgG>
                );
              })}
              {wykonaneMetry > 0 && (
                <MaszynaObmiaru
                  x={LEFT_MARGIN + SKETCH_W / 2}
                  y={paverY}
                  rotDeg={ROT_UKLADANIA}
                  szerObszaru={szerokoscObszaruSzkicuPx(figury, wykonaneMetry)}
                  rodzaj="rozkladarka"
                />
              )}
              {markery.map((marker, mIdx) => {
                const markerY = metryDoY(figury, heights, marker.metryKumulatywne);
                return (
                  <SvgG key={marker.wpis.id} onPress={() => onTruckPress?.(marker.wpis, mIdx)}>
                    <MaszynaObmiaru
                      x={LEFT_MARGIN + SKETCH_W / 2}
                      y={markerY}
                      rotDeg={ROT_UKLADANIA}
                      szerObszaru={szerokoscObszaruSzkicuPx(figury, marker.metryKumulatywne)}
                      rodzaj="auto"
                      numer={marker.wpis.numerAuta}
                    />
                  </SvgG>
                );
              })}
            </>
          )}
        </Svg>
  );

  return (
    <>
      {scrollowalny ? (
        <ScrollView horizontal={false} showsVerticalScrollIndicator={trybSzkicu === 'live'} nestedScrollEnabled>
          {svgContent}
        </ScrollView>
      ) : (
        svgContent
      )}

      {/* Modal figury */}
      {selectedFigura && (() => {
        const idx = figury.indexOf(selectedFigura);
        const pik = idx >= 0 ? pikietaze[idx] : null;
        const pow = obliczPowierzchniFigury(selectedFigura);
        const masa = pow * (dzialka.grubosc / 100) * ciezarObjetosciowy;
        const dlugFig = dlugoscFigury(selectedFigura);
        const metryStart = idx >= 0 ? cumMetry[idx] : 0;
        const pozostaloM = Math.max(0, (metryStart + dlugFig) - wykonaneMetry);
        const pozostaloPow = pow * (dlugFig > 0 ? pozostaloM / dlugFig : 0);
        const pozostaloMasa = pozostaloPow * (dzialka.grubosc / 100) * ciezarObjetosciowy;

        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedFigura(null)}>
            <Pressable style={styles.modalTlo} onPress={() => setSelectedFigura(null)}>
              <View style={[styles.modalKarta, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTytul, { color: theme.colors.text }]}>
                  {pik ? `${formatujPikietaz(pik.poczatek)} – ${formatujPikietaz(pik.koniec)}` : NAZWY_FIGUR[selectedFigura.typ]}
                </Text>
                <Text style={[styles.modalPodtytul, { color: theme.colors.textSecondary }]}>Figura #{(idx ?? 0) + 1} – {NAZWY_FIGUR[selectedFigura.typ]}</Text>
                <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                <WiersInfo label="Powierzchnia" w={`${formatLiczby(pow)} m²`} theme={theme} />
                <WiersInfo label="Długość" w={`${formatLiczby(dlugFig)} m`} theme={theme} />
                <WiersInfo label="Śr. szerokość" w={`${formatLiczby(sredniaSzerokoscFigury(selectedFigura))} m`} theme={theme} />
                <WiersInfo label="Ilość masy" w={`${formatLiczby(masa, 2)} Mg`} theme={theme} />
                {wykonaneMetry > 0 && (
                  <>
                    <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.modalPodtytul, { color: theme.colors.textSecondary }]}>Pozostało do końca:</Text>
                    <WiersInfo label="Długość" w={`${formatLiczby(pozostaloM)} m`} theme={theme} />
                    <WiersInfo label="Powierzchnia" w={`${formatLiczby(pozostaloPow)} m²`} theme={theme} />
                    <WiersInfo label="Masa" w={`${formatLiczby(pozostaloMasa, 2)} Mg`} theme={theme} />
                  </>
                )}
                <TouchableOpacity style={[styles.btnZamknij, { backgroundColor: theme.colors.primary }]} onPress={() => setSelectedFigura(null)}>
                  <Text style={styles.btnZamknijTekst}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        );
      })()}
    </>
  );
}

function WiersInfo({ label, w, theme }: { label: string; w: string; theme: AppTheme }) {
  return (
    <View style={styles.infoWiersz}>
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoWartosc, { color: theme.colors.text }]}>{w}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pusty: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  pustyTekst: { fontSize: 14 },
  modalTlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalKarta: { width: '100%', borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTytul: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalPodtytul: { fontSize: 13, marginBottom: 12 },
  sep: { height: 1, marginVertical: 12 },
  infoWiersz: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoWartosc: { fontSize: 14, fontWeight: '600' },
  btnZamknij: { marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnZamknijTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
