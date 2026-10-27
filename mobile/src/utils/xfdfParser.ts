// ============================================================
// PARSER XFDF – wielokąty i polilinie (krawężniki) z PDF-XChange
// ============================================================

import type { BazaObmiaru, KrawedznikObmiaru, ObszarObmiaru, Punkt2D, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  obwodWielokata,
  powierzchniaWielokata,
  skalujWierzcholki,
  metryNaPunktPdf,
} from './obmiarGeometry';
import { round2 } from './calculations';
import {
  iloczynWektorowyOsi,
  kierunekRosnacegoKm,
  orientujLancuchDoKm,
  stacjaNaOsi,
  stronaWzgledemOsi,
} from './osPzt';

export interface PolygonXfdfSurowy {
  wierzcholki: Punkt2D[];
  kolorWypelnienia?: string;
  title?: string;
  subject?: string;
}

export interface PolylineXfdfSurowa {
  wierzcholki: Punkt2D[];
  color?: string;
  subject?: string;
  style?: string;
  dlugoscEtykietaM?: number;
  /** <polyline> = oś / krawężnik; <line> = wymiar */
  zrodlo?: 'polyline' | 'line';
}

export interface WynikParsowaniaXfdf {
  zrodloNazwa: string;
  zrodloPdfHref?: string;
  polygony: PolygonXfdfSurowy[];
  polilinie: PolylineXfdfSurowa[];
  osTrasy?: PolylineXfdfSurowa;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const PRÓG_POKRYCIA_M = 0.5;
const PRÓG_OD_OSI_M = 2.5;

/** Parsuje ciąg „x,y;x,y;…” z tagu <vertices> */
export function parsujVertices(tekst: string): Punkt2D[] {
  const out: Punkt2D[] = [];
  const pary = tekst.split(';').map((s) => s.trim()).filter(Boolean);
  for (const para of pary) {
    const [xs, ys] = para.split(',').map((s) => s.trim());
    const x = parseFloat(xs);
    const y = parseFloat(ys);
    if (!isNaN(x) && !isNaN(y)) out.push({ x, y });
  }
  return out;
}

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1];
}

function tekstBezTagow(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function etykietaMetrow(body: string): number | undefined {
  const t = tekstBezTagow(body);
  const oczysc = (s: string) => s.replace(/\s|\u00a0/g, '').replace(',', '.');
  const m = t.match(
    /([0-9]{1,4}(?:[\s\u00a0][0-9]{3})+|[0-9]{1,4})([,.][0-9]+)?\s*(?:m\.?\s*b\.?|mb|m)(?!\s*[²2])/i,
  );
  if (m) {
    const n = parseFloat(oczysc(`${m[1]}${m[2] ?? ''}`));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  const samo = t.match(/^([0-9]{2,4})([,.][0-9]+)?$/);
  if (samo) {
    const n = parseFloat(oczysc(`${samo[1]}${samo[2] ?? ''}`));
    return Number.isFinite(n) && n >= 80 && n <= 2500 ? n : undefined;
  }
  return undefined;
}

function etykietyZBlokuContents(xml: string): number[] {
  const out: number[] = [];
  const blok = /<contents(?:-richtext)?\b[^>]*>([\s\S]*?)<\/contents(?:-richtext)?>/gi;
  let m: RegExpExecArray | null;
  while ((m = blok.exec(xml)) !== null) {
    const n = etykietaMetrow(m[1] ?? '');
    if (n) out.push(n);
  }
  const attrRe = /\bcontents="([^"]*)"/gi;
  while ((m = attrRe.exec(xml)) !== null) {
    const n = etykietaMetrow(m[1] ?? '');
    if (n) out.push(n);
  }
  return out;
}

export function zbierzEtykietyMetrow(xml: string): number[] {
  return etykietyZBlokuContents(xml);
}

function etykietaZAnnotacji(attrs: string, body: string): number | undefined {
  const zBloku = etykietyZBlokuContents(`${attrs} ${body}`);
  if (zBloku.length > 0) return Math.max(...zBloku);
  return undefined;
}

/** Pikiety z opisu PZT, np. 106+850 … 107+287. */
export function pikietyZTekstu(s: string): number[] {
  const t = tekstBezTagow(s);
  const out: number[] = [];
  const re = /(\d{1,3})\+(\d{3})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const km = parseInt(m[1], 10);
    const met = parseInt(m[2], 10);
    if (!Number.isFinite(km) || !Number.isFinite(met) || met > 999) continue;
    const v = km * 1000 + met;
    if (v >= 1000 && v <= 500000) out.push(v);
  }
  return out;
}

