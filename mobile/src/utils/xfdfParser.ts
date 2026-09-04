// ============================================================
// PARSER XFDF – wielokąty z eksportu komentarzy PDF-XChange
// (czysta logika – bez React Native / Expo)
// ============================================================

import type { ObszarObmiaru, Punkt2D, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  obwodWielokata,
  powierzchniaWielokata,
  skalujWierzcholki,
} from './obmiarGeometry';
import { round2 } from './calculations';

export interface PolygonXfdfSurowy {
  wierzcholki: Punkt2D[];
  kolorWypelnienia?: string;
  title?: string;
}

export interface WynikParsowaniaXfdf {
  zrodloNazwa: string;
  zrodloPdfHref?: string;
  polygony: PolygonXfdfSurowy[];
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

/** Parsuje ciąg „x,y;x,y;…” z tagu <vertices> */
export function parsujVertices(tekst: string): Punkt2D[] {
  const out: Punkt2D[] = [];
  const pary = tekst.split(';').map((s) => s.trim()).filter(Boolean);
  for (const para of pary) {
    const [xs, ys] = para.split(',').map((s) => s.trim());
    const x = parseFloat(xs);
    const y = parseFloat(ys);
    if (!isNaN(x) && !isNaN(y)) out.push({ x, y });
  }
  return out;
}

/**
 * Lekki parser XFDF bez pełnego DOM XML –
 * PDF-XChange zapisuje vertices jako tekst w <vertices>…</vertices>.
 */
export function parsujXfdfTekst(xml: string, zrodloNazwa: string): WynikParsowaniaXfdf {
  const hrefMatch = xml.match(/<f\s+href="([^"]+)"/i);
  const zrodloPdfHref = hrefMatch?.[1];

  const polygony: PolygonXfdfSurowy[] = [];
  const polygonRegex = /<polygon\b([^>]*)>([\s\S]*?)<\/polygon>/gi;
  let m: RegExpExecArray | null;
  while ((m = polygonRegex.exec(xml)) !== null) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    const vertMatch = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (!vertMatch) continue;
    const wierzcholki = parsujVertices(vertMatch[1].trim());
    if (wierzcholki.length < 3) continue;

    const kolorMatch = attrs.match(/interior-color="(#[0-9A-Fa-f]{6})"/i)
      ?? attrs.match(/color="(#[0-9A-Fa-f]{6})"/i);
    const titleMatch = attrs.match(/title="([^"]*)"/i);

    polygony.push({
      wierzcholki,
      kolorWypelnienia: kolorMatch?.[1],
      title: titleMatch?.[1],
    });
  }

  return { zrodloNazwa, zrodloPdfHref, polygony };
}

/** Buduje ObszarObmiaru z surowych polygonów + skali */
export function obszaryZPolygony(
  wynik: WynikParsowaniaXfdf,
  skala: SkalaPzt = DOMYSLNA_SKALA_PZT,
  kolejnoscStart = 1,
): ObszarObmiaru[] {
  const teraz = new Date().toISOString();
  return wynik.polygony.map((p, i) => {
    const wierzcholkiM = skalujWierzcholki(p.wierzcholki, skala);
    return {
      id: generujId(),
      nazwa: `Obszar ${kolejnoscStart + i}`,
      kolejnosc: kolejnoscStart + i,
      wierzcholkiPdf: p.wierzcholki,
      wierzcholkiM,
      powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
      obwodM: round2(obwodWielokata(wierzcholkiM)),
      zrodloNazwa: wynik.zrodloNazwa,
      zrodloPdfHref: wynik.zrodloPdfHref,
      kolorWypelnienia: p.kolorWypelnienia,
      createdAt: teraz,
    };
  });
}

/** Przelicza metry i powierzchnie obszarów po zmianie skali */
export function przeliczObszarySkalą(obszary: ObszarObmiaru[], skala: SkalaPzt): ObszarObmiaru[] {
  return obszary.map((o) => {
    const wierzcholkiM = skalujWierzcholki(o.wierzcholkiPdf, skala);
    return {
      ...o,
      wierzcholkiM,
      powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
      obwodM: round2(obwodWielokata(wierzcholkiM)),
    };
  });
}

/** Ustawia kolejność 1…N według kolejności tablicy */
export function nadajKolejnosc(obszary: ObszarObmiaru[]): ObszarObmiaru[] {
  return obszary.map((o, i) => ({
    ...o,
    kolejnosc: i + 1,
    nazwa: o.nazwa.match(/^Obszar \d+$/) ? `Obszar ${i + 1}` : o.nazwa,
  }));
}
