// ============================================================
// OŚ PZT – pikietaż i wycinek wielokąta wzdłuż przerywanej osi z XFDF
// ============================================================

import type { ArkuszPzt, ObszarObmiaru, Punkt2D, ProjektBudowy } from '../types';
import { powierzchniaWielokata } from './obmiarGeometry';
import { round2 } from './calculations';

function dystans(a: Punkt2D, b: Punkt2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function dlugoscPolilinii(pts: Punkt2D[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dystans(pts[i - 1], pts[i]);
  return s;
}

/** Punkt na polilinii w stacji s [m wzdłuż łańcucha]. */
export function punktNaOsi(os: Punkt2D[], s: number): Punkt2D | null {
  if (os.length < 2) return null;
  let acc = 0;
  const target = Math.max(0, s);
  for (let i = 0; i < os.length - 1; i++) {
    const d = dystans(os[i], os[i + 1]);
    if (acc + d >= target - 1e-9 || i === os.length - 2) {
      const t = d < 1e-9 ? 0 : Math.max(0, Math.min(1, (target - acc) / d));
      return { x: os[i].x + (os[i + 1].x - os[i].x) * t, y: os[i].y + (os[i + 1].y - os[i].y) * t };
    }
    acc += d;
  }
  return os[os.length - 1];
}

function czyscLancuch(pts: Punkt2D[]): Punkt2D[] {
  const out: Punkt2D[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || dystans(last, p) > 1e-4) out.push(p);
  }
  return out;
}

/** Wycina polilinię do przedziału stacji [s0, s1]. */
export function wycinekPolilinii(os: Punkt2D[], s0: number, s1: number): Punkt2D[] {
  if (os.length < 2) return [];
  const lo = Math.min(s0, s1);
  const hi = Math.max(s0, s1);
  const out: Punkt2D[] = [];
  const p0 = punktNaOsi(os, lo);
  if (p0) out.push(p0);
  let acc = 0;
  for (let i = 0; i < os.length - 1; i++) {
    const d = dystans(os[i], os[i + 1]);
    const sEnd = acc + d;
    if (sEnd > lo + 1e-4 && sEnd < hi - 1e-4) out.push(os[i + 1]);
    acc = sEnd;
  }
  const p1 = punktNaOsi(os, hi);
  if (p1) out.push(p1);
  return czyscLancuch(out);
}

/** Stacja [m] najbliższego punktu na osi (od początku łańcucha). */
export function stacjaNaOsi(os: Punkt2D[], p: Punkt2D): number {
  if (os.length < 2) return 0;
  let najlepsza = 0;
  let minD = Infinity;
  let acc = 0;
  for (let i = 0; i < os.length - 1; i++) {
    const a = os[i];
    const b = os[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const ab2 = abx * abx + aby * aby;
    const t = ab2 <= 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2));
    const qx = a.x + t * abx;
    const qy = a.y + t * aby;
    const d = Math.hypot(p.x - qx, p.y - qy);
    if (d < minD) {
      minD = d;
      najlepsza = acc + t * Math.sqrt(ab2);
    }
    acc += Math.sqrt(ab2);
  }
  return najlepsza;
}

/** Styczny do osi w stacji s – (dx,dy) unormowane, w układzie PDF (Y w górę). */
export function stycznyNaOsi(os: Punkt2D[], s: number): { punkt: Punkt2D; dx: number; dy: number } | null {
  const punkt = punktNaOsi(os, s);
  if (!punkt || os.length < 2) return null;
  let acc = 0;
  const target = Math.max(0, s);
  for (let i = 0; i < os.length - 1; i++) {
    const d = dystans(os[i], os[i + 1]);
    if (acc + d >= target - 1e-9 || i === os.length - 2) {
      const dx = os[i + 1].x - os[i].x;
      const dy = os[i + 1].y - os[i].y;
      const len = Math.hypot(dx, dy) || 1;
      return { punkt, dx: dx / len, dy: dy / len };
    }
    acc += d;
  }
  return null;
}

