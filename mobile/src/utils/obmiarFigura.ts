// ============================================================
// FIGURA OBSZARU – podstawy L/P, boki, kilometraż, odległości
// ============================================================

import type { BazaObmiaru, ObszarObmiaru, Punkt2D, WezelObmiaru } from '../types';
import { round2 } from './calculations';

function dystans(a: Punkt2D, b: Punkt2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normIdx(i: number, n: number): number {
  return ((i % n) + n) % n;
}

export function absKilometraz(km?: number, m?: number): number | null {
  if (km == null && m == null) return null;
  return Math.max(0, km ?? 0) * 1000 + Math.max(0, m ?? 0);
}

export function formatujKilometraz(km?: number, m?: number): string {
  if (km == null && m == null) return '';
  const abs = absKilometraz(km, m) ?? 0;
  const k = Math.floor(abs / 1000);
  const mm = Math.round(abs % 1000);
  return `${k}+${String(mm).padStart(3, '0')}`;
}

/** Akceptuje „1+500”, „1 500”, „1500”. */
export function parsujKilometraz(tekst: string): { km: number; m: number } | null {
  const t = tekst.trim().replace(',', '.');
  if (!t) return null;
  const plus = t.match(/^(\d+)\s*\+\s*(\d{1,3})$/);
  if (plus) return { km: parseInt(plus[1], 10), m: parseInt(plus[2], 10) };
  const liczby = t.match(/^(\d+)(?:\s+|[,.])(\d{1,3})$/);
  if (liczby) return { km: parseInt(liczby[1], 10), m: parseInt(liczby[2], 10) };
  const calosc = Number(t);
  if (!Number.isFinite(calosc) || calosc < 0) return null;
  const km = Math.floor(calosc / 1000);
  const m = Math.round(calosc % 1000);
  return { km, m };
}

export function bazaKompletna(b?: BazaObmiaru): b is BazaObmiaru & { idxLewy: number; idxPrawy: number } {
  return b != null && b.idxLewy != null && b.idxPrawy != null;
}

function lukIdx(n: number, od: number, doIdx: number, kierunek: 1 | -1): number[] {
  const out: number[] = [];
  let i = normIdx(od, n);
  const cel = normIdx(doIdx, n);
  let guard = 0;
  out.push(i);
  while (i !== cel && guard <= n) {
    i = normIdx(i + kierunek, n);
    out.push(i);
    guard += 1;
  }
  return out;
}

function dlugoscLancucha(wierzcholki: Punkt2D[], idx: number[]): number {
  let s = 0;
  for (let i = 0; i < idx.length - 1; i++) {
    s += dystans(wierzcholki[idx[i]], wierzcholki[idx[i + 1]]);
  }
  return s;
}

/** Krótszy łańcuch wierzchołków od A do B (włącznie). */
export function lancuchKrotszy(n: number, a: number, b: number): number[] {
  if (n < 1) return [];
  const p = lukIdx(n, a, b, 1);
  const q = lukIdx(n, a, b, -1);
  return p.length <= q.length ? p : q;
}

/**
 * Bok jezdni: z węzła startu idziemy STRONĄ ODWROTNĄ niż krótsza podstawa
 * do drugiego węzła bazy, aż do węzła końca tego boku.
 */
export function lancuchBoku(
  n: number,
  idxStart: number,
  idxDrugiBazy: number,
  idxKoniec: number,
): number[] {
  const bazaPlus = lukIdx(n, idxStart, idxDrugiBazy, 1);
  const bazaMinus = lukIdx(n, idxStart, idxDrugiBazy, -1);
  const kierunekBazy: 1 | -1 = bazaPlus.length <= bazaMinus.length ? 1 : -1;
  const kierunekBoku: 1 | -1 = kierunekBazy === 1 ? -1 : 1;
  const proba = lukIdx(n, idxStart, idxKoniec, kierunekBoku);
  if (proba[proba.length - 1] === normIdx(idxKoniec, n) && proba.length <= n + 1) {
    return proba;
  }
  return lukIdx(n, idxStart, idxKoniec, kierunekBazy);
}

export interface BokiFigury {
  lewa: number[];
  prawa: number[];
  bazaStart: [number, number];
  bazaKoniec: [number, number];
  lewaDl: number;
  prawaDl: number;
  dlugoscUkladania: number;
}

export function bokiFigury(obszar: ObszarObmiaru): BokiFigury | null {
  const pts = obszar.wierzcholkiM;
  const n = pts.length;
  const s = obszar.bazaStart;
  const k = obszar.bazaKoniec;
  if (!bazaKompletna(s) || !bazaKompletna(k) || n < 3) return null;
  const lewa = lancuchBoku(n, s.idxLewy, s.idxPrawy, k.idxLewy);
  const prawa = lancuchBoku(n, s.idxPrawy, s.idxLewy, k.idxPrawy);
  const lewaDl = dlugoscLancucha(pts, lewa);
  const prawaDl = dlugoscLancucha(pts, prawa);
  return {
    lewa,
    prawa,
    bazaStart: [s.idxLewy, s.idxPrawy],
    bazaKoniec: [k.idxLewy, k.idxPrawy],
    lewaDl,
    prawaDl,
    dlugoscUkladania: round2((lewaDl + prawaDl) / 2),
  };
}

/**
 * Długość do pikietażu PZT (oś), nie do układania MMA.
 * Krawędź od osi z wyspami jest dłuższa – odrzucamy ją, gdy wyraźnie wystaje.
 * Czerwony krawężnik „zewnętrzny” jest bliższy osi trasy niż objeżdżanie wysp.
 */
export function dlugoscKilometrazaObszaru(obszar: ObszarObmiaru): number {
  const boki = bokiFigury(obszar);
  const zewn = (obszar.krawedzniki ?? [])
    .filter((k) => k.polozenie === 'zewnetrzna' && k.dlugoscM > 2)
    .map((k) => k.dlugoscM);
  if (zewn.length > 0 && boki) {
    const krot = Math.min(boki.lewaDl, boki.prawaDl);
    const z = Math.max(...zewn);
    if (z > krot * 0.7 && z < krot * 1.2) return round2(z);
  }
  if (boki) {
    const krot = Math.min(boki.lewaDl, boki.prawaDl);
    const dlug = Math.max(boki.lewaDl, boki.prawaDl);
    const prog = Math.max(3, 0.008 * Math.max(krot, 1));
    if (dlug - krot > prog) return round2(krot);
    return round2((boki.lewaDl + boki.prawaDl) / 2);
  }
  return round2(Math.max(obszar.obwodM / 2, 0.01));
}

export function punktNaLancuchu(
  wierzcholki: Punkt2D[],
  idx: number[],
  t: number,
): { punkt: Punkt2D; headingRad: number; ok: boolean } {
  if (idx.length < 2) {
    const p = wierzcholki[idx[0]] ?? { x: 0, y: 0 };
    return { punkt: { ...p }, headingRad: 0, ok: false };
  }
  const dl = dlugoscLancucha(wierzcholki, idx);
  let remaining = Math.max(0, Math.min(1, t)) * Math.max(dl, 1e-9);
  for (let i = 0; i < idx.length - 1; i++) {
    const a = wierzcholki[idx[i]];
    const b = wierzcholki[idx[i + 1]];
    const d = dystans(a, b);
    const headingRad = Math.atan2(b.y - a.y, b.x - a.x);
    if (remaining <= d) {
      const u = d > 0 ? remaining / d : 0;
      return {
        punkt: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u },
        headingRad,
        ok: true,
      };
    }
    remaining -= d;
  }
  const last = wierzcholki[idx[idx.length - 1]];
  const prev = wierzcholki[idx[idx.length - 2]];
  return {
    punkt: { ...last },
    headingRad: Math.atan2(last.y - prev.y, last.x - prev.x),
    ok: true,
  };
}