function dlugoscZPikietXml(xml: string): number | undefined {
  const p = pikietyZTekstu(xml);
  if (p.length < 2) return undefined;
  const d = Math.max(...p) - Math.min(...p);
  if (d >= 80 && d <= 2500) return round2(d);
  return undefined;
}

/** Kreski z własnym wymiarem „… m” – oś i linie równoległe, nie krawędź łuku obok. */
function kreskiZEtykieta(xml: string): Array<{ pts: Punkt2D[]; metry: number }> {
  const out: Array<{ pts: Punkt2D[]; metry: number }> = [];
  const re = /<(polyline|line)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[2] ?? '';
    const body = m[3] ?? '';
    const metry = etykietaZAnnotacji(attrs, body);
    if (!metry || metry < 80 || metry > 2500) continue;
    let pts: Punkt2D[] = [];
    const vert = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (vert) pts = parsujVertices(vert[1].trim());
    if (pts.length < 2) {
      const start = attr(attrs, 'start');
      const end = attr(attrs, 'end');
      if (start && end) {
        const [x1, y1] = start.split(',').map((s) => parseFloat(s.trim()));
        const [x2, y2] = end.split(',').map((s) => parseFloat(s.trim()));
        if ([x1, y1, x2, y2].every((n) => Number.isFinite(n))) {
          pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }
      }
    }
    if (pts.length >= 2) out.push({ pts, metry });
  }
  return out;
}

/** Mediana odległości punktów od łamanej osi, w punktach PDF. */
function medianaOdOsiPdf(os: Punkt2D[], pts: Punkt2D[]): number {
  if (os.length < 2 || pts.length === 0) return Infinity;
  const offs: number[] = [];
  const krok = Math.max(1, Math.floor((pts.length - 1) / 12));
  for (let i = 0; i < pts.length; i += krok) {
    let min = Infinity;
    for (let j = 0; j < os.length - 1; j++) {
      const d = distPunktOdcinek(pts[i], os[j], os[j + 1]);
      if (d < min) min = d;
    }
    offs.push(min);
  }
  offs.sort((a, b) => a - b);
  return offs[Math.floor(offs.length / 2)];
}

/**
 * Wymiar osi arkusza: opis tej kreski, a gdy jest krótszy niż równoległy wymiar tej samej osi – dłuższy.
 * Dłuższa krawędź łuku obok (ścieżka, krawężnik) nie wydłuża kilometraża.
 */
export function etykietaOsiZArkusza(
  osEtykietaM: number | undefined,
  xml: string,
  geomM?: number,
): number | undefined {
  const zOsi = osEtykietaM && osEtykietaM > 80 && osEtykietaM < 2500 ? osEtykietaM : undefined;
  const zPikiet = dlugoscZPikietXml(xml);
  const kreski = kreskiZEtykieta(xml);
  const osKreska = zOsi
    ? kreski
      .filter((k) => Math.abs(k.metry - zOsi) < 0.06)
      .sort((a, b) => dlugoscPdfLancucha(b.pts) - dlugoscPdfLancucha(a.pts))[0]
    : undefined;
  const przyOsi = osKreska
    ? kreski.filter((k) => medianaOdOsiPdf(osKreska.pts, k.pts) <= 22).map((k) => k.metry)
    : zbierzEtykietyMetrow(xml).filter((e) => e >= 80 && e <= 2500);
  const kandydaci = [...przyOsi];
  if (zOsi) kandydaci.push(zOsi);
  if (zPikiet) kandydaci.push(zPikiet);
  if (kandydaci.length === 0) return osEtykietaM && osEtykietaM > 1 ? osEtykietaM : undefined;

  const arkuszowe = kandydaci.filter((e) => e >= 200 && e <= 900);
  const pula = arkuszowe.length > 0 ? arkuszowe : kandydaci;
  const baza = zOsi ?? (geomM && geomM > 80 ? geomM : Math.max(...pula));
  const doPikietazu = pula.filter((e) => e >= baza * 0.995 && e <= baza * 1.12);
  if (doPikietazu.length > 0) return round2(Math.max(...doPikietazu));
  if (geomM && geomM > 1) {
    const bliskie = pula.filter((e) => e >= geomM * 0.98 && e <= geomM * 1.12);
    if (bliskie.length > 0) return round2(Math.max(...bliskie));
  }
  return round2(zOsi ?? Math.max(...pula));
}