/**
 * Pełne wielokrotności kroku w [odM, doM], np. start 106+850, krok 50 → 106+850, 106+900, …
 */
export function stacjePodzialki(odM: number, doM: number, krokM: number): number[] {
  const krok = Math.max(1, Math.round(krokM));
  const lo = Math.min(odM, doM);
  const hi = Math.max(odM, doM);
  const first = Math.ceil(lo / krok - 1e-9) * krok;
  const out: number[] = [];
  for (let s = first; s <= hi + 1e-6; s += krok) out.push(Math.round(s * 1000) / 1000);
  return out;
}

/** Ustawia łańcuch osi zgodnie z rosnącym km: do końca poprzedniego arkusza, inaczej od mniejszego X. */
export function orientujLancuchDoKm(pts: Punkt2D[], prevKoniec?: Punkt2D): Punkt2D[] {
  if (pts.length < 2) return pts;
  if (prevKoniec) {
    return dystans(pts[0], prevKoniec) <= dystans(pts[pts.length - 1], prevKoniec)
      ? pts
      : [...pts].reverse();
  }
  return pts[0].x <= pts[pts.length - 1].x ? pts : [...pts].reverse();
}

/**
 * Lewa / prawa patrząc zgodnie z rosnącym kilometrażem (kierunek osi).
 * Iloczyn wektorowy > 0 (PDF Y w górę) = lewa strona trasy.
 */
export function stronaWzgledemOsi(p: Punkt2D, os: Punkt2D[]): 'lewa' | 'prawa' | undefined {
  if (os.length < 2) return undefined;
  const t = stycznyNaOsi(os, stacjaNaOsi(os, p));
  if (!t) return undefined;
  const cross = t.dx * (p.y - t.punkt.y) - t.dy * (p.x - t.punkt.x);
  if (Math.abs(cross) < 1e-6) return undefined;
  return cross > 0 ? 'lewa' : 'prawa';
}

export function iloczynWektorowyOsi(p: Punkt2D, os: Punkt2D[]): number {
  if (os.length < 2) return 0;
  const t = stycznyNaOsi(os, stacjaNaOsi(os, p));
  if (!t) return 0;
  return t.dx * (p.y - t.punkt.y) - t.dy * (p.x - t.punkt.x);
}

