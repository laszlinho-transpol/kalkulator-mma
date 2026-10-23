// ============================================================
// Siatka pomocnicza szkicu: wiaderko do krawędzi i pole zamalowania.
// Wynik zawsze wraca jako wektor (wielokąty w jednostkach PDF).
// ============================================================

import type { ElementSzkicu, Punkt2D } from '../types';

export interface Zakres {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Siatka {
  minX: number;
  minY: number;
  cell: number;
  nx: number;
  ny: number;
  d: Uint8Array;
}

export const MAX_KOMOREK_BOKU = 640;

export function zakresPunktow(pts: Punkt2D[], margines = 0): Zakres | null {
  if (pts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX: minX - margines, minY: minY - margines, maxX: maxX + margines, maxY: maxY + margines };
}

export function czescWspolna(a: Zakres, b: Zakres): Zakres | null {
  const z = { minX: Math.max(a.minX, b.minX), minY: Math.max(a.minY, b.minY), maxX: Math.min(a.maxX, b.maxX), maxY: Math.min(a.maxY, b.maxY) };
  return z.maxX > z.minX && z.maxY > z.minY ? z : null;
}

function nowaSiatka(z: Zakres, maxBoku: number): Siatka {
  const w = Math.max(z.maxX - z.minX, 1e-9);
  const h = Math.max(z.maxY - z.minY, 1e-9);
  const cell = Math.max(w, h) / maxBoku;
  const nx = Math.max(1, Math.ceil(w / cell));
  const ny = Math.max(1, Math.ceil(h / cell));
  return { minX: z.minX, minY: z.minY, cell, nx, ny, d: new Uint8Array(nx * ny) };
}

/** Wypełnia pierścienie regułą parzystości (otwory jako kolejne pierścienie). */
function wypelnijPierscienie(s: Siatka, pierscienie: Punkt2D[][], wartosc: number): void {
  const xs: number[] = [];
  for (let j = 0; j < s.ny; j++) {
    const yc = s.minY + (j + 0.5) * s.cell;
    xs.length = 0;
    for (const poly of pierscienie) {
      for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
        const a = poly[i];
        const b = poly[k];
        if ((a.y > yc) !== (b.y > yc)) xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - s.minX) / s.cell - 0.5));
      const i1 = Math.min(s.nx - 1, Math.floor((xs[k + 1] - s.minX) / s.cell - 0.5));
      for (let i = i0; i <= i1; i++) s.d[j * s.nx + i] = wartosc;
    }
  }
}

function rysujKreske(s: Siatka, pts: Punkt2D[], polowa: number, zamknij: boolean, wartosc: number): void {
  const n = pts.length;
  const ile = zamknij ? n : n - 1;
  for (let k = 0; k < ile; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % n];
    const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - polowa - s.minX) / s.cell));
    const i1 = Math.min(s.nx - 1, Math.floor((Math.max(a.x, b.x) + polowa - s.minX) / s.cell));
    const j0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - polowa - s.minY) / s.cell));
    const j1 = Math.min(s.ny - 1, Math.floor((Math.max(a.y, b.y) + polowa - s.minY) / s.cell));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const p2 = polowa * polowa;
    for (let j = j0; j <= j1; j++) {
      const yc = s.minY + (j + 0.5) * s.cell;
      for (let i = i0; i <= i1; i++) {
        const xc = s.minX + (i + 0.5) * s.cell;
        const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((xc - a.x) * dx + (yc - a.y) * dy) / l2));
        const ex = xc - (a.x + t * dx);
        const ey = yc - (a.y + t * dy);
        if (ex * ex + ey * ey <= p2) s.d[j * s.nx + i] = wartosc;
      }
    }
  }
}

function pierscienieElementu(e: ElementSzkicu): Punkt2D[][] {
  return [e.punktyPdf, ...(e.otwory ?? [])];
}

function zamalowujeWnetrze(e: ElementSzkicu): boolean {
  return !!(e.wypelnienie && e.punktyPdf.length >= 3);
}

