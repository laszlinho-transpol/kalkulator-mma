// ============================================================
// PARSER XFDF – wielokąty i polilinie (krawężniki) z PDF-XChange
// ============================================================

import type { BazaObmiaru, KrawedznikObmiaru, ObszarObmiaru, Punkt2D, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  obwodWielokata,
  powierzchniaWielokata,
  skalujWierzcholki,
  metryNaPunktPdf,
} from './obmiarGeometry';
import { round2 } from './calculations';

export interface PolygonXfdfSurowy {
  wierzcholki: Punkt2D[];
  kolorWypelnienia?: string;
  title?: string;
  subject?: string;
}

export interface PolylineXfdfSurowa {
  wierzcholki: Punkt2D[];
  color?: string;
  subject?: string;
  dlugoscEtykietaM?: number;
}

export interface WynikParsowaniaXfdf {
  zrodloNazwa: string;
  zrodloPdfHref?: string;
  polygony: PolygonXfdfSurowy[];
  polilinie: PolylineXfdfSurowa[];
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const PRÓG_POKRYCIA_M = 0.5;
const PRÓG_OD_OSI_M = 2.5;

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

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1];
}

function etykietaMetrow(body: string): number | undefined {
  const m = body.match(/>([0-9\s\u00a0]+[,.]?[0-9]*)\s*m/i);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(/\s|\u00a0/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function distPunktOdcinek(p: Punkt2D, a: Punkt2D, b: Punkt2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 <= 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

export function distPunktDoPoligonu(p: Punkt2D, poly: Punkt2D[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = distPunktOdcinek(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < min) min = d;
  }
  return min;
}

function mediana(arr: number[]): number {
  if (arr.length === 0) return Infinity;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function dlugoscLancucha(pts: Punkt2D[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return s;
}

/** Żółty (PDF-XChange) = lewa jezdnia, różowy = prawa. */
export function stronaTrasyZKoloru(hex?: string): 'lewa' | 'prawa' | undefined {
  if (!hex) return undefined;
  const h = hex.toUpperCase();
  if (h === '#FFEE58' || h === '#FBC02D' || h === '#FFEB3B' || h === '#FFF176' || h === '#FDD835') return 'lewa';
  if (h === '#FFC0CB' || h === '#F8BBD0' || h === '#FF80AB' || h === '#F48FB1' || h === '#F06292') return 'prawa';
  const n = parseInt(h.slice(1), 16);
  if (!Number.isFinite(n)) return undefined;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  if (r > 200 && g > 180 && b < 120) return 'lewa';
  if (r > 200 && b > 150 && g > 140 && g < 220) return 'prawa';
  return undefined;
}

export function czyLiniaKrawedznika(color?: string, subject?: string): boolean {
  const c = (color || '').toUpperCase();
  const s = (subject || '').toLowerCase();
  if (c === '#FF0000' || c === '#E53935' || c === '#C62828' || c === '#F44336') return true;
  if (s.includes('obwód') || s.includes('obwod') || s.includes('krawęż') || s.includes('krawenz')) return true;
  return false;
}

/**
 * Na początku / końcu arkusza dwa wierzchołki o skrajnym X:
 * wyższe Y = lewa, niższe Y = prawa (PDF Y w górę = strona L na tym PZT).
 */
export function bazyZEkstemowX(wierzcholki: Punkt2D[]): { start: BazaObmiaru; koniec: BazaObmiaru } | null {
  if (wierzcholki.length < 4) return null;
  const xs = wierzcholki.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rozpiętość = maxX - minX;
  if (rozpiętość < 1e-6) return null;
  const pas = Math.max(2, rozpiętość * 0.002);
  const skraj = (cel: number): { idxLewy: number; idxPrawy: number } | null => {
    const kand = wierzcholki
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => Math.abs(p.x - cel) <= pas);
    if (kand.length < 2) return null;
    let idxLewy = kand[0].i;
    let idxPrawy = kand[0].i;
    for (const k of kand) {
      if (k.p.y > wierzcholki[idxLewy].y) idxLewy = k.i;
      if (k.p.y < wierzcholki[idxPrawy].y) idxPrawy = k.i;
    }
    if (idxLewy === idxPrawy) return null;
    return { idxLewy, idxPrawy };
  };
  const start = skraj(minX);
  const koniec = skraj(maxX);
  if (!start || !koniec) return null;
  return { start, koniec };
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
    polygony.push({
      wierzcholki,
      kolorWypelnienia: attr(attrs, 'interior-color') ?? attr(attrs, 'color'),
      title: attr(attrs, 'title'),
      subject: attr(attrs, 'subject'),
    });
  }

  const polilinie: PolylineXfdfSurowa[] = [];
  const lineRegex = /<polyline\b([^>]*)>([\s\S]*?)<\/polyline>/gi;
  while ((m = lineRegex.exec(xml)) !== null) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    const vertMatch = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (!vertMatch) continue;
    const wierzcholki = parsujVertices(vertMatch[1].trim());
    if (wierzcholki.length < 2) continue;
    polilinie.push({
      wierzcholki,
      color: attr(attrs, 'color'),
      subject: attr(attrs, 'subject'),
      dlugoscEtykietaM: etykietaMetrow(body),
    });
  }

  return { zrodloNazwa, zrodloPdfHref, polygony, polilinie };
}

function nazwaObszaru(p: PolygonXfdfSurowy, i: number, kolejnoscStart: number): string {
  const strona = stronaTrasyZKoloru(p.kolorWypelnienia);
  if (strona === 'lewa') return 'Trasa L';
  if (strona === 'prawa') return 'Trasa P';
  return `Obszar ${kolejnoscStart + i}`;
}

function dopasujKrawedzniki(
  obszary: ObszarObmiaru[],
  polilinie: PolylineXfdfSurowa[],
  skala: SkalaPzt,
): ObszarObmiaru[] {
  const k = metryNaPunktPdf(skala);
  const krawedzie = polilinie.filter((l) => czyLiniaKrawedznika(l.color, l.subject));
  if (krawedzie.length === 0 || obszary.length === 0) return obszary;

  const przypisane: KrawedznikObmiaru[][] = obszary.map(() => []);

  for (const linia of krawedzie) {
    const mediany = obszary.map((o) =>
      mediana(linia.wierzcholki.map((p) => distPunktDoPoligonu(p, o.wierzcholkiPdf))) * k,
    );
    let idx = 0;
    for (let i = 1; i < mediany.length; i++) if (mediany[i] < mediany[idx]) idx = i;
    const odKrawedzi = mediany[idx];
    if (odKrawedzi > PRÓG_POKRYCIA_M * 4) continue; // daleko od wszystkich obszarów – pomiń
    const inne = mediany.filter((_, i) => i !== idx);
    const doSasiada = inne.length ? Math.min(...inne) : Infinity;
    const polozenie: KrawedznikObmiaru['polozenie'] =
      doSasiada < PRÓG_OD_OSI_M ? 'odOsi' : 'zewnetrzna';
    const wierzcholkiM = skalujWierzcholki(linia.wierzcholki, skala);
    przypisane[idx].push({
      id: generujId(),
      wierzcholkiPdf: linia.wierzcholki,
      wierzcholkiM,
      dlugoscM: round2(dlugoscLancucha(wierzcholkiM)),
      odlegloscOdKrawedziM: round2(odKrawedzi),
      polozenie,
    });
  }

  return obszary.map((o, i) => ({
    ...o,
    krawedzniki: przypisane[i].length ? przypisane[i] : o.krawedzniki,
  }));
}

/** Buduje ObszarObmiaru z surowych polygonów + skali */
export function obszaryZPolygony(
  wynik: WynikParsowaniaXfdf,
  skala: SkalaPzt = DOMYSLNA_SKALA_PZT,
  kolejnoscStart = 1,
): ObszarObmiaru[] {
  const teraz = new Date().toISOString();
  const surowe = wynik.polygony.map((p, i) => {
    const wierzcholkiM = skalujWierzcholki(p.wierzcholki, skala);
    const stronaTrasy = stronaTrasyZKoloru(p.kolorWypelnienia);
    const bazy = bazyZEkstemowX(p.wierzcholki);
    return {
      id: generujId(),
      nazwa: nazwaObszaru(p, i, kolejnoscStart),
      kolejnosc: kolejnoscStart + i,
      wierzcholkiPdf: p.wierzcholki,
      wierzcholkiM,
      powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
      obwodM: round2(obwodWielokata(wierzcholkiM)),
      zrodloNazwa: wynik.zrodloNazwa,
      zrodloPdfHref: wynik.zrodloPdfHref,
      kolorWypelnienia: p.kolorWypelnienia,
      stronaTrasy,
      bazaStart: bazy?.start,
      bazaKoniec: bazy?.koniec,
      odsadzki: [{ id: generujId(), nr: 1, zastosowana: false }],
      createdAt: teraz,
    } satisfies ObszarObmiaru;
  });
  return dopasujKrawedzniki(surowe, wynik.polilinie ?? [], skala);
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
      krawedzniki: o.krawedzniki?.map((kr) => ({
        ...kr,
        wierzcholkiM: skalujWierzcholki(kr.wierzcholkiPdf, skala),
        dlugoscM: round2(dlugoscLancucha(skalujWierzcholki(kr.wierzcholkiPdf, skala))),
      })),
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