export interface PrzekrojPoprzeczny {
  lewy: Punkt2D;
  prawy: Punkt2D;
  srodek: Punkt2D;
  szerokoscM: number;
  headingRad: number;
  ok: boolean;
}

/** Przekrój L–P na osi (t = 0…1). Szerokość = odległość między bokami. */
export function przekrojPoprzeczny(obszar: ObszarObmiaru, t: number): PrzekrojPoprzeczny {
  const puste: PrzekrojPoprzeczny = {
    lewy: { x: 0, y: 0 }, prawy: { x: 0, y: 0 }, srodek: { x: 0, y: 0 },
    szerokoscM: 0, headingRad: 0, ok: false,
  };
  const boki = bokiFigury(obszar);
  if (!boki) return puste;
  const L = punktNaLancuchu(obszar.wierzcholkiM, boki.lewa, t);
  const P = punktNaLancuchu(obszar.wierzcholkiM, boki.prawa, t);
  if (!L.ok || !P.ok) return puste;
  const headingRad = Math.atan2(
    Math.sin(L.headingRad) + Math.sin(P.headingRad),
    Math.cos(L.headingRad) + Math.cos(P.headingRad),
  );
  return {
    lewy: L.punkt,
    prawy: P.punkt,
    srodek: { x: (L.punkt.x + P.punkt.x) / 2, y: (L.punkt.y + P.punkt.y) / 2 },
    szerokoscM: dystans(L.punkt, P.punkt),
    headingRad,
    ok: true,
  };
}

