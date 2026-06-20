// ============================================================
// SZKIC 2D – wizualizacja działki roboczej z trybem Live
// Rozkładarka: widok z góry | Wywrotka: widok z boku (jak wcześniej)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView, Dimensions,
} from 'react-native';
import Svg, {
  Rect as SvgRect, Line as SvgLine, Text as SvgText,
  G as SvgG, Polygon as SvgPolygon,
} from 'react-native-svg';
import { useAppTheme } from '../../context/ThemeContext';
import { Wywrotka } from '../../../assets/svg/Wywrotka';
import {
  obliczPowierzchniFigury, dlugoscFigury, formatLiczby,
} from '../../utils/calculations';
import { obliczPikietazFigur, formatujPikietaz } from '../../utils/chainage';
import { NAZWY_FIGUR } from '../../constants';
import type { DzialkaRobocza, Figura, WpisLive } from '../../types';
import type { AppTheme } from '../../constants/theme';

const SCREEN_H = Dimensions.get('window').height;
const LEFT_MARGIN = 52;
const SKETCH_W = 88;
const RIGHT_MARGIN = 62;
const SVG_W = LEFT_MARGIN + SKETCH_W + RIGHT_MARGIN;
const MIN_H = 44;
const MAX_H = 220;
const PAD_TOP = 16;
const PAD_BOT = 16;
const MIN_ODSTEP_AUT = 36;
const MAX_WYSOKOSC_OKNA = Math.min(360, SCREEN_H * 0.42);

function obliczWysokosci(figury: Figura[]): number[] {
  if (figury.length === 0) return [];
  const lengths = figury.map(dlugoscFigury);
  const maxLen = Math.max(...lengths, 1);
  const sumaLen = lengths.reduce((s, l) => s + l, 0);
  const skala = sumaLen > 0 ? Math.min(1, (MAX_H * figury.length * 0.6) / sumaLen) : 1;
  return lengths.map((l) => Math.max(MIN_H, Math.round((l / maxLen) * MAX_H * Math.max(skala, 0.5))));
}

function metryDoY(figury: Figura[], heights: number[], metryOdStartu: number): number {
  let cumMetry = 0, cumY = PAD_TOP;
  for (let i = 0; i < figury.length; i++) {
    const l = dlugoscFigury(figury[i]);
    if (metryOdStartu <= cumMetry + l) {
      return cumY + ((metryOdStartu - cumMetry) / Math.max(l, 1)) * heights[i];
    }
    cumMetry += l; cumY += heights[i];
  }
  return cumY;
}

function cumMetryFigur(figury: Figura[]): number[] {
  const res: number[] = []; let cum = 0;
  for (const f of figury) { res.push(cum); cum += dlugoscFigury(f); }
  return res;
}

/** Rozmieszcza markery aut z minimalnym odstępem, aby nie nachodziły */
function rozmiescMarkeryY(pozycje: number[]): number[] {
  if (pozycje.length === 0) return [];
  const wynik = [pozycje[0]];
  for (let i = 1; i < pozycje.length; i++) {
    const poprzednia = wynik[i - 1];
    wynik.push(Math.max(pozycje[i], poprzednia + MIN_ODSTEP_AUT));
  }
  return wynik;
}

function PaverTopSVG({ x, y, szer }: { x: number; y: number; szer: number }) {
  const W = szer * 0.85;
  const CW = szer * 0.55;
  const CL = 22;
  const cx = x;
  return (
    <SvgG transform={`translate(${cx - CW / 2}, ${y - CL / 2})`}>
      <SvgRect x={(CW - W) / 2} y={CL - 3} width={W} height={6} rx="2" fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x="0" y="3" width={CW} height={CL - 6} rx="3" fill="#d4900f" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x={CW * 0.2} y="5" width={CW * 0.6} height={CL - 12} rx="2" fill="#c4860f" />
      <SvgPolygon points={`0,3 ${CW},3 ${CW / 2},0`} fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
      <SvgRect x={-5} y="2" width="5" height={CL - 4} rx="2" fill="#1a1a1a" />
      <SvgRect x={CW} y="2" width="5" height={CL - 4} rx="2" fill="#1a1a1a" />
    </SvgG>
  );
}

export interface WpisLiveMarker {
  wpis: WpisLive;
  metryKumulatywne: number;
  ostatnieAuto?: boolean;
}

interface DzialkaSketchProps {
  dzialka: DzialkaRobocza;
  ciezarObjetosciowy: number;
  wykonaneMetry?: number;
  markery?: WpisLiveMarker[];
  onTruckPress?: (wpis: WpisLive, idxWpisu: number) => void;
  /** Maks. wysokość okna szkicu (domyślnie przewijane) */
  maxWysokosc?: number;
}

