// ============================================================
// CAŁY PZT – sklejenie jak tyczenie wstecz (niweleta)
// Baza = współrzędne XFDF. Ostatnie L/P arkusza N = pierwsze L/P N+1.
// Reszta punktów: te same różnice z XFDF arkusza.
// ============================================================

import type { ArkuszPzt, ObszarObmiaru, Punkt2D } from '../types';
import { round2 } from './calculations';
import {
  dlugoscPolilinii,
  dopasujGeometrieArkuszaDoEtykiety,
  iloczynWektorowyOsi,
  osMZorientowana,
  stacjaNaOsi,
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
 */
export function kierunekLancucha(os: Punkt2D[]): Punkt2D {
  if (os.length < 2) return { x: 1, y: 0 };
  const a = os[0];
  const b = os[os.length - 1];
  if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-4) return wektorJednostkowy(a, b);
  const t = stycznyNaOsi(os, 0);
  return t ? { x: t.dx, y: t.dy } : { x: 1, y: 0 };
}

function punktBazy(
  o: ObszarObmiaru,
  ktory: 'start' | 'koniec',
  ktora: 'lewy' | 'prawy',
): Punkt2D | undefined {
  const b = ktory === 'start' ? o.bazaStart : o.bazaKoniec;
  const i = ktora === 'lewy' ? b?.idxLewy : b?.idxPrawy;
  if (i == null) return undefined;
  return o.wierzcholkiM[i];
}

function skrajLewyPrawy(os: Punkt2D[], pts: Punkt2D[]): { lewy: Punkt2D; prawy: Punkt2D } | null {
  if (os.length < 2 || pts.length < 2) return null;
  let lewy = pts[0];
  let prawy = pts[0];
  let maxC = iloczynWektorowyOsi(lewy, os);
  let minC = maxC;
  for (const p of pts) {
    const c = iloczynWektorowyOsi(p, os);
    if (c > maxC) {
      maxC = c;
      lewy = p;
    }
    if (c < minC) {
      minC = c;
      prawy = p;
    }
  }
  if (Math.hypot(lewy.x - prawy.x, lewy.y - prawy.y) < 0.05) return null;
  return { lewy, prawy };
}

/**
 * Poprzeczka L–P na początku / końcu arkusza (bazy XFDF albo skraj jezdni na osi).
 * To punkty tyczenia: ostatnie L/P arkusza N = pierwsze L/P arkusza N+1.
 */
export function stykLewyPrawy(
  ark: ArkuszPzt,
  ktory: 'start' | 'koniec',
): { lewy: Punkt2D; prawy: Punkt2D } | null {
  const os = osMZorientowana(ark);
  const lewa = ark.obszary.find((o) => o.stronaTrasy === 'lewa');
  const prawa = ark.obszary.find((o) => o.stronaTrasy === 'prawa');
  if (lewa && prawa) {
    const lewy = punktBazy(lewa, ktory, 'lewy');
    const prawy = punktBazy(prawa, ktory, 'prawy');
    if (lewy && prawy && Math.hypot(lewy.x - prawy.x, lewy.y - prawy.y) > 0.05) {
      return { lewy, prawy };
    }
  }
  for (const o of ark.obszary) {
    const lewy = punktBazy(o, ktory, 'lewy');
    const prawy = punktBazy(o, ktory, 'prawy');
    if (lewy && prawy && Math.hypot(lewy.x - prawy.x, lewy.y - prawy.y) > 0.05) {
      return { lewy, prawy };
    }
  }
  if (os.length >= 2) {
    const all = ark.obszary.flatMap((o) => o.wierzcholkiM);
    const st = all.map((p) => ({ p, s: stacjaNaOsi(os, p) }));
    if (st.length >= 2) {
      const lo = Math.min(...st.map((x) => x.s));
      const hi = Math.max(...st.map((x) => x.s));
      const pas = Math.max((hi - lo) * 0.04, 0.25);
      const pasmo = ktory === 'start'
        ? st.filter((x) => x.s <= lo + pas)
        : st.filter((x) => x.s >= hi - pas);
      const skraj = skrajLewyPrawy(os, (pasmo.length >= 2 ? pasmo : st).map((x) => x.p));
      if (skraj) return skraj;
    }
  }
  return null;
}

