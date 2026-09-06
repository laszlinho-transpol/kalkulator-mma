// ============================================================
// GESTY MAPY (Google Maps) – zoom w punkcie, obrót, tarcie
// ============================================================

export function ograniczenie(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Nowa translacja przy pinch/zoom tak, aby punkt pod ogniskiem
 * (środek między palcami) został w miejscu.
 *
 * f0 – ognisko na starcie gestu, f1 – bieżące (względem środka widoku).
 * s0/t0 – skala i translacja na starcie gestu.
 */
export function translacjaPrzyZoomie(args: {
  skala0: number;
  skala1: number;
  tx0: number;
  ty0: number;
  f0x: number;
  f0y: number;
  f1x: number;
  f1y: number;
}): { tx: number; ty: number } {
  const s0 = args.skala0 === 0 ? 1 : args.skala0;
  const k = args.skala1 / s0;
  return {
    tx: args.f1x - k * (args.f0x - args.tx0),
    ty: args.f1y - k * (args.f0y - args.ty0),
  };
}

/**
 * Obrót wokół ogniska: punkt pod palcami zostaje, reszta krąży.
 * f – ognisko względem środka widoku.
 */
export function translacjaPrzyObrocie(args: {
  tx0: number;
  ty0: number;
  dRot: number;
  fx: number;
  fy: number;
}): { tx: number; ty: number } {
  const cos = Math.cos(args.dRot);
  const sin = Math.sin(args.dRot);
  const dx = args.tx0 - args.fx;
  const dy = args.ty0 - args.fy;
  return {
    tx: args.fx + dx * cos - dy * sin,
    ty: args.fy + dx * sin + dy * cos,
  };
}

export const SKALA_MIN = 0.4;
export const SKALA_MAX = 14;
export const TARCIE_DECAY = 0.996;