export function srodekNaPostepie(
  obszar: ObszarObmiaru,
  t: number,
): { punkt: Punkt2D; headingRad: number; ok: boolean } {
  const p = przekrojPoprzeczny(obszar, t);
  if (!p.ok) return { punkt: { x: 0, y: 0 }, headingRad: 0, ok: false };
  return { punkt: p.srodek, headingRad: p.headingRad, ok: true };
}

/** Obrys ułożonego odcinka: łańcuch L i P od startu do postępu (do zamalowania). */
export function wielokatUlozony(obszar: ObszarObmiaru, postep: number): Punkt2D[] {
  const boki = bokiFigury(obszar);
  const tEnd = Math.max(0, Math.min(1, postep));
  if (!boki || tEnd < 0.001) return [];
  const n = Math.max(8, Math.ceil(tEnd * 56));
  const lewa: Punkt2D[] = [];
  const prawa: Punkt2D[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * tEnd;
    const L = punktNaLancuchu(obszar.wierzcholkiM, boki.lewa, t);
    const P = punktNaLancuchu(obszar.wierzcholkiM, boki.prawa, t);
    if (L.ok) lewa.push(L.punkt);
    if (P.ok) prawa.push(P.punkt);
  }
  if (lewa.length < 2 || prawa.length < 2) return [];
  return [...lewa, ...prawa.reverse()];
}

export function odlegloscNaLancuchu(wierzcholki: Punkt2D[], idx: number[], wezel: number): number | null {
  const pos = idx.indexOf(wezel);
  if (pos < 0) return null;
  return dlugoscLancucha(wierzcholki, idx.slice(0, pos + 1));
}

export interface OdlegloscWezla {
  idx: number;
  odStartuM: number;
}

/** Podłańcuch od węzła A do B wzdłuż zadanego boku (kolejność łańcucha). */
export function podlancuch(lancuch: number[], a: number, b: number): number[] {
  const i = lancuch.indexOf(a);
  const j = lancuch.indexOf(b);
  if (i < 0 || j < 0) return [];
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  return lancuch.slice(lo, hi + 1);
}

/**
 * Węzły boku L/P pokrywające odcinek kilometrażu (najbliższe wierzchołki
 * obejmujące przedział, np. prawa krawędź 1+300…1+400).
 */
