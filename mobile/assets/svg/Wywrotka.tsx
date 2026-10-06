// ============================================================
// SVG – WYWROTKA (Dump Truck) – widok z boku, z numerem na skrzyni
// ============================================================

import React from 'react';
import Svg, {
  Rect, Circle, Path, Line, G, Text as SvgText,
} from 'react-native-svg';

interface WywrotkaProps {
  nrAuta: number;
  width?: number;
  height?: number;
  /** Kolor skrzyni wywrotu */
  kolorSkrzyni?: string;
  /** false gdy numer rysujemy osobno (odbicie lustrzane nie odwraca cyfr). */
  pokazNumer?: boolean;
}

export function Wywrotka({ nrAuta, width = 56, height = 38, kolorSkrzyni = '#E8A020', pokazNumer = true }: WywrotkaProps) {
  // Skrzynia lekko uniesiona (gotowa do wyburzenia)
  const skrzyniaKolor = kolorSkrzyni;
  const szkieletKolor = '#c4860f';

  return (
    <Svg width={width} height={height} viewBox="0 0 56 38">
      {/* === KOŁA === */}
      <Circle cx="12" cy="31" r="6" fill="#1a1a1a" />
      <Circle cx="12" cy="31" r="3" fill="#555" />
      <Circle cx="43" cy="31" r="6" fill="#1a1a1a" />
      <Circle cx="43" cy="31" r="3" fill="#555" />

      {/* === RAMA (chassis) === */}
      <Rect x="4" y="24" width="48" height="5" rx="1" fill="#888" />

      {/* === KABINA KIEROWCY === */}
      <Rect x="3" y="12" width="18" height="14" rx="2" fill="#d4900f" stroke={szkieletKolor} strokeWidth="1" />
      {/* szyba przednia */}
      <Rect x="6" y="14" width="11" height="8" rx="1.5" fill="#9ecfff" fillOpacity="0.7" />
      {/* dach kabiny */}
      <Rect x="2" y="10" width="20" height="4" rx="1.5" fill={szkieletKolor} />

      {/* === SKRZYNIA WYWROTU (tilted slightly) === */}
      <Path
        d={`M20,10 L52,8 L52,23 L20,25 Z`}
        fill={skrzyniaKolor}
        stroke={szkieletKolor}
        strokeWidth="1.5"
      />
      {/* boczna belka wzmacniająca */}
      <Line x1="20" y1="16" x2="52" y2="15" stroke={szkieletKolor} strokeWidth="1" />
      {/* tylna klapa */}
      <Line x1="52" y1="8" x2="52" y2="23" stroke={szkieletKolor} strokeWidth="2" />

      {pokazNumer ? (
        <SvgText
          x="37"
          y="20"
          fontSize={nrAuta >= 10 ? "10" : "12"}
          fontWeight="900"
          fill="#1a1a1a"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {nrAuta}
        </SvgText>
      ) : null}

      {/* === TYLNY ZDERZAK / HITCH === */}
      <Rect x="51" y="25" width="3" height="4" rx="1" fill="#666" />

      {/* === REFLEKTOR PRZEDNI === */}
      <Rect x="2" y="19" width="3" height="5" rx="1" fill="#fffbe6" />
    </Svg>
  );
}
