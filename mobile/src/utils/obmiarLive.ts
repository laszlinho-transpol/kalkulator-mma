// ============================================================
// LIVE na wielokącie obmiaru – długość ścieżki, postęp, bilans
// ============================================================

import type { ObszarObmiaru, Punkt2D, RolaWezlaObmiaru, WezelObmiaru, WpisWzObmiaru } from '../types';
import { bokiFigury } from './obmiarFigura';
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
  const boki = bokiFigury(obszar);
  if (boki && boki.dlugoscUkladania > 0.5) return boki.dlugoscUkladania;
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

export function gestoscObszaru(gestoscMgM3?: number): number {
  return gestoscMgM3 && gestoscMgM3 > 0 ? gestoscMgM3 : 2.4;
}

/** Gęstość z recepty (Zaplanuj masę) albo orientacyjna MMA ~2.4 Mg/m³ */
export function bilansLiveObszaru(
  obszar: ObszarObmiaru,
  gestoscMgM3 = 2.4,
): BilansLiveObmiaru {
  const rho = gestoscObszaru(gestoscMgM3);
  const dlugoscM = dlugoscUkladaniaObszaru(obszar);
  const ostatnieWz = obszar.wpisyWz?.[obszar.wpisyWz.length - 1];
  const przejechaneMetry = Math.max(0, ostatnieWz?.przejechaneMetry ?? obszar.przejechaneMetry ?? 0);
  const sumaTon = Math.max(
    0,
    obszar.wpisyWz?.reduce((a, w) => a + w.tony, 0) ?? obszar.sumaTon ?? 0,
  );
  const postep = Math.max(0, Math.min(1, przejechaneMetry / Math.max(dlugoscM, 0.01)));
  const zakrytaPowierzchniaM2 = round2(obszar.powierzchniaM2 * postep);
  const pozostaloMetrow = round2(Math.max(0, dlugoscM - przejechaneMetry));
  const pozostaloM2 = round2(Math.max(0, obszar.powierzchniaM2 - zakrytaPowierzchniaM2));

  let sredniaGruboscCm: number | null = null;
  let pozostaloMgPrzyGrubosci: number | null = null;
  if (zakrytaPowierzchniaM2 > 0.5 && sumaTon > 0) {
    sredniaGruboscCm = round2((sumaTon / (zakrytaPowierzchniaM2 * rho)) * 100);
  }
  const gruboscDoMasy = obszar.gruboscCm && obszar.gruboscCm > 0
    ? obszar.gruboscCm
    : sredniaGruboscCm;
  if (gruboscDoMasy != null) {
    pozostaloMgPrzyGrubosci = round2(pozostaloM2 * (gruboscDoMasy / 100) * rho);
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

export interface InfoAutaWz {
  numer: number;
  tony: number;
  przejechaneMetry: number;
  metryTegoAuta: number;
  powierzchniaM2: number;
  gruboscCm: number | null;
  pozostaloMg: number | null;
}

/** Bilans pojedynczego auta z WZ – jak w LIVE / Zaplanuj masę. */
export function infoAutaWz(
  obszar: ObszarObmiaru,
  wpis: WpisWzObmiaru,
  gestoscMgM3 = 2.4,
): InfoAutaWz {
  const rho = gestoscObszaru(gestoscMgM3);
  const posortowane = [...(obszar.wpisyWz ?? [])].sort((a, b) => a.numer - b.numer);
  const prev = posortowane.filter((w) => w.numer < wpis.numer).pop();
  const metryPoprzednie = prev?.przejechaneMetry ?? 0;
  const metryTegoAuta = round2(Math.max(0, wpis.przejechaneMetry - metryPoprzednie));
  const dl = Math.max(dlugoscUkladaniaObszaru(obszar), 0.01);
  const powierzchniaM2 = round2(obszar.powierzchniaM2 * (metryTegoAuta / dl));
  let gruboscCm: number | null = null;
  if (powierzchniaM2 > 0.01 && wpis.tony > 0) {
    gruboscCm = round2((wpis.tony / (powierzchniaM2 * rho)) * 100);
  }
  const bilans = bilansLiveObszaru(obszar, rho);
  return {
    numer: wpis.numer,
    tony: wpis.tony,
    przejechaneMetry: wpis.przejechaneMetry,
    metryTegoAuta,
    powierzchniaM2,
    gruboscCm,
    pozostaloMg: bilans.pozostaloMgPrzyGrubosci,
  };
}

/** Metry z tonażu przy zadanej grubości i ρ – jak Zaplanuj masę. */
export function metryZTonnObszaru(
  obszar: ObszarObmiaru,
  tony: number,
  gestoscMgM3 = 2.4,
): { metryAuta: number; metryOdStartu: number } | null {
  const rho = gestoscObszaru(gestoscMgM3);
  const gruboscCm = obszar.gruboscCm;
  if (!gruboscCm || gruboscCm <= 0 || tony <= 0) return null;
  const dl = Math.max(dlugoscUkladaniaObszaru(obszar), 0.01);
  const szer = obszar.powierzchniaM2 / dl;
  const masaNaM = szer * (gruboscCm / 100) * rho;
  if (masaNaM <= 1e-9) return null;
  const metryAuta = round2(tony / masaNaM);
  const ost = obszar.wpisyWz?.[obszar.wpisyWz.length - 1];
  const metryOdStartu = round2((ost?.przejechaneMetry ?? 0) + metryAuta);
  return { metryAuta, metryOdStartu };
}