export function idxWezlowOdcinkaKm(
  obszar: ObszarObmiaru,
  strona: 'lewa' | 'prawa',
  kmOdAbs: number,
  kmDoAbs: number,
): number[] | null {
  const boki = bokiFigury(obszar);
  if (!boki) return null;
  const lancuch = strona === 'lewa' ? boki.lewa : boki.prawa;
  const startAbs = absKilometraz(obszar.bazaStart?.kilometrazKm, obszar.bazaStart?.kilometrazM);
  if (startAbs == null || lancuch.length < 1) return null;
  const sign = kierunekKilometrazu(obszar) === 'malejacy' ? -1 : 1;
  let d0 = (kmOdAbs - startAbs) * sign;
  let d1 = (kmDoAbs - startAbs) * sign;
  if (d1 < d0) {
    const t = d0;
    d0 = d1;
    d1 = t;
  }
  const pts = obszar.wierzcholkiM;
  const dists: number[] = [0];
  let acc = 0;
  for (let i = 1; i < lancuch.length; i++) {
    acc += dystans(pts[lancuch[i - 1]], pts[lancuch[i]]);
    dists.push(acc);
  }
  let iStart = 0;
  for (let i = 0; i < dists.length; i++) {
    if (dists[i] <= d0 + 1e-6) iStart = i;
  }
  let iEnd = lancuch.length - 1;
  for (let i = 0; i < dists.length; i++) {
    if (dists[i] >= d1 - 1e-6) {
      iEnd = i;
      break;
    }
  }
  if (iEnd < iStart) return null;
  const sub = lancuch.slice(iStart, iEnd + 1);
  return sub.length >= 1 ? sub : null;
}

/** Odległość każdego węzła od podstawy startu wzdłuż boku L/P. */
export function odleglosciWezlowOdStartu(obszar: ObszarObmiaru): OdlegloscWezla[] {
  const pts = obszar.wierzcholkiM;
  const n = pts.length;
  const boki = bokiFigury(obszar);
  const out: OdlegloscWezla[] = [];
  if (!boki) {
    for (let i = 0; i < n; i++) out.push({ idx: i, odStartuM: 0 });
    return out;
  }
  const mapa = new Map<number, number>();
  mapa.set(boki.bazaStart[0], 0);
  mapa.set(boki.bazaStart[1], 0);
  for (const i of boki.lewa) {
    const d = odlegloscNaLancuchu(pts, boki.lewa, i);
    if (d != null) mapa.set(i, d);
  }
  for (const i of boki.prawa) {
    const d = odlegloscNaLancuchu(pts, boki.prawa, i);
    if (d != null) {
      const prev = mapa.get(i);
      mapa.set(i, prev == null ? d : (prev + d) / 2);
    }
  }
  mapa.set(boki.bazaKoniec[0], boki.dlugoscUkladania);
  mapa.set(boki.bazaKoniec[1], boki.dlugoscUkladania);
  for (let i = 0; i < n; i++) {
    out.push({ idx: i, odStartuM: round2(mapa.get(i) ?? 0) });
  }
  return out;
}

export function kierunekKilometrazu(obszar: ObszarObmiaru): 'rosnacy' | 'malejacy' | 'nieznany' {
  if (obszar.kierunekUkladania === 'rosnacy' || obszar.kierunekUkladania === 'malejacy') {
    return obszar.kierunekUkladania;
  }
  const a = absKilometraz(obszar.bazaStart?.kilometrazKm, obszar.bazaStart?.kilometrazM);
  const b = absKilometraz(obszar.bazaKoniec?.kilometrazKm, obszar.bazaKoniec?.kilometrazM);
  if (a == null || b == null) return 'nieznany';
  if (b > a) return 'rosnacy';
  if (b < a) return 'malejacy';
  return 'nieznany';
}

export function zAbsKilometraza(abs: number): { km: number; m: number } {
  const v = Math.max(0, Math.round(abs));
  return { km: Math.floor(v / 1000), m: v % 1000 };
}

/** Koniec = start ± długość osi, wg kierunku. */
export function kilometrazKoncaZOsi(
  startKm: number,
  startM: number,
  dlugoscM: number,
  kierunek: 'rosnacy' | 'malejacy',
): { km: number; m: number } {
  const start = Math.max(0, startKm) * 1000 + Math.max(0, startM);
  const delta = Math.max(0, dlugoscM);
  const koniec = kierunek === 'rosnacy' ? start + delta : start - delta;
  return zAbsKilometraza(koniec);
}

