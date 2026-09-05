// ============================================================
// LIVE na wielokącie obmiaru – długość ścieżki, postęp, bilans
// ============================================================

import type { ObszarObmiaru, Punkt2D, RolaWezlaObmiaru, WezelObmiaru } from '../types';
import { round2 } from './calculations';

function dystans(a: Punkt2D, b: Punkt2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Długość łuku wzdłuż krawędzi wielokąta od idxA do idxB */
function lukWzdluz(wierzcholki: Punkt2D[], od: number, doIdx: number, kierunek: 1 | -1): number {
  const n = wierzcholki.length;
  if (n < 2) return 0;
  let i = ((od % n) + n) % n;
  const cel = ((doIdx % n) + n) % n;
  let suma = 0;
  let guard = 0;
  while (i !== cel && guard < n + 1) {
    const next = (((i + kierunek) % n) + n) % n;
    suma += dystans(wierzcholki[i], wierzcholki[next]);
    i = next;
    guard += 1;
  }
  return suma;
}

/** Krótsza ścieżka wzdłuż obwodu między dwoma wierzchołkami */
export function dlugoscMiedzyWierzcholkami(wierzcholki: Punkt2D[], a: number, b: number): number {
  if (wierzcholki.length < 2) return 0;
  return Math.min(lukWzdluz(wierzcholki, a, b, 1), lukWzdluz(wierzcholki, a, b, -1));
}

/**
 * Szacowana długość układania [m]:
 * START→KONIEC wzdłuż obwodu, inaczej pół obwodu.
 */
export function dlugoscUkladaniaObszaru(obszar: ObszarObmiaru): number {
  const wezly = obszar.wezlyRole ?? [];
  const start = wezly.find((w) => w.rola === 'start');
  const koniec = wezly.find((w) => w.rola === 'koniec');
  if (start && koniec && obszar.wierzcholkiM.length >= 2) {
    const d = dlugoscMiedzyWierzcholkami(obszar.wierzcholkiM, start.idx, koniec.idx);
    if (d > 0.5) return round2(d);
  }
  return round2(Math.max(obszar.obwodM / 2, 0.01));
}

export interface BilansLiveObmiaru {
  dlugoscM: number;
  przejechaneMetry: number;
  sumaTon: number;
  postep: number;
  zakrytaPowierzchniaM2: number;
  pozostaloMetrow: number;
  pozostaloM2: number;
  sredniaGruboscCm: number | null;
  pozostaloMgPrzyGrubosci: number | null;
}

/** Gęstość orientacyjna MMA ~2.4 Mg/m³ */
export function bilansLiveObszaru(
  obszar: ObszarObmiaru,
  gestoscMgM3 = 2.4,
): BilansLiveObmiaru {
  const dlugoscM = dlugoscUkladaniaObszaru(obszar);
  const przejechaneMetry = Math.max(0, obszar.przejechaneMetry ?? 0);
  const sumaTon = Math.max(0, obszar.sumaTon ?? 0);
  const postep = Math.max(0, Math.min(1, przejechaneMetry / Math.max(dlugoscM, 0.01)));
  const zakrytaPowierzchniaM2 = round2(obszar.powierzchniaM2 * postep);
  const pozostaloMetrow = round2(Math.max(0, dlugoscM - przejechaneMetry));
  const pozostaloM2 = round2(Math.max(0, obszar.powierzchniaM2 - zakrytaPowierzchniaM2));

  let sredniaGruboscCm: number | null = null;
  let pozostaloMgPrzyGrubosci: number | null = null;
  if (zakrytaPowierzchniaM2 > 0.5 && sumaTon > 0) {
    sredniaGruboscCm = round2((sumaTon / (zakrytaPowierzchniaM2 * gestoscMgM3)) * 100);
    pozostaloMgPrzyGrubosci = round2(pozostaloM2 * (sredniaGruboscCm / 100) * gestoscMgM3);
  }

  return {
    dlugoscM,
    przejechaneMetry,
    sumaTon,
    postep,
    zakrytaPowierzchniaM2,
    pozostaloMetrow,
    pozostaloM2,
    sredniaGruboscCm,
    pozostaloMgPrzyGrubosci,
  };
}

/** Ustaw / zamień rolę węzła – jedna rola specjalna na obszar (poza zwykly) */
export function zastosujRoleWezla(
  wierzcholkiM: Punkt2D[],
  dotychczas: WezelObmiaru[] | undefined,
  idx: number,
  rola: RolaWezlaObmiaru,
): WezelObmiaru[] {
  const n = wierzcholkiM.length;
  const i = Math.max(0, Math.min(n - 1, idx));
  const p = wierzcholkiM[i];
  let lista = (dotychczas ?? []).filter((w) => w.idx !== i);
  if (rola !== 'zwykly') {
    lista = lista.filter((w) => w.rola !== rola);
    lista.push({ x: p.x, y: p.y, idx: i, rola });
  }
  return lista;
}