/**
 * Helmert 2 punkty: A,B z XFDF → A',B' z poprzedniego arkusza.
 * Reszta punktów: te same różnice (obrót + ewentualna skala styku L–P).
 */
export function transformDwochPunktow(
  srcA: Punkt2D,
  srcB: Punkt2D,
  dstA: Punkt2D,
  dstB: Punkt2D,
): Transform2D {
  const sdx = srcB.x - srcA.x;
  const sdy = srcB.y - srcA.y;
  const ddx = dstB.x - dstA.x;
  const ddy = dstB.y - dstA.y;
  const sl = Math.hypot(sdx, sdy);
  const dl = Math.hypot(ddx, ddy);
  let k = sl > 1e-9 ? dl / sl : 1;
  if (!Number.isFinite(k) || k < 0.85 || k > 1.15) k = 1;
  const rot = Math.atan2(ddy, ddx) - Math.atan2(sdy, sdx);
  const c = Math.cos(rot) * k;
  const s = Math.sin(rot) * k;
  return { c, s, tx: dstA.x - (c * srcA.x - s * srcA.y), ty: dstA.y - (s * srcA.x + c * srcA.y) };
}

function transformPrzesuniecia(src: Punkt2D, dst: Punkt2D): Transform2D {
  return { c: 1, s: 0, tx: dst.x - src.x, ty: dst.y - src.y };
}

/**
 * Składa arkusze jak tyczenie wstecz:
 * – baza = współrzędne XFDF (metry z arkusza, bez wymuszania +X),
 * – pierwsze L/P następnego arkusza = ostatnie L/P poprzedniego,
 * – pozostałe punkty z różnic XFDF (ten sam układ względny).
 */
export function scalPztDoArkusza(arkusze: ArkuszPzt[]): ArkuszPzt | null {
  if (arkusze.length === 0) return null;
  const kmOd = arkusze[0].kilometrazPoczatkowyM;
  const kmDo = arkusze[arkusze.length - 1].kilometrazKoncowyM;
  let prevStyk: { lewy: Punkt2D; prawy: Punkt2D } | null = null;
  let prevOsEnd: Punkt2D | null = null;
  const osGlobal: Punkt2D[] = [];
  const obszary: ObszarObmiaru[] = [];

  for (const surowy of arkusze) {
    const ark = dopasujGeometrieArkuszaDoEtykiety(surowy);
    const os = osMZorientowana(ark);
    const styk0 = stykLewyPrawy(ark, 'start');
    const styk1 = stykLewyPrawy(ark, 'koniec');
    let T: Transform2D;
    if (!prevStyk && !prevOsEnd) {
      T = identTransform();
    } else if (prevStyk && styk0) {
      T = transformDwochPunktow(styk0.lewy, styk0.prawy, prevStyk.lewy, prevStyk.prawy);
    } else if (os.length >= 2 && prevOsEnd) {
      T = transformPrzesuniecia(os[0], prevOsEnd);
    } else {
      T = identTransform();
    }

    if (os.length >= 2) {
      const osT = transformPunkty(T, os);
      if (osGlobal.length === 0) osGlobal.push(...osT);
      else {
        const last = osGlobal[osGlobal.length - 1];
        const d0 = Math.hypot(osT[0].x - last.x, osT[0].y - last.y);
        osGlobal.push(...(d0 < 0.05 ? osT.slice(1) : osT));
      }
      prevOsEnd = osT[osT.length - 1];
    }
    if (styk1) {
      prevStyk = {
        lewy: zastosujTransform(T, styk1.lewy),
        prawy: zastosujTransform(T, styk1.prawy),
      };
    } else {
      prevStyk = null;
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
