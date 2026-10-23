// Rysunki do okienek „Zasada działania” w geodezji (viewBox 320 × 150, kolory z motywu).

import React, { type ReactNode } from 'react';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { useMotyw } from '../../hooks/useMotyw';
import { CZCIONKA } from './RysunkiGeodezji';

export type Kolory = { tusz: string; drugi: string; akcent: string; cel: string; tlo: string };

export function Rys({ opis, wys = 150, children }: { opis: string; wys?: number; children: (k: Kolory) => ReactNode }) {
  const theme = useMotyw();
  const k = { tusz: theme.colors.text, drugi: theme.colors.textSecondary, akcent: theme.colors.primary, cel: theme.colors.success, tlo: theme.colors.card };
  return (
    <Svg width="100%" height={wys} viewBox={`0 0 320 ${wys}`} accessibilityLabel={opis}>
      <G fontFamily={CZCIONKA}>{children(k)}</G>
    </Svg>
  );
}

function Szpilka({ x, y, kolor, tusz, napis, dx = 0, dy = -12 }: { x: number; y: number; kolor: string; tusz: string; napis?: string; dx?: number; dy?: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={6} fill={kolor} stroke={tusz} strokeWidth={1.4} />
      <Circle cx={x} cy={y} r={1.8} fill={tusz} />
      {napis ? <SvgText x={x + dx} y={y + dy} fontSize={13} fontWeight="800" fill={tusz} textAnchor="middle">{napis}</SvgText> : null}
    </G>
  );
}

