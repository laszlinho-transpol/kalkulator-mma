// ============================================================
// GEOMETRIA OBMIARU – powierzchnia, obwód, skala PDF → metry
// ============================================================

import type { Punkt2D, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import { round2 } from './calculations';

/** 1 punkt PDF = 1/72 cala; 1 cal = 2.54 cm */
export const CM_NA_PUNKT_PDF = 2.54 / 72;

/** Ile metrów terenowych przypada na 1 punkt PDF przy danej skali */
export function metryNaPunktPdf(skala: SkalaPzt = DOMYSLNA_SKALA_PZT): number {
  return CM_NA_PUNKT_PDF * skala.metryNaCm;
}

export function pdfNaMetry(p: Punkt2D, skala: SkalaPzt = DOMYSLNA_SKALA_PZT): Punkt2D {
  const k = metryNaPunktPdf(skala);
  return { x: p.x * k, y: p.y * k };
}

export function skalujWierzcholki(
  wierzcholki: Punkt2D[],
  skala: SkalaPzt = DOMYSLNA_SKALA_PZT,
): Punkt2D[] {
  return wierzcholki.map((p) => pdfNaMetry(p, skala));
}

/** Powierzchnia wielokąta (shoelace) – jednostki jak wejście */
export function powierzchniaWielokata(wierzcholki: Punkt2D[]): number {
  if (wierzcholki.length < 3) return 0;
  let suma = 0;
  const n = wierzcholki.length;
  for (let i = 0; i < n; i++) {
    const a = wierzcholki[i];
    const b = wierzcholki[(i + 1) % n];
    suma += a.x * b.y - b.x * a.y;
  }
  return Math.abs(suma) / 2;
}

/** Obwód wielokąta */
export function obwodWielokata(wierzcholki: Punkt2D[]): number {
  if (wierzcholki.length < 2) return 0;
  let suma = 0;
  const n = wierzcholki.length;
  for (let i = 0; i < n; i++) {
    const a = wierzcholki[i];
    const b = wierzcholki[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    suma += Math.sqrt(dx * dx + dy * dy);
  }
  return suma;
}

export function bboxWielokata(wierzcholki: Punkt2D[]): {
  minX: number; minY: number; maxX: number; maxY: number; szer: number; wys: number;
} {
  if (wierzcholki.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, szer: 0, wys: 0 };
  }
  let minX = wierzcholki[0].x;
  let maxX = wierzcholki[0].x;
  let minY = wierzcholki[0].y;
  let maxY = wierzcholki[0].y;
  for (const p of wierzcholki) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, szer: maxX - minX, wys: maxY - minY };
}

/**
 * Kalibracja skali do znanej powierzchni z CSV PDF-XChange.
 * Zwraca nową skalę (metryNaCm), żeby shoelace(metry) ≈ znanaPowM2.
 */
export function skalaDoZnanejPowierzchni(
  wierzcholkiPdf: Punkt2D[],
  znanaPowM2: number,
  baza: SkalaPzt = DOMYSLNA_SKALA_PZT,
): SkalaPzt {
  if (znanaPowM2 <= 0 || wierzcholkiPdf.length < 3) return baza;
  const powPdf = powierzchniaWielokata(wierzcholkiPdf);
  if (powPdf <= 0) return baza;
  // pow_m2 = pow_pdf * (cmNaPunkt * metryNaCm)^2
  // metryNaCm = sqrt(pow_m2 / pow_pdf) / cmNaPunkt
  const metryNaCm = Math.sqrt(znanaPowM2 / powPdf) / CM_NA_PUNKT_PDF;
  return {
    mianownik: Math.round(metryNaCm * 100), // przybliżenie (5 m/cm → 500)
    metryNaCm: round2(metryNaCm * 100) / 100,
  };
}

export function formatujPowierzchnie(m2: number): string {
  return `${round2(m2).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}
