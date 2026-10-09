import React from 'react';
import Svg, {
  Rect, Circle, Path, Polygon, Line, G, Text as SvgText,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

/** Widok z góry: zasypnica z lewej, kabina z prawej, gąsienice u góry i dołu. */
export function RozkladarkaZGory({ width = 168, height = 112 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 132">
      {/* Gąsienice */}
      <Rect x="38" y="8" width="118" height="18" rx="9" fill="#1a1a1a" />
      <Rect x="38" y="106" width="118" height="18" rx="9" fill="#1a1a1a" />
      {[48, 68, 88, 108, 128, 146].map((x) => (
        <G key={x}>
          <Circle cx={x} cy="17" r="6" fill="#2d2d2d" stroke="#111" strokeWidth="1" />
          <Circle cx={x} cy="115" r="6" fill="#2d2d2d" stroke="#111" strokeWidth="1" />
        </G>
      ))}

      {/* Rama */}
      <Rect x="42" y="28" width="112" height="76" rx="6" fill="#c4860f" />

      {/* Zasypnica (hopper) – lewa, czarne żaluzje */}
      <Path d="M8,30 L46,30 L50,102 L4,102 Z" fill="#2a2a2a" stroke="#111" strokeWidth="1.5" />
      {[38, 50, 62, 74, 86].map((y) => (
        <Line key={y} x1="10" y1={y} x2="46" y2={y} stroke="#111" strokeWidth="2.2" />
      ))}
      <Path d="M8,30 L4,102" stroke="#E8A020" strokeWidth="2" />

      {/* Środkowa część / przenośnik */}
      <Rect x="50" y="36" width="52" height="60" rx="3" fill="#d4900f" />
      <Rect x="58" y="44" width="36" height="44" rx="2" fill="#b87a0c" />
      <Rect x="64" y="50" width="24" height="8" rx="1" fill="#E8A020" />
      <SvgText x="76" y="72" fontSize="9" fontWeight="bold" fill="#fff" textAnchor="middle">
        MMA
      </SvgText>

      {/* Kabina operatora */}
      <Rect x="104" y="32" width="52" height="68" rx="6" fill="#E8A020" stroke="#c4860f" strokeWidth="1.5" />
      <Rect x="110" y="38" width="40" height="28" rx="4" fill="#9ecfff" fillOpacity="0.85" />
      <Line x1="130" y1="38" x2="130" y2="66" stroke="#c4860f" strokeWidth="1.2" />
      <Rect x="114" y="72" width="32" height="20" rx="3" fill="#c4860f" />
      <Circle cx="130" cy="82" r="5" fill="#f5f5f5" />

      {/* Stół (screed) z tyłu / po prawej */}
      <Rect x="154" y="24" width="14" height="84" rx="3" fill="#6b6b6b" stroke="#444" strokeWidth="1" />
      <Line x1="161" y1="32" x2="161" y2="100" stroke="#E8A020" strokeWidth="1.5" />

      {/* Kierunek jazdy */}
      <Polygon points="18,66 2,74 18,82" fill="#E8A020" stroke="#c4860f" strokeWidth="1" />
    </Svg>
  );
}
