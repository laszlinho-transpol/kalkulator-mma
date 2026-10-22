// Rysunki kalkulatorów geodezji: małe na kafelkach i schemat wierzchołka łuku nad formularzem.

import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

const CZCIONKA = Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'Arial, Helvetica, sans-serif' });

export type RodzajRysunku = 'szkic' | 'przekroj' | 'spadki' | 'luki' | 'wierzcholek' | 'katProsty';

/** Mały rysunek na kafelek (100 × 56), w kolorze działu. */
export function RysunekKafelka({ rodzaj, kolor, tusz }: { rodzaj: RodzajRysunku; kolor: string; tusz: string }) {
  const kreska = { stroke: tusz, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const akcent = { ...kreska, stroke: kolor, strokeWidth: 2.5 };
  const pkt = (x: number, y: number, k = kolor) => <Circle cx={x} cy={y} r={4} fill={k} stroke={tusz} strokeWidth={1.2} />;
  return (
    <Svg width="100%" height={56} viewBox="0 0 100 56">
      <G fontFamily={CZCIONKA}>
      {rodzaj === 'szkic' ? (
        <G>
          {[20, 40, 60, 80].map((x) => <Line key={`x${x}`} x1={x} y1={4} x2={x} y2={52} stroke={kolor} strokeOpacity={0.25} strokeWidth={1} />)}
          {[16, 32, 48].map((y) => <Line key={`y${y}`} x1={6} y1={y} x2={94} y2={y} stroke={kolor} strokeOpacity={0.25} strokeWidth={1} />)}
          <Polyline points="16,40 46,18 84,30" {...akcent} />
          {pkt(16, 40)}{pkt(46, 18)}{pkt(84, 30)}
        </G>
      ) : null}
      {rodzaj === 'przekroj' ? (
        <G>
          <Rect x={6} y={26} width={52} height={5} fill={kolor} fillOpacity={0.7} stroke={tusz} strokeWidth={1} />
          <Rect x={6} y={31} width={52} height={5} fill={kolor} fillOpacity={0.4} stroke={tusz} strokeWidth={1} />
          <Rect x={6} y={36} width={52} height={9} fill={kolor} fillOpacity={0.15} stroke={tusz} strokeWidth={1} />
          <Rect x={54} y={45} width={24} height={6} fill={tusz} fillOpacity={0.25} stroke={tusz} strokeWidth={1} />
          <Path d="M58 45 L58 16 L66 14 L68 14 L68 45 Z" fill={kolor} fillOpacity={0.3} stroke={tusz} strokeWidth={1.2} />
          <Rect x={68} y={14} width={26} height={6} fill={kolor} fillOpacity={0.5} stroke={tusz} strokeWidth={1} />
          <Rect x={68} y={20} width={26} height={10} fill={kolor} fillOpacity={0.15} stroke={tusz} strokeWidth={1} />
          <Line x1={30} y1={4} x2={30} y2={22} stroke={tusz} strokeWidth={2} />
          <Path d="M26 22 L34 22 L30 26 Z" fill={kolor} stroke={tusz} strokeWidth={1} />
        </G>
      ) : null}
      {rodzaj === 'spadki' ? (
        <G>
          <Line x1={10} y1={14} x2={90} y2={42} {...akcent} />
          <Line x1={10} y1={42} x2={90} y2={42} {...kreska} strokeDasharray="4 4" />
          <Line x1={90} y1={14} x2={90} y2={42} {...kreska} strokeDasharray="3 3" />
          {pkt(10, 14)}{pkt(90, 42)}
          <SvgText x={42} y={22} fontSize={13} fontWeight="800" fill={tusz}>%</SvgText>
        </G>
      ) : null}
      {rodzaj === 'luki' ? (
        <G>
          <Line x1={8} y1={12} x2={92} y2={12} {...kreska} />
          <Path d="M8 12 Q50 12 88 50" {...akcent} />
          {[26, 44, 62].map((x) => {
            const t = (x - 8) / 80;
            const y = 12 + (x - 8) * (x - 8) / 170;
            return <Line key={x} x1={x} y1={12} x2={x} y2={Math.min(y + t * 2, 50)} {...kreska} strokeWidth={1.4} strokeDasharray="3 2" />;
          })}
          {pkt(8, 12)}
        </G>
      ) : null}
      {rodzaj === 'wierzcholek' ? (
        <G>
          <Path d="M10 46 A52 52 0 0 1 90 46" {...akcent} strokeDasharray="5 4" />
          <Line x1={10} y1={46} x2={90} y2={46} {...kreska} />
          <Line x1={50} y1={46} x2={50} y2={16} {...kreska} strokeWidth={1.6} />
          <SvgText x={55} y={36} fontSize={12} fontWeight="800" fill={tusz}>X</SvgText>
          {pkt(10, 46, tusz)}{pkt(90, 46, tusz)}{pkt(50, 15)}
        </G>
      ) : null}
      {rodzaj === 'katProsty' ? (
        <G>
          <Path d="M20 46 L20 10 L80 46 Z" {...kreska} fill={kolor} fillOpacity={0.12} />
          <Path d="M20 38 L28 38 L28 46" {...akcent} strokeWidth={2} />
          <SvgText x={8} y={32} fontSize={11} fontWeight="800" fill={tusz}>3</SvgText>
          <SvgText x={46} y={55} fontSize={11} fontWeight="800" fill={tusz}>4</SvgText>
          <SvgText x={54} y={24} fontSize={11} fontWeight="800" fill={kolor}>5</SvgText>
        </G>
      ) : null}
      </G>
    </Svg>
  );
}

/**
 * Schemat wierzchołka łuku: dwie skrajne szpilki, cięciwa c, łuk o promieniu R,
 * strzałka X prostopadle w środku cięciwy do szpilki w wierzchołku.
 */
export function SchematWierzcholka({ tusz, drugi, akcent, c, r, x }: {
  tusz: string;
  drugi: string;
  akcent: string;
  c: string;
  r: string;
  x: string;
}) {
  // Rysunek poglądowy (strzałka przesadzona): A(40,150), B(300,150), wierzchołek V(170,80), środek okręgu O(170,236).
  const R = 155.7;
  const szpilka = (cx: number, cy: number, k: string, etykieta: string, dx: number) => (
    <G>
      <Circle cx={cx} cy={cy} r={7} fill={k} stroke={tusz} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={2} fill={tusz} />
      <SvgText x={cx + dx} y={cy - 14} fontSize={12} fontWeight="700" fill={drugi} textAnchor="middle">{etykieta}</SvgText>
    </G>
  );
  return (
    <Svg width="100%" height={220} viewBox="0 50 340 200" accessibilityLabel="Schemat wierzchołka łuku">
      <G fontFamily={CZCIONKA}>
      <Line x1={170} y1={236} x2={300} y2={150} stroke={drugi} strokeWidth={1.2} strokeDasharray="5 4" />
      <Line x1={170} y1={236} x2={170} y2={150} stroke={drugi} strokeWidth={1.2} strokeDasharray="5 4" />
      <Path d="M163 236 L177 236 M170 229 L170 243" stroke={drugi} strokeWidth={1.5} />
      <SvgText x={182} y={244} fontSize={12} fontWeight="700" fill={drugi}>środek łuku</SvgText>
      <SvgText x={248} y={206} fontSize={14} fontWeight="800" fill={tusz}>R</SvgText>
      <SvgText x={248} y={222} fontSize={11} fontWeight="700" fill={drugi}>{r}</SvgText>

      <Path d={`M40 150 A${R} ${R} 0 0 1 300 150`} stroke={akcent} strokeWidth={3} strokeDasharray="9 7" fill="none" strokeLinecap="round" />
      <Line x1={40} y1={150} x2={300} y2={150} stroke={tusz} strokeWidth={2.2} />

      <Line x1={40} y1={168} x2={300} y2={168} stroke={drugi} strokeWidth={1.2} />
      <Path d="M40 162 L40 174 M300 162 L300 174 M170 164 L170 172" stroke={drugi} strokeWidth={1.2} />
      <Path d="M48 164 L40 168 L48 172 M292 164 L300 168 L292 172" stroke={drugi} strokeWidth={1.2} fill="none" />
      <SvgText x={105} y={186} fontSize={11} fontWeight="700" fill={drugi} textAnchor="middle">c/2</SvgText>
      <SvgText x={235} y={186} fontSize={11} fontWeight="700" fill={drugi} textAnchor="middle">c/2</SvgText>
      <SvgText x={170} y={202} fontSize={14} fontWeight="800" fill={tusz} textAnchor="middle">c = {c}</SvgText>

      <Line x1={170} y1={150} x2={170} y2={80} stroke={akcent} strokeWidth={2.5} />
      <Path d="M170 140 L180 140 L180 150" stroke={tusz} strokeWidth={1.2} fill="none" />
      <SvgText x={180} y={112} fontSize={16} fontWeight="800" fill={akcent}>X</SvgText>
      <SvgText x={180} y={128} fontSize={12} fontWeight="800" fill={akcent}>{x}</SvgText>

      {szpilka(40, 150, tusz, 'szpilka', 0)}
      {szpilka(300, 150, tusz, 'szpilka', 0)}
      {szpilka(170, 80, akcent, 'wierzchołek', 0)}
      <SvgText x={66} y={100} fontSize={12} fontWeight="700" fill={akcent} textAnchor="middle">łuk</SvgText>
      </G>
    </Svg>
  );
}