function distPunktOdcinek(p: Punkt2D, a: Punkt2D, b: Punkt2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 <= 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

export function distPunktDoPoligonu(p: Punkt2D, poly: Punkt2D[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = distPunktOdcinek(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < min) min = d;
  }
  return min;
}

function mediana(arr: number[]): number {
  if (arr.length === 0) return Infinity;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function dlugoscPdfLancucha(pts: Punkt2D[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return s;
}

function dlugoscLancucha(pts: Punkt2D[]): number {
  return dlugoscPdfLancucha(pts);
}

function odwracLancuch(pts: Punkt2D[]): Punkt2D[] {
  return [...pts].reverse();
}

function distKoncow(a: Punkt2D, b: Punkt2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Czarna albo niebieska polilinia osi. Czerwony krawężnik i linia wymiarowa odpadają. */
function czyKreskaOsiKandydata(l: PolylineXfdfSurowa): boolean {
  if (l.zrodlo === 'line' || l.wierzcholki.length < 2) return false;
  if (czyLiniaKrawedznika(l.color, l.subject, l.style)) return false;
  return czyLiniaOsi(l.color, l.subject, l.style, l.zrodlo) || czyLiniaOsiBocznej(l.color, l.subject);
}

/** Długość kreski w metrach: wymiar z XFDF, a gdy go nie ma – długość łamanej 1:500. */
function metryKreskiOsi(l: PolylineXfdfSurowa): number {
  const etykieta = l.dlugoscEtykietaM;
  if (etykieta && etykieta > 0.5) return etykieta;
  return dlugoscPdfLancucha(l.wierzcholki) * metryNaPunktPdf();
}

/** Odległość punktu od cięciwy kreski, w punktach PDF. */
function odlegloscBocznaOdCieciwy(seed: Punkt2D[], p: Punkt2D): number {
  const a = seed[0];
  const b = seed[seed.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((p.x - a.x) * (-dy / len) + (p.y - a.y) * (dx / len));
}

/** Ta sama oś, nie droga dochodząca z boku. Próg ~4 m na skali 1:500. */
function wspoliniowe(a: Punkt2D[], b: Punkt2D[]): boolean {
  const seed = dlugoscPdfLancucha(a) >= dlugoscPdfLancucha(b) ? a : b;
  const other = seed === a ? b : a;
  const offs: number[] = [];
  const krok = Math.max(1, Math.floor((other.length - 1) / 8));
  for (let i = 0; i < other.length; i += krok) offs.push(odlegloscBocznaOdCieciwy(seed, other[i]));
  offs.push(odlegloscBocznaOdCieciwy(seed, other[other.length - 1]));
  offs.sort((x, y) => x - y);
  return offs[Math.floor(offs.length / 2)] <= 22;
}

/** Wymiar z XFDF: ta sama etykieta na wielu kreskach → max; odcinki cząstkowe → suma. */
function scalEtykietyOsi(osie: PolylineXfdfSurowa[]): number | undefined {
  const etykiety = osie
    .map((o) => o.dlugoscEtykietaM)
    .filter((n): n is number => typeof n === 'number' && n > 0.5);
  if (etykiety.length === 0) return undefined;
  const max = Math.max(...etykiety);
  const sum = etykiety.reduce((s, n) => s + n, 0);
  if (etykiety.every((e) => e >= max * 0.9)) return max;
  return sum;
}

type TrybScalania = 'tail0' | 'tailN' | 'head0' | 'headN';

function dolaczLancuch(chain: Punkt2D[], u: Punkt2D[], tryb: TrybScalania): Punkt2D[] {
  if (tryb === 'tail0') return chain.concat(u);
  if (tryb === 'tailN') return chain.concat(odwracLancuch(u));
  if (tryb === 'head0') return odwracLancuch(u).concat(chain);
  return u.concat(chain);
}

/**
 * Oś trasy = najdłuższa kreska osi (czarna albo niebieska), w całości.
 * Krawężnik i inne obiekty jej nie skracają. Krótsze kreski zostają osiami bocznymi.
 * Stykające się odcinki tej samej osi (ta sama etykieta albo ciąg dalszy) są sklejane.
 */
export function scalLinieOsi(
  polilinie: PolylineXfdfSurowa[],
  _polygony?: PolygonXfdfSurowy[],
): PolylineXfdfSurowa | undefined {
  const pozostale = polilinie.filter(czyKreskaOsiKandydata);
  if (pozostale.length === 0) return undefined;

  const wszystkie = pozostale.flatMap((o) => o.wierzcholki);
  const xs = wszystkie.map((p) => p.x);
  const ys = wszystkie.map((p) => p.y);
  const diagOs = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const maxGap = Math.max(24, diagOs * 0.025);

  type Komponent = { linie: PolylineXfdfSurowa[]; wierzcholki: Punkt2D[] };
  const komponenty: Komponent[] = [];

  while (pozostale.length > 0) {
    pozostale.sort((a, b) => metryKreskiOsi(b) - metryKreskiOsi(a));
    const seed = pozostale.shift()!;
    const kolor = (seed.color || '').toUpperCase();
    const linie = [seed];
    let chain = [...seed.wierzcholki];
    let dolozono = true;
    while (dolozono) {
      dolozono = false;
      const head = chain[0];
      const tail = chain[chain.length - 1];
      let best = -1;
      let tryb: TrybScalania = 'tail0';
      let bestD = Infinity;
      for (let i = 0; i < pozostale.length; i++) {
        const u = pozostale[i];
        if ((u.color || '').toUpperCase() !== kolor) continue;
        if (!wspoliniowe(seed.wierzcholki, u.wierzcholki)) continue;
        const kand: Array<{ tryb: TrybScalania; d: number }> = [
          { tryb: 'tail0', d: distKoncow(tail, u.wierzcholki[0]) },
          { tryb: 'tailN', d: distKoncow(tail, u.wierzcholki[u.wierzcholki.length - 1]) },
          { tryb: 'head0', d: distKoncow(head, u.wierzcholki[0]) },
          { tryb: 'headN', d: distKoncow(head, u.wierzcholki[u.wierzcholki.length - 1]) },
        ];
        for (const k of kand) {
          if (k.d < bestD) {
            bestD = k.d;
            best = i;
            tryb = k.tryb;
          }
        }
      }
      if (best < 0 || bestD > maxGap) break;
      const u = pozostale.splice(best, 1)[0];
      linie.push(u);
      chain = dolaczLancuch(chain, u.wierzcholki, tryb);
      dolozono = true;
    }
    komponenty.push({ linie, wierzcholki: chain });
  }

  const metryKomponentu = (k: Komponent): number => {
    const geom = dlugoscPdfLancucha(k.wierzcholki) * metryNaPunktPdf();
    const ety = scalEtykietyOsi(k.linie);
    return ety && ety > 0.5 ? Math.max(ety, geom) : geom;
  };
  komponenty.sort((a, b) => metryKomponentu(b) - metryKomponentu(a));
  const best = komponenty[0];
  const etykieta = scalEtykietyOsi(best.linie);
  return {
    wierzcholki: best.wierzcholki,
    color: best.linie[0].color ?? '#000000',
    subject: 'oś trasy',
    style: best.linie[0].style ?? 'dash',
    dlugoscEtykietaM: etykieta != null && etykieta > 0.5 ? etykieta : undefined,
  };
}

/** Czy krótsza kreska jest tą samą osią główną (żeby nie rysować jej drugi raz jako bocznej). */
export function kreskaNalezyDoOsi(kreska: Punkt2D[], os: Punkt2D[]): boolean {
  if (kreska.length < 2 || os.length < 2) return false;
  const blisko = (p: Punkt2D) => os.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.8);
  const srodek = kreska[Math.floor(kreska.length / 2)];
  return blisko(kreska[0]) && blisko(kreska[kreska.length - 1]) && blisko(srodek);
}

export function wybierzOsTrasy(
  polilinie: PolylineXfdfSurowa[],
  polygony?: PolygonXfdfSurowy[],
): PolylineXfdfSurowa | undefined {
  return scalLinieOsi(polilinie, polygony);
}

/** Żółty (PDF-XChange) = lewa jezdnia, różowy = prawa. */
export function stronaTrasyZKoloru(hex?: string): 'lewa' | 'prawa' | undefined {
  if (!hex) return undefined;
  const h = hex.toUpperCase();
  if (h === '#FFEE58' || h === '#FBC02D' || h === '#FFEB3B' || h === '#FFF176' || h === '#FDD835') return 'lewa';
  if (h === '#FFC0CB' || h === '#F8BBD0' || h === '#FF80AB' || h === '#F48FB1' || h === '#F06292') return 'prawa';
  const n = parseInt(h.slice(1), 16);
  if (!Number.isFinite(n)) return undefined;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  if (r > 200 && g > 180 && b < 120) return 'lewa';
  if (r > 200 && b > 150 && g > 140 && g < 220) return 'prawa';
  return undefined;
}

export function czyLiniaOsi(
  color?: string,
  subject?: string,
  style?: string,
  zrodlo?: 'polyline' | 'line',
): boolean {
  const s = (subject || '').toLowerCase();
  if (s.includes('oś') || s.includes('os trasy') || s.includes('oś trasy') || s.includes('axis')) return true;
  if (zrodlo === 'line') return false;
  if (czyLiniaOsiBocznej(color, subject)) return false;
  const c = (color || '').toUpperCase();
  if (c === '#FF0000' || c === '#E53935' || c === '#C62828' || c === '#F44336') return false;
  const czarna = !c || c === '#000000' || c === '#000' || c === '#111111' || c === '#212121' || c === '#1A1A1A';
  if (!czarna) return false;
  const st = (style || '').toLowerCase();
  // Kreskowana albo ciągła (brak stylu, „solid”) – oś trasy. Inny styl pomijamy.
  return st === '' || st === 'solid' || st === 'dash' || st === 'dashed' || st.includes('dash');
}

export function czyLiniaKrawedznika(color?: string, subject?: string, style?: string): boolean {
  if (czyLiniaOsi(color, subject, style)) return false;
  if (czyLiniaOsiBocznej(color, subject)) return false;
  const c = (color || '').toUpperCase();
  const s = (subject || '').toLowerCase();
  const czerwona = c === '#FF0000' || c === '#E53935' || c === '#C62828' || c === '#F44336' || c === '#FF1744';
  if (czerwona) return true;
  if (s.includes('krawęż') || s.includes('krawenz') || s.includes('krawężnik')) return true;
  return false;
}

/** Niebieska polilinia: oś drogi bocznej albo wjazdu, nie krawężnik. */
export function czyLiniaOsiBocznej(color?: string, subject?: string): boolean {
  const c = (color || '').toUpperCase();
  const s = (subject || '').toLowerCase();
  if (s.includes('oś bocz') || s.includes('os bocz') || s.includes('oś wjaz') || s.includes('os wjaz')) return true;
  return c === '#0000FF' || c === '#0000CD' || c === '#1E40AF' || c === '#2196F3' || c === '#1565C0' || c === '#3F51B5';
}

/**
 * Na początku / końcu arkusza dwa wierzchołki o skrajnym X:
 * wyższe Y = lewa, niższe Y = prawa (PDF Y w górę = strona L na tym PZT).
 */
export function bazyZEkstemowX(wierzcholki: Punkt2D[]): { start: BazaObmiaru; koniec: BazaObmiaru } | null {
  if (wierzcholki.length < 4) return null;
  const xs = wierzcholki.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rozpiętość = maxX - minX;
  if (rozpiętość < 1e-6) return null;
  const pas = Math.max(2, rozpiętość * 0.002);
  const skraj = (cel: number): { idxLewy: number; idxPrawy: number } | null => {
    const kand = wierzcholki
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => Math.abs(p.x - cel) <= pas);
    if (kand.length < 2) return null;
    let idxLewy = kand[0].i;
    let idxPrawy = kand[0].i;
    for (const k of kand) {
      if (k.p.y > wierzcholki[idxLewy].y) idxLewy = k.i;
      if (k.p.y < wierzcholki[idxPrawy].y) idxPrawy = k.i;
    }
    if (idxLewy === idxPrawy) return null;
    return { idxLewy, idxPrawy };
  };
  const start = skraj(minX);
  const koniec = skraj(maxX);
  if (!start || !koniec) return null;
  return { start, koniec };
}

/**
 * Podstawy start/koniec i L/P wzdłuż osi: długość = stacja km, szerokość = poprzeczka.
 * Lewa = po lewej gdy idziemy rosnącym kilometrażem.
 */
export function bazyWzdluzOsi(
  wierzcholki: Punkt2D[],
  os: Punkt2D[],
): { start: BazaObmiaru; koniec: BazaObmiaru; dlugosc: number } | null {
  if (wierzcholki.length < 4 || os.length < 2) return null;
  const stacje = wierzcholki.map((p, i) => ({ i, s: stacjaNaOsi(os, p) }));
  const minS = Math.min(...stacje.map((x) => x.s));
  const maxS = Math.max(...stacje.map((x) => x.s));
  const roz = Math.max(maxS - minS, 1e-6);
  let pas = Math.max(roz * 0.03, 1e-4);
  const skraj = (lo: number, hi: number): { idxLewy: number; idxPrawy: number } | null => {
    let kand = stacje.filter((x) => x.s >= lo && x.s <= hi);
    if (kand.length < 2) kand = stacje.filter((x) => Math.abs(x.s - (lo + hi) / 2) <= pas * 2);
    if (kand.length < 2) return null;
    let idxLewy = kand[0].i;
    let idxPrawy = kand[0].i;
    let maxC = iloczynWektorowyOsi(wierzcholki[idxLewy], os);
    let minC = maxC;
    for (const k of kand) {
      const c = iloczynWektorowyOsi(wierzcholki[k.i], os);
      if (c > maxC) {
        maxC = c;
        idxLewy = k.i;
      }
      if (c < minC) {
        minC = c;
        idxPrawy = k.i;
      }
    }
    if (idxLewy === idxPrawy) return null;
    return { idxLewy, idxPrawy };
  };
  let start = skraj(minS, minS + pas);
  let koniec = skraj(maxS - pas, maxS);
  if (!start || !koniec) {
    pas = roz * 0.08;
    start = skraj(minS, minS + pas);
    koniec = skraj(maxS - pas, maxS);
  }
  if (!start || !koniec) return null;
  return { start, koniec, dlugosc: roz };
}

/**
 * Lekki parser XFDF bez pełnego DOM XML –
 * PDF-XChange zapisuje vertices jako tekst w <vertices>…</vertices>.
 */
export function parsujXfdfTekst(xml: string, zrodloNazwa: string): WynikParsowaniaXfdf {
  const hrefMatch = xml.match(/<f\s+href="([^"]+)"/i);
  const zrodloPdfHref = hrefMatch?.[1];

  const polygony: PolygonXfdfSurowy[] = [];
  const polygonRegex = /<polygon\b([^>]*)>([\s\S]*?)<\/polygon>/gi;
  let m: RegExpExecArray | null;
  while ((m = polygonRegex.exec(xml)) !== null) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    const vertMatch = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (!vertMatch) continue;
    const wierzcholki = parsujVertices(vertMatch[1].trim());
    if (wierzcholki.length < 3) continue;
    polygony.push({
      wierzcholki,
      kolorWypelnienia: attr(attrs, 'interior-color') ?? attr(attrs, 'color'),
      title: attr(attrs, 'title'),
      subject: attr(attrs, 'subject'),
    });
  }

  const polilinie: PolylineXfdfSurowa[] = [];
  const lineRegex = /<polyline\b([^>]*)>([\s\S]*?)<\/polyline>/gi;
  while ((m = lineRegex.exec(xml)) !== null) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    const vertMatch = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (!vertMatch) continue;
    const wierzcholki = parsujVertices(vertMatch[1].trim());
    if (wierzcholki.length < 2) continue;
    polilinie.push({
      wierzcholki,
      color: attr(attrs, 'color'),
      subject: attr(attrs, 'subject'),
      style: attr(attrs, 'style'),
      dlugoscEtykietaM: etykietaZAnnotacji(attrs, body),
      zrodlo: 'polyline',
    });
  }

  const lineAnnotRegex = /<line\b([^>]*)>([\s\S]*?)<\/line>/gi;
  while ((m = lineAnnotRegex.exec(xml)) !== null) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    let wierzcholki: Punkt2D[] = [];
    const vertMatch = body.match(/<vertices[^>]*>([\s\S]*?)<\/vertices>/i);
    if (vertMatch) wierzcholki = parsujVertices(vertMatch[1].trim());
    if (wierzcholki.length < 2) {
      const start = attr(attrs, 'start');
      const end = attr(attrs, 'end');
      if (start && end) {
        const [x1, y1] = start.split(',').map((s) => parseFloat(s.trim()));
        const [x2, y2] = end.split(',').map((s) => parseFloat(s.trim()));
        if ([x1, y1, x2, y2].every((n) => Number.isFinite(n))) {
          wierzcholki = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }
      }
    }
    if (wierzcholki.length < 2) continue;
    polilinie.push({
      wierzcholki,
      color: attr(attrs, 'color'),
      subject: attr(attrs, 'subject'),
      style: attr(attrs, 'style'),
      dlugoscEtykietaM: etykietaZAnnotacji(attrs, body),
      zrodlo: 'line',
    });
  }

  const osSurowa = wybierzOsTrasy(polilinie, polygony);
  const kier = kierunekRosnacegoKm(polygony.flatMap((g) => g.wierzcholki));
  const osOrient = osSurowa && osSurowa.wierzcholki.length >= 2
    ? { ...osSurowa, wierzcholki: orientujLancuchDoKm(osSurowa.wierzcholki, kier) }
    : osSurowa;
  const geomM = osOrient && osOrient.wierzcholki.length >= 2
    ? round2(dlugoscLancucha(skalujWierzcholki(osOrient.wierzcholki, DOMYSLNA_SKALA_PZT)))
    : undefined;
  const osTrasy = osOrient
    ? { ...osOrient, dlugoscEtykietaM: etykietaOsiZArkusza(osOrient.dlugoscEtykietaM, xml, geomM) }
    : undefined;

  return { zrodloNazwa, zrodloPdfHref, polygony, polilinie, osTrasy };
}