export function DzialkaSketch({
  dzialka, ciezarObjetosciowy, wykonaneMetry = 0, markery = [],
  onTruckPress, maxWysokosc = MAX_WYSOKOSC_OKNA,
}: DzialkaSketchProps) {
  const { theme, isDark } = useAppTheme();
  const [selectedFigura, setSelectedFigura] = useState<Figura | null>(null);

  const { figury } = dzialka;
  if (figury.length === 0) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={[styles.pustyTekst, { color: theme.colors.textSecondary }]}>Dodaj figury, aby zobaczyć szkic</Text>
      </View>
    );
  }

  const heights = obliczWysokosci(figury);
  const pikietaze = obliczPikietazFigur(dzialka);
  const cumMetry = cumMetryFigur(figury);
  const cumHeights: number[] = [];
  let yAcc = PAD_TOP;
  for (const h of heights) { cumHeights.push(yAcc); yAcc += h; }
  const svgH = yAcc + PAD_BOT;

  const ostatniaDl = dlugoscFigury(figury[figury.length - 1]);
  const maxMetry = cumMetry[figury.length - 1] + ostatniaDl;
  const paverY = metryDoY(figury, heights, Math.min(wykonaneMetry, maxMetry));
  const isLiveMode = wykonaneMetry > 0 || markery.length > 0;

  const pozycjeY = markery.map((m) => metryDoY(figury, heights, m.metryKumulatywne));
  const rozmieszczoneY = rozmiescMarkeryY(pozycjeY);

  const svgContent = (
    <Svg width={SVG_W} height={svgH}>
      {figury.map((figura, idx) => {
        const pow = obliczPowierzchniFigury(figura);
        const yFig = cumHeights[idx];
        const hFig = heights[idx];
        const cx = LEFT_MARGIN + SKETCH_W / 2;
        const isEven = idx % 2 === 0;
        return (
          <SvgG key={figura.id}>
            <SvgRect
              x={LEFT_MARGIN} y={yFig} width={SKETCH_W} height={hFig}
              fill={isEven ? '#E8A02020' : '#2E86AB20'}
              stroke={isEven ? '#E8A020' : '#2E86AB'}
              strokeWidth="1.5"
              onPress={() => setSelectedFigura(figura)}
            />
            <SvgText x={cx - 10} y={yFig + hFig / 2 + 5} fontSize="11" fontWeight="700" fill={isEven ? '#E8A020' : '#2E86AB'} textAnchor="middle">{idx + 1}</SvgText>
            <SvgText x={cx + 12} y={yFig + hFig / 2 + 5} fontSize="8" fill={isDark ? '#aaa' : '#555'} textAnchor="middle">{pow.toFixed(0)}m²</SvgText>
          </SvgG>
        );
      })}

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

      {isLiveMode && (
        <>
          <SvgRect x={LEFT_MARGIN} y={PAD_TOP} width={SKETCH_W} height={yAcc - PAD_TOP} fill="rgba(0,0,0,0.7)" />
          {paverY > PAD_TOP && (
            <SvgRect x={LEFT_MARGIN} y={PAD_TOP} width={SKETCH_W} height={paverY - PAD_TOP} fill="rgba(10,10,15,0.95)" />
          )}
          {paverY > PAD_TOP && (
            <SvgLine x1={LEFT_MARGIN - 4} y1={paverY} x2={LEFT_MARGIN + SKETCH_W + 4} y2={paverY} stroke="#E8A020" strokeWidth="2" />
          )}
          {wykonaneMetry > 0 && paverY > PAD_TOP + 14 && (
            <PaverTopSVG x={LEFT_MARGIN + SKETCH_W / 2} y={paverY} szer={SKETCH_W - 4} />
          )}
        </>
      )}
    </Svg>
  );

  return (
    <>
      <ScrollView
        style={{ maxHeight: maxWysokosc }}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <View style={{ position: 'relative', width: SVG_W, height: svgH }}>
          {svgContent}
          {/* Markery aut – widok z boku (Wywrotka) jako komponenty RN */}
          {isLiveMode && markery.map((marker, mIdx) => {
            const markerY = rozmieszczoneY[mIdx];
            return (
              <TouchableOpacity
                key={marker.wpis.id}
                style={{
                  position: 'absolute',
                  left: 2,
                  top: markerY - 19,
                  width: 48,
                  height: 38,
                }}
                onPress={() => onTruckPress?.(marker.wpis, mIdx)}
                activeOpacity={0.7}
              >
                <Wywrotka
                  nrAuta={marker.wpis.numerAuta}
                  width={48}
                  height={34}
                  kolorSkrzyni={marker.ostatnieAuto ? '#22C55E' : '#E8A020'}
                />
                {marker.ostatnieAuto && (
                  <View style={styles.badgeOstatnie}>
                    <Text style={styles.badgeOstatnieTekst}>OST.</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

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
  badgeOstatnie: {
    position: 'absolute', top: -6, right: -4,
    backgroundColor: '#22C55E', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1,
  },
  badgeOstatnieTekst: { color: '#fff', fontSize: 7, fontWeight: '900' },
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
