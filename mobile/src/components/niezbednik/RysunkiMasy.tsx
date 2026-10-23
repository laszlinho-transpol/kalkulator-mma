// Rysunki działu „Masa i sprzęt”: małe na kafelki i schematy do okienek „Zasada działania”.

import React from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { CZCIONKA } from '../geodezja/RysunkiGeodezji';
import { Rys } from '../geodezja/ZasadyGeodezji';

export type RodzajRysunkuMasy = 'powierzchnia' | 'grubosc' | 'wskaznik';

/** Mały rysunek na kafelek (100 × 56), w kolorze działu. */
export function RysunekKafelkaMasy({ rodzaj, kolor, tusz }: { rodzaj: RodzajRysunkuMasy; kolor: string; tusz: string }) {
  const kreska = { stroke: tusz, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width="100%" height={56} viewBox="0 0 100 56">
      <G fontFamily={CZCIONKA}>
        {rodzaj === 'powierzchnia' ? (
          <G>
            <Rect x={4} y={14} width={22} height={14} rx={2} fill={kolor} fillOpacity={0.35} {...kreska} />
            <Path d="M26 18 L33 18 L36 23 L36 28 L26 28 Z" fill={kolor} fillOpacity={0.6} {...kreska} />
            <Circle cx={11} cy={30} r={3} fill={tusz} />
            <Circle cx={31} cy={30} r={3} fill={tusz} />
            <Rect x={40} y={20} width={54} height={10} fill={kolor} fillOpacity={0.3} {...kreska} />
            <Line x1={40} y1={42} x2={94} y2={42} {...kreska} />
            <Path d="M40 42 L45 39 M40 42 L45 45 M94 42 L89 39 M94 42 L89 45" {...kreska} fill="none" />
            <SvgText x={67} y={53} fontSize={10} fontWeight="800" fill={kolor} textAnchor="middle">m</SvgText>
          </G>
        ) : null}
        {rodzaj === 'grubosc' ? (
          <G>
            <Rect x={8} y={24} width={70} height={10} fill={kolor} fillOpacity={0.45} {...kreska} />
            <Rect x={8} y={34} width={70} height={14} fill={kolor} fillOpacity={0.12} {...kreska} />
            <Line x1={88} y1={24} x2={88} y2={34} {...kreska} />
            <Path d="M88 24 L85 28 M88 24 L91 28 M88 34 L85 30 M88 34 L91 30" {...kreska} fill="none" />
            <SvgText x={80} y={16} fontSize={10} fontWeight="800" fill={kolor} textAnchor="middle">cm</SvgText>
            <Path d="M20 6 L34 6 L34 14 L20 14 Z" fill={tusz} fillOpacity={0.25} {...kreska} />
            <SvgText x={44} y={14} fontSize={9} fontWeight="800" fill={tusz}>Mg</SvgText>
          </G>
        ) : null}
        {rodzaj === 'wskaznik' ? (
          <G>
            <Line x1={40} y1={2} x2={40} y2={54} stroke={tusz} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 3" />
            <Rect x={28} y={8} width={24} height={24} rx={3} fill={kolor} fillOpacity={0.35} {...kreska} />
            <Rect x={10} y={36} width={60} height={8} fill={kolor} fillOpacity={0.6} {...kreska} />
            <Line x1={52} y1={18} x2={84} y2={18} stroke={kolor} strokeWidth={2.2} strokeLinecap="round" />
            <Circle cx={84} cy={18} r={2.6} fill={kolor} stroke={tusz} strokeWidth={1} />
            <Line x1={84} y1={2} x2={84} y2={54} stroke={tusz} strokeWidth={1.6} strokeDasharray="5 3" />
          </G>
        ) : null}
      </G>
    </Svg>
  );
}