/** Obrysy komórek zaznaczonych w masce – pętle wierzchołków siatki. */
function petleMaski(mask: Uint8Array, nx: number, ny: number): Array<Array<[number, number]>> {
  const nastepne = new Map<number, number[]>();
  const W = nx + 1;
  const dodaj = (ax: number, ay: number, bx: number, by: number) => {
    const k = ay * W + ax;
    const lista = nastepne.get(k);
    if (lista) lista.push(by * W + bx);
    else nastepne.set(k, [by * W + bx]);
  };
  const pelna = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < ny && mask[j * nx + i] === 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!pelna(i, j)) continue;
      if (!pelna(i, j - 1)) dodaj(i, j, i + 1, j);
      if (!pelna(i + 1, j)) dodaj(i + 1, j, i + 1, j + 1);
      if (!pelna(i, j + 1)) dodaj(i + 1, j + 1, i, j + 1);
      if (!pelna(i - 1, j)) dodaj(i, j + 1, i, j);
    }
  }
  const petle: Array<Array<[number, number]>> = [];
  for (const [start, lista] of nastepne) {
    while (lista.length > 0) {
      const petla: Array<[number, number]> = [[start % W, Math.floor(start / W)]];
      let k = lista.pop()!;
      let straz = 0;
      while (k !== start && straz++ < 4_000_000) {
        petla.push([k % W, Math.floor(k / W)]);
        const dalej = nastepne.get(k);
        if (!dalej || dalej.length === 0) break;
        k = dalej.pop()!;
      }
      if (petla.length >= 4) petle.push(petla);
    }
  }
  return petle;
}

function polePetli(p: Array<[number, number]>): number {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return s / 2;
}

function uprosc(pts: Punkt2D[], tol: number): Punkt2D[] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stos: Array<[number, number]> = [[0, pts.length - 1]];
  while (stos.length) {
    const [a, b] = stos.pop()!;
    const pa = pts[a];
    const pb = pts[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const l = Math.hypot(dx, dy) || 1e-12;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i].x - pa.x) * dy - (pts[i].y - pa.y) * dx) / l;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx > 0 && maxD > tol) {
      keep[idx] = 1;
      stos.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i] === 1);
}

