// ============================================================
// SZKIC 2D – wizualizacja działki roboczej z trybem Live
// – nakładka ciemna 70%→100%, rozkładarka SVG, markery aut
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView, useColorScheme, Dimensions,
} from 'react-native';
import Svg, {
  Rect as SvgRect, Line as SvgLine, Text as SvgText,
  G as SvgG, Circle as SvgCircle, Path as SvgPath,
  Polygon as SvgPolygon,
} from 'react-native-svg';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';
import {
  obliczPowierzchniFigury, dlugoscFigury, obliczWynikiDzialki, formatLiczby,
} from '../../utils/calculations';
import { obliczPikietazFigur, formatujPikietaz } from '../../utils/chainage';
import { NAZWY_FIGUR } from '../../constants';
import type { DzialkaRobocza, Figura, WpisLive } from '../../types';

// ---- Stałe layoutu ----
const SCREEN_W = Dimensions.get('window').width;
const LEFT_MARGIN = 52;   // strefa ikon aut (lewa)
const SKETCH_W = 90;      // szerokość bloku figury w px
const RIGHT_MARGIN = 60;  // strefa pikietażu (prawa)
const SVG_W = LEFT_MARGIN + SKETCH_W + RIGHT_MARGIN;
const MIN_H = 28;
const MAX_H = 120;
const PAD_TOP = 16;
const PAD_BOT = 16;

// ---- Obliczenia pozycji ----

function obliczWysokosci(figury: Figura[]): number[] {
  if (figury.length === 0) return [];
  const lengths = figury.map(dlugoscFigury);
  const maxLen = Math.max(...lengths, 1);
  return lengths.map((l) => Math.max(MIN_H, Math.round((l / maxLen) * MAX_H)));
}

/** Y pozycja (w px) odpowiadająca danej liczbie metrów od startu działki */
function metryDoY(figury: Figura[], heights: number[], metryOdStartu: number): number {
  let cumMetry = 0;
  let cumY = PAD_TOP;
  for (let i = 0; i < figury.length; i++) {
    const l = dlugoscFigury(figury[i]);
    if (metryOdStartu <= cumMetry + l) {
      const frac = l > 0 ? (metryOdStartu - cumMetry) / l : 0;
      return cumY + frac * heights[i];
    }
    cumMetry += l;
    cumY += heights[i];
  }
  return cumY;
}

/** Kumulatywne metry na początku każdej figury */
function cumMetryFigur(figury: Figura[]): number[] {
  const wynik: number[] = [];
  let cum = 0;
  for (const f of figury) { wynik.push(cum); cum += dlugoscFigury(f); }
  return wynik;
}

// ---- Komponenty inline SVG ----

function PaverSVG({ x, y }: { x: number; y: number }) {
  return (
    <SvgG transform={`translate(${x - 38}, ${y - 14})`}>
      {/* gąsienice */}
      <SvgRect x="2" y="20" width="14" height="5" rx="2.5" fill="#1a1a1a" />
      <SvgRect x="60" y="20" width="14" height="5" rx="2.5" fill="#1a1a1a" />
      {/* rama */}
      <SvgRect x="1" y="15" width="74" height="6" rx="1" fill="#c4860f" />
      {/* zasypnica (hopper) */}
      <SvgPath d="M0,4 L18,4 L21,15 L-2,15 Z" fill="#E8A020" />
      {/* kabina */}
      <SvgRect x="17" y="6" width="18" height="10" rx="2" fill="#E8A020" />
      <SvgRect x="19" y="7.5" width="13" height="7" rx="1.5" fill="#9ecfff" fillOpacity="0.7" />
      {/* silnik */}
      <SvgRect x="35" y="8" width="18" height="8" rx="1.5" fill="#d4900f" />
      {/* komin */}
      <SvgRect x="48" y="3" width="4" height="8" rx="1.5" fill="#555" />
      {/* stół */}
      <SvgRect x="56" y="16" width="20" height="5" rx="1.5" fill="#888" />
      {/* linie grzewcze stołu */}
      <SvgLine x1="59" y1="17" x2="59" y2="20" stroke="#E8A020" strokeWidth="1.2" />
      <SvgLine x1="63" y1="17" x2="63" y2="20" stroke="#E8A020" strokeWidth="1.2" />
      <SvgLine x1="67" y1="17" x2="67" y2="20" stroke="#E8A020" strokeWidth="1.2" />
      <SvgLine x1="71" y1="17" x2="71" y2="20" stroke="#E8A020" strokeWidth="1.2" />
    </SvgG>
  );
}

