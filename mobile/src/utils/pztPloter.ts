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

function punktyNaCzoie(os: Punkt2D[], pts: Punkt2D[], ktory: 'start' | 'koniec'): Punkt2D[] {
  if (os.length < 2 || pts.length === 0) return [];
  const st = pts.map((p) => ({ p, s: stacjaNaOsi(os, p) }));
  const lo = Math.min(...st.map((x) => x.s));
  const hi = Math.max(...st.map((x) => x.s));
  const pas = Math.max((hi - lo) * 0.015, 0.35);
  const pasmo = ktory === 'start'
    ? st.filter((x) => x.s <= lo + pas)
    : st.filter((x) => x.s >= hi - pas);
  return (pasmo.length >= 1 ? pasmo : st.filter((x) => (
    ktory === 'start' ? x.s <= lo + pas * 3 : x.s >= hi - pas * 3
  ))).map((x) => x.p);
}

/** Najdłuższy obszar danej strony (jezdnia, nie wjazd / łata). */
function glownyObszar(ark: ArkuszPzt, strona: 'lewa' | 'prawa'): ObszarObmiaru | undefined {
  const os = osMZorientowana(ark);
  const kand = ark.obszary.filter((o) => o.stronaTrasy === strona && o.wierzcholkiM.length >= 2);
  if (kand.length === 0) return undefined;
  if (kand.length === 1 || os.length < 2) return kand[0];
  return kand.reduce((best, o) => {
    const d = (pts: Punkt2D[]) => {
      const st = pts.map((p) => stacjaNaOsi(os, p));
      return Math.max(...st) - Math.min(...st);
    };
    return d(o.wierzcholkiM) > d(best.wierzcholkiM) ? o : best;
  });
}

function skrajPoStronie(os: Punkt2D[], pts: Punkt2D[], strona: 'lewa' | 'prawa'): Punkt2D | undefined {
  if (pts.length === 0) return undefined;
  let best = pts[0];
  let bestC = iloczynWektorowyOsi(best, os);
  for (const p of pts) {
    const c = iloczynWektorowyOsi(p, os);
    if (strona === 'lewa' ? c > bestC : c < bestC) {
      bestC = c;
      best = p;
    }
  }
  return best;
}

function skrajLewyPrawy(os: Punkt2D[], pts: Punkt2D[]): { lewy: Punkt2D; prawy: Punkt2D } | null {
  const lewy = skrajPoStronie(os, pts, 'lewa');
  const prawy = skrajPoStronie(os, pts, 'prawa');
  if (!lewy || !prawy || Math.hypot(lewy.x - prawy.x, lewy.y - prawy.y) < 0.05) return null;
  return { lewy, prawy };
}

/** Poprzeczka (L–P) jest prostopadła do osi, nie wzdłuż jezdni. */
export function czyPoprzeczka(
  styk: { lewy: Punkt2D; prawy: Punkt2D },
  os: Punkt2D[],
  stacjaM: number,
): boolean {
  const t = stycznyNaOsi(os, stacjaM);
  if (!t) return false;
  const dx = styk.prawy.x - styk.lewy.x;
  const dy = styk.prawy.y - styk.lewy.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return false;
  return Math.abs((dx * t.dx + dy * t.dy) / len) < 0.5;
}

export interface WezlyCzola {
  lewy?: Punkt2D;
  prawy?: Punkt2D;
  os?: Punkt2D;
}

/**
 * Węzły czoła: skraj żółtego (L) i różowego (P) przy min/max stacji osi.
 * Nie bierzemy zapisanej bazy – para wzdłuż jezdni + Helmert dawały załamanie 90°.
 */
export function wezlyCzola(ark: ArkuszPzt, ktory: 'start' | 'koniec'): WezlyCzola {
  const os = osMZorientowana(ark);
  const out: WezlyCzola = {};
  if (os.length >= 2) out.os = ktory === 'start' ? os[0] : os[os.length - 1];
  const lewa = glownyObszar(ark, 'lewa');
  const prawa = glownyObszar(ark, 'prawa');
  if (os.length >= 2 && lewa) {
    out.lewy = skrajPoStronie(os, punktyNaCzoie(os, lewa.wierzcholkiM, ktory), 'lewa');
  }
  if (os.length >= 2 && prawa) {
    out.prawy = skrajPoStronie(os, punktyNaCzoie(os, prawa.wierzcholkiM, ktory), 'prawa');
  }
  if ((!out.lewy || !out.prawy) && os.length >= 2) {
    const skraj = skrajLewyPrawy(os, punktyNaCzoie(os, ark.obszary.flatMap((o) => o.wierzcholkiM), ktory));
    if (skraj) {
      out.lewy = out.lewy ?? skraj.lewy;
      out.prawy = out.prawy ?? skraj.prawy;
    }
  }
  return out;
}