function interp(a: Punkt2D, b: Punkt2D, sa: number, sb: number, s: number): Punkt2D {
  const t = Math.abs(sb - sa) < 1e-9 ? 0 : (s - sa) / (sb - sa);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Wycina wielokąt do przedziału stacji na osi [s0, s1] metrów. */
export function wycinekWielokataPoOsi(poly: Punkt2D[], os: Punkt2D[], s0: number, s1: number): Punkt2D[] {
  if (poly.length < 3 || os.length < 2) return [];
  const lo = Math.min(s0, s1);
  const hi = Math.max(s0, s1);
  const inside = (s: number) => s >= lo - 1e-4 && s <= hi + 1e-4;
  const out: Punkt2D[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const sa = stacjaNaOsi(os, a);
    const sb = stacjaNaOsi(os, b);
    if (inside(sa)) out.push(a);
    const crossings: Punkt2D[] = [];
    for (const gran of [lo, hi]) {
      if ((sa < gran && sb >= gran) || (sa > gran && sb <= gran) || (sa <= gran && sb > gran) || (sa >= gran && sb < gran)) {
        if ((sa - gran) * (sb - gran) <= 0 && Math.abs(sb - sa) > 1e-9) {
          crossings.push(interp(a, b, sa, sb, gran));
        }
      }
    }
    crossings.sort((p, q) => dystans(a, p) - dystans(a, q));
    for (const c of crossings) out.push(c);
  }
  const czyste: Punkt2D[] = [];
  for (const p of out) {
    const last = czyste[czyste.length - 1];
    if (!last || dystans(last, p) > 1e-4) czyste.push(p);
  }
  if (czyste.length >= 3 && dystans(czyste[0], czyste[czyste.length - 1]) < 1e-4) czyste.pop();
  return czyste;
}

export function powierzchniaWycinkaM2(
  obszar: ObszarObmiaru,
  osM: Punkt2D[],
  s0: number,
  s1: number,
  odsadzkaLewaCm: number,
  odsadzkaPrawaCm: number,
): number {
  const clip = wycinekWielokataPoOsi(obszar.wierzcholkiM, osM, s0, s1);
  const baza = clip.length >= 3 ? powierzchniaWielokata(clip) : 0;
  const dl = Math.max(0, Math.abs(s1 - s0));
  const extra = dl * ((Math.max(0, odsadzkaLewaCm) + Math.max(0, odsadzkaPrawaCm)) / 100);
  return round2(Math.max(0, baza) + extra);
}

export function arkuszeNachodzaceNaKm(projekt: ProjektBudowy, odM: number, doM: number): ArkuszPzt[] {
  const lo = Math.min(odM, doM);
  const hi = Math.max(odM, doM);
  return projekt.arkusze.filter((a) => a.kilometrazKoncowyM > lo + 0.05 && a.kilometrazPoczatkowyM < hi - 0.05);
}

export function arkuszWycinekDlaKm(
  arkusz: ArkuszPzt,
  pasuje: (o: ObszarObmiaru) => boolean,
  odM: number,
  doM: number,
): ArkuszPzt {
  const osM = arkusz.osTrasy?.wierzcholkiM;
  const osPdf = arkusz.osTrasy?.wierzcholkiPdf;
  const dlOs = arkusz.osTrasy?.dlugoscM
    ?? Math.max(0.01, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM);
  const s0 = Math.max(0, Math.min(odM, doM) - arkusz.kilometrazPoczatkowyM);
  const s1 = Math.min(dlOs, Math.max(odM, doM) - arkusz.kilometrazPoczatkowyM);
  const skalaS = osPdf && osM && osM.length >= 2
    ? dlugoscPolilinii(osPdf) / Math.max(dlugoscPolilinii(osM), 1e-6)
    : 1;
  const obszary = arkusz.obszary.filter(pasuje).map((o) => {
    if (s1 <= s0 + 0.05) return { ...o, wierzcholkiM: [], wierzcholkiPdf: [], powierzchniaM2: 0 };
    if (!osM) return o;
    const clip = wycinekWielokataPoOsi(o.wierzcholkiM, osM, s0, s1);
    if (clip.length < 3) return { ...o, wierzcholkiM: clip, powierzchniaM2: 0 };
    let clipPdf = o.wierzcholkiPdf;
    if (osPdf && osPdf.length >= 2) {
      clipPdf = wycinekWielokataPoOsi(o.wierzcholkiPdf, osPdf, s0 * skalaS, s1 * skalaS);
    }
    return {
      ...o,
      wierzcholkiM: clip,
      wierzcholkiPdf: clipPdf.length >= 3 ? clipPdf : o.wierzcholkiPdf,
      powierzchniaM2: round2(powierzchniaWielokata(clip)),
    };
  }).filter((o) => o.wierzcholkiM.length >= 3 && o.powierzchniaM2 > 0.05);

  const osClipM = osM && osM.length >= 2 ? wycinekPolilinii(osM, s0, s1) : undefined;
  const osClipPdf = osPdf && osPdf.length >= 2 ? wycinekPolilinii(osPdf, s0 * skalaS, s1 * skalaS) : undefined;
  const osTrasy = osClipM && osClipM.length >= 2
    ? {
      wierzcholkiPdf: osClipPdf && osClipPdf.length >= 2 ? osClipPdf : (arkusz.osTrasy?.wierzcholkiPdf ?? osClipM),
      wierzcholkiM: osClipM,
      dlugoscM: round2(Math.max(0, s1 - s0)),
    }
    : arkusz.osTrasy;

  return {
    ...arkusz,
    kilometrazPoczatkowyM: arkusz.kilometrazPoczatkowyM + s0,
    kilometrazKoncowyM: arkusz.kilometrazPoczatkowyM + s1,
    obszary,
    osTrasy,
  };
}
