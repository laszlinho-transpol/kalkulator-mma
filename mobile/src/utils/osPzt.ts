// ============================================================
// OŚ PZT – pikietaż i wycinek wielokąta wzdłuż przerywanej osi z XFDF
// ============================================================

import type { ArkuszPzt, ObszarObmiaru, Punkt2D, ProjektBudowy, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import { metryNaPunktPdf, powierzchniaWielokata } from './obmiarGeometry';
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

/** Kilometraż arkusza dla punktu PDF: rzut na oś, potem skala km arkusza. */
export function kilometrazZPunktuPdf(
  arkusz: {
    kilometrazPoczatkowyM: number;
    kilometrazKoncowyM: number;
    osTrasy?: { wierzcholkiPdf?: Punkt2D[] };
  },
  punkt: Punkt2D,
): number | null {
  const os = arkusz.osTrasy?.wierzcholkiPdf;
  if (!os || os.length < 2) return null;
  const dl = dlugoscPolilinii(os);
  if (dl < 1e-6) return null;
  const s = Math.max(0, Math.min(dl, stacjaNaOsi(os, punkt)));
  const od = arkusz.kilometrazPoczatkowyM;
  return od + (s / dl) * (arkusz.kilometrazKoncowyM - od);
}

/**
 * Stacja z wysunięciem poza kreskę osi: czoła żółtego/różowego często wystają
 * 0,3–1 m za ostatni wierzchołek przerywanej osi (stąd 9 166 zamiast 9 181).
 */
export function stacjaNaOsiZWysunieciem(os: Punkt2D[], p: Punkt2D, maxWysuniecieM = 4): number {
  const s = stacjaNaOsi(os, p);
  if (os.length < 2) return s;
  const L = dlugoscPolilinii(os);
  const t0 = stycznyNaOsi(os, 0);
  const t1 = stycznyNaOsi(os, L);
  if (!t0 || !t1) return s;
  const a0 = os[0];
  const a1 = os[os.length - 1];
  const w0 = (p.x - a0.x) * t0.dx + (p.y - a0.y) * t0.dy;
  const w1 = (p.x - a1.x) * t1.dx + (p.y - a1.y) * t1.dy;
  const off0 = Math.abs((p.x - a0.x) * (-t0.dy) + (p.y - a0.y) * t0.dx);
  const off1 = Math.abs((p.x - a1.x) * (-t1.dy) + (p.y - a1.y) * t1.dx);
  const maxOff = 14;
  if (w0 < -0.02 && -w0 <= maxWysuniecieM && off0 <= maxOff) return w0;
  if (w1 > 0.02 && w1 <= maxWysuniecieM && off1 <= maxOff) return L + w1;
  return s;
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

/** Ułamek stacji na odcinku osi (do porównania pikiet PZT vs XFDF na tym samym PDF). */
export function udzialStacjiNaOsi(odM: number, doM: number, stacjaM: number): number {
  const span = Math.max(0.01, doM - odM);
  return (stacjaM - odM) / span;
}

/**
 * Kierunek rosnącego km na arkuszu: wzdłuż dłuższej osi bbox obszarów (PZT: zwykle +X).
 * Każdy arkusz ma własny układ PDF – nie wolno łączyć końców z poprzedniej strony.
 */
export function kierunekRosnacegoKm(pts: Punkt2D[]): Punkt2D {
  if (pts.length < 2) return { x: 1, y: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const dx = Math.max(...xs) - Math.min(...xs);
  const dy = Math.max(...ys) - Math.min(...ys);
  if (dy > dx * 1.3) return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

/** Ustawia łańcuch osi zgodnie z rosnącym km (kierunek arkusza, domyślnie +X). */
export function orientujLancuchDoKm(pts: Punkt2D[], kierunek?: Punkt2D): Punkt2D[] {
  if (pts.length < 2) return pts;
  const dir = kierunek && (kierunek.x !== 0 || kierunek.y !== 0) ? kierunek : { x: 1, y: 0 };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const kx = dir.x / len;
  const ky = dir.y / len;
  const proj = (p: Punkt2D) => p.x * kx + p.y * ky;
  return proj(pts[0]) <= proj(pts[pts.length - 1]) ? pts : [...pts].reverse();
}

/** Oś arkusza w kierunku rosnącego km (każda strona PDF osobno). */
export function osPdfZorientowana(arkusz: ArkuszPzt): Punkt2D[] {
  const os = arkusz.osTrasy?.wierzcholkiPdf;
  if (!os || os.length < 2) return [];
  const pts = arkusz.obszary.flatMap((o) => o.wierzcholkiPdf);
  return orientujLancuchDoKm(os, kierunekRosnacegoKm(pts));
}

export function osMZorientowana(arkusz: ArkuszPzt): Punkt2D[] {
  const os = arkusz.osTrasy?.wierzcholkiM;
  if (!os || os.length < 2) return [];
  const pts = arkusz.obszary.flatMap((o) => o.wierzcholkiM);
  return orientujLancuchDoKm(os, kierunekRosnacegoKm(pts));
}

/** Rozciąga łańcuch wzdłuż siebie, żeby długość = cel (etykieta XFDF, nie kreska 1:500). */
export function rozciagnijLancuchDoDlugosci(os: Punkt2D[], celM: number): Punkt2D[] {
  if (os.length < 2 || !Number.isFinite(celM) || celM < 1e-3) return os;
  const dl = dlugoscPolilinii(os);
  if (dl < 1e-6 || Math.abs(dl - celM) < 0.005) return os;
  const k = celM / dl;
  const out: Punkt2D[] = [{ ...os[0] }];
  for (let i = 1; i < os.length; i++) {
    out.push({
      x: out[i - 1].x + (os[i].x - os[i - 1].x) * k,
      y: out[i - 1].y + (os[i].y - os[i - 1].y) * k,
    });
  }
  return out;
}

/** Przenosi punkt (stacja + odsunięcie) ze starej osi na rozciągniętą. */
export function przeniesPunktPrzyRozciagnieciuOsi(
  p: Punkt2D,
  osStara: Punkt2D[],
  osNowa: Punkt2D[],
): Punkt2D {
  if (osStara.length < 2 || osNowa.length < 2) return p;
  const s = stacjaNaOsi(osStara, p);
  const t0 = stycznyNaOsi(osStara, s);
  if (!t0) return p;
  const off = (p.x - t0.punkt.x) * (-t0.dy) + (p.y - t0.punkt.y) * t0.dx;
  const dl0 = dlugoscPolilinii(osStara);
  const dl1 = dlugoscPolilinii(osNowa);
  const s1 = dl0 < 1e-9 ? s : s * (dl1 / dl0);
  const t1 = stycznyNaOsi(osNowa, s1);
  if (!t1) return p;
  return { x: t1.punkt.x + (-t1.dy) * off, y: t1.punkt.y + t1.dx * off };
}

/**
 * Geometria w metrach = zadana długość osi. PDF zostaje (tło 1:500).
 * `dlugoscEtykietaM` nie jest zmieniane (wymiar XFDF).
 */
export function dopasujGeometrieArkuszaDoDlugosci(arkusz: ArkuszPzt, celM: number): ArkuszPzt {
  const os0 = arkusz.osTrasy?.wierzcholkiM;
  if (!celM || celM < 80 || !os0 || os0.length < 2) return arkusz;
  const osStara = osMZorientowana(arkusz);
  if (osStara.length < 2) return arkusz;
  const dl = dlugoscPolilinii(osStara);
  const cel = round2(celM);
  if (Math.abs(dl - cel) < 0.02) {
    return arkusz.osTrasy?.dlugoscM === cel
      ? arkusz
      : { ...arkusz, osTrasy: { ...arkusz.osTrasy!, dlugoscM: cel } };
  }
  const osNowa = rozciagnijLancuchDoDlugosci(osStara, cel);
  const mapuj = (pts: Punkt2D[]) => pts.map((p) => przeniesPunktPrzyRozciagnieciuOsi(p, osStara, osNowa));
  return {
    ...arkusz,
    osTrasy: {
      ...arkusz.osTrasy!,
      wierzcholkiM: osNowa,
      dlugoscM: cel,
    },
    obszary: arkusz.obszary.map((o) => {
      const wierzcholkiM = mapuj(o.wierzcholkiM);
      return {
        ...o,
        wierzcholkiM,
        powierzchniaM2: wierzcholkiM.length >= 3
          ? round2(powierzchniaWielokata(wierzcholkiM))
          : o.powierzchniaM2,
        krawedzniki: (o.krawedzniki ?? []).map((k) => ({
          ...k,
          wierzcholkiM: mapuj(k.wierzcholkiM),
        })),
      };
    }),
  };
}

/**
 * Geometria w metrach = wymiar osi z XFDF. PDF zostaje (tło 1:500).
 * Bez tego ploter/trasa jest o 0,5–2 m na arkusz krótsza niż pikietaż.
 */
export function dopasujGeometrieArkuszaDoEtykiety(arkusz: ArkuszPzt): ArkuszPzt {
  const etykieta = arkusz.osTrasy?.dlugoscEtykietaM;
  if (!etykieta || etykieta < 80) return arkusz;
  return dopasujGeometrieArkuszaDoDlugosci(arkusz, etykieta);
}

/** Stacje na osi [m geometrii] dla wycinka pikietażu PZT (ułamek arkusza, gdy XFDF ≠ pikiety). */
export function stacjeLokalneNaOsiM(
  arkusz: ArkuszPzt,
  odM: number,
  doM: number,
): { s0: number; s1: number; dlOs: number } {
  const km0 = arkusz.kilometrazPoczatkowyM;
  const kmSpan = Math.max(0.01, arkusz.kilometrazKoncowyM - km0);
  const osM = arkusz.osTrasy?.wierzcholkiM;
  const dlOs = osM && osM.length >= 2
    ? dlugoscPolilinii(osM)
    : Math.max(0.01, arkusz.osTrasy?.dlugoscM ?? kmSpan);
  const s0 = Math.max(0, ((Math.min(odM, doM) - km0) / kmSpan) * dlOs);
  const s1 = Math.min(dlOs, ((Math.max(odM, doM) - km0) / kmSpan) * dlOs);
  return { s0, s1, dlOs };
}

/** Rozpiętość jezdni wzdłuż osi [m] – bliższa pikiecie PZT niż kreska przerywana. */
export function dlugoscObszarowWzdluzOsiM(arkusz: ArkuszPzt): number {
  const os = osMZorientowana(arkusz);
  if (os.length < 2 || arkusz.obszary.length === 0) return 0;
  const ds = arkusz.obszary.map((o) => {
    if (o.wierzcholkiM.length < 2) return 0;
    const st = o.wierzcholkiM.map((p) => stacjaNaOsi(os, p));
    return Math.max(...st) - Math.min(...st);
  }).filter((d) => d > 1);
  if (ds.length === 0) return 0;
  ds.sort((a, b) => a - b);
  return round2(ds[Math.floor(ds.length / 2)]);
}

/**
 * Pikietaż arkusza po czołach L/P (z wysunięciem za kreskę osi).
 * Żółty/różowy dochodzą do styku arkuszy; wymiar PDF-XChange mierzy tylko narysowaną kreskę.
 */
export function dlugoscPikietazuJezdniM(arkusz: ArkuszPzt): number {
  const os = osMZorientowana(arkusz);
  if (os.length < 2 || arkusz.obszary.length === 0) return 0;
  const jezdnie = arkusz.obszary.filter((o) => o.stronaTrasy === 'lewa' || o.stronaTrasy === 'prawa');
  const pula = jezdnie.length > 0 ? jezdnie : arkusz.obszary;
  const ds = pula.map((o) => {
    if (o.wierzcholkiM.length < 2) return 0;
    const st = o.wierzcholkiM.map((p) => stacjaNaOsiZWysunieciem(os, p));
    return Math.max(...st) - Math.min(...st);
  }).filter((d) => d > 80 && d < 2500);
  if (ds.length === 0) return 0;
  ds.sort((a, b) => a - b);
  return round2(ds[Math.floor(ds.length / 2)]);
}

/** Szerokość poprzeczna obszaru w punktach PDF (podstawa L–P, inaczej cieńszy bok bbox). */
export function szerokoscObszaruPdf(o: {
  wierzcholkiPdf: Punkt2D[];
  bazaStart?: { idxLewy?: number; idxPrawy?: number };
  bazaKoniec?: { idxLewy?: number; idxPrawy?: number };
}): number {
  const dist = (i?: number, j?: number) => {
    if (i == null || j == null) return 0;
    const a = o.wierzcholkiPdf[i];
    const b = o.wierzcholkiPdf[j];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const kand = [
    dist(o.bazaStart?.idxLewy, o.bazaStart?.idxPrawy),
    dist(o.bazaKoniec?.idxLewy, o.bazaKoniec?.idxPrawy),
  ].filter((d) => d > 1);
  if (kand.length) return Math.min(...kand);
  if (o.wierzcholkiPdf.length < 2) return 0;
  const xs = o.wierzcholkiPdf.map((p) => p.x);
  const ys = o.wierzcholkiPdf.map((p) => p.y);
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

export function medianaSzerokosciObszarowPdf(
  obszary: Array<Parameters<typeof szerokoscObszaruPdf>[0]>,
): number {
  const s = obszary.map(szerokoscObszaruPdf).filter((d) => d > 1).sort((a, b) => a - b);
  if (!s.length) return 36;
  return s[Math.floor(s.length / 2)];
}

function przecieciaProstejZKrawedziami(poly: Punkt2D[], p: Punkt2D, nx: number, ny: number): number[] {
  const us: number[] = [];
  if (poly.length < 2) return us;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const det = nx * dy - ny * dx;
    if (Math.abs(det) < 1e-9) continue;
    const t = ((a.x - p.x) * dy - (a.y - p.y) * dx) / det;
    const s = ((a.x - p.x) * ny - (a.y - p.y) * nx) / det;
    if (s >= -1e-6 && s <= 1 + 1e-6) us.push(t);
  }
  return us;
}

/** Szerokość obszaru w poprzek osi (punkty PDF) w stacji sPdf. */
export function szerokoscPoprzecznaPdf(
  obszary: Array<{ wierzcholkiPdf: Punkt2D[] }>,
  osPdf: Punkt2D[],
  sPdf: number,
): number {
  const t = stycznyNaOsi(osPdf, sPdf);
  if (!t) return 0;
  const plen = Math.hypot(t.dx, t.dy) || 1;
  const nx = -t.dy / plen;
  const ny = t.dx / plen;
  let minU = Infinity;
  let maxU = -Infinity;
  for (const o of obszary) {
    for (const u of przecieciaProstejZKrawedziami(o.wierzcholkiPdf, t.punkt, nx, ny)) {
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
    }
  }
  if (!Number.isFinite(minU) || maxU <= minU) return 0;
  return maxU - minU;
}

/**
 * Pas układania w punktach PDF: spójne przecięcia przy osi.
 * Daleki poligon (pobocze, sąsiedni obszar) nie poszerza maszyny do szerokości arkusza.
 */
export function pasUkladaniaPdf(
  obszary: Array<{
    wierzcholkiPdf: Punkt2D[];
    bazaStart?: { idxLewy?: number; idxPrawy?: number };
    bazaKoniec?: { idxLewy?: number; idxPrawy?: number };
  }>,
  osPdf: Punkt2D[],
  sPdf: number,
): { szer: number; srodek: Punkt2D } | null {
  const t = stycznyNaOsi(osPdf, sPdf);
  if (!t) return null;
  const plen = Math.hypot(t.dx, t.dy) || 1;
  const nx = -t.dy / plen;
  const ny = t.dx / plen;
  type Span = { minU: number; maxU: number };
  const spany: Span[] = [];
  for (const o of obszary) {
    const us = przecieciaProstejZKrawedziami(o.wierzcholkiPdf, t.punkt, nx, ny)
      .filter((u) => Math.abs(u) <= ZASIEG_CZOLA_PDF);
    if (us.length < 2) continue;
    let minU = Math.min(...us);
    let maxU = Math.max(...us);
    const projekt = szerokoscObszaruPdf(o);
    if (projekt > 1 && maxU - minU > projekt * 1.8) {
      const pol = projekt / 2;
      const c = minU <= 0 && maxU >= 0 ? 0 : (Math.abs(minU) < Math.abs(maxU) ? minU : maxU);
      minU = c - pol;
      maxU = c + pol;
    }
    if (maxU - minU < 1) continue;
    spany.push({ minU, maxU });
  }
  if (!spany.length) return null;
  spany.sort((a, b) => a.minU - b.minU);
  const merged: Span[] = [];
  for (const s of spany) {
    const last = merged[merged.length - 1];
    const gap = last ? s.minU - last.maxU : Infinity;
    const typowa = Math.max(last ? last.maxU - last.minU : 0, s.maxU - s.minU);
    if (last && gap <= Math.max(8, typowa * 0.35)) {
      last.minU = Math.min(last.minU, s.minU);
      last.maxU = Math.max(last.maxU, s.maxU);
    } else {
      merged.push({ minU: s.minU, maxU: s.maxU });
    }
  }
  const zawiera = merged.find((s) => s.minU <= 0.5 && s.maxU >= -0.5);
  const wybrany = zawiera ?? merged.reduce((best, s) => {
    const odl = s.maxU < 0 ? -s.maxU : s.minU > 0 ? s.minU : 0;
    const odlBest = best.maxU < 0 ? -best.maxU : best.minU > 0 ? best.minU : 0;
    return odl < odlBest ? s : best;
  });
  const u = (wybrany.minU + wybrany.maxU) / 2;
  return {
    szer: wybrany.maxU - wybrany.minU,
    srodek: { x: t.punkt.x + nx * u, y: t.punkt.y + ny * u },
  };
}

/** Około 60 m w punktach PDF przy 1:500 – odcina dalekie cięcie łuku. */
const ZASIEG_CZOLA_PDF = 360;

/**
 * Czoło odcinka: odcinek od krawędzi do krawędzi obmiaru, prostopadle do osi.
 * Nie jest to kreska pikiety na osi.
 */
export function czoloObmiaruPdf(
  obszary: Array<{ wierzcholkiPdf: Punkt2D[] }>,
  osPdf: Punkt2D[],
  sPdf: number,
): { a: Punkt2D; b: Punkt2D; srodek: Punkt2D } | null {
  const t = stycznyNaOsi(osPdf, sPdf);
  if (!t) return null;
  const plen = Math.hypot(t.dx, t.dy) || 1;
  const nx = -t.dy / plen;
  const ny = t.dx / plen;
  const us: number[] = [];
  for (const o of obszary) {
    for (const u of przecieciaProstejZKrawedziami(o.wierzcholkiPdf, t.punkt, nx, ny)) {
      if (Math.abs(u) <= ZASIEG_CZOLA_PDF) us.push(u);
    }
  }
  if (us.length < 2) return null;
  const minU = Math.min(...us);
  const maxU = Math.max(...us);
  if (maxU - minU < 1) return null;
  const a = { x: t.punkt.x + nx * minU, y: t.punkt.y + ny * minU };
  const b = { x: t.punkt.x + nx * maxU, y: t.punkt.y + ny * maxU };
  return { a, b, srodek: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

/**
 * Napis START/KONIEC prostopadle do osi, tuż przed czołem startu i za czołem końca.
 * `ux, uy` – styczna SVG w stronę rosnącego kilometraża.
 */
export function napisZakresuWzdluzOsi(args: {
  mx: number;
  my: number;
  ux: number;
  uy: number;
  rola: 'start' | 'koniec';
  kilometrazMaleje: boolean;
  font: number;
}): { x: number; y: number; rot: number } {
  const naZewnatrz = args.rola === 'start'
    ? (args.kilometrazMaleje ? 1 : -1)
    : (args.kilometrazMaleje ? -1 : 1);
  const odstep = Math.max(1, args.font) * 1.05;
  const x = args.mx + args.ux * naZewnatrz * odstep;
  const y = args.my + args.uy * naZewnatrz * odstep;
  const px = Math.abs(args.uy) < 1e-12 ? 0 : -args.uy;
  const py = Math.abs(args.ux) < 1e-12 ? 0 : args.ux;
  let rot = Math.atan2(py, px) * (180 / Math.PI);
  if (rot > 90) rot -= 180;
  else if (rot < -90) rot += 180;
  return { x, y, rot };
}

/** Poprzeczka i opis km: w punktach PDF, łącznie nie szersze niż obszar. */
export function rozmiarPodzialkiOsi(szerokoscObszaruPdf: number): {
  halfPdf: number;
  fontPdf: number;
  odstepTekstuPdf: number;
} {
  const szer = Math.max(10, szerokoscObszaruPdf);
  const halfPdf = Math.min(szer * 0.42, szer / 2);
  const fontPdf = Math.min(Math.max(szer * 0.13, 4), 6.2);
  return { halfPdf, fontPdf, odstepTekstuPdf: halfPdf + fontPdf * 0.65 };
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
  const extra = dl * ((odsadzkaLewaCm + odsadzkaPrawaCm) / 100);
  return round2(Math.max(0, baza + extra));
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
  const { s0, s1 } = stacjeLokalneNaOsiM(arkusz, odM, doM);
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
      wierzcholkiPdf: clipPdf.length >= 3 ? clipPdf : [],
      powierzchniaM2: round2(powierzchniaWielokata(clip)),
      bazaStart: undefined,
      bazaKoniec: undefined,
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
    kilometrazPoczatkowyM: Math.max(arkusz.kilometrazPoczatkowyM, Math.min(odM, doM)),
    kilometrazKoncowyM: Math.min(arkusz.kilometrazKoncowyM, Math.max(odM, doM)),
    obszary,
    osTrasy,
  };
}

/** Mapowanie PDF ↔ SVG podglądu arkusza (Y PDF w górę, Y SVG w dół). */
export interface MapaPdfSvg {
  w: number;
  h: number;
  cx: number;
  cy: number;
  skalaFit: number;
}

export function pdfDoSvgPodgladu(p: Punkt2D, m: MapaPdfSvg): Punkt2D {
  return {
    x: m.w / 2 + (p.x - m.cx) * m.skalaFit,
    y: m.h / 2 - (p.y - m.cy) * m.skalaFit,
  };
}

export function svgDoPdfPodgladu(s: Punkt2D, m: MapaPdfSvg): Punkt2D {
  const k = m.skalaFit === 0 ? 1 : m.skalaFit;
  return {
    x: m.cx + (s.x - m.w / 2) / k,
    y: m.cy - (s.y - m.h / 2) / k,
  };
}

/** Długość osi w metrach terenu przy skali rysunku (1:500), bez współczynnika k. */
export function dlugoscOsiPdf1500M(
  osPdf: Punkt2D[],
  skala: SkalaPzt = DOMYSLNA_SKALA_PZT,
): number {
  return round2(dlugoscPolilinii(osPdf) * metryNaPunktPdf(skala));
}

export interface WynikPomiaruOsi {
  metry1500: number;
  pdf: number;
  stacjaAPdf: number;
  stacjaBPdf: number;
  punktA: Punkt2D;
  punktB: Punkt2D;
  kmPztA: number | null;
  kmPztB: number | null;
  kmXfdfA: number | null;
  kmXfdfB: number | null;
}

function kmZUlamka(zakres: { odM: number; doM: number } | null | undefined, ulamek: number): number | null {
  if (!zakres) return null;
  const span = zakres.doM - zakres.odM;
  if (!Number.isFinite(span) || Math.abs(span) < 0.01) return null;
  return round2(zakres.odM + ulamek * span);
}

/**
 * Dwa punkty (PDF) rzutowane na oś: odległość wzdłuż kreski w metrach 1:500, bez k.
 * Na 2_22: tapnij nadruk 115+700 i 115+800 — jeśli ≈ 100 m, podziałka PDF jest w skali.
 */
export function pomiarWzdlozOsiPdf(args: {
  osPdf: Punkt2D[];
  a: Punkt2D;
  b: Punkt2D;
  skala?: SkalaPzt;
  kmPzt?: { odM: number; doM: number } | null;
  kmXfdf?: { odM: number; doM: number } | null;
}): WynikPomiaruOsi | null {
  const os = args.osPdf;
  if (os.length < 2) return null;
  const L = dlugoscPolilinii(os);
  if (L < 1e-6) return null;
  const sa = stacjaNaOsi(os, args.a);
  const sb = stacjaNaOsi(os, args.b);
  const pdf = Math.abs(sb - sa);
  const k = metryNaPunktPdf(args.skala ?? DOMYSLNA_SKALA_PZT);
  const punktA = punktNaOsi(os, sa) ?? args.a;
  const punktB = punktNaOsi(os, sb) ?? args.b;
  const ua = sa / L;
  const ub = sb / L;
  return {
    metry1500: round2(pdf * k),
    pdf: round2(pdf),
    stacjaAPdf: sa,
    stacjaBPdf: sb,
    punktA,
    punktB,
    kmPztA: kmZUlamka(args.kmPzt, ua),
    kmPztB: kmZUlamka(args.kmPzt, ub),
    kmXfdfA: kmZUlamka(args.kmXfdf, ua),
    kmXfdfB: kmZUlamka(args.kmXfdf, ub),
  };
}

export function ocenaOdstempuPodzialkiM(metry1500: number): {
  krokM: number;
  roznicaM: number;
  zgadzaSie: boolean;
  tekst: string;
} {
  const kandydaci = [50, 100, 150, 200, 250, 300, 400];
  let krokM = 100;
  let best = Infinity;
  for (const k of kandydaci) {
    const r = Math.abs(metry1500 - k);
    if (r < best) {
      best = r;
      krokM = k;
    }
  }
  const roznicaM = round2(metry1500 - krokM);
  const zgadzaSie = best <= Math.max(2.5, krokM * 0.025);
  const m = metry1500.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const d = Math.abs(roznicaM).toLocaleString('pl-PL', { maximumFractionDigits: 2 });
  let tekst: string;
  if (zgadzaSie && krokM === 100) {
    tekst = `Odstęp ${m} m ≈ 100 m na 1:500 — podziałka na PDF jest w skali.`;
  } else if (zgadzaSie) {
    tekst = `Odstęp ${m} m ≈ ${krokM} m na 1:500 (nie 100 m między tymi dwoma punktami).`;
  } else {
    tekst = `Odstęp ${m} m (Δ ${d} m od ${krokM} m) — nadruk na tym arkuszu może nie być co 100 m. Możliwy błąd projektowy oryginalnego PDF.`;
  }
  return { krokM, roznicaM, zgadzaSie, tekst };
}
