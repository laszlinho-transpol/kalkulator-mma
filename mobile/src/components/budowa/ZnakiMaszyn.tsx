// Rysunki rozkładarki i wywrotki na szkicu PZT (koniec rozładunku).
import React from 'react';
import { Circle, G, Rect } from 'react-native-svg';

/** Wywrotka, przód w +x, punkt (0,0) to miejsce końca rozładunku. */
export function ZnakAuta() {
  return (
    <G>
      <Rect x={-26} y={-7} width={16} height={10} rx={1.5} fill="#F59E0B" stroke="#111827" strokeWidth={0.8} />
      <Rect x={-11} y={-6} width={8} height={8} rx={1} fill="#FDE68A" stroke="#111827" strokeWidth={0.7} />
      <Circle cx={-20} cy={4} r={2.3} fill="#111827" />
      <Circle cx={-6} cy={4} r={2.3} fill="#111827" />
    </G>
  );
}

/** Rozkładarka, stoł w +x (0,0). */
export function ZnakRozkladarki() {
  return (
    <G>
      <Rect x={-30} y={-8} width={22} height={12} rx={1.5} fill="#16A34A" stroke="#052E16" strokeWidth={0.8} />
      <Rect x={-32} y={-5} width={6} height={8} rx={1} fill="#86EFAC" stroke="#052E16" strokeWidth={0.6} />
      <Rect x={-2} y={-10} width={3.2} height={16} rx={0.4} fill="#14532D" />
      <Circle cx={-22} cy={5.5} r={2.4} fill="#052E16" />
      <Circle cx={-12} cy={5.5} r={2.4} fill="#052E16" />
    </G>
  );
}

export function katWektoraStopni(ux: number, uy: number): number {
  return (Math.atan2(uy, ux) * 180) / Math.PI;
}