function rolaKoloruObszaru(hex?: string): 'boczna' | 'wjazd' | 'sciezka' | undefined {
  const h = (hex || '').toUpperCase();
  if (h === '#8B8B00' || h === '#827717' || h === '#9E9D24' || h === '#AFB42B') return 'boczna';
  if (h === '#009300' || h === '#00C853' || h === '#2E7D32' || h === '#43A047' || h === '#008000') return 'wjazd';
  if (h === '#40E0D0' || h === '#26A69A' || h === '#00BCD4' || h === '#388E8E' || h === '#80DEEA') return 'sciezka';
  return undefined;
}

function nazwaObszaru(
  p: PolygonXfdfSurowy,
  i: number,
  kolejnoscStart: number,
  strona?: 'lewa' | 'prawa',
): string {
  const rola = rolaKoloruObszaru(p.kolorWypelnienia);
  if (rola === 'boczna') return 'Droga boczna';
  if (rola === 'wjazd') return 'Wjazd';
  if (rola === 'sciezka') return 'Ścieżka rowerowa';
  const s = strona ?? stronaTrasyZKoloru(p.kolorWypelnienia);
  if (s === 'lewa') return 'Trasa L';
  if (s === 'prawa') return 'Trasa P';
  return `Obszar ${kolejnoscStart + i}`;
}