/** Trójkąt 3-4-5 z kątem prostym przy A. */
export function RysTrojkat345({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <Rys opis="Trójkąt 3-4-5">
      {(k) => (
        <>
          <Polygon points="90,130 250,130 90,10" fill={k.akcent} fillOpacity={0.12} stroke={k.tusz} strokeWidth={2.2} strokeLinejoin="round" />
          <Path d="M90 116 L104 116 L104 130" stroke={k.akcent} strokeWidth={2} fill="none" />
          <SvgText x={80} y={70} fontSize={14} fontWeight="800" fill={k.tusz} textAnchor="end">a = 3×</SvgText>
          <SvgText x={80} y={86} fontSize={12} fontWeight="700" fill={k.drugi} textAnchor="end">{a}</SvgText>
          <SvgText x={170} y={146} fontSize={14} fontWeight="800" fill={k.tusz} textAnchor="middle">b = 4× · {b}</SvgText>
          <SvgText x={182} y={62} fontSize={14} fontWeight="800" fill={k.akcent}>c = 5×</SvgText>
          <SvgText x={182} y={78} fontSize={12} fontWeight="700" fill={k.akcent}>{c}</SvgText>
          <SvgText x={110} y={112} fontSize={12} fontWeight="800" fill={k.akcent}>90°</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Tyczenie kąta prostego od istniejącej linii dwiema taśmami. */
export function RysTyczenie345({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <Rys opis="Tyczenie kąta prostego taśmami" wys={160}>
      {(k) => (
        <>
          <Line x1={10} y1={128} x2={310} y2={128} stroke={k.drugi} strokeWidth={2} strokeDasharray="10 6" />
          <SvgText x={310} y={148} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="end">istniejąca linia</SvgText>
          <Line x1={80} y1={128} x2={220} y2={128} stroke={k.tusz} strokeWidth={2.4} />
          <SvgText x={150} y={146} fontSize={12} fontWeight="800" fill={k.tusz} textAnchor="middle">b {b}</SvgText>
          <Line x1={80} y1={128} x2={80} y2={23} stroke={k.akcent} strokeWidth={2.6} />
          <Line x1={220} y1={128} x2={80} y2={23} stroke={k.tusz} strokeWidth={1.6} strokeDasharray="6 4" />
          <Path d="M58 30 A105 105 0 0 1 102 25" stroke={k.akcent} strokeWidth={1.4} fill="none" />
          <Path d="M90 10 A175 175 0 0 0 66 40" stroke={k.tusz} strokeWidth={1.2} fill="none" strokeDasharray="3 3" />
          <Path d="M80 114 L94 114 L94 128" stroke={k.akcent} strokeWidth={1.8} fill="none" />
          <SvgText x={70} y={80} fontSize={12} fontWeight="800" fill={k.akcent} textAnchor="end">a {a}</SvgText>
          <SvgText x={160} y={66} fontSize={12} fontWeight="800" fill={k.tusz}>c {c}</SvgText>
          <Szpilka x={80} y={128} kolor={k.tusz} tusz={k.tusz} napis="A" dx={-12} dy={4} />
          <Szpilka x={220} y={128} kolor={k.tusz} tusz={k.tusz} napis="B" dx={0} dy={-12} />
          <Szpilka x={80} y={23} kolor={k.akcent} tusz={k.tusz} napis="C" dx={-14} dy={5} />
        </>
      )}
    </Rys>
  );
}

const R_LUKU = 260;
const Y_STYCZNEJ = 38;
const yLuku = (dx: number) => Y_STYCZNEJ + R_LUKU - Math.sqrt(R_LUKU * R_LUKU - dx * dx);

/** Łuk od stycznej: x wzdłuż stycznej od początku łuku, y prostopadle do łuku. */
export function RysLukStyczna() {
  const y0 = Y_STYCZNEJ;
  const xs = [70, 140, 200];
  return (
    <Rys opis="Tyczenie łuku od stycznej" wys={168}>
      {(k) => (
        <>
          <Line x1={30} y1={y0} x2={310} y2={y0} stroke={k.tusz} strokeWidth={2} />
          <SvgText x={310} y={y0 - 7} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="end">styczna</SvgText>
          <Path d={`M30 ${y0} A${R_LUKU} ${R_LUKU} 0 0 1 250 ${yLuku(220).toFixed(1)}`} stroke={k.akcent} strokeWidth={3} fill="none" strokeDasharray="9 6" />
          <SvgText x={258} y={yLuku(220) + 4} fontSize={12} fontWeight="800" fill={k.akcent}>łuk R</SvgText>
          {xs.map((dx) => (
            <G key={dx}>
              <Line x1={30 + dx} y1={y0} x2={30 + dx} y2={yLuku(dx)} stroke={k.tusz} strokeWidth={1.4} strokeDasharray="4 3" />
              <Path d={`M${30 + dx} ${y0 + 8} L${38 + dx} ${y0 + 8} L${38 + dx} ${y0}`} stroke={k.drugi} strokeWidth={1} fill="none" />
              <Szpilka x={30 + dx} y={yLuku(dx)} kolor={k.akcent} tusz={k.tusz} />
            </G>
          ))}
          <Line x1={30} y1={y0 - 16} x2={170} y2={y0 - 16} stroke={k.drugi} strokeWidth={1} />
          <Path d={`M37 ${y0 - 20} L30 ${y0 - 16} L37 ${y0 - 12} M163 ${y0 - 20} L170 ${y0 - 16} L163 ${y0 - 12}`} stroke={k.drugi} strokeWidth={1} fill="none" />
          <SvgText x={100} y={y0 - 21} fontSize={13} fontWeight="800" fill={k.tusz} textAnchor="middle">x</SvgText>
          <SvgText x={176} y={(y0 + yLuku(140)) / 2 + 2} fontSize={13} fontWeight="800" fill={k.akcent}>y</SvgText>
          <Szpilka x={30} y={y0} kolor={k.tusz} tusz={k.tusz} napis="PŁ" dx={0} dy={24} />
        </>
      )}
    </Rys>
  );
}

/** Spadek między punktami A i B: różnica rzędnych Δh na odległości L. */
export function RysSpadek({ wynik }: { wynik?: string }) {
  return (
    <Rys opis="Spadek między punktami">
      {(k) => (
        <>
          <Line x1={40} y1={45} x2={280} y2={95} stroke={k.akcent} strokeWidth={3} />
          <Line x1={40} y1={45} x2={280} y2={45} stroke={k.drugi} strokeWidth={1.2} strokeDasharray="5 4" />
          <Line x1={280} y1={45} x2={280} y2={95} stroke={k.tusz} strokeWidth={1.6} />
          <Path d="M276 52 L280 45 L284 52 M276 88 L280 95 L284 88" stroke={k.tusz} strokeWidth={1.4} fill="none" />
          <SvgText x={290} y={75} fontSize={14} fontWeight="800" fill={k.tusz}>Δh</SvgText>
          <Line x1={40} y1={122} x2={280} y2={122} stroke={k.drugi} strokeWidth={1.2} />
          <Path d="M47 118 L40 122 L47 126 M273 118 L280 122 L273 126 M40 112 L40 132 M280 112 L280 132" stroke={k.drugi} strokeWidth={1.2} fill="none" />
          <SvgText x={160} y={140} fontSize={13} fontWeight="800" fill={k.tusz} textAnchor="middle">odległość L</SvgText>
          <SvgText x={150} y={58} fontSize={13} fontWeight="800" fill={k.akcent} textAnchor="middle" transform="rotate(11.8 150 58)">{wynik ?? 'i = Δh / L × 100%'}</SvgText>
          <Szpilka x={40} y={45} kolor={k.tusz} tusz={k.tusz} napis="A" dx={0} dy={-12} />
          <SvgText x={40} y={70} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">rzędna A</SvgText>
          <Szpilka x={280} y={95} kolor={k.akcent} tusz={k.tusz} napis="B" dx={-14} dy={18} />
          <SvgText x={232} y={112} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">rzędna B</SvgText>
        </>
      )}
    </Rys>
  );
}

function Kratka() {
  return (
    <>
      <Rect x={0} y={0} width={320} height={150} fill="#FBF8EE" />
      {Array.from({ length: 16 }, (_, i) => <Line key={`x${i}`} x1={i * 20 + 10} y1={0} x2={i * 20 + 10} y2={150} stroke="#9CC3E6" strokeWidth={0.8} />)}
      {Array.from({ length: 8 }, (_, i) => <Line key={`y${i}`} x1={0} y1={i * 20 + 5} x2={320} y2={i * 20 + 5} stroke="#9CC3E6" strokeWidth={0.8} />)}
    </>
  );
}

const PAPIER_TUSZ = '#1F2937';

function PunktSzkicu({ x, y, nr, odczyt, kolor = PAPIER_TUSZ }: { x: number; y: number; nr: string; odczyt?: string; kolor?: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={6} fill="#fff" stroke={kolor} strokeWidth={2} />
      <SvgText x={x - 9} y={y - 9} fontSize={12} fontWeight="800" fill={kolor} textAnchor="end">{nr}</SvgText>
      {odczyt ? <SvgText x={x + 10} y={y + 4} fontSize={11} fontWeight="700" fill={PAPIER_TUSZ}>{odczyt}</SvgText> : null}
    </G>
  );
}

/** Szkic: stuknięcie w kartkę dodaje punkt, odczyt z łaty przy punkcie. */
export function RysSzkicPunkty() {
  return (
    <Rys opis="Dodawanie punktów na kartce">
      {(k) => (
        <>
          <Kratka />
          <PunktSzkicu x={70} y={95} nr="1" odczyt="1520" />
          <PunktSzkicu x={170} y={45} nr="2" odczyt="1488" />
          <Circle cx={250} cy={105} r={18} fill={k.akcent} fillOpacity={0.25} stroke={k.akcent} strokeWidth={2} />
          <Circle cx={250} cy={105} r={6} fill="#fff" stroke={k.akcent} strokeWidth={2} />
          <Path d="M262 122 q6 10 4 22 M270 120 q8 8 8 22" stroke={k.akcent} strokeWidth={2} fill="none" strokeLinecap="round" />
          <SvgText x={226} y={84} fontSize={12} fontWeight="800" fill={k.akcent} textAnchor="end">stuknij</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Szkic: połączenie punktów z odległością nad linią i spadkiem pod nią. */
export function RysSzkicLinia() {
  return (
    <Rys opis="Połączenie punktów">
      {() => (
        <>
          <Kratka />
          <Line x1={50} y1={95} x2={270} y2={95} stroke={PAPIER_TUSZ} strokeWidth={2.4} />
          <PunktSzkicu x={50} y={95} nr="1" />
          <PunktSzkicu x={270} y={95} nr="2" />
          <SvgText x={160} y={75} fontSize={14} fontWeight="800" fill={PAPIER_TUSZ} textAnchor="middle">12,50 m</SvgText>
          <SvgText x={160} y={88} fontSize={12} fontWeight="700" fill="#1D4ED8" textAnchor="middle">(1,20% →)</SvgText>
          <SvgText x={50} y={120} fontSize={11} fontWeight="700" fill={PAPIER_TUSZ} textAnchor="middle">1520</SvgText>
          <SvgText x={270} y={120} fontSize={11} fontWeight="700" fill={PAPIER_TUSZ} textAnchor="middle">1670</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Szkic: cel spadku na linii – drugi punkt dostaje docelowy odczyt i Δh. */
export function RysSzkicCel() {
  const cel = '#15803D';
  return (
    <Rys opis="Cel spadku na połączeniu">
      {(k) => (
        <>
          <Kratka />
          <Line x1={50} y1={95} x2={250} y2={95} stroke={PAPIER_TUSZ} strokeWidth={2.4} />
          <SvgText x={150} y={74} fontSize={13} fontWeight="800" fill={cel} textAnchor="middle">cel 2,00% →</SvgText>
          <PunktSzkicu x={50} y={95} nr="1" />
          <PunktSzkicu x={250} y={95} nr="2" kolor={cel} />
          <SvgText x={50} y={120} fontSize={11} fontWeight="700" fill={PAPIER_TUSZ} textAnchor="middle">1520</SvgText>
          <SvgText x={50} y={136} fontSize={10} fontWeight="700" fill={k.akcent} textAnchor="middle">zostaje z łaty</SvgText>
          <SvgText x={262} y={92} fontSize={11} fontWeight="800" fill={cel}>cel 1770</SvgText>
          <SvgText x={262} y={106} fontSize={11} fontWeight="800" fill={cel}>Δh −100 mm</SvgText>
          <SvgText x={250} y={124} fontSize={11} fontWeight="700" fill={PAPIER_TUSZ} textAnchor="middle">1670</SvgText>
        </>
      )}
    </Rys>
  );
}

function PrzekrojBazowy({ k }: { k: Kolory }) {
  return (
    <>
      <Rect x={10} y={70} width={170} height={8} fill="#374151" stroke={k.tusz} strokeWidth={1} />
      <Rect x={10} y={78} width={170} height={9} fill="#6B7280" stroke={k.tusz} strokeWidth={1} />
      <Rect x={10} y={87} width={170} height={20} fill="#D6C7A1" stroke={k.tusz} strokeWidth={1} />
      <Rect x={176} y={107} width={36} height={14} fill="#BDBDBD" stroke={k.tusz} strokeWidth={1} />
      <Path d="M180 107 L180 52 L190 50 L196 50 L196 107 Z" fill="#E5E7EB" stroke={k.tusz} strokeWidth={1.4} />
      <Rect x={196} y={50} width={114} height={9} fill="#C2410C" fillOpacity={0.55} stroke={k.tusz} strokeWidth={1} />
      <Rect x={196} y={59} width={114} height={16} fill="#D6C7A1" stroke={k.tusz} strokeWidth={1} />
    </>
  );
}

/** Przekrój: elementy dokładane od lewej do prawej. */
export function RysPrzekrojElementy() {
  const numer = (x: number, n: string, k: Kolory) => (
    <G>
      <Circle cx={x} cy={24} r={11} fill={k.akcent} />
      <SvgText x={x} y={28.5} fontSize={12} fontWeight="800" fill="#1A1A1A" textAnchor="middle">{n}</SvgText>
    </G>
  );
  return (
    <Rys opis="Elementy przekroju od lewej do prawej">
      {(k) => (
        <>
          <PrzekrojBazowy k={k} />
          {numer(95, '1', k)}{numer(188, '2', k)}{numer(253, '3', k)}
          <SvgText x={95} y={128} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">jezdnia – warstwy</SvgText>
          <SvgText x={194} y={140} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">krawężnik + ława</SvgText>
          <SvgText x={253} y={94} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">chodnik</SvgText>
          <Path d="M40 46 L150 46 M144 41 L150 46 L144 51" stroke={k.drugi} strokeWidth={1.4} fill="none" />
          <SvgText x={40} y={40} fontSize={11} fontWeight="700" fill={k.drugi}>kolejność</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Przekrój: odczyty łaty w punktach charakterystycznych. */
export function RysPrzekrojPomiar() {
  const trojkat = (x: number, y: number, k: Kolory, wpisany?: boolean) => (
    <Polygon points={`${x - 6},${y - 12} ${x + 6},${y - 12} ${x},${y - 2}`} fill={wpisany ? k.cel : k.tlo} stroke={wpisany ? k.cel : k.tusz} strokeWidth={1.4} />
  );
  return (
    <Rys opis="Odczyty łaty na przekroju">
      {(k) => (
        <>
          <PrzekrojBazowy k={k} />
          {trojkat(14, 70, k, true)}{trojkat(176, 70, k)}{trojkat(186, 50, k)}{trojkat(306, 50, k)}
          <SvgText x={14} y={50} fontSize={11} fontWeight="800" fill={k.cel}>1450</SvgText>
          <SvgText x={150} y={50} fontSize={11} fontWeight="800" fill={k.tusz} textAnchor="middle">1384</SvgText>
          <SvgText x={186} y={30} fontSize={11} fontWeight="800" fill={k.tusz} textAnchor="middle">1264</SvgText>
          <SvgText x={300} y={30} fontSize={11} fontWeight="800" fill={k.tusz} textAnchor="end">1287</SvgText>
          <SvgText x={14} y={128} fontSize={11} fontWeight="700" fill={k.cel}>wpisany odczyt</SvgText>
          <SvgText x={310} y={100} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="end">reszta przeliczona</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Wierzchołek łuku w terenie: od szpilki c/2 wzdłuż cięciwy, potem X prostopadle. */
export function RysWierzcholekTyczenie({ polowa, x }: { polowa: string; x: string }) {
  return (
    <Rys opis="Wytyczenie wierzchołka łuku">
      {(k) => (
        <>
          <Path d="M30 120 A190 190 0 0 1 290 120" stroke={k.akcent} strokeWidth={2.6} strokeDasharray="9 6" fill="none" />
          <Line x1={30} y1={120} x2={290} y2={120} stroke={k.tusz} strokeWidth={2} />
          <Line x1={30} y1={136} x2={160} y2={136} stroke={k.drugi} strokeWidth={1.2} />
          <Path d="M37 132 L30 136 L37 140 M153 132 L160 136 L153 140" stroke={k.drugi} strokeWidth={1.2} fill="none" />
          <SvgText x={95} y={132} fontSize={12} fontWeight="800" fill={k.tusz} textAnchor="middle">c/2 = {polowa}</SvgText>
          <Line x1={160} y1={120} x2={160} y2={70} stroke={k.akcent} strokeWidth={2.6} />
          <Path d="M160 112 L168 112 L168 120" stroke={k.tusz} strokeWidth={1.2} fill="none" />
          <SvgText x={174} y={104} fontSize={13} fontWeight="800" fill={k.akcent}>X = {x}</SvgText>
          <Szpilka x={30} y={120} kolor={k.tusz} tusz={k.tusz} napis="A" dx={0} dy={-12} />
          <Szpilka x={290} y={120} kolor={k.tusz} tusz={k.tusz} napis="B" dx={0} dy={-12} />
          <Circle cx={160} cy={120} r={3.5} fill={k.tusz} />
          <SvgText x={150} y={112} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="end">M</SvgText>
          <Szpilka x={160} y={70} kolor={k.akcent} tusz={k.tusz} napis="wierzchołek" dx={0} dy={-12} />
        </>
      )}
    </Rys>
  );
}