export function zastosujKilometrazKonca(obszar: ObszarObmiaru, dlugoscM: number): ObszarObmiaru {
  const kierunek = kierunekKilometrazu(obszar);
  const startKm = obszar.bazaStart?.kilometrazKm ?? obszar.kilometrazStartKm;
  const startM = obszar.bazaStart?.kilometrazM ?? obszar.kilometrazStartM;
  if (kierunek === 'nieznany') return obszar;
  if (startKm == null && startM == null) return obszar;
  const k = kilometrazKoncaZOsi(startKm ?? 0, startM ?? 0, dlugoscM, kierunek);
  return {
    ...obszar,
    bazaStart: { ...(obszar.bazaStart ?? {}), kilometrazKm: startKm ?? 0, kilometrazM: startM ?? 0 },
    bazaKoniec: { ...(obszar.bazaKoniec ?? {}), kilometrazKm: k.km, kilometrazM: k.m },
    kilometrazStartKm: startKm ?? 0,
    kilometrazStartM: startM ?? 0,
    kilometrazKoniecKm: k.km,
    kilometrazKoniecM: k.m,
  };
}

export interface PunktOsi {
  t: number;
  punkt: Punkt2D;
  headingRad: number;
  odStartuM: number;
  etykietaKm: string;
}

export function osFigury(obszar: ObszarObmiaru, krokM = 25): PunktOsi[] {
  const boki = bokiFigury(obszar);
  if (!boki) return [];
  const dl = Math.max(boki.dlugoscUkladania, 0.01);
  const kierunek = kierunekKilometrazu(obszar);
  const startAbs = absKilometraz(obszar.bazaStart?.kilometrazKm, obszar.bazaStart?.kilometrazM) ?? 0;
  const out: PunktOsi[] = [];
  const n = Math.max(2, Math.ceil(dl / krokM) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = srodekNaPostepie(obszar, t);
    if (!s.ok) continue;
    const od = t * dl;
    const abs = kierunek === 'malejacy' ? startAbs - od : startAbs + od;
    const km = zAbsKilometraza(abs);
    out.push({
      t,
      punkt: s.punkt,
      headingRad: s.headingRad,
      odStartuM: round2(od),
      etykietaKm: formatujKilometraz(km.km, km.m),
    });
  }
  return out;
}

export function wezlyZKonfiguracji(obszar: ObszarObmiaru): WezelObmiaru[] {
  const pts = obszar.wierzcholkiM;
  const out: WezelObmiaru[] = [];
  const add = (idx: number | undefined, rola: WezelObmiaru['rola']) => {
    if (idx == null || idx < 0 || idx >= pts.length) return;
    const p = pts[idx];
    out.push({ x: p.x, y: p.y, idx, rola });
  };
  add(obszar.bazaStart?.idxLewy, 'startLewy');
  add(obszar.bazaStart?.idxPrawy, 'startPrawy');
  add(obszar.bazaKoniec?.idxLewy, 'koniecLewy');
  add(obszar.bazaKoniec?.idxPrawy, 'koniecPrawy');
  if (out.length === 0) {
    return (obszar.wezlyRole ?? []).filter((w) => w.rola !== 'zwykly');
  }
  return out;
}

export function odlegloscMiedzyWezlami(
  wierzcholki: Punkt2D[],
  a: number,
  b: number,
): { wzdluzM: number; prostoM: number } {
  const n = wierzcholki.length;
  if (n < 2) return { wzdluzM: 0, prostoM: 0 };
  const p = lukIdx(n, a, b, 1);
  const q = lukIdx(n, a, b, -1);
  const wzdluzM = round2(Math.min(dlugoscLancucha(wierzcholki, p), dlugoscLancucha(wierzcholki, q)));
  return { wzdluzM, prostoM: round2(dystans(wierzcholki[a], wierzcholki[b])) };
}

export function nowaOdsadzka(nr: number): import('../types').OdsadzkaObmiaru {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nr,
    zastosowana: false,
  };
}