function dopasujKrawedzniki(
  obszary: ObszarObmiaru[],
  polilinie: PolylineXfdfSurowa[],
  skala: SkalaPzt,
): ObszarObmiaru[] {
  const k = metryNaPunktPdf(skala);
  const krawedzie = polilinie.filter((l) => czyLiniaKrawedznika(l.color, l.subject, l.style));
  if (krawedzie.length === 0 || obszary.length === 0) return obszary;

  const przypisane: KrawedznikObmiaru[][] = obszary.map(() => []);

  for (const linia of krawedzie) {
    const mediany = obszary.map((o) =>
      mediana(linia.wierzcholki.map((p) => distPunktDoPoligonu(p, o.wierzcholkiPdf))) * k,
    );
    let idx = 0;
    for (let i = 1; i < mediany.length; i++) if (mediany[i] < mediany[idx]) idx = i;
    const odKrawedzi = mediany[idx];
    if (odKrawedzi > PRÓG_POKRYCIA_M * 4) continue; // daleko od wszystkich obszarów – pomiń
    const inne = mediany.filter((_, i) => i !== idx);
    const doSasiada = inne.length ? Math.min(...inne) : Infinity;
    const polozenie: KrawedznikObmiaru['polozenie'] =
      doSasiada < PRÓG_OD_OSI_M ? 'odOsi' : 'zewnetrzna';
    const wierzcholkiM = skalujWierzcholki(linia.wierzcholki, skala);
    przypisane[idx].push({
      id: generujId(),
      wierzcholkiPdf: linia.wierzcholki,
      wierzcholkiM,
      dlugoscM: round2(dlugoscLancucha(wierzcholkiM)),
      odlegloscOdKrawedziM: round2(odKrawedzi),
      polozenie,
      kolor: linia.color,
    });
  }

  return obszary.map((o, i) => ({
    ...o,
    krawedzniki: przypisane[i].length ? przypisane[i] : o.krawedzniki,
  }));
}