function TruckSVG({ x, y, nrAuta }: { x: number; y: number; nrAuta: number }) {
  return (
    <SvgG transform={`translate(${x}, ${y - 14})`}>
      {/* koła */}
      <SvgCircle cx="8" cy="22" r="5" fill="#1a1a1a" />
      <SvgCircle cx="8" cy="22" r="2.5" fill="#555" />
      <SvgCircle cx="32" cy="22" r="5" fill="#1a1a1a" />
      <SvgCircle cx="32" cy="22" r="2.5" fill="#555" />
      {/* rama */}
      <SvgRect x="1" y="17" width="40" height="4" rx="1" fill="#888" />
      {/* kabina */}
      <SvgRect x="1" y="8" width="13" height="10" rx="1.5" fill="#c4860f" />
      <SvgRect x="3" y="10" width="8" height="6" rx="1" fill="#9ecfff" fillOpacity="0.7" />
      {/* skrzynia */}
      <SvgPath d="M13,5 L42,3 L42,17 L13,18 Z" fill="#E8A020" />
      {/* numer na skrzyni */}
      <SvgText
        x="28"
        y="14"
        fontSize={nrAuta >= 10 ? "8" : "9"}
        fontWeight="900"
        fill="#1a1a1a"
        textAnchor="middle"
      >
        {String(nrAuta)}
      </SvgText>
    </SvgG>
  );
}

// ---- Główny komponent ----

export interface WpisLiveMarker {
  wpis: WpisLive;
  /** Łączne metry od startu po tym wpisie */
  metryKumulatywne: number;
}

interface DzialkaSketchProps {
  dzialka: DzialkaRobocza;
  ciezarObjetosciowy: number;
  /** Tryb live: aktualne łączne metry wykonane */
  wykonaneMetry?: number;
  /** Lista wpisów live z kumulatywnymi metrami dla markerów aut */
  markery?: WpisLiveMarker[];
  /** Callback kliknięcia w ikonę wywrotki */
  onTruckPress?: (wpis: WpisLive, metryOdPoprzedniego: number) => void;
}

