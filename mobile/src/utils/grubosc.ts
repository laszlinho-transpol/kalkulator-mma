// ============================================================
// GRUBOŚCI WARSTWY – pomocnicze (kompatybilność wsteczna)
// ============================================================

import type { DzialkaRobocza } from '../types';

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