/** Buduje ObszarObmiaru z surowych polygonów + skali */
export function obszaryZPolygony(
  wynik: WynikParsowaniaXfdf,
  skala: SkalaPzt = DOMYSLNA_SKALA_PZT,
  kolejnoscStart = 1,
): ObszarObmiaru[] {
  const teraz = new Date().toISOString();
  const osPdf = wynik.osTrasy?.wierzcholki;
  const surowe = wynik.polygony.map((p, i) => {
    const wierzcholkiM = skalujWierzcholki(p.wierzcholki, skala);
    const k = metryNaPunktPdf(skala);
    const zOsi = osPdf && osPdf.length >= 2 ? bazyWzdluzOsi(p.wierzcholki, osPdf) : null;
    const bazy = zOsi ?? bazyZEkstemowX(p.wierzcholki);
    const centroid = {
      x: p.wierzcholki.reduce((s, q) => s + q.x, 0) / Math.max(p.wierzcholki.length, 1),
      y: p.wierzcholki.reduce((s, q) => s + q.y, 0) / Math.max(p.wierzcholki.length, 1),
    };
    const stronaTrasy = stronaTrasyZKoloru(p.kolorWypelnienia)
      ?? (rolaKoloruObszaru(p.kolorWypelnienia) ? undefined : (osPdf ? stronaWzgledemOsi(centroid, osPdf) : undefined));
    const dlugoscOdcinkaM = zOsi ? round2(zOsi.dlugosc * k) : undefined;
    const iL = bazy?.start.idxLewy;
    const iP = bazy?.start.idxPrawy;
    const szerokoscOdcinkaM = iL != null && iP != null
      ? round2(Math.hypot(
        (p.wierzcholki[iL].x - p.wierzcholki[iP].x) * k,
        (p.wierzcholki[iL].y - p.wierzcholki[iP].y) * k,
      ))
      : undefined;
    return {
      id: generujId(),
      nazwa: nazwaObszaru({ ...p, kolorWypelnienia: p.kolorWypelnienia }, i, kolejnoscStart, stronaTrasy),
      kolejnosc: kolejnoscStart + i,
      wierzcholkiPdf: p.wierzcholki,
      wierzcholkiM,
      powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
      obwodM: round2(obwodWielokata(wierzcholkiM)),
      zrodloNazwa: wynik.zrodloNazwa,
      zrodloPdfHref: wynik.zrodloPdfHref,
      kolorWypelnienia: p.kolorWypelnienia,
      stronaTrasy,
      bazaStart: bazy?.start,
      bazaKoniec: bazy?.koniec,
      dlugoscOdcinkaM,
      szerokoscOdcinkaM,
      odsadzki: [{ id: generujId(), nr: 1, zastosowana: false }],
      kierunekUkladania: 'rosnacy' as const,
      createdAt: teraz,
    } satisfies ObszarObmiaru;
  });
  return dopasujKrawedzniki(surowe, wynik.polilinie ?? [], skala);
}

