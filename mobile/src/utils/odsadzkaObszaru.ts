// Obrys XFDF to warstwa ścieralna. Niższe warstwy poszerzają się w lewo i w prawo
// o odsadzkę konstrukcji. Czerwony krawężnik zostaje na swoim miejscu.
// Odsadzka jest poprzeczna – odcinek nie wydłuża się wzdłuż kilometraża.

import type { ArkuszPzt, KategoriaWarstwy, ObszarObmiaru, ProjektBudowy, Punkt2D } from '../types';
import { round2 } from './calculations';
import { metryNaPunktPdf, powierzchniaWielokata } from './obmiarGeometry';
import { dlugoscPolilinii, przeniesPunktPrzyRozciagnieciuOsi, stacjaNaOsi, stacjeLokalneNaOsiM, stycznyNaOsi, wycinekWielokataPoOsi } from './osPzt';
import type { WarstwaKonstrukcji } from '../types';

function odsadzkiCm(w: Pick<WarstwaKonstrukcji, 'odsadzkaCm' | 'odsadzkaLewaCm' | 'odsadzkaPrawaCm'>): { lewa: number; prawa: number } {
  if (w.odsadzkaLewaCm != null || w.odsadzkaPrawaCm != null) {
    return { lewa: w.odsadzkaLewaCm ?? 0, prawa: w.odsadzkaPrawaCm ?? 0 };
  }
  return { lewa: w.odsadzkaCm ?? 0, prawa: 0 };
}

function powierzchniaZDlugosci(powierzchniaM2: number, dlugoscM: number, lewaCm: number, prawaCm: number): number {
  const extra = Math.max(0, dlugoscM) * ((lewaCm + prawaCm) / 100);
  return round2(Math.max(0, powierzchniaM2 + extra));
}

/** Wierzchołek bliżej niż tyle [m] od czerwonej linii nie rusza się. */
export const PROG_KRAWEDZNIKA_M = 0.45;

export interface RysunekOdsadzki {
  id: string;
  wierzcholkiPdf: Punkt2D[];
  kolor: string;
  krycie: number;
}

function srodek(pts: Punkt2D[]): Punkt2D {
  const n = Math.max(pts.length, 1);
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };
}

function kierunekGlowny(pts: Punkt2D[]): Punkt2D {
  const c = srodek(pts);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { x: Math.cos(ang), y: Math.sin(ang) };
}

/** Oś wzdłuż dłuższego kierunku wielokąta – gdy na arkuszu nie ma linii osi. */
export function osZWielokata(pts: Punkt2D[]): Punkt2D[] {
  if (pts.length < 2) return pts.map((p) => ({ ...p }));
  const c = srodek(pts);
  const k = kierunekGlowny(pts);
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    const t = (p.x - c.x) * k.x + (p.y - c.y) * k.y;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (max - min < 1e-6) return [{ ...pts[0] }, { ...pts[pts.length - 1] }];
  return [
    { x: c.x + k.x * min, y: c.y + k.y * min },
    { x: c.x + k.x * max, y: c.y + k.y * max },
  ];
}

function odlegloscDoLamanej(p: Punkt2D, linia: Punkt2D[]): number {
  if (linia.length === 0) return Infinity;
  if (linia.length === 1) return Math.hypot(p.x - linia[0].x, p.y - linia[0].y);
  let min = Infinity;
  for (let i = 1; i < linia.length; i++) {
    const a = linia[i - 1];
    const b = linia[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < min) min = d;
  }
  return min;
}

function medianaOdleglosci(pts: Punkt2D[], os: Punkt2D[]): number {
  if (os.length < 2 || pts.length === 0) return Infinity;
  const d = pts.map((p) => {
    const s = stacjaNaOsi(os, p);
    const t = stycznyNaOsi(os, s);
    if (!t) return Infinity;
    return Math.hypot(p.x - t.punkt.x, p.y - t.punkt.y);
  }).sort((a, b) => a - b);
  return d[Math.floor(d.length / 2)] ?? Infinity;
}

/**
 * Oś, względem której „lewa” i „prawa” są krawędziami jezdni.
 * Trasa główna trzyma się czarnej osi, droga boczna – niebieskiej, gdy idzie wzdłuż niej.
 */
export function osDlaObszaru(obszar: ObszarObmiaru, arkusz?: ArkuszPzt): Punkt2D[] {
  const pts = obszar.wierzcholkiM;
  if (pts.length < 2) return [];
  const kier = kierunekGlowny(pts);
  const c = srodek(pts);
  const kandydaci: Punkt2D[][] = [];
  const glowna = arkusz?.osTrasy?.wierzcholkiM;
  if (glowna && glowna.length >= 2) kandydaci.push(glowna);
  for (const os of arkusz?.osieBoczne ?? []) {
    if (os.wierzcholkiM.length >= 2) kandydaci.push(os.wierzcholkiM);
  }
  let best: Punkt2D[] | null = null;
  let bestScore = 0.35;
  for (const os of kandydaci) {
    const st = stycznyNaOsi(os, stacjaNaOsi(os, c));
    if (!st) continue;
    const dot = Math.abs(st.dx * kier.x + st.dy * kier.y);
    const dist = medianaOdleglosci(pts, os);
    if (dist > 80) continue;
    let score = dot * 3 - dist / 40;
    if (os === glowna && obszar.stronaTrasy) score += 0.45;
    if (score > bestScore) {
      bestScore = score;
      best = os;
    }
  }
  return best ?? osZWielokata(pts);
}