/**
 * Węzły L i P na czole / końcu arkusza – skraj jezdni przy min/max stacji osi.
 */
export function stykLewyPrawy(
  ark: ArkuszPzt,
  ktory: 'start' | 'koniec',
): { lewy: Punkt2D; prawy: Punkt2D } | null {
  const w = wezlyCzola(ark, ktory);
  if (!w.lewy || !w.prawy) return null;
  if (Math.hypot(w.lewy.x - w.prawy.x, w.lewy.y - w.prawy.y) < 0.05) return null;
  return { lewy: w.lewy, prawy: w.prawy };
}

/**
 * Helmert 2 punkty: A,B z XFDF → A',B' z poprzedniego arkusza.
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

const ZGODNY_PRZESUW_M = 2.5;

/**
 * Tyczenie wstecz: pierwszy L := ostatni L, pierwszy P := ostatni P.
 * Samo przesunięcie (te same Δx, Δy z XFDF). Helmert/obrót na złej parze
 * L–P (wzdłuż jezdni zamiast poprzeczki) łamał ploter pod 90°.
 */
export function transformTyczeniaWstecz(
  srcLewy: Punkt2D,
  srcPrawy: Punkt2D,
  dstLewy: Punkt2D,
  dstPrawy: Punkt2D,
): Transform2D {
  return transformZajeciaWezlow(
    { lewy: srcLewy, prawy: srcPrawy },
    { lewy: dstLewy, prawy: dstPrawy },
  );
}

/** Przesuwa arkusz tak, by węzły czoła wpadły w węzły końca poprzedniego. Bez obrotu. */
export function transformZajeciaWezlow(src: WezlyCzola, dst: WezlyCzola): Transform2D {
  const kand: Punkt2D[] = [];
  if (src.lewy && dst.lewy) kand.push({ x: dst.lewy.x - src.lewy.x, y: dst.lewy.y - src.lewy.y });
  if (src.prawy && dst.prawy) kand.push({ x: dst.prawy.x - src.prawy.x, y: dst.prawy.y - src.prawy.y });
  if (src.os && dst.os) kand.push({ x: dst.os.x - src.os.x, y: dst.os.y - src.os.y });
  if (kand.length === 0) return identTransform();
  const glowny = kand[0];
  const zgodne = kand.filter((d) => Math.hypot(d.x - glowny.x, d.y - glowny.y) <= ZGODNY_PRZESUW_M);
  const n = zgodne.length;
  return {
    c: 1,
    s: 0,
    tx: zgodne.reduce((s, d) => s + d.x, 0) / n,
    ty: zgodne.reduce((s, d) => s + d.y, 0) / n,
  };
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
  let prevWezly: WezlyCzola | null = null;
  const osGlobal: Punkt2D[] = [];
  const obszary: ObszarObmiaru[] = [];

  for (const surowy of arkusze) {
    const ark = dopasujGeometrieArkuszaDoEtykiety(surowy);
    const os = osMZorientowana(ark);
    const wezly0 = wezlyCzola(ark, 'start');
    const wezly1 = wezlyCzola(ark, 'koniec');
    const T: Transform2D = prevWezly
      ? transformZajeciaWezlow(wezly0, prevWezly)
      : identTransform();

    if (os.length >= 2) {
      const osT = transformPunkty(T, os);
      if (osGlobal.length === 0) osGlobal.push(...osT);
      else {
        const last = osGlobal[osGlobal.length - 1];
        const d0 = Math.hypot(osT[0].x - last.x, osT[0].y - last.y);
        osGlobal.push(...(d0 < 0.05 ? osT.slice(1) : osT));
      }
    }
    const mapWezel = (p?: Punkt2D): Punkt2D | undefined => (p ? zastosujTransform(T, p) : undefined);
    prevWezly = {
      lewy: mapWezel(wezly1.lewy),
      prawy: mapWezel(wezly1.prawy),
      os: mapWezel(wezly1.os) ?? (os.length >= 2 ? transformPunkty(T, os).at(-1) : undefined),
    };

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