/** Przelicza metry i powierzchnie obszarów po zmianie skali */
export function przeliczObszarySkalą(obszary: ObszarObmiaru[], skala: SkalaPzt): ObszarObmiaru[] {
  return obszary.map((o) => {
    const wierzcholkiM = skalujWierzcholki(o.wierzcholkiPdf, skala);
    return {
      ...o,
      wierzcholkiM,
      powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
      obwodM: round2(obwodWielokata(wierzcholkiM)),
      krawedzniki: o.krawedzniki?.map((kr) => ({
        ...kr,
        wierzcholkiM: skalujWierzcholki(kr.wierzcholkiPdf, skala),
        dlugoscM: round2(dlugoscLancucha(skalujWierzcholki(kr.wierzcholkiPdf, skala))),
      })),
    };
  });
}

/** Ustawia kolejność 1…N według kolejności tablicy */
export function nadajKolejnosc(obszary: ObszarObmiaru[]): ObszarObmiaru[] {
  return obszary.map((o, i) => ({
    ...o,
    kolejnosc: i + 1,
    nazwa: o.nazwa.match(/^Obszar \d+$/) ? `Obszar ${i + 1}` : o.nazwa,
  }));
}

export function parsujZawartoscXfdf(
  tekst: string,
  nazwa: string,
): { sukces: true; wynik: WynikParsowaniaXfdf } | { sukces: false; blad: string } {
  if (!tekst.includes('<xfdf') && !tekst.includes('<polygon')) {
    return { sukces: false, blad: `${nazwa} nie wygląda na plik XFDF z wielokątami PDF-XChange.` };
  }
  const wynik = parsujXfdfTekst(tekst, nazwa);
  if (wynik.polygony.length === 0) {
    return { sukces: false, blad: `W pliku ${nazwa} nie znaleziono żadnego wielokąta (<polygon>).` };
  }
  return { sukces: true, wynik };
}

