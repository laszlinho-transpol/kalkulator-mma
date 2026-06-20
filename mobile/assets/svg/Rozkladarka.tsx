// ============================================================
// SVG – ROZKŁADARKA (Road Paver) – widok z boku, bez tła
// ============================================================

import React from 'react';
import Svg, {
  Rect, Circle, Path, Polygon, Line, G, Text as SvgText,
} from 'react-native-svg';

interface RozkladarkaProps {
  width?: number;
  height?: number;
  /** Kierunek pracy: 'rosnacy' = jedzie w prawo, 'malejacy' = w lewo */
  kierunek?: 'rosnacy' | 'malejacy';
}

export function Rozkladarka({ width = 90, height = 52, kierunek = 'rosnacy' }: RozkladarkaProps) {
  const flip = kierunek === 'malejacy' ? -1 : 1;

  return (
    <Svg width={width} height={height} viewBox="0 0 90 52">
      <G transform={`translate(${flip === -1 ? 90 : 0}, 0) scale(${flip}, 1)`}>
        {/* === GĄSIENICE (tracks) === */}
        <Rect x="6" y="40" width="24" height="8" rx="4" fill="#2d2d2d" />
        <Rect x="60" y="40" width="24" height="8" rx="4" fill="#2d2d2d" />
        {/* kółka gąsienic */}
        <Circle cx="12" cy="44" r="5" fill="#1a1a1a" />
        <Circle cx="22" cy="44" r="5" fill="#1a1a1a" />
        <Circle cx="32" cy="44" r="3" fill="#1a1a1a" />
        <Circle cx="58" cy="44" r="3" fill="#1a1a1a" />
        <Circle cx="68" cy="44" r="5" fill="#1a1a1a" />
        <Circle cx="78" cy="44" r="5" fill="#1a1a1a" />

        {/* === RAMA (chassis) === */}
        <Rect x="5" y="32" width="80" height="10" rx="2" fill="#c4860f" />

        {/* === SKRZYNIA ZASYPOWA (hopper) === */}
        <Path
          d="M4,10 L24,10 L28,32 L0,32 Z"
          fill="#E8A020"
          stroke="#c4860f"
          strokeWidth="1.5"
        />
        {/* krawędź boczna zasypnicy */}
        <Line x1="4" y1="10" x2="0" y2="32" stroke="#c4860f" strokeWidth="2" />

        {/* === KABINA OPERATORA === */}
        <Rect x="22" y="14" width="22" height="18" rx="3" fill="#E8A020" stroke="#c4860f" strokeWidth="1.5" />
        {/* szyba kabiny */}
        <Rect x="25" y="17" width="16" height="11" rx="2" fill="#9ecfff" fillOpacity="0.7" />
        {/* daszek kabiny */}
        <Rect x="20" y="12" width="26" height="4" rx="1" fill="#c4860f" />

        {/* === SILNIK / ŚRODKOWA CZĘŚĆ === */}
        <Rect x="44" y="16" width="20" height="16" rx="2" fill="#d4900f" stroke="#c4860f" strokeWidth="1" />
        {/* komin / wylot spalin */}
        <Rect x="58" y="8" width="5" height="12" rx="2" fill="#555" />
        <Rect x="57" y="7" width="7" height="3" rx="1" fill="#333" />

        {/* === RAMIONA STOŁU (screed arms) === */}
        <Rect x="62" y="28" width="20" height="4" rx="1" fill="#aaa" />

        {/* === STÓŁ WYRÓWNUJĄCY (screed) === */}
        <Rect x="64" y="34" width="24" height="6" rx="2" fill="#888" stroke="#666" strokeWidth="1" />
        {/* elementy grzewcze stołu */}
        <Line x1="68" y1="35" x2="68" y2="39" stroke="#c4860f" strokeWidth="1.5" />
        <Line x1="73" y1="35" x2="73" y2="39" stroke="#c4860f" strokeWidth="1.5" />
        <Line x1="78" y1="35" x2="78" y2="39" stroke="#c4860f" strokeWidth="1.5" />
        <Line x1="83" y1="35" x2="83" y2="39" stroke="#c4860f" strokeWidth="1.5" />

        {/* === OZNACZENIE STRZAŁKA KIERUNKU === */}
        <Polygon
          points="83,20 90,24 83,28"
          fill="#E8A020"
          stroke="#c4860f"
          strokeWidth="1"
        />

        {/* === NAPIS MMA === */}
        <SvgText
          x="47"
          y="28"
          fontSize="6"
          fontWeight="bold"
          fill="#fff"
          textAnchor="middle"
        >
          MMA
        </SvgText>
      </G>
    </Svg>
  );
}