export function DzialkaSketch({
  dzialka,
  ciezarObjetosciowy,
  wykonaneMetry = 0,
  markery = [],
  onTruckPress,
}: DzialkaSketchProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [selectedFigura, setSelectedFigura] = useState<Figura | null>(null);

  const { figury } = dzialka;
  if (figury.length === 0) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={[styles.pustyTekst, { color: theme.colors.textSecondary }]}>
          Dodaj figury, aby zobaczyć szkic
        </Text>
      </View>
    );
  }

  const heights = obliczWysokosci(figury);
  const pikietaze = obliczPikietazFigur(dzialka);
  const cumMetry = cumMetryFigur(figury);
  const cumHeights: number[] = [];
  let yAcc = PAD_TOP;
  for (const h of heights) { cumHeights.push(yAcc); yAcc += h; }
  const totalSketchH = yAcc;
  const svgH = totalSketchH + PAD_BOT;

  // Y dla aktualnego frontu robót
  const paverY = metryDoY(figury, heights, Math.min(wykonaneMetry, cumMetry[figury.length - 1] + dlugoscFigury(figury[figury.length - 1])));
  const isLiveMode = wykonaneMetry > 0 || markery.length > 0;

  // Kolory figur (naprzemienne)
  const colors = ['#E8A02040', '#2E86AB40'];
  const colorsDark = ['#E8A020', '#2E86AB'];

  return (
    <>
      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        <Svg width={SVG_W} height={svgH}>

          {/* ====== BLOKI FIGUR (podstawa) ====== */}
          {figury.map((figura, idx) => {
            const pow = obliczPowierzchniFigury(figura);
            const yFig = cumHeights[idx];
            const hFig = heights[idx];
            const cx = LEFT_MARGIN + SKETCH_W / 2;
            const cy = yFig + hFig / 2;
            const isEven = idx % 2 === 0;

            return (
              <SvgG key={figura.id}>
                {/* Blok figury */}
                <SvgRect
                  x={LEFT_MARGIN}
                  y={yFig}
                  width={SKETCH_W}
                  height={hFig}
                  fill={isEven ? '#E8A02025' : '#2E86AB25'}
                  stroke={isEven ? '#E8A020' : '#2E86AB'}
                  strokeWidth="1.5"
                  onPress={() => setSelectedFigura(figura)}
                />
                {/* Numer figury */}
                <SvgText
                  x={cx - 14}
                  y={cy + 5}
                  fontSize="13"
                  fontWeight="700"
                  fill={isEven ? '#E8A020' : '#2E86AB'}
                  textAnchor="middle"
                >
                  {idx + 1}
                </SvgText>
                {/* Powierzchnia */}
                <SvgText
                  x={cx + 14}
                  y={cy + 5}
                  fontSize="9"
                  fill={colorScheme === 'dark' ? '#ccc' : '#444'}
                  textAnchor="middle"
                >
                  {pow.toFixed(0)}m²
                </SvgText>
              </SvgG>
            );
          })}

          {/* ====== PIKIETAŻE (prawa strona) ====== */}
          {figury.map((_, idx) => {
            const pik = pikietaze[idx];
            const yFig = cumHeights[idx];
            return (
              <SvgG key={`pik-${idx}`}>
                {/* Górna linia + etykieta */}
                <SvgLine
                  x1={LEFT_MARGIN + SKETCH_W}
                  y1={yFig}
                  x2={LEFT_MARGIN + SKETCH_W + 6}
                  y2={yFig}
                  stroke={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  strokeWidth="1"
                />
                <SvgText
                  x={LEFT_MARGIN + SKETCH_W + 8}
                  y={yFig + 4}
                  fontSize="9"
                  fill={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                >
                  {formatujPikietaz(pik.poczatek)}
                </SvgText>
                {/* Dolna linia + etykieta (tylko ostatnia figura) */}
                {idx === figury.length - 1 && (
                  <>
                    <SvgLine
                      x1={LEFT_MARGIN + SKETCH_W}
                      y1={yFig + heights[idx]}
                      x2={LEFT_MARGIN + SKETCH_W + 6}
                      y2={yFig + heights[idx]}
                      stroke={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      strokeWidth="1"
                    />
                    <SvgText
                      x={LEFT_MARGIN + SKETCH_W + 8}
                      y={yFig + heights[idx] + 4}
                      fontSize="9"
                      fill={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                    >
                      {formatujPikietaz(pik.koniec)}
                    </SvgText>
                  </>
                )}
              </SvgG>
            );
          })}

          {/* ====== TRYB LIVE: NAKŁADKI CIEMNE ====== */}
          {isLiveMode && (
            <>
              {/* Nakładka 70% na całą długość (szare "surowe podłoże") */}
              <SvgRect
                x={LEFT_MARGIN}
                y={PAD_TOP}
                width={SKETCH_W}
                height={totalSketchH - PAD_TOP}
                fill="rgba(0,0,0,0.7)"
              />

              {/* Nakładka 100% na część wykonaną (czarny asfalt) */}
              {paverY > PAD_TOP && (
                <SvgRect
                  x={LEFT_MARGIN}
                  y={PAD_TOP}
                  width={SKETCH_W}
                  height={paverY - PAD_TOP}
                  fill="rgba(10,10,15,0.95)"
                />
              )}

              {/* Linia granicy wykonania (jasna pozioma linia) */}
              {paverY > PAD_TOP && (
                <SvgLine
                  x1={LEFT_MARGIN - 4}
                  y1={paverY}
                  x2={LEFT_MARGIN + SKETCH_W + 4}
                  y2={paverY}
                  stroke="#E8A020"
                  strokeWidth="2"
                />
              )}

              {/* ROZKŁADARKA na granicy wykonania */}
              {wykonaneMetry > 0 && paverY > PAD_TOP + 10 && (
                <PaverSVG
                  x={LEFT_MARGIN + SKETCH_W / 2}
                  y={paverY}
                />
              )}

              {/* ===== MARKERY AUT: linie przerywane + ikonki ===== */}
              {markery.map((marker, mIdx) => {
                const markerY = metryDoY(figury, heights, marker.metryKumulatywne);
                // Y poprzedniego markera (lub startu)
                const prevMetry = mIdx > 0 ? markery[mIdx - 1].metryKumulatywne : 0;

                return (
                  <SvgG key={marker.wpis.id}>
                    {/* Linia przerywana pozioma */}
                    <SvgLine
                      x1={LEFT_MARGIN - 8}
                      y1={markerY}
                      x2={LEFT_MARGIN + SKETCH_W}
                      y2={markerY}
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.2"
                      strokeDasharray="4,3"
                    />

                    {/* Ikonka wywrotki (klikalna) */}
                    <SvgG
                      onPress={() =>
                        onTruckPress?.(
                          marker.wpis,
                          marker.metryKumulatywne - prevMetry,
                        )
                      }
                    >
                      <TruckSVG x={2} y={markerY} nrAuta={marker.wpis.numerAuta} />
                    </SvgG>
                  </SvgG>
                );
              })}
            </>
          )}

        </Svg>
      </ScrollView>

      {/* ====== MODAL: szczegóły klikniętej figury ====== */}
      {selectedFigura && (() => {
        const idx = figury.indexOf(selectedFigura);
        const pik = idx >= 0 ? pikietaze[idx] : null;
        const pow = obliczPowierzchniFigury(selectedFigura);
        const masa = pow * (dzialka.grubosc / 100) * ciezarObjetosciowy;
        const dlugFig = dlugoscFigury(selectedFigura);
        const metryStartFig = idx >= 0 ? cumMetry[idx] : 0;
        const pozostaloMetrow = Math.max(0, (metryStartFig + dlugFig) - wykonaneMetry);
        const pozostaloPow = pow * (dlugFig > 0 ? pozostaloMetrow / dlugFig : 0);
        const pozostaloMasa = pozostaloPow * (dzialka.grubosc / 100) * ciezarObjetosciowy;

        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedFigura(null)}>
            <Pressable style={styles.modalTło} onPress={() => setSelectedFigura(null)}>
              <View style={[styles.modalKarta, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTytul, { color: theme.colors.text }]}>
                  {pik ? `${formatujPikietaz(pik.poczatek)} – ${formatujPikietaz(pik.koniec)}` : NAZWY_FIGUR[selectedFigura.typ]}
                </Text>
                <Text style={[styles.modalPodtytul, { color: theme.colors.textSecondary }]}>
                  Figura #{(idx ?? 0) + 1} – {NAZWY_FIGUR[selectedFigura.typ]}
                </Text>
                <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                <Wiersz label="Powierzchnia" wartosc={`${formatLiczby(pow)} m²`} theme={theme} />
                <Wiersz label="Długość" wartosc={`${formatLiczby(dlugFig)} m`} theme={theme} />
                <Wiersz label="Ilość masy" wartosc={`${formatLiczby(masa, 2)} Mg`} theme={theme} />
                {wykonaneMetry > 0 && (
                  <>
                    <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.zostaloLabel, { color: theme.colors.textSecondary }]}>Pozostało do końca:</Text>
                    <Wiersz label="Długość" wartosc={`${formatLiczby(pozostaloMetrow)} m`} theme={theme} />
                    <Wiersz label="Powierzchnia" wartosc={`${formatLiczby(pozostaloPow)} m²`} theme={theme} />
                    <Wiersz label="Masa" wartosc={`${formatLiczby(pozostaloMasa, 2)} Mg`} theme={theme} />
                  </>
                )}
                <TouchableOpacity
                  style={[styles.btnZamknij, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setSelectedFigura(null)}
                >
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

function Wiersz({ label, wartosc, theme }: { label: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={styles.wierszInfo}>
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoWartosc, { color: theme.colors.text }]}>{wartosc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pusty: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  pustyTekst: { fontSize: 14 },
  modalTło: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalKarta: { width: '100%', borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTytul: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalPodtytul: { fontSize: 13, marginBottom: 12 },
  sep: { height: 1, marginVertical: 12 },
  zostaloLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  wierszInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoWartosc: { fontSize: 14, fontWeight: '600' },
  btnZamknij: { marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnZamknijTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