function osPdfDlaObszaru(obszar: ObszarObmiaru, arkusz: ArkuszPzt | undefined, skalaMian: number): Punkt2D[] {
  const metry = osDlaObszaru(obszar, arkusz);
  if (metry.length < 2) return [];
  const glownaM = arkusz?.osTrasy?.wierzcholkiM;
  if (glownaM && metry === glownaM && arkusz?.osTrasy?.wierzcholkiPdf) return arkusz.osTrasy.wierzcholkiPdf;
  const boczna = (arkusz?.osieBoczne ?? []).find((o) => o.wierzcholkiM === metry);
  if (boczna) return boczna.wierzcholkiPdf;
  return metry.map((p) => ({ x: p.x / skalaMian, y: p.y / skalaMian }));
}

/**
 * Przesuwa wierzchołki prostopadle do osi.
 * Dodatnia odsadzka idzie na zewnątrz danej krawędzi, ujemna – do środka.
 * Wierzchołek przy krawężniku zostaje.
 */
export function poszerzWielokat(
  wierzcholki: Punkt2D[],
  os: Punkt2D[] | undefined,
  krawedzie: Punkt2D[][],
  odsLewa: number,
  odsPrawa: number,
  progKrawedzi: number,
): Punkt2D[] {
  if (wierzcholki.length < 3) return wierzcholki.map((p) => ({ ...p }));
  if (Math.abs(odsLewa) < 1e-9 && Math.abs(odsPrawa) < 1e-9) return wierzcholki.map((p) => ({ ...p }));
  const osU = os && os.length >= 2 ? os : osZWielokata(wierzcholki);
  const rzuty = wierzcholki.map((v) => {
    const s = stacjaNaOsi(osU, v);
    const t = stycznyNaOsi(osU, s);
    if (!t) return { v, nx: 0, ny: 1, signed: 0 };
    const nx = -t.dy;
    const ny = t.dx;
    const signed = (v.x - t.punkt.x) * nx + (v.y - t.punkt.y) * ny;
    return { v, nx, ny, signed };
  });
  const signed = rzuty.map((r) => r.signed);
  const sMin = Math.min(...signed);
  const sMax = Math.max(...signed);
  const mid = (sMin + sMax) / 2;
  return rzuty.map((r) => {
    const naKrawedzi = krawedzie.some((k) => odlegloscDoLamanej(r.v, k) <= progKrawedzi);
    if (naKrawedzi) return { ...r.v };
    const lewa = r.signed >= mid;
    let delta = lewa ? odsLewa : -odsPrawa;
    if (delta < 0) {
      const zapas = Math.max(0, Math.abs(r.signed - mid) - 0.02);
      if (-delta > zapas) delta = -zapas;
    }
    if (Math.abs(delta) < 1e-9) return { ...r.v };
    return { x: r.v.x + r.nx * delta, y: r.v.y + r.ny * delta };
  });
}

function krawedzieObszaru(obszar: ObszarObmiaru, pdf: boolean): Punkt2D[][] {
  return (obszar.krawedzniki ?? [])
    .map((k) => (pdf ? k.wierzcholkiPdf : k.wierzcholkiM))
    .filter((w) => w.length >= 2);
}

/** Powierzchnia warstwy [m²]: ścieralna z XFDF, niżej z odsadzką i z krawężnikiem. */
export function powierzchniaWarstwyObszaru(
  obszar: ObszarObmiaru,
  arkusz: ArkuszPzt | undefined,
  odsLewaCm: number,
  odsPrawaCm: number,
  kmOd?: number,
  kmDo?: number,
): number {
  const poly0 = obszar.wierzcholkiM;
  if (poly0.length < 3) {
    const dl = kmOd != null && kmDo != null ? Math.abs(kmDo - kmOd) : Math.max(obszar.dlugoscOdcinkaM ?? 0, 0);
    return powierzchniaZDlugosci(obszar.powierzchniaM2, dl, odsLewaCm, odsPrawaCm);
  }
  const osWlasna = osDlaObszaru(obszar, arkusz);
  let poly = poly0;
  const osGlowna = arkusz?.osTrasy?.wierzcholkiM;
  if (kmOd != null && kmDo != null && osGlowna && osGlowna.length >= 2 && arkusz) {
    const { s0, s1, dlOs } = stacjeLokalneNaOsiM(arkusz, kmOd, kmDo);
    if (s1 > s0 + 0.05 && s1 - s0 < dlOs - 0.2) {
      const clip = wycinekWielokataPoOsi(poly, osGlowna, s0, s1);
      if (clip.length >= 3) poly = clip;
      else return 0;
    }
  }
  const pos = poszerzWielokat(
    poly,
    osWlasna,
    krawedzieObszaru(obszar, false),
    odsLewaCm / 100,
    odsPrawaCm / 100,
    PROG_KRAWEDZNIKA_M,
  );
  const pole = powierzchniaWielokata(pos);
  if (!Number.isFinite(pole)) {
    const dl = kmOd != null && kmDo != null ? Math.abs(kmDo - kmOd) : (obszar.dlugoscOdcinkaM ?? 0);
    return powierzchniaZDlugosci(obszar.powierzchniaM2, dl, odsLewaCm, odsPrawaCm);
  }
  return round2(Math.max(0, pole));
}

