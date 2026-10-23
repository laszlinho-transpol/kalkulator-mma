import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

export type NazwaIkony =
  | 'wstecz' | 'dom' | 'dalej' | 'telefon' | 'kopiuj' | 'udostepnij' | 'plus' | 'edytuj' | 'usun' | 'mapa' | 'ustawienia' | 'info';

interface Props {
  nazwa: NazwaIkony;
  kolor: string;
  rozmiar?: number;
  grubosc?: number;
}

/** Ikony liniowe 24×24 – jeden zestaw dla całej aplikacji. */
export function Ikona({ nazwa, kolor, rozmiar = 20, grubosc = 2.2 }: Props) {
  const wspolne = { stroke: kolor, strokeWidth: grubosc, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={rozmiar} height={rozmiar} viewBox="0 0 24 24">
      {nazwa === 'wstecz' ? <Polyline points="15 18 9 12 15 6" {...wspolne} /> : null}
      {nazwa === 'dalej' ? <Polyline points="9 18 15 12 9 6" {...wspolne} /> : null}
      {nazwa === 'dom' ? (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...wspolne} />
          <Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" {...wspolne} />
        </>
      ) : null}
      {nazwa === 'telefon' ? (
        <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" {...wspolne} />
      ) : null}
      {nazwa === 'kopiuj' ? (
        <>
          <Rect x="9" y="9" width="12" height="12" rx="2" {...wspolne} />
          <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...wspolne} />
        </>
      ) : null}
      {nazwa === 'udostepnij' ? (
        <>
          <Circle cx="18" cy="5" r="3" {...wspolne} />
          <Circle cx="6" cy="12" r="3" {...wspolne} />
          <Circle cx="18" cy="19" r="3" {...wspolne} />
          <Path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" {...wspolne} />
        </>
      ) : null}
      {nazwa === 'plus' ? <Path d="M12 5v14M5 12h14" {...wspolne} /> : null}
      {nazwa === 'edytuj' ? <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" {...wspolne} /> : null}
      {nazwa === 'usun' ? <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" {...wspolne} /> : null}
      {nazwa === 'mapa' ? (
        <>
          <Path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" {...wspolne} />
          <Circle cx="12" cy="10" r="3" {...wspolne} />
        </>
      ) : null}
      {nazwa === 'info' ? (
        <>
          <Path d="M12 10.5V17" {...wspolne} strokeWidth={grubosc + 0.6} />
          <Circle cx="12" cy="6.5" r="1.6" fill={kolor} />
        </>
      ) : null}
      {nazwa === 'ustawienia' ? (
        <>
          <Circle cx="12" cy="12" r="3" {...wspolne} />
          <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...wspolne} />
        </>
      ) : null}
    </Svg>
  );
}
