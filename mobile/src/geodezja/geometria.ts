// Wspólna geometria szkiców geodezyjnych: wektory, krzywa kwadratowa (łuk linii), widok kartki.

export interface Pkt {
  x: number;
  y: number;
}

/** Widok kartki: ekran = świat × s + t (świat w metrach, oś y w dół jak na kartce). */
export interface Widok {
  s: number;
  tx: number;
  ty: number;
}

export const SKALA_WIDOKU_MIN = 2;
export const SKALA_WIDOKU_MAX = 4000;

export const odl = (a: Pkt, b: Pkt) => Math.hypot(b.x - a.x, b.y - a.y);
export const srodek = (a: Pkt, b: Pkt): Pkt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const naEkran = (w: Widok, p: Pkt): Pkt => ({ x: p.x * w.s + w.tx, y: p.y * w.s + w.ty });
export const naSwiat = (w: Widok, p: Pkt): Pkt => ({ x: (p.x - w.tx) / w.s, y: (p.y - w.ty) / w.s });

export function ograniczSkale(s: number): number {
  return Math.min(SKALA_WIDOKU_MAX, Math.max(SKALA_WIDOKU_MIN, s));
}

/** Zoom wokół punktu ekranu `f` – punkt pod palcem/kursorem zostaje w miejscu. */
export function zoomWokol(w: Widok, s1: number, f: Pkt): Widok {
  const s = ograniczSkale(s1);
  const swiat = naSwiat(w, f);
  return { s, tx: f.x - swiat.x * s, ty: f.y - swiat.y * s };
}

/** Widok mieszczący prostokąt świata w ramce `szer × wys` z marginesem w px. */
export function dopasujWidok(
  zakres: { minX: number; minY: number; maxX: number; maxY: number } | null,
  szer: number,
  wys: number,
  margines = 48,
  domyslnaSkala = 40,
): Widok {
  if (!zakres) return { s: domyslnaSkala, tx: szer / 2, ty: wys / 2 };
  const w = Math.max(zakres.maxX - zakres.minX, 1e-6);
  const h = Math.max(zakres.maxY - zakres.minY, 1e-6);
  const s = ograniczSkale(Math.min((szer - 2 * margines) / w, (wys - 2 * margines) / h, domyslnaSkala * 8));
  const cx = (zakres.minX + zakres.maxX) / 2;
  const cy = (zakres.minY + zakres.maxY) / 2;
  return { s, tx: szer / 2 - cx * s, ty: wys / 2 - cy * s };
}

export function zakresPunktow(punkty: Pkt[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (punkty.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of punkty) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Punkt kontrolny krzywej kwadratowej, która przechodzi przez środek M = środek cięciwy + strzałka. */
export function kontrolnyLuku(a: Pkt, b: Pkt, wygiecie: number): Pkt {
  const L = odl(a, b);
  const m = srodek(a, b);
  if (L === 0 || wygiecie === 0) return m;
  const nx = -(b.y - a.y) / L;
  const ny = (b.x - a.x) / L;
  return { x: m.x + 2 * nx * wygiecie * L, y: m.y + 2 * ny * wygiecie * L };
}

export function punktKrzywej(a: Pkt, c: Pkt, b: Pkt, t: number): Pkt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

const PROBKI = 64;

export function dlugoscKrzywej(a: Pkt, c: Pkt, b: Pkt): number {
  let suma = 0;
  let poprz = a;
  for (let i = 1; i <= PROBKI; i++) {
    const p = punktKrzywej(a, c, b, i / PROBKI);
    suma += odl(poprz, p);
    poprz = p;
  }
  return suma;
}

/** Stosunek długości łuku do cięciwy – zależy tylko od wygięcia (łuk skaluje się z cięciwą). */
export function czynnikLuku(wygiecie: number): number {
  if (!wygiecie) return 1;
  const a = { x: 0, y: 0 };
  const b = { x: 1, y: 0 };
  return dlugoscKrzywej(a, kontrolnyLuku(a, b, wygiecie), b);
}

/** Punkt na krzywej w odległości `s` (wzdłuż łuku) od początku. */
export function punktNaDlugosci(a: Pkt, c: Pkt, b: Pkt, s: number): Pkt {
  if (s <= 0) return a;
  let suma = 0;
  let poprz = a;
  for (let i = 1; i <= PROBKI; i++) {
    const p = punktKrzywej(a, c, b, i / PROBKI);
    const d = odl(poprz, p);
    if (suma + d >= s) {
      const k = d === 0 ? 0 : (s - suma) / d;
      return { x: poprz.x + (p.x - poprz.x) * k, y: poprz.y + (p.y - poprz.y) * k };
    }
    suma += d;
    poprz = p;
  }
  return b;
}

/** Rzut punktu na krzywą: odległość wzdłuż łuku od początku do najbliższego miejsca. */
export function rzutNaKrzywa(a: Pkt, c: Pkt, b: Pkt, p: Pkt): { s: number; odleglosc: number } {
  let suma = 0;
  let poprz = a;
  let najlepszy = { s: 0, odleglosc: odl(a, p) };
  for (let i = 1; i <= PROBKI; i++) {
    const q = punktKrzywej(a, c, b, i / PROBKI);
    const dx = q.x - poprz.x;
    const dy = q.y - poprz.y;
    const d2 = dx * dx + dy * dy;
    const k = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - poprz.x) * dx + (p.y - poprz.y) * dy) / d2));
    const rzut = { x: poprz.x + dx * k, y: poprz.y + dy * k };
    const o = odl(rzut, p);
    if (o < najlepszy.odleglosc) najlepszy = { s: suma + Math.sqrt(d2) * k, odleglosc: o };
    suma += Math.sqrt(d2);
    poprz = q;
  }
  return najlepszy;
}

/** Odległość punktu od odcinka. */
export function odlOdOdcinka(p: Pkt, a: Pkt, b: Pkt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const k = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2));
  return Math.hypot(p.x - (a.x + dx * k), p.y - (a.y + dy * k));
}

/** Liczba z przecinkiem dziesiętnym (zapis polski), bez „-0”. */
export function fm(n: number, miejsca = 2): string {
  const r = n.toFixed(miejsca);
  const bezMinusZera = /^-0(\.0+)?$/.test(r) ? r.slice(1) : r;
  return bezMinusZera.replace('.', ',');
}

export function zeZnakiem(n: number, miejsca = 0): string {
  const t = fm(n, miejsca);
  return n > 0 && !/^0(,0+)?$/.test(t) ? `+${t}` : t;
}

/** Liczba wpisana przez użytkownika (przecinek lub kropka); puste → undefined. */
export function liczbaZTekstu(t: string | undefined): number | undefined {
  if (t == null) return undefined;
  const s = t.trim().replace(',', '.').replace(/[−–]/g, '-').replace(/\s/g, '');
  if (s === '' || s === '-' || s === '.') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