const KOLOR_PODBUDOWY = '#F4A261';
const KOLOR_KLSM = '#F6D5B8';

function kolorWarstwy(kategoria: KategoriaWarstwy): { kolor: string; krycie: number } {
  if (kategoria === 'klsm') return { kolor: KOLOR_KLSM, krycie: 0.9 };
  if (kategoria === 'podbudowa') return { kolor: KOLOR_PODBUDOWY, krycie: 0.85 };
  if (kategoria === 'wiazaca') return { kolor: '#2563EB', krycie: 0.75 };
  if (kategoria === 'sma') return { kolor: '#16A34A', krycie: 0.55 };
  return { kolor: '#9333EA', krycie: 0.4 };
}

function punktPdfNaMetry(arkusz: ArkuszPzt, metryNaPunkt: number, p: Punkt2D): Punkt2D {
  const surowy = { x: p.x * metryNaPunkt, y: p.y * metryNaPunkt };
  const osPdf = arkusz.osTrasy?.wierzcholkiPdf;
  const osM = arkusz.osTrasy?.wierzcholkiM;
  if (!osPdf || !osM || osPdf.length < 2 || osM.length < 2) return surowy;
  const os0 = osPdf.map((q) => ({ x: q.x * metryNaPunkt, y: q.y * metryNaPunkt }));
  return przeniesPunktPrzyRozciagnieciuOsi(surowy, os0, osM);
}

/**
 * Powierzchnia kawałka obszaru między dwoma stuknięciami.
 * Cięcie idzie wzdłuż osi tego obszaru (czarnej albo niebieskiej), z odsadzką i krawężnikiem.
 */
export function powierzchniaMiedzyPunktamiPdf(
  obszar: ObszarObmiaru,
  arkusz: ArkuszPzt,
  skalaMian: number,
  aPdf: Punkt2D,
  bPdf: Punkt2D,
  odsLewaCm: number,
  odsPrawaCm: number,
): number {
  if (obszar.wierzcholkiM.length < 3) return 0;
  const os = osDlaObszaru(obszar, arkusz);
  if (os.length < 2) return powierzchniaWarstwyObszaru(obszar, arkusz, odsLewaCm, odsPrawaCm);
  const a = punktPdfNaMetry(arkusz, skalaMian, aPdf);
  const b = punktPdfNaMetry(arkusz, skalaMian, bPdf);
  const s0 = stacjaNaOsi(os, a);
  const s1 = stacjaNaOsi(os, b);
  let poly = wycinekWielokataPoOsi(obszar.wierzcholkiM, os, s0, s1);
  if (poly.length < 3) poly = obszar.wierzcholkiM;
  const pos = poszerzWielokat(
    poly,
    os,
    krawedzieObszaru(obszar, false),
    odsLewaCm / 100,
    odsPrawaCm / 100,
    PROG_KRAWEDZNIKA_M,
  );
  return round2(Math.max(0, powierzchniaWielokata(pos)));
}

/** Wielokąty odsadzek do dorysowania pod obrysem ścieralnej (jednostki PDF). */
export function rysunkiOdsadzekArkusza(
  projekt: ProjektBudowy,
  arkusz: ArkuszPzt,
  warstwyDla: (obszar: ObszarObmiaru) => WarstwaKonstrukcji[],
): RysunekOdsadzki[] {
  const k = metryNaPunktPdf(projekt.skala);
  const out: { rys: RysunekOdsadzki; zasieg: number }[] = [];
  for (const obszar of arkusz.obszary) {
    if (obszar.wierzcholkiPdf.length < 3) continue;
    const osPdf = osPdfDlaObszaru(obszar, arkusz, k);
    const kraw = krawedzieObszaru(obszar, true);
    for (const w of warstwyDla(obszar)) {
      const ods = odsadzkiCm(w);
      if (Math.abs(ods.lewa) < 0.05 && Math.abs(ods.prawa) < 0.05) continue;
      const poly = poszerzWielokat(
        obszar.wierzcholkiPdf,
        osPdf,
        kraw,
        (ods.lewa / 100) / k,
        (ods.prawa / 100) / k,
        PROG_KRAWEDZNIKA_M / k,
      );
      const kol = kolorWarstwy(w.kategoria);
      out.push({
        zasieg: Math.max(Math.abs(ods.lewa), Math.abs(ods.prawa)),
        rys: {
          id: `${obszar.id}|${w.id}`,
          wierzcholkiPdf: poly,
          kolor: kol.kolor,
          krycie: kol.krycie,
        },
      });
    }
  }
  out.sort((a, b) => b.zasieg - a.zasieg);
  return out.map((x) => x.rys);
}

