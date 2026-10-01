// ============================================================
// CAŁY PZT – sklejenie arkuszy do jednego układu (wydruk plotera)
// Każda strona PDF ma własny (x,y). Łączymy przez oś: początek N = koniec N-1
// po przesunięciu i obrocie, w metrach terenowych.
// ============================================================

import type { ArkuszPzt, ObszarObmiaru, Punkt2D } from '../types';
import { round2 } from './calculations';
import {
  dlugoscPolilinii,
  osMZorientowana,
  stycznyNaOsi,
} from './osPzt';

export const CALY_PZT_ID = '__caly_pzt__';

export interface Transform2D {
  c: number;
  s: number;
  tx: number;
  ty: number;
}

export function identTransform(): Transform2D {
  return { c: 1, s: 0, tx: 0, ty: 0 };
}

export function zastosujTransform(T: Transform2D, p: Punkt2D): Punkt2D {
  return { x: T.c * p.x - T.s * p.y + T.tx, y: T.s * p.x + T.c * p.y + T.ty };
}

export function transformPunkty(T: Transform2D, pts: Punkt2D[]): Punkt2D[] {
  return pts.map((p) => zastosujTransform(T, p));
}

export function obrocWektor(T: Transform2D, v: Punkt2D): Punkt2D {
  return { x: T.c * v.x - T.s * v.y, y: T.s * v.x + T.c * v.y };
}

/** Obrót + przesunięcie: pSrc z kierunkiem tSrc trafia w pDst z tDst. */
export function transformStyku(
  pSrc: Punkt2D,
  tSrc: Punkt2D,
  pDst: Punkt2D,
  tDst: Punkt2D,
): Transform2D {
  const d = Math.atan2(tDst.y, tDst.x) - Math.atan2(tSrc.y, tSrc.x);
  const c = Math.cos(d);
  const s = Math.sin(d);
  const rx = c * pSrc.x - s * pSrc.y;
  const ry = s * pSrc.x + c * pSrc.y;
  return { c, s, tx: pDst.x - rx, ty: pDst.y - ry };
}

export function wektorJednostkowy(a: Punkt2D, b: Punkt2D): Punkt2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/**
 * Kierunek całego arkusza (cięciwa start→koniec), nie styczna haka na krawędzi.
 * PZT jest już „oknem” L→P; chwilowa styczna na styku potrafi obrócić następny
 * arkusz o ~180° i trasa na ploterze zawraca.
 */
export function kierunekLancucha(os: Punkt2D[]): Punkt2D {
  if (os.length < 2) return { x: 1, y: 0 };
  const a = os[0];
  const b = os[os.length - 1];
  if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-4) return wektorJednostkowy(a, b);
  const t = stycznyNaOsi(os, 0);
  return t ? { x: t.dx, y: t.dy } : { x: 1, y: 0 };
}

/**
 * Składa arkusze w jeden „ploter”: oś ciągła, obszary i krawężniki
 * w metrach (rysowane jako wierzcholkiPdf w podglądzie).
 *
 * Każdy arkusz PZT to już okno L→P. Sklejamy cięciwą osi do +X
 * (początek N = koniec N-1), nigdy chwilową styczną na krawędzi –
 * hak na końcu poprzedniej strony obracałby następny arkusz o ~180°.
 */
export function scalPztDoArkusza(arkusze: ArkuszPzt[]): ArkuszPzt | null {
  if (arkusze.length === 0) return null;
  const kmOd = arkusze[0].kilometrazPoczatkowyM;
  const kmDo = arkusze[arkusze.length - 1].kilometrazKoncowyM;
  let prevEnd: Punkt2D | null = null;
  const osGlobal: Punkt2D[] = [];
  const obszary: ObszarObmiaru[] = [];
  const plusX = { x: 1, y: 0 };

  for (const ark of arkusze) {
    const os = osMZorientowana(ark);
    let T: Transform2D;
    if (os.length >= 2) {
      const dest = prevEnd ?? { x: 0, y: 0 };
      T = transformStyku(os[0], kierunekLancucha(os), dest, plusX);
      const osT = transformPunkty(T, os);
      if (osGlobal.length === 0) osGlobal.push(...osT);
      else {
        const last = osGlobal[osGlobal.length - 1];
        const d0 = Math.hypot(osT[0].x - last.x, osT[0].y - last.y);
        osGlobal.push(...(d0 < 0.05 ? osT.slice(1) : osT));
      }
      prevEnd = osT[osT.length - 1];
    } else {
      T = prevEnd
        ? transformStyku({ x: 0, y: 0 }, plusX, prevEnd, plusX)
        : identTransform();
    }

    for (const o of ark.obszary) {
      obszary.push({
        ...o,
        id: `${ark.id}:${o.id}`,
        wierzcholkiM: transformPunkty(T, o.wierzcholkiM),
        wierzcholkiPdf: transformPunkty(T, o.wierzcholkiM),
        krawedzniki: (o.krawedzniki ?? []).map((k) => ({
          ...k,
          id: `${ark.id}:${k.id}`,
          wierzcholkiM: transformPunkty(T, k.wierzcholkiM),
          wierzcholkiPdf: transformPunkty(T, k.wierzcholkiM),
        })),
      });
    }
  }

  if (obszary.length === 0) return null;
  const dl = osGlobal.length >= 2 ? dlugoscPolilinii(osGlobal) : 0;
  const pikietaz = round2(Math.max(0, kmDo - kmOd));
  return {
    id: CALY_PZT_ID,
    nazwa: 'Cały PZT',
    zrodloNazwa: 'caly-pzt',
    kolejnosc: 0,
    kontynuacjaPoprzedniego: false,
    kilometrazPoczatkowyM: kmOd,
    kilometrazKoncowyM: kmDo,
    obszary,
    osTrasy: osGlobal.length >= 2
      ? {
        wierzcholkiPdf: osGlobal,
        wierzcholkiM: osGlobal,
        dlugoscM: round2(Math.max(dl, pikietaz)),
        dlugoscEtykietaM: pikietaz > 0.5 ? pikietaz : undefined,
      }
      : undefined,
  };
}
