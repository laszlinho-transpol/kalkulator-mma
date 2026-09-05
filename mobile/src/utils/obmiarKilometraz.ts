// ============================================================
// KILOMETRAŻ na obszarze + pozycja na ścieżce układania
// ============================================================

import type { ObszarObmiaru, Punkt2D } from '../types';
import { dlugoscUkladaniaObszaru } from './obmiarLive';
import { round2 } from './calculations';

function dystans(a: Punkt2D, b: Punkt2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export interface ZnacznikKilometrazu {
  km: number;
  m: number;
  odStartuM: number;
  etykieta: string;
}

/** Pełne pikiety co 100 m. Start 1+830, dł. 400 → 1+900, 2+000, 2+100, 2+200. */
export function pelneKilometrazeCo100m(
  startKm: number,
  startM: number,
  dlugoscObszaruM: number,
): ZnacznikKilometrazu[] {
  if (dlugoscObszaruM <= 0) return [];
  const startAbs = Math.max(0, startKm) * 1000 + Math.max(0, startM);
  const koniecAbs = startAbs + dlugoscObszaruM;
  let nastepny = Math.floor(startAbs / 100) * 100 + 100;
  if (nastepny <= startAbs) nastepny += 100;
  const out: ZnacznikKilometrazu[] = [];
  for (let abs = nastepny; abs <= koniecAbs + 1e-6; abs += 100) {
    const odStartuM = round2(abs - startAbs);
    const km = Math.floor(abs / 1000);
    const m = Math.round(abs % 1000);
    out.push({
      km,
      m,
      odStartuM,
      etykieta: `${km}+${String(m).padStart(3, '0')}`,
    });
  }
  return out;
}

export interface PunktNaSciezce {
  punkt: Punkt2D;
  headingRad: number;
  ok: boolean;
}

function lukDlugosc(wierzcholki: Punkt2D[], od: number, doIdx: number, kierunek: 1 | -1): number {
  const n = wierzcholki.length;
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

function idxStartKoniec(obszar: ObszarObmiaru): { start: number; koniec: number; kierunek: 1 | -1 } {
  const n = obszar.wierzcholkiM.length;
  const wezly = obszar.wezlyRole ?? [];
  const s = wezly.find((w) => w.rola === 'start');
  const k = wezly.find((w) => w.rola === 'koniec');
  const start = s ? s.idx : 0;
  const koniec = k ? k.idx : Math.min(Math.max(1, Math.floor(n / 2)), Math.max(n - 1, 1));
  const p = lukDlugosc(obszar.wierzcholkiM, start, koniec, 1);
  const q = lukDlugosc(obszar.wierzcholkiM, start, koniec, -1);
  return { start, koniec, kierunek: p <= q ? 1 : -1 };
}

export function punktNaSciezceUkladania(obszar: ObszarObmiaru, metryOdStartu: number): PunktNaSciezce {
  const pts = obszar.wierzcholkiM;
  if (pts.length < 2) return { punkt: { x: 0, y: 0 }, headingRad: 0, ok: false };
  const { start, koniec, kierunek } = idxStartKoniec(obszar);
  const n = pts.length;
  let remaining = Math.max(0, metryOdStartu);
  let i = ((start % n) + n) % n;
  const cel = ((koniec % n) + n) % n;
  let guard = 0;
  let headingRad = 0;
  while (guard < n + 1) {
    const next = (((i + kierunek) % n) + n) % n;
    const d = dystans(pts[i], pts[next]);
    headingRad = Math.atan2(pts[next].y - pts[i].y, pts[next].x - pts[i].x);
    if (remaining <= d) {
      const t = d > 0 ? remaining / d : 0;
      return {
        punkt: {
          x: pts[i].x + (pts[next].x - pts[i].x) * t,
          y: pts[i].y + (pts[next].y - pts[i].y) * t,
        },
        headingRad,
        ok: true,
      };
    }
    remaining -= d;
    i = next;
    guard += 1;
    if (i === cel) return { punkt: { ...pts[cel] }, headingRad, ok: true };
  }
  return { punkt: { ...pts[start] }, headingRad: 0, ok: false };
}

export function znacznikiKilometrazuNaObszarze(obszar: ObszarObmiaru): Array<
  ZnacznikKilometrazu & { pozycja: PunktNaSciezce }
> {
  if (obszar.kilometrazStartKm == null || obszar.kilometrazStartM == null) return [];
  const dl = dlugoscUkladaniaObszaru(obszar);
  return pelneKilometrazeCo100m(obszar.kilometrazStartKm, obszar.kilometrazStartM, dl).map((z) => ({
    ...z,
    pozycja: punktNaSciezceUkladania(obszar, z.odStartuM),
  }));
}