function petlaDoPdf(s: Siatka, p: Array<[number, number]>): Punkt2D[] {
  const pts = p.map(([i, j]) => ({ x: s.minX + i * s.cell, y: s.minY + j * s.cell }));
  // Douglas–Peucker na pętli otwartej w najdalszym wierzchołku, żeby nie zgubić rogu startowego.
  let far = 0;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const a = uprosc(pts.slice(0, far + 1), s.cell * 0.6);
  const b = uprosc([...pts.slice(far), pts[0]], s.cell * 0.6);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

export interface OpcjeWiadra {
  elementy: ElementSzkicu[];
  punkt: Punkt2D;
  kolor: string;
  /** Obrysy obszarów PZT – zatrzymują farbę jak linie szkicu. */
  krawedzie: Punkt2D[][];
  /** Obszary warstwy – farba nie wychodzi poza nie. Brak = cały arkusz. */
  dozwolone?: Punkt2D[][] | null;
  /** Fragment arkusza, w którym liczona jest plama (zwykle okolica widoku). */
  zakres: Zakres;
  /** Grubość linii obszaru w jednostkach PDF przy obecnym przybliżeniu. */
  liniaObszaruPdf: number;
  maxBoku?: number;
  noweId?: () => string;
}

/**
 * Wiaderko: zalewa obszar od punktu do najbliższych linii szkicu i krawędzi obszarów.
 * Zwraca elementy z nową plamą albo null, gdy farba nie ma granic.
 */
export function wypelnijDoKrawedzi(o: OpcjeWiadra): ElementSzkicu[] | null {
  const s = nowaSiatka(o.zakres, o.maxBoku ?? MAX_KOMOREK_BOKU);
  const pi = Math.floor((o.punkt.x - s.minX) / s.cell);
  const pj = Math.floor((o.punkt.y - s.minY) / s.cell);
  if (pi < 0 || pj < 0 || pi >= s.nx || pj >= s.ny) return null;

  const SCIANA = 2;
  if (o.dozwolone) {
    wypelnijPierscienie(s, o.dozwolone, 1);
    for (let i = 0; i < s.d.length; i++) s.d[i] = s.d[i] === 1 ? 0 : SCIANA;
  }
  const polowaLinii = Math.max(s.cell * 0.75, o.liniaObszaruPdf / 2);
  for (const k of o.krawedzie) rysujKreske(s, k, polowaLinii, true, SCIANA);
  for (const e of o.elementy) {
    if (e.plama) continue;
    rysujKreske(s, e.punktyPdf, Math.max(s.cell * 0.75, e.gruboscPdf / 2), false, SCIANA);
  }
  const start = pj * s.nx + pi;
  if (s.d[start] !== 0) return null;

  const ZALANA = 3;
  const kolejka = new Int32Array(s.nx * s.ny);
  let glowa = 0;
  let ogon = 0;
  kolejka[ogon++] = start;
  s.d[start] = ZALANA;
  let brzeg = false;
  while (glowa < ogon) {
    const c = kolejka[glowa++];
    const i = c % s.nx;
    const j = (c - i) / s.nx;
    if (i === 0 || j === 0 || i === s.nx - 1 || j === s.ny - 1) brzeg = true;
    if (i > 0 && s.d[c - 1] === 0) { s.d[c - 1] = ZALANA; kolejka[ogon++] = c - 1; }
    if (i < s.nx - 1 && s.d[c + 1] === 0) { s.d[c + 1] = ZALANA; kolejka[ogon++] = c + 1; }
    if (j > 0 && s.d[c - s.nx] === 0) { s.d[c - s.nx] = ZALANA; kolejka[ogon++] = c - s.nx; }
    if (j < s.ny - 1 && s.d[c + s.nx] === 0) { s.d[c + s.nx] = ZALANA; kolejka[ogon++] = c + s.nx; }
  }
  if (brzeg) {
    const wObszarze = [...(o.dozwolone ?? []), ...o.krawedzie].some((poly) => punktWWielokacieR(o.punkt, poly));
    if (!wObszarze) return null;
  }

  // Poszerzenie o jedną komórkę domyka szczelinę między farbą a linią.
  const maska = new Uint8Array(s.nx * s.ny);
  for (let c = 0; c < maska.length; c++) {
    if (s.d[c] !== ZALANA) continue;
    const i = c % s.nx;
    maska[c] = 1;
    if (i > 0) maska[c - 1] = 1;
    if (i < s.nx - 1) maska[c + 1] = 1;
    if (c - s.nx >= 0) maska[c - s.nx] = 1;
    if (c + s.nx < maska.length) maska[c + s.nx] = 1;
  }
  const petle = petleMaski(maska, s.nx, s.ny)
    .map((p) => ({ p, pole: polePetli(p) }))
    .sort((a, b) => Math.abs(b.pole) - Math.abs(a.pole));
  if (petle.length === 0) return null;
  const [zewn, ...reszta] = petle;
  const otwory = reszta
    .filter((x) => Math.sign(x.pole) !== Math.sign(zewn.pole) && Math.abs(x.pole) >= 2)
    .map((x) => petlaDoPdf(s, x.p))
    .filter((p) => p.length >= 3);
  const obrys = petlaDoPdf(s, zewn.p);
  if (obrys.length < 3) return null;
  const id = o.noweId?.() ?? `pl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return [
    ...o.elementy,
    { id, punktyPdf: obrys, kolor: o.kolor, gruboscPdf: 0, wypelnienie: o.kolor, plama: true, ...(otwory.length ? { otwory } : {}) },
  ];
}

function punktWWielokacieR(p: Punkt2D, poly: Punkt2D[]): boolean {
  let w = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) w = !w;
  }
  return w;
}

export function zakresElementow(elementy: ElementSzkicu[]): Zakres | null {
  let z: Zakres | null = null;
  for (const e of elementy) {
    const r = zakresPunktow(e.punktyPdf, e.gruboscPdf / 2);
    if (!r) continue;
    z = z
      ? { minX: Math.min(z.minX, r.minX), minY: Math.min(z.minY, r.minY), maxX: Math.max(z.maxX, r.maxX), maxY: Math.max(z.maxY, r.maxY) }
      : r;
  }
  return z;
}

/**
 * Pole zamalowane szkicem (kreski o grubości > 0, wypełnienia i plamy) w jednostkach PDF².
 * Z obszarem – tylko część wewnątrz obszaru.
 */
export function poleZamalowaniaPdf(elementy: ElementSzkicu[], obszar?: Punkt2D[] | null, maxBoku = MAX_KOMOREK_BOKU): number {
  const malujace = elementy.filter((e) => e.gruboscPdf > 0 || zamalowujeWnetrze(e));
  let z = zakresElementow(malujace);
  if (!z) return 0;
  if (obszar) {
    const zo = zakresPunktow(obszar);
    z = zo ? czescWspolna(z, zo) : null;
    if (!z) return 0;
  }
  const s = nowaSiatka(z, maxBoku);
  for (const e of malujace) {
    if (zamalowujeWnetrze(e)) wypelnijPierscienie(s, pierscienieElementu(e), 1);
    if (e.gruboscPdf > 0 && !e.plama) rysujKreske(s, e.punktyPdf, e.gruboscPdf / 2, false, 1);
  }
  let ile = 0;
  if (obszar) {
    const m = { ...s, d: new Uint8Array(s.nx * s.ny) };
    wypelnijPierscienie(m, [obszar], 1);
    for (let i = 0; i < s.d.length; i++) if (s.d[i] === 1 && m.d[i] === 1) ile++;
  } else {
    for (let i = 0; i < s.d.length; i++) if (s.d[i] === 1) ile++;
  }
  return ile * s.cell * s.cell;
}