export function scalWynikiXfdf(czesci: Array<{ nazwa: string; wynik?: WynikParsowaniaXfdf; blad?: string }>):
  | { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] }
  | { sukces: false; blad: string } {
  const posortowane = [...czesci].sort((a, b) =>
    a.nazwa.localeCompare(b.nazwa, undefined, { numeric: true, sensitivity: 'base' }),
  );
  const wyniki: WynikParsowaniaXfdf[] = [];
  const pominiete: string[] = [];
  for (const c of posortowane) {
    if (c.wynik) wyniki.push(c.wynik);
    else if (c.blad) pominiete.push(c.blad);
  }
  if (wyniki.length === 0) {
    return { sukces: false, blad: pominiete[0] || 'Nie udało się wczytać żadnego arkusza XFDF.' };
  }
  return { sukces: true, wyniki, pominiete };
}

export function parsujListeTekstowXfdf(pliki: Array<{ nazwa: string; tekst: string }>):
  | { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] }
  | { sukces: false; blad: string } {
  return scalWynikiXfdf(pliki.map((p) => {
    const r = parsujZawartoscXfdf(p.tekst, p.nazwa);
    return r.sukces
      ? { nazwa: p.nazwa, wynik: r.wynik }
      : { nazwa: p.nazwa, blad: r.blad };
  }));
}
