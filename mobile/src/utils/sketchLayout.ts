// ============================================================
// LAYOUT SZKICU – wspólne obliczenia wysokości i wymiarów SVG
// tryb 'standard' – kompaktowy (plan, archiwum, podgląd)
// tryb 'live'      – proporcjonalny wg metrów (zakładka LIVE)
// ============================================================

import { dlugoscFigury } from './calculations';
import type { Figura } from '../types';

export type TrybSzkicu = 'standard' | 'live';

export const SKETCH_LEFT_MARGIN = 44;
export const SKETCH_BLOCK_W = 80;
export const SKETCH_RIGHT_MARGIN = 58;
export const SKETCH_SVG_W = SKETCH_LEFT_MARGIN + SKETCH_BLOCK_W + SKETCH_RIGHT_MARGIN;

const MIN_H = 26;
const MAX_H_STANDARD = 110;
/** Piksele na metr w trybie LIVE – długie odcinki są czytelniejsze dzięki przewijaniu */
const PX_PER_M_LIVE = 1.15;
const PAD_TOP = 12;
const PAD_BOT = 12;

/** Wysokości pionowe figur [px] */
export function obliczWysokosciFigur(figury: Figura[], tryb: TrybSzkicu = 'standard'): number[] {
  if (figury.length === 0) return [];
  const lengths = figury.map(dlugoscFigury);

  if (tryb === 'live') {
    return lengths.map((l) => Math.max(MIN_H, Math.round(l * PX_PER_M_LIVE)));
  }

  const maxLen = Math.max(...lengths, 1);
  return lengths.map((l) => Math.max(MIN_H, Math.round((l / maxLen) * MAX_H_STANDARD)));
}

/** Całkowita wysokość SVG szkicu */
export function obliczWysokoscSzkicu(figury: Figura[], tryb: TrybSzkicu = 'standard'): number {
  const heights = obliczWysokosciFigur(figury, tryb);
  if (heights.length === 0) return PAD_TOP + PAD_BOT;
  return heights.reduce((s, h) => s + h, 0) + PAD_TOP + PAD_BOT;
}

/** Kumulatywne metry od startu działki */
export function cumMetryFigur(figury: Figura[]): number[] {
  const res: number[] = [];
  let cum = 0;
  for (const f of figury) {
    res.push(cum);
    cum += dlugoscFigury(f);
  }
  return res;
}

/** Pozycja Y [px] dla danego metra bieżącego */
export function metryDoY(
  figury: Figura[],
  heights: number[],
  metryOdStartu: number,
): number {
  let cumMetry = 0;
  let cumY = PAD_TOP;
  for (let i = 0; i < figury.length; i++) {
    const l = dlugoscFigury(figury[i]);
    if (metryOdStartu <= cumMetry + l) {
      return cumY + ((metryOdStartu - cumMetry) / Math.max(l, 1)) * heights[i];
    }
    cumMetry += l;
    cumY += heights[i];
  }
  return cumY;
}

function maxSzerokoscFiguryM(figura: Figura): number {
  switch (figura.typ) {
    case 'prostokat': return figura.szerokosc;
    case 'trapez': return Math.max(figura.szerokosc1, figura.szerokosc2);
    case 'trojkat': return figura.szerokosc;
    case 'pierscien': return figura.szerokosc * 1.5;
    case 'wjazd': return figura.s;
    default: return 1;
  }
}

/** Szerokość figury [m] w ułamku długości 0…1, zgodnie z kształtem na szkicu. */
export function szerokoscMNaUlamku(figura: Figura, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  switch (figura.typ) {
    case 'prostokat': return figura.szerokosc;
    case 'trapez': return figura.szerokosc1 + (figura.szerokosc2 - figura.szerokosc1) * u;
    case 'trojkat': return figura.szerokosc * (1 - u);
    case 'pierscien': return figura.szerokosc * (1.35 - 0.8 * u);
    case 'wjazd': {
      const udzialL = figura.L / Math.max(figura.L + figura.R1 + figura.R2, 1);
      const prog = Math.min(udzialL, 0.75);
      if (u <= prog) return figura.s;
      const k = (u - prog) / Math.max(1 - prog, 1e-6);
      return figura.s * (1 - 0.5 * k);
    }
    default: return 1;
  }
}

/** Szerokość układanego pasa [px] na szkicu figur, w danym metrze od startu. */
export function szerokoscObszaruSzkicuPx(figury: Figura[], metryOdStartu: number): number {
  const maxSzer = Math.max(...figury.map(maxSzerokoscFiguryM), 1);
  let cum = 0;
  for (let i = 0; i < figury.length; i++) {
    const f = figury[i];
    const l = dlugoscFigury(f);
    const ostatnia = i === figury.length - 1;
    if (ostatnia || metryOdStartu <= cum + l) {
      const u = l <= 0 ? 0 : Math.max(0, Math.min(1, (metryOdStartu - cum) / l));
      const szerM = szerokoscMNaUlamku(f, u);
      return Math.max(6, (szerM / maxSzer) * SKETCH_BLOCK_W);
    }
    cum += l;
  }
  return SKETCH_BLOCK_W;
}

export const SKETCH_PAD = { top: PAD_TOP, bot: PAD_BOT };
