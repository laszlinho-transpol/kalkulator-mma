// Wspólne rysunki rozkładarki i wywrotki.
// +X = przód (kierunek układania), Y = szerokość L–P. Środek (0,0) = pozycja na odcinku.
// Wygląd bierze się z ustawień: obmiar, widok z boku albo własny plik SVG.
import React from 'react';
import { G, Rect, Text as SvgText, SvgXml } from 'react-native-svg';
import { Rozkladarka } from '../../../assets/svg/Rozkladarka';
import { Wywrotka } from '../../../assets/svg/Wywrotka';
import { useGrafikaMaszynStore } from '../../stores/grafikaMaszynStore';

/** Ułożony odcinek – ciemny szary. */
export const FILL_ULOZONE = 'rgba(55, 65, 81, 0.72)';

export function katWektoraStopni(ux: number, uy: number): number {
  return (Math.atan2(uy, ux) * 180) / Math.PI;
}

/** Szerokość rysunku = 88% szerokości obszaru, długość jak w obmiarze PZT. */
export function wymiaryMaszyny(szerObszaruPx: number, rodzaj: 'rozkladarka' | 'auto'): { szer: number; dl: number } {
  const szer = Math.max(szerObszaruPx * 0.88, 2);
  const dl = szer * (rodzaj === 'rozkladarka' ? 1.25 : 1.7);
  return { szer, dl };
}

/** Widok z góry – +X = przód (kierunek układania). Szerokość = odległość L–P. */
export function SvgRozkladarka({ szer, dl }: { szer: number; dl: number }) {
  const sx = Math.max(szer, 2);
  const dx = Math.max(dl, 2);
  const sw = Math.max(sx * 0.035, 0.4);
  return (
    <G pointerEvents="none">
      <Rect x={-dx / 2} y={-sx / 2} width={dx} height={sx} rx={sx * 0.08} fill="#D4A017" stroke="#5C4A0A" strokeWidth={sw} />
      <Rect x={-dx * 0.38} y={-sx * 0.32} width={dx * 0.55} height={sx * 0.64} rx={sx * 0.06} fill="#B8860B" />
      <Rect x={-dx / 2 - dx * 0.05} y={-sx * 0.52} width={dx * 0.16} height={sx * 1.04} rx={sx * 0.04} fill="#6B5420" stroke="#3F3110" strokeWidth={sw} />
      <Rect x={-dx * 0.32} y={-sx / 2} width={dx * 0.68} height={sx * 0.12} fill="#374151" />
      <Rect x={-dx * 0.32} y={sx / 2 - sx * 0.12} width={dx * 0.68} height={sx * 0.12} fill="#374151" />
    </G>
  );
}

export function SvgSamochod({ szer, dl, numer }: { szer: number; dl: number; numer?: number }) {
  const sx = Math.max(szer, 2);
  const dx = Math.max(dl, 2);
  const sw = Math.max(sx * 0.035, 0.4);
  return (
    <G pointerEvents="none">
      <Rect x={-dx / 2} y={-sx / 2} width={dx} height={sx} rx={sx * 0.1} fill="#E8B923" stroke="#5C4A0A" strokeWidth={sw} />
      <Rect x={-dx / 2 + dx * 0.06} y={-sx * 0.36} width={dx * 0.55} height={sx * 0.72} fill="#C9A227" />
      <Rect x={dx / 2 - dx * 0.32} y={-sx * 0.42} width={dx * 0.28} height={sx * 0.84} rx={sx * 0.08} fill="#8B6914" />
      <Rect x={dx / 2 - dx * 0.22} y={-sx * 0.2} width={dx * 0.12} height={sx * 0.26} fill="#93C5FD" />
      {numer != null ? (
        <SvgText
          x={-dx * 0.06}
          y={sx * 0.14}
          fill="#111827"
          fontSize={sx * 0.42}
          fontWeight="800"
          textAnchor="middle"
        >
          {numer}
        </SvgText>
      ) : null}
    </G>
  );
}

function NumerAuta({ dx, sx, numer }: { dx: number; sx: number; numer: number }) {
  return (
    <SvgText
      x={-dx * 0.08}
      y={sx * 0.16}
      fill="#111827"
      fontSize={Math.max(6, sx * 0.38)}
      fontWeight="800"
      textAnchor="middle"
    >
      {numer}
    </SvgText>
  );
}

/** Rysunek w układzie maszyny: środek 0,0, przód w +X, szerokość w osi Y. */
export function RysunekMaszyny({
  rodzaj, szer, dl, numer,
}: {
  rodzaj: 'rozkladarka' | 'auto';
  szer: number;
  dl: number;
  numer?: number;
}) {
  const grafika = useGrafikaMaszynStore((s) => s.grafika);
  const sx = Math.max(szer, 2);
  const dx = Math.max(dl, 2);
  const wlasny = rodzaj === 'rozkladarka' ? grafika.svgRozkladarki : grafika.svgAuta;
  const obmiar = rodzaj === 'rozkladarka'
    ? <SvgRozkladarka szer={sx} dl={dx} />
    : <SvgSamochod szer={sx} dl={dx} numer={numer} />;

  if (wlasny) {
    return (
      <G pointerEvents="none">
        <SvgXml
          xml={wlasny}
          override={{ x: -dx / 2, y: -sx / 2, width: dx, height: sx }}
          fallback={obmiar}
        />
        {rodzaj === 'auto' && numer != null ? <NumerAuta dx={dx} sx={sx} numer={numer} /> : null}
      </G>
    );
  }

  if (grafika.wyglad === 'bok') {
    if (rodzaj === 'rozkladarka') {
      return (
        <G pointerEvents="none" transform={`translate(${-dx / 2},${-sx / 2})`}>
          <Rozkladarka width={dx} height={sx} kierunek="rosnacy" />
        </G>
      );
    }
    return (
      <G pointerEvents="none">
        <G transform={`translate(${dx / 2},${-sx / 2}) scale(-1,1)`}>
          <Wywrotka width={dx} height={sx} nrAuta={numer ?? 1} pokazNumer={false} />
        </G>
        {numer != null ? <NumerAuta dx={dx} sx={sx} numer={numer} /> : null}
      </G>
    );
  }

  return obmiar;
}

export function MaszynaObmiaru({
  x, y, rotDeg, szerObszaru, rodzaj, numer,
}: {
  x: number;
  y: number;
  rotDeg: number;
  szerObszaru: number;
  rodzaj: 'rozkladarka' | 'auto';
  numer?: number;
}) {
  const { szer, dl } = wymiaryMaszyny(szerObszaru, rodzaj);
  return (
    <G transform={`translate(${x},${y}) rotate(${rotDeg})`}>
      <RysunekMaszyny rodzaj={rodzaj} szer={szer} dl={dl} numer={numer} />
    </G>
  );
}
