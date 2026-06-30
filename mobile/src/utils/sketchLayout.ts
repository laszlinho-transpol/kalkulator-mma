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

export const SKETCH_PAD = { top: PAD_TOP, bot: PAD_BOT };
