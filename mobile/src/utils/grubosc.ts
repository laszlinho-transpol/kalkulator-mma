// ============================================================
// GRUBOŚCI WARSTWY – pomocnicze (kompatybilność wsteczna)
// ============================================================

import type { DzialkaRobocza } from '../types';

export type KolorGrubosci = 'zielony' | 'pomaranczowy' | 'czerwony';

export function gruboscProjektowa(dz: DzialkaRobocza): number {
  return dz.gruboscProjektowa ?? dz.grubosc ?? 0;
}

export function gruboscWbudowywania(dz: DzialkaRobocza): number {
  return dz.gruboscWbudowywania ?? dz.grubosc ?? 0;
}

export function tolerancjaProcent(dz: DzialkaRobocza): number {
  return dz.tolerancja ?? 10;
}

export function formatujTolerancje(dz: DzialkaRobocza): string {
  return `±${tolerancjaProcent(dz)}%`;
}

/** Zakresy wg specyfikacji: zielony ±2% od grubości wbudowywania, pomarańczowy w tolerancji proj., czerwony poza */
export function kolorUzyskanejGrubosci(uzyskana: number, dz: DzialkaRobocza): KolorGrubosci {
  const proj = gruboscProjektowa(dz);
  const wb = gruboscWbudowywania(dz);
  const tol = tolerancjaProcent(dz) / 100;

  const minProj = proj * (1 - tol);
  const maxProj = proj * (1 + tol);
  const minZiel = wb * (1 - 0.02);
  const maxZiel = wb * (1 + 0.02);

  if (uzyskana < minProj || uzyskana > maxProj) return 'czerwony';
  if (uzyskana >= minZiel && uzyskana <= maxZiel) return 'zielony';
  return 'pomaranczowy';
}

export function kolorGrubosciDoHex(kolor: KolorGrubosci, theme: { colors: { success: string; warning: string; danger: string } }): string {
  switch (kolor) {
    case 'zielony': return theme.colors.success;
    case 'pomaranczowy': return theme.colors.warning;
    default: return theme.colors.danger;
  }
}