/** Auto z tonażem → pas o długości L, szerokości s i grubości g. */
export function RysMetryZAuta({ tonaz, metry }: { tonaz: string; metry: string }) {
  return (
    <Rys opis="Metry pasa z jednego auta" wys={150}>
      {(k) => (
        <>
          <Rect x={10} y={34} width={62} height={34} rx={4} fill={k.akcent} fillOpacity={0.3} stroke={k.tusz} strokeWidth={1.8} />
          <Path d="M72 44 L90 44 L98 56 L98 68 L72 68 Z" fill={k.akcent} fillOpacity={0.55} stroke={k.tusz} strokeWidth={1.8} strokeLinejoin="round" />
          <Circle cx={26} cy={72} r={7} fill={k.tusz} />
          <Circle cx={84} cy={72} r={7} fill={k.tusz} />
          <SvgText x={41} y={56} fontSize={13} fontWeight="800" fill={k.tusz} textAnchor="middle">{tonaz}</SvgText>
          <Path d="M106 56 L122 56" stroke={k.drugi} strokeWidth={2} />
          <Path d="M117 51 L123 56 L117 61" stroke={k.drugi} strokeWidth={2} fill="none" />
          <Rect x={130} y={44} width={180} height={22} fill={k.akcent} fillOpacity={0.35} stroke={k.tusz} strokeWidth={1.8} />
          <Rect x={130} y={66} width={180} height={6} fill={k.tusz} fillOpacity={0.35} stroke={k.tusz} strokeWidth={1.2} />
          <SvgText x={220} y={60} fontSize={12} fontWeight="700" fill={k.tusz} textAnchor="middle">szerokość s</SvgText>
          <SvgText x={314} y={86} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="end">grubość g</SvgText>
          <Line x1={130} y1={104} x2={310} y2={104} stroke={k.akcent} strokeWidth={2.2} />
          <Path d="M130 104 L138 99 M130 104 L138 109 M310 104 L302 99 M310 104 L302 109" stroke={k.akcent} strokeWidth={2.2} fill="none" />
          <SvgText x={220} y={126} fontSize={15} fontWeight="800" fill={k.akcent} textAnchor="middle">{metry}</SvgText>
          <SvgText x={220} y={144} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">metrów bieżących z auta</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Wbudowana masa na długości L i szerokości s → średnia grubość warstwy. */
export function RysSredniaGrubosc({ wynik }: { wynik: string }) {
  return (
    <Rys opis="Średnia grubość z wbudowanej masy" wys={140}>
      {(k) => (
        <>
          <Rect x={30} y={50} width={250} height={26} fill={k.akcent} fillOpacity={0.4} stroke={k.tusz} strokeWidth={1.8} />
          <Rect x={30} y={76} width={250} height={26} fill={k.drugi} fillOpacity={0.15} stroke={k.tusz} strokeWidth={1.2} />
          <SvgText x={155} y={68} fontSize={12} fontWeight="800" fill={k.tusz} textAnchor="middle">M [Mg] wbudowane</SvgText>
          <SvgText x={155} y={94} fontSize={11} fontWeight="700" fill={k.drugi} textAnchor="middle">podbudowa</SvgText>
          <Line x1={296} y1={50} x2={296} y2={76} stroke={k.akcent} strokeWidth={2.2} />
          <Path d="M296 50 L291 57 M296 50 L301 57 M296 76 L291 69 M296 76 L301 69" stroke={k.akcent} strokeWidth={2.2} fill="none" />
          <SvgText x={312} y={40} fontSize={13} fontWeight="800" fill={k.akcent} textAnchor="end">{wynik}</SvgText>
          <Line x1={30} y1={120} x2={280} y2={120} stroke={k.tusz} strokeWidth={1.8} />
          <Path d="M30 120 L38 115 M30 120 L38 125 M280 120 L272 115 M280 120 L272 125" stroke={k.tusz} strokeWidth={1.8} fill="none" />
          <SvgText x={155} y={136} fontSize={12} fontWeight="800" fill={k.tusz} textAnchor="middle">przejechana długość L</SvgText>
          <SvgText x={30} y={36} fontSize={11} fontWeight="700" fill={k.drugi}>szerokość s, gęstość ρ</SvgText>
        </>
      )}
    </Rys>
  );
}

/** Rozkładarka z góry: oś maszyny, stół z poszerzeniami, linka i wymiary dla wskaźnika. */
export function RysWskaznik({ odOsi, odGasienicy, odPlozy }: { odOsi: string; odGasienicy: string; odPlozy: string }) {
  return (
    <Rys opis="Rozkładarka z góry i wymiary wskaźnika" wys={176}>
      {(k) => (
        <>
          <Line x1={110} y1={6} x2={110} y2={170} stroke={k.drugi} strokeWidth={1.4} strokeDasharray="6 4" />
          <SvgText x={104} y={16} fontSize={10} fontWeight="700" fill={k.drugi} textAnchor="end">oś</SvgText>
          <Rect x={80} y={18} width={60} height={58} rx={6} fill={k.akcent} fillOpacity={0.22} stroke={k.tusz} strokeWidth={1.8} />
          <Rect x={80} y={18} width={10} height={58} fill={k.tusz} fillOpacity={0.45} />
          <Rect x={130} y={18} width={10} height={58} fill={k.tusz} fillOpacity={0.45} />
          <Rect x={30} y={84} width={160} height={16} fill={k.akcent} fillOpacity={0.55} stroke={k.tusz} strokeWidth={1.6} />
          <Rect x={80} y={84} width={60} height={16} fill={k.tusz} fillOpacity={0.25} />
          <Line x1={60} y1={84} x2={60} y2={100} stroke={k.tusz} strokeWidth={1} />
          <Line x1={160} y1={84} x2={160} y2={100} stroke={k.tusz} strokeWidth={1} />
          <Rect x={190} y={80} width={4} height={24} fill={k.tusz} />
          <Line x1={140} y1={40} x2={262} y2={40} stroke={k.akcent} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={262} cy={40} r={4.5} fill={k.akcent} stroke={k.tusz} strokeWidth={1.2} />
          <SvgText x={200} y={32} fontSize={11} fontWeight="800" fill={k.tusz} textAnchor="middle">wskaźnik</SvgText>
          <Line x1={262} y1={6} x2={262} y2={170} stroke={k.cel} strokeWidth={2} strokeDasharray="8 4" />
          <SvgText x={268} y={70} fontSize={11} fontWeight="800" fill={k.cel}>linka</SvgText>
          {[
            { x: 110, y: 120, napis: `od osi ${odOsi}` },
            { x: 140, y: 140, napis: `od gąsienicy ${odGasienicy}` },
            { x: 194, y: 160, napis: `od płozy ${odPlozy}` },
          ].map((w) => (
            <G key={w.y}>
              <Line x1={w.x} y1={w.y} x2={262} y2={w.y} stroke={k.tusz} strokeWidth={1.6} />
              <Path d={`M${w.x} ${w.y} L${w.x + 6} ${w.y - 4} M${w.x} ${w.y} L${w.x + 6} ${w.y + 4} M262 ${w.y} L256 ${w.y - 4} M262 ${w.y} L256 ${w.y + 4}`} stroke={k.tusz} strokeWidth={1.6} fill="none" />
              <SvgText x={w.x - 4} y={w.y + 4} fontSize={11} fontWeight="800" fill={k.tusz} textAnchor="end">{w.napis}</SvgText>
            </G>
          ))}
        </>
      )}
    </Rys>
  );
}
