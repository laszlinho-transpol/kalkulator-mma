// ============================================================
// ODSADZKA KRAWĘDZI – przesunięcie krawędzi + przeliczenie m²
// ============================================================

import type { Punkt2D } from '../types';
import { powierzchniaWielokata, obwodWielokata } from './obmiarGeometry';
import { round2 } from './calculations';

function dystans(a: Punkt2D, b: Punkt2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Pole ze znakiem: >0 = CCW */
export function poleZeZnakiem(wierzcholki: Punkt2D[]): number {
  let suma = 0;
  const n = wierzcholki.length;
  for (let i = 0; i < n; i++) {
    const a = wierzcholki[i];
    const b = wierzcholki[(i + 1) % n];
    suma += a.x * b.y - b.x * a.y;
  }
  return suma / 2;
}

/**
 * Jednostkowa normalna na ZEWNĄTRZ dla krawędzi a→b.
 * CCW: zewnątrz = w prawo od kierunku krawędzi.
 */
export function normalnaZewnetrzna(a: Punkt2D, b: Punkt2D, ccw: boolean): Punkt2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  if (ccw) return { x: dy / len, y: -dx / len };
  return { x: -dy / len, y: dx / len };
}

export interface WynikOdsadzki {
  wierzcholki: Punkt2D[];
  powierzchniaM2: number;
  obwodM: number;
  deltaPowierzchniaM2: number;
  dlugoscKrawedziM: number;
}

/**
 * Odsuwa krawędź idx → idx+1 o dystansM metrów (+ na zewnątrz, − do wewnątrz).
 * Prostokąt 100×5: odsadzka +0.10 m na boku 100 m → Δ ≈ +10 m².
 */
export function odsadzKrawedz(
  wierzcholki: Punkt2D[],
  idxKrawedzi: number,
  dystansM: number,
): WynikOdsadzki {
  const n = wierzcholki.length;
  if (n < 3 || Math.abs(dystansM) < 1e-12) {
    const pow = round2(powierzchniaWielokata(wierzcholki));
    return {
      wierzcholki: wierzcholki.map((p) => ({ ...p })),
      powierzchniaM2: pow,
      obwodM: round2(obwodWielokata(wierzcholki)),
      deltaPowierzchniaM2: 0,
      dlugoscKrawedziM: 0,
    };
  }

  const i0 = ((idxKrawedzi % n) + n) % n;
  const i1 = (i0 + 1) % n;
  const a = wierzcholki[i0];
  const b = wierzcholki[i1];
  const dlugoscKrawedziM = dystans(a, b);
  const ccw = poleZeZnakiem(wierzcholki) > 0;
  const nrm = normalnaZewnetrzna(a, b, ccw);

  const nowe = wierzcholki.map((p) => ({ ...p }));
  nowe[i0] = { x: a.x + nrm.x * dystansM, y: a.y + nrm.y * dystansM };
  nowe[i1] = { x: b.x + nrm.x * dystansM, y: b.y + nrm.y * dystansM };

  const powStara = powierzchniaWielokata(wierzcholki);
  const powNowa = powierzchniaWielokata(nowe);
  return {
    wierzcholki: nowe,
    powierzchniaM2: round2(powNowa),
    obwodM: round2(obwodWielokata(nowe)),
    deltaPowierzchniaM2: round2(powNowa - powStara),
    dlugoscKrawedziM: round2(dlugoscKrawedziM),
  };
}

/** Odsuwa wskazane wierzchołki łańcucha (kolejność = przebieg krawędzi). */
export function odsadzPoLancuchu(
  wierzcholki: Punkt2D[],
  lancuch: number[],
  dystansM: number,
): WynikOdsadzki {
  if (lancuch.length < 2) {
    return odsadzKrawedz(wierzcholki, lancuch[0] ?? 0, dystansM);
  }
  if (wierzcholki.length < 3 || Math.abs(dystansM) < 1e-12) {
    return odsadzKrawedz(wierzcholki, lancuch[0], 0);
  }

  const ccw = poleZeZnakiem(wierzcholki) > 0;
  const normals: Punkt2D[] = [];
  let dlugosc = 0;
  for (let k = 0; k < lancuch.length - 1; k++) {
    const a = wierzcholki[lancuch[k]];
    const b = wierzcholki[lancuch[k + 1]];
    dlugosc += dystans(a, b);
    normals.push(normalnaZewnetrzna(a, b, ccw));
  }

  const nowe = wierzcholki.map((p) => ({ ...p }));
  for (let k = 0; k < lancuch.length; k++) {
    const idx = lancuch[k];
    let nx: number;
    let ny: number;
    if (k === 0) {
      nx = normals[0].x;
      ny = normals[0].y;
    } else if (k === lancuch.length - 1) {
      nx = normals[normals.length - 1].x;
      ny = normals[normals.length - 1].y;
    } else {
      nx = normals[k - 1].x + normals[k].x;
      ny = normals[k - 1].y + normals[k].y;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
    }
    const p = wierzcholki[idx];
    nowe[idx] = { x: p.x + nx * dystansM, y: p.y + ny * dystansM };
  }

  const powStara = powierzchniaWielokata(wierzcholki);
  const powNowa = powierzchniaWielokata(nowe);
  return {
    wierzcholki: nowe,
    powierzchniaM2: round2(powNowa),
    obwodM: round2(obwodWielokata(nowe)),
    deltaPowierzchniaM2: round2(powNowa - powStara),
    dlugoscKrawedziM: round2(dlugosc),
  };
}

/** Odsuwa łańcuch wierzchołków idxOd…idxDo (kierunek +1 po obwodzie). */
export function odsadzLancuch(
  wierzcholki: Punkt2D[],
  idxOd: number,
  idxDo: number,
  dystansM: number,
): WynikOdsadzki {
  const n = wierzcholki.length;
  if (n < 3 || Math.abs(dystansM) < 1e-12) {
    return odsadzKrawedz(wierzcholki, idxOd, 0);
  }
  const lancuch: number[] = [];
  let i = ((idxOd % n) + n) % n;
  const cel = ((idxDo % n) + n) % n;
  let guard = 0;
  while (guard <= n) {
    lancuch.push(i);
    if (i === cel) break;
    i = (i + 1) % n;
    guard += 1;
  }
  return odsadzPoLancuchu(wierzcholki, lancuch, dystansM);
}

export function listaKrawedzi(
  wierzcholki: Punkt2D[],
): { idx: number; dlugoscM: number; label: string }[] {
  const n = wierzcholki.length;
  const out: { idx: number; dlugoscM: number; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = round2(dystans(wierzcholki[i], wierzcholki[(i + 1) % n]));
    const next = (i + 1) % n;
    out.push({ idx: i, dlugoscM: d, label: `W${i + 1}→W${next + 1} (${d} m)` });
  }
  return out;
}
