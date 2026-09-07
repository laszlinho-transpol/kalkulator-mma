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

export const SKALA_MIN = 0.1;
export const SKALA_MAX = 64;
export const TARCIE_DECAY = 0.996;

/** Presety jak w PDF-XChange (10% … 6400%). */
export const PRESETY_ZOOM_PROC = [10, 25, 50, 100, 200, 400, 800, 1600, 2400, 3200, 6400] as const;

export function skalaZProcentu(proc: number): number {
  return ograniczenie(proc / 100, SKALA_MIN, SKALA_MAX);
}

/** Kolejny/poprzedni stopień lupki (albo skrajny preset). */
export function nastepnyPresetZoom(skala: number, kierunek: -1 | 1): number {
  const pct = skala * 100;
  if (kierunek > 0) {
    const next = PRESETY_ZOOM_PROC.find((p) => p > pct + 0.51);
    return skalaZProcentu(next ?? PRESETY_ZOOM_PROC[PRESETY_ZOOM_PROC.length - 1]);
  }
  const prev = [...PRESETY_ZOOM_PROC].reverse().find((p) => p < pct - 0.51);
  return skalaZProcentu(prev ?? PRESETY_ZOOM_PROC[0]);
}

/**
 * Odwrotność transformacji podglądu (translate → rotate → scale, oś w środku ramki).
 * Zwraca współrzędne w przestrzeni SVG (przed zoomem).
 */
export function punktSvgZEkranu(args: {
  ekranX: number;
  ekranY: number;
  szer: number;
  wys: number;
  tx: number;
  ty: number;
  rot: number;
  skala: number;
}): { x: number; y: number } {
  const cx = args.szer / 2;
  const cy = args.wys / 2;
  const qx = args.ekranX - cx - args.tx;
  const qy = args.ekranY - cy - args.ty;
  const c = Math.cos(-args.rot);
  const s = Math.sin(-args.rot);
  const rx = qx * c - qy * s;
  const ry = qx * s + qy * c;
  const sc = args.skala === 0 ? 1 : args.skala;
  return { x: cx + rx / sc, y: cy + ry / sc };
}
