// Wierzchołek łuku: strzałka X w środku cięciwy c przy znanym promieniu R.

export interface WierzcholekLuku {
  /** Strzałka – odsunięcie wierzchołka od środka cięciwy [m]. */
  x: number;
  /** Połowa cięciwy – odmierzana od każdej szpilki do środka cięciwy [m]. */
  polowa: number;
  /** Kąt środkowy [°]. */
  kat: number;
  /** Długość łuku między szpilkami [m]. */
  dlugoscLuku: number;
}

/** X = R − √(R² − (c/2)²); `null`, gdy cięciwa jest dłuższa niż średnica. */
export function wierzcholekLuku(c: number, r: number): WierzcholekLuku | null {
  if (!(c > 0) || !(r > 0) || c > 2 * r) return null;
  const polowa = c / 2;
  const x = r - Math.sqrt(r * r - polowa * polowa);
  const katRad = 2 * Math.asin(polowa / r);
  return { x, polowa, kat: (katRad * 180) / Math.PI, dlugoscLuku: r * katRad };
}
