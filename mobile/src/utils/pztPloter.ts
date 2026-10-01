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

function tangensStart(os: Punkt2D[]): Punkt2D {
  const t = stycznyNaOsi(os, 0);
  return t ? { x: t.dx, y: t.dy } : { x: 1, y: 0 };
}

function tangensKoniec(os: Punkt2D[]): Punkt2D {
  const t = stycznyNaOsi(os, dlugoscPolilinii(os));
  return t ? { x: t.dx, y: t.dy } : { x: 1, y: 0 };
}

/**
 * Składa arkusze w jeden „ploter”: oś ciągła, obszary i krawężniki
 * w metrach (rysowane jako wierzcholkiPdf w podglądzie).
 */
export function scalPztDoArkusza(arkusze: ArkuszPzt[]): ArkuszPzt | null {
  if (arkusze.length === 0) return null;
  const kmOd = arkusze[0].kilometrazPoczatkowyM;
  const kmDo = arkusze[arkusze.length - 1].kilometrazKoncowyM;
  let prevEnd: Punkt2D | null = null;
  let prevTang: Punkt2D | null = null;
  const osGlobal: Punkt2D[] = [];
  const obszary: ObszarObmiaru[] = [];

  for (const ark of arkusze) {
    const os = osMZorientowana(ark);
    let T: Transform2D;
    if (os.length >= 2) {
      const tang0 = tangensStart(os);
      T = !prevEnd || !prevTang
        ? transformStyku(os[0], tang0, { x: 0, y: 0 }, { x: 1, y: 0 })
        : transformStyku(os[0], tang0, prevEnd, prevTang);
      const osT = transformPunkty(T, os);
      if (osGlobal.length === 0) osGlobal.push(...osT);
      else {
        const last = osGlobal[osGlobal.length - 1];
        const d0 = Math.hypot(osT[0].x - last.x, osT[0].y - last.y);
        osGlobal.push(...(d0 < 0.05 ? osT.slice(1) : osT));
      }
      prevEnd = osT[osT.length - 1];
      prevTang = obrocWektor(T, tangensKoniec(os));
    } else {
      T = prevEnd && prevTang
        ? transformStyku({ x: 0, y: 0 }, { x: 1, y: 0 }, prevEnd, prevTang)
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
