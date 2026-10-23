// Szkic geodezyjny – rzut z góry: punkty z odczytami łaty, połączenia ze spadkami i celem, punkty pośrednie.
// Współrzędne w metrach (oś y w dół, jak na kartce). Wysokości: rzędna [m] albo odczyt łaty [mm].

import {
  czynnikLuku, dlugoscKrzywej, kontrolnyLuku, odl, punktKrzywej, punktNaDlugosci, rzutNaKrzywa, srodek,
  type Pkt,
} from './geometria';

/** Zadany spadek [%] – teren opada od końca `od` linii do drugiego końca. */
export interface CelSpadku {
  spadek: number;
  od: 'a' | 'b';
  /** Koniec, który zostaje z odczytem z łaty (domyślnie `od`); drugi dostaje odczyt zgodny z celem. */
  kotwica?: 'a' | 'b';
}

export function kotwicaCelu(cel: CelSpadku): 'a' | 'b' {
  return cel.kotwica ?? cel.od;
}

export interface PunktGeodezyjny {
  id: string;
  nr: number;
  nazwa: string;
  x: number;
  y: number;
  warstwa?: string;
  /** Odczyt z łaty [mm]. */
  odczyt?: number;
  /** Rzędna [m]. */
  rzedna?: number;
  komentarz?: string;
  /** Punkt pośredni – leży na linii w odległości od jej początku (wzdłuż łuku). */
  naLinii?: { liniaId: string; odleglosc: number };
  /** Własny cel punktu pośredniego (domyślnie cel linii). */
  cel?: CelSpadku;
}

export interface LiniaGeodezyjna {
  id: string;
  a: string;
  b: string;
  /** Strzałka łuku / cięciwa (ze znakiem); 0 = prosta. */
  wygiecie: number;
  cel?: CelSpadku;
}

export interface SzkicGeodezyjny {
  id: string;
  nazwa: string;
  opis?: string;
  /** Bok kwadratu siatki pomocniczej [m]. */
  bokSiatki: number;
  siatka: boolean;
  punkty: PunktGeodezyjny[];
  linie: LiniaGeodezyjna[];
  ukryteWarstwy: string[];
  archiwum?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DanePunktu = Pick<PunktGeodezyjny, 'nazwa' | 'warstwa' | 'odczyt' | 'rzedna' | 'komentarz'>;

export const BEZ_WARSTWY = '';
export const MAX_WYGIECIE = 0.75;

export const generujIdGeo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function nowySzkicGeodezyjny(nazwa: string, teraz = new Date(), id = generujIdGeo()): SzkicGeodezyjny {
  const iso = teraz.toISOString();
  return { id, nazwa, bokSiatki: 1, siatka: true, punkty: [], linie: [], ukryteWarstwy: [], createdAt: iso, updatedAt: iso };
}

const zmien = (s: SzkicGeodezyjny, zmiany: Partial<SzkicGeodezyjny>): SzkicGeodezyjny => ({ ...s, ...zmiany });

export function nastepnyNumer(s: SzkicGeodezyjny): number {
  return s.punkty.reduce((m, p) => Math.max(m, p.nr), 0) + 1;
}

/** Warstwy w kolejności pierwszego użycia (bez pustej). */
export function warstwySzkicu(s: SzkicGeodezyjny): string[] {
  const wynik: string[] = [];
  for (const p of [...s.punkty].sort((a, b) => a.nr - b.nr)) {
    const w = p.warstwa?.trim();
    if (w && !wynik.includes(w)) wynik.push(w);
  }
  return wynik;
}

export function punktWidoczny(s: SzkicGeodezyjny, p: PunktGeodezyjny): boolean {
  return !s.ukryteWarstwy.includes(p.warstwa?.trim() || BEZ_WARSTWY);
}

export function liniaWidoczna(s: SzkicGeodezyjny, l: LiniaGeodezyjna): boolean {
  const a = s.punkty.find((p) => p.id === l.a);
  const b = s.punkty.find((p) => p.id === l.b);
  return !!a && !!b && punktWidoczny(s, a) && punktWidoczny(s, b);
}

export function przelaczWarstwe(s: SzkicGeodezyjny, warstwa: string): SzkicGeodezyjny {
  const ukryte = s.ukryteWarstwy.includes(warstwa)
    ? s.ukryteWarstwy.filter((w) => w !== warstwa)
    : [...s.ukryteWarstwy, warstwa];
  return zmien(s, { ukryteWarstwy: ukryte });
}

function czyscDane(d: Partial<DanePunktu>): Partial<DanePunktu> {
  const wynik: Partial<DanePunktu> = { ...d };
  if (wynik.warstwa != null) wynik.warstwa = wynik.warstwa.trim() || undefined;
  if (wynik.komentarz != null) wynik.komentarz = wynik.komentarz.trim() || undefined;
  if (wynik.nazwa != null) wynik.nazwa = wynik.nazwa.trim();
  return wynik;
}

export function dodajPunkt(
  s: SzkicGeodezyjny,
  polozenie: Pkt,
  dane: Partial<DanePunktu> = {},
  id = generujIdGeo(),
): { szkic: SzkicGeodezyjny; punkt: PunktGeodezyjny } {
  const nr = nastepnyNumer(s);
  const d = czyscDane(dane);
  const punkt: PunktGeodezyjny = { id, nr, x: polozenie.x, y: polozenie.y, ...d, nazwa: d.nazwa || String(nr) };
  return { szkic: zmien(s, { punkty: [...s.punkty, punkt] }), punkt };
}

export function edytujPunkt(s: SzkicGeodezyjny, id: string, dane: Partial<PunktGeodezyjny>): SzkicGeodezyjny {
  const d = czyscDane(dane);
  return zmien(s, {
    punkty: s.punkty.map((p) => (p.id === id ? { ...p, ...d, nazwa: d.nazwa === '' ? String(p.nr) : (d.nazwa ?? p.nazwa) } : p)),
  });
}

/** Usuwa punkt, jego linie i punkty pośrednie leżące na tych liniach. */
export function usunPunkt(s: SzkicGeodezyjny, id: string): SzkicGeodezyjny {
  let punkty = s.punkty;
  let linie = s.linie;
  const doUsuniecia = [id];
  while (doUsuniecia.length > 0) {
    const pid = doUsuniecia.pop()!;
    const linieP = linie.filter((l) => l.a === pid || l.b === pid).map((l) => l.id);
    punkty = punkty.filter((p) => p.id !== pid);
    linie = linie.filter((l) => !linieP.includes(l.id));
    for (const p of punkty) if (p.naLinii && linieP.includes(p.naLinii.liniaId)) doUsuniecia.push(p.id);
  }
  return zmien(s, { punkty, linie });
}

export function usunLinie(s: SzkicGeodezyjny, liniaId: string): SzkicGeodezyjny {
  const posrednie = s.punkty.filter((p) => p.naLinii?.liniaId === liniaId).map((p) => p.id);
  let wynik = zmien(s, { linie: s.linie.filter((l) => l.id !== liniaId) });
  for (const pid of posrednie) wynik = usunPunkt(wynik, pid);
  return wynik;
}

export function liniaMiedzy(s: SzkicGeodezyjny, a: string, b: string): LiniaGeodezyjna | undefined {
  return s.linie.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
}

export function polacz(s: SzkicGeodezyjny, a: string, b: string, id = generujIdGeo()): { szkic: SzkicGeodezyjny; linia?: LiniaGeodezyjna } {
  if (a === b) return { szkic: s };
  const jest = liniaMiedzy(s, a, b);
  if (jest) return { szkic: s, linia: jest };
  const linia: LiniaGeodezyjna = { id, a, b, wygiecie: 0 };
  return { szkic: zmien(s, { linie: [...s.linie, linia] }), linia };
}

export function edytujLinie(s: SzkicGeodezyjny, id: string, zmiany: Partial<LiniaGeodezyjna>): SzkicGeodezyjny {
  return zmien(s, { linie: s.linie.map((l) => (l.id === id ? { ...l, ...zmiany } : l)) });
}

// ------------------------------------------------------------
// Geometria
// ------------------------------------------------------------

export interface GeometriaLinii {
  a: Pkt;
  b: Pkt;
  c: Pkt;
  /** Środek łuku (uchwyt wyginania). */
  m: Pkt;
  dlugosc: number;
}

export function pozycjaPunktu(s: SzkicGeodezyjny, id: string, glebokosc = 0): Pkt | null {
  const p = s.punkty.find((q) => q.id === id);
  if (!p) return null;
  if (!p.naLinii || glebokosc > 8) return { x: p.x, y: p.y };
  const l = s.linie.find((q) => q.id === p.naLinii!.liniaId);
  const g = l ? geometriaLinii(s, l, glebokosc + 1) : null;
  if (!g) return { x: p.x, y: p.y };
  return punktNaDlugosci(g.a, g.c, g.b, Math.min(p.naLinii.odleglosc, g.dlugosc));
}

export function geometriaLinii(s: SzkicGeodezyjny, l: LiniaGeodezyjna, glebokosc = 0): GeometriaLinii | null {
  const a = pozycjaPunktu(s, l.a, glebokosc);
  const b = pozycjaPunktu(s, l.b, glebokosc);
  if (!a || !b) return null;
  const c = kontrolnyLuku(a, b, l.wygiecie);
  return { a, b, c, m: punktKrzywej(a, c, b, 0.5), dlugosc: l.wygiecie ? dlugoscKrzywej(a, c, b) : odl(a, b) };
}

/** Ścieżka SVG linii w podanym przekształceniu punktów. */
export function sciezkaLinii(g: GeometriaLinii, f: (p: Pkt) => Pkt = (p) => p): string {
  const a = f(g.a);
  const b = f(g.b);
  if (g.c.x === srodek(g.a, g.b).x && g.c.y === srodek(g.a, g.b).y) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  const c = f(g.c);
  return `M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`;
}

/** Ustawia długość linii (wzdłuż łuku): przesuwa koniec B po prostej z A (albo A, gdy B jest pośredni). */
export function ustawDlugoscLinii(s: SzkicGeodezyjny, liniaId: string, dlugosc: number): SzkicGeodezyjny {
  const l = s.linie.find((q) => q.id === liniaId);
  if (!l || !(dlugosc > 0)) return s;
  const g = geometriaLinii(s, l);
  if (!g) return s;
  const pb = s.punkty.find((p) => p.id === l.b);
  const pa = s.punkty.find((p) => p.id === l.a);
  const ruchomyB = !pb?.naLinii;
  if (!ruchomyB && pa?.naLinii) return s;
  const [staly, ruchomy] = ruchomyB ? [g.a, g.b] : [g.b, g.a];
  const cieciwa = dlugosc / czynnikLuku(l.wygiecie);
  const L = odl(staly, ruchomy);
  const kier = L > 0 ? { x: (ruchomy.x - staly.x) / L, y: (ruchomy.y - staly.y) / L } : { x: 1, y: 0 };
  const nowy = { x: staly.x + kier.x * cieciwa, y: staly.y + kier.y * cieciwa };
  const id = ruchomyB ? l.b : l.a;
  return zmien(s, { punkty: s.punkty.map((p) => (p.id === id ? { ...p, x: nowy.x, y: nowy.y } : p)) });
}

export interface BlokadaOdleglosci {
  liniaId: string;
  dlugosc: number;
}

/**
 * Przesuwa punkt w miejsce palca. Z blokadą – punkt zostaje na okręgu o zadanej długości linii
 * wokół drugiego końca (kierunek wybiera palec). Punkt pośredni ślizga się po swojej linii.
 */
export function przesunPunkt(s: SzkicGeodezyjny, id: string, cel: Pkt, blokada?: BlokadaOdleglosci | null): SzkicGeodezyjny {
  const p = s.punkty.find((q) => q.id === id);
  if (!p) return s;
  if (p.naLinii) {
    const l = s.linie.find((q) => q.id === p.naLinii!.liniaId);
    const g = l ? geometriaLinii(s, l) : null;
    if (!g) return s;
    const { s: dl } = rzutNaKrzywa(g.a, g.c, g.b, cel);
    return zmien(s, { punkty: s.punkty.map((q) => (q.id === id ? { ...q, naLinii: { ...q.naLinii!, odleglosc: dl } } : q)) });
  }
  let nowy = cel;
  const l = blokada ? s.linie.find((q) => q.id === blokada.liniaId) : undefined;
  if (l && blokada && blokada.dlugosc > 0 && (l.a === id || l.b === id)) {
    const drugi = pozycjaPunktu(s, l.a === id ? l.b : l.a);
    if (drugi) {
      const r = blokada.dlugosc / czynnikLuku(l.wygiecie);
      const L = odl(drugi, cel);
      const k = L > 0 ? { x: (cel.x - drugi.x) / L, y: (cel.y - drugi.y) / L } : { x: 1, y: 0 };
      nowy = { x: drugi.x + k.x * r, y: drugi.y + k.y * r };
    }
  }
  return zmien(s, { punkty: s.punkty.map((q) => (q.id === id ? { ...q, x: nowy.x, y: nowy.y } : q)) });
}

/** Wygięcie z położenia uchwytu (środek łuku pod palcem). */
export function wygnijLinie(s: SzkicGeodezyjny, liniaId: string, m: Pkt): SzkicGeodezyjny {
  const l = s.linie.find((q) => q.id === liniaId);
  const g = l ? geometriaLinii(s, l) : null;
  if (!l || !g) return s;
  const L = odl(g.a, g.b);
  if (L === 0) return s;
  const sr = srodek(g.a, g.b);
  const nx = -(g.b.y - g.a.y) / L;
  const ny = (g.b.x - g.a.x) / L;
  let w = ((m.x - sr.x) * nx + (m.y - sr.y) * ny) / L;
  if (Math.abs(w) < 0.015) w = 0;
  w = Math.max(-MAX_WYGIECIE, Math.min(MAX_WYGIECIE, w));
  return edytujLinie(s, liniaId, { wygiecie: w });
}

// ------------------------------------------------------------
// Wysokości, spadki, cel
// ------------------------------------------------------------

export type Uklad = 'rzedna' | 'odczyt';

export interface WysokoscPunktu {
  /** Wysokość względna w metrach – rzędna albo −odczyt/1000 (porównywalne tylko w tym samym układzie). */
  h: number;
  uklad: Uklad;
  odczyt?: number;
  rzedna?: number;
  /** Wartość wyliczona (z horyzontu albo interpolacji na linii), a nie wpisana. */
  wyliczona: boolean;
}

/** Horyzont instrumentu [m] = rzędna + odczyt z pierwszego punktu, który ma obie wartości. */
export function horyzontInstrumentu(s: SzkicGeodezyjny): number | null {
  const p = [...s.punkty].sort((a, b) => a.nr - b.nr).find((q) => q.odczyt != null && q.rzedna != null);
  return p ? p.rzedna! + p.odczyt! / 1000 : null;
}

function zH(h: number, uklad: Uklad, hi: number | null, wyliczona: boolean): WysokoscPunktu {
  if (uklad === 'rzedna') {
    return { h, uklad, rzedna: h, odczyt: hi != null ? Math.round((hi - h) * 1000) : undefined, wyliczona };
  }
  return { h, uklad, odczyt: Math.round(-h * 1000), wyliczona };
}

export function wysokoscPunktu(s: SzkicGeodezyjny, id: string, glebokosc = 0): WysokoscPunktu | null {
  const p = s.punkty.find((q) => q.id === id);
  if (!p) return null;
  const hi = horyzontInstrumentu(s);
  if (p.rzedna != null) {
    return { h: p.rzedna, uklad: 'rzedna', rzedna: p.rzedna, odczyt: p.odczyt ?? (hi != null ? Math.round((hi - p.rzedna) * 1000) : undefined), wyliczona: false };
  }
  if (p.odczyt != null) {
    if (hi != null) return { h: hi - p.odczyt / 1000, uklad: 'rzedna', rzedna: hi - p.odczyt / 1000, odczyt: p.odczyt, wyliczona: false };
    return { h: -p.odczyt / 1000, uklad: 'odczyt', odczyt: p.odczyt, wyliczona: false };
  }
  if (!p.naLinii || glebokosc > 8) return null;
  const l = s.linie.find((q) => q.id === p.naLinii!.liniaId);
  if (!l) return null;
  const ha = wysokoscPunktu(s, l.a, glebokosc + 1);
  const hb = wysokoscPunktu(s, l.b, glebokosc + 1);
  const g = geometriaLinii(s, l);
  if (!ha || !hb || !g || ha.uklad !== hb.uklad || g.dlugosc === 0) return null;
  const k = Math.min(p.naLinii.odleglosc, g.dlugosc) / g.dlugosc;
  return zH(ha.h + (hb.h - ha.h) * k, ha.uklad, hi, true);
}

/** Czy wartości punktu są wyliczone (rzędna z horyzontu, odczyt z rzędnej albo interpolacja). */
export function polaWyliczone(s: SzkicGeodezyjny, id: string): { odczyt: boolean; rzedna: boolean } {
  const p = s.punkty.find((q) => q.id === id);
  const w = wysokoscPunktu(s, id);
  return { odczyt: !!w && w.odczyt != null && p?.odczyt == null, rzedna: !!w && w.rzedna != null && p?.rzedna == null };
}

export interface AnalizaLinii {
  dlugosc: number;
  /** hB − hA [m]. */
  roznica: number | null;
  /** Spadek [%] (wartość bezwzględna). */
  spadek: number | null;
  /** Koniec, w stronę którego teren opada. */
  wDol: 'a' | 'b' | null;
}

export function analizaLinii(s: SzkicGeodezyjny, l: LiniaGeodezyjna): AnalizaLinii | null {
  const g = geometriaLinii(s, l);
  if (!g) return null;
  const ha = wysokoscPunktu(s, l.a);
  const hb = wysokoscPunktu(s, l.b);
  if (!ha || !hb || ha.uklad !== hb.uklad) return { dlugosc: g.dlugosc, roznica: null, spadek: null, wDol: null };
  const roznica = hb.h - ha.h;
  const spadek = g.dlugosc > 0 ? (Math.abs(roznica) / g.dlugosc) * 100 : null;
  const wDol = Math.abs(roznica) < 1e-9 ? null : roznica < 0 ? 'b' : 'a';
  return { dlugosc: g.dlugosc, roznica, spadek, wDol };
}

export interface WartoscCelu {
  punktId: string;
  liniaId: string;
  h: number;
  uklad: Uklad;
  odczyt?: number;
  rzedna?: number;
  /** Cel − stan obecny [m] (ujemne = obniżyć). */
  roznica?: number;
}

/** Wysokość docelowa w odległości `x` (wzdłuż linii od A): przez kotwicę, opadająca od końca `od`. */
function hCelu(s: SzkicGeodezyjny, l: LiniaGeodezyjna, cel: CelSpadku, x: number): { h: number; uklad: Uklad } | null {
  const g = geometriaLinii(s, l);
  const k = kotwicaCelu(cel);
  const kotwica = wysokoscPunktu(s, k === 'a' ? l.a : l.b);
  if (!g || !kotwica) return null;
  const xK = k === 'a' ? 0 : g.dlugosc;
  const znak = cel.od === 'a' ? 1 : -1;
  return { h: kotwica.h - (znak * (x - xK) * cel.spadek) / 100, uklad: kotwica.uklad };
}

function wartoscCelu(s: SzkicGeodezyjny, l: LiniaGeodezyjna, cel: CelSpadku, punktId: string, x: number): WartoscCelu | null {
  const c = hCelu(s, l, cel, x);
  if (!c) return null;
  const w = zH(c.h, c.uklad, horyzontInstrumentu(s), true);
  const teraz = wysokoscPunktu(s, punktId);
  return {
    punktId,
    liniaId: l.id,
    h: c.h,
    uklad: c.uklad,
    odczyt: w.odczyt,
    rzedna: w.rzedna,
    roznica: teraz && teraz.uklad === c.uklad && !teraz.wyliczona ? c.h - teraz.h : undefined,
  };
}

/** Cele dla punktu: z linii, w których punkt jest końcem przeciwnym do kotwicy, i własny cel punktu pośredniego. */
export function celeDlaPunktu(s: SzkicGeodezyjny, id: string): WartoscCelu[] {
  const wynik: WartoscCelu[] = [];
  const p = s.punkty.find((q) => q.id === id);
  if (!p) return wynik;
  for (const l of s.linie) {
    if (!l.cel) continue;
    const g = geometriaLinii(s, l);
    if (!g) continue;
    const k = kotwicaCelu(l.cel);
    if (k === 'a' && l.b === id) {
      const w = wartoscCelu(s, l, l.cel, id, g.dlugosc);
      if (w) wynik.push(w);
    } else if (k === 'b' && l.a === id) {
      const w = wartoscCelu(s, l, l.cel, id, 0);
      if (w) wynik.push(w);
    }
  }
  if (p.naLinii) {
    const l = s.linie.find((q) => q.id === p.naLinii!.liniaId);
    const cel = p.cel ?? l?.cel;
    if (l && cel) {
      const w = wartoscCelu(s, l, cel, id, p.naLinii.odleglosc);
      if (w) wynik.push(w);
    }
  }
  return wynik;
}

/**
 * Punkt pośredni na linii między `od` i `do` w odległości `odleglosc` od punktu `od`.
 * Gdy linii nie ma – zostaje utworzona. Punkt dziedziczy warstwę i cel linii.
 */
export function dodajPunktPosredni(
  s: SzkicGeodezyjny,
  od: string,
  doPunktu: string,
  odleglosc: number,
  dane: Partial<DanePunktu> = {},
): { szkic: SzkicGeodezyjny; punkt?: PunktGeodezyjny } {
  const { szkic: zLinia, linia } = polacz(s, od, doPunktu);
  if (!linia) return { szkic: s };
  const g = geometriaLinii(zLinia, linia);
  if (!g) return { szkic: s };
  const zA = Math.max(0, Math.min(g.dlugosc, linia.a === od ? odleglosc : g.dlugosc - odleglosc));
  const pozycja = punktNaDlugosci(g.a, g.c, g.b, zA);
  const warstwa = dane.warstwa ?? zLinia.punkty.find((p) => p.id === od)?.warstwa;
  const { szkic, punkt } = dodajPunkt(zLinia, pozycja, { ...dane, warstwa });
  const zPolozeniem = { ...punkt, naLinii: { liniaId: linia.id, odleglosc: zA } };
  return { szkic: zmien(szkic, { punkty: szkic.punkty.map((p) => (p.id === punkt.id ? zPolozeniem : p)) }), punkt: zPolozeniem };
}

/** Odległość punktu pośredniego od wskazanego końca jego linii. */
export function odlegloscPosredniegoOd(s: SzkicGeodezyjny, punktId: string, odPunktu: string): number | null {
  const p = s.punkty.find((q) => q.id === punktId);
  const l = p?.naLinii ? s.linie.find((q) => q.id === p.naLinii!.liniaId) : undefined;
  const g = l ? geometriaLinii(s, l) : null;
  if (!p?.naLinii || !l || !g) return null;
  return l.a === odPunktu ? p.naLinii.odleglosc : g.dlugosc - p.naLinii.odleglosc;
}

export function zakresSzkicu(s: SzkicGeodezyjny): Pkt[] {
  const pts: Pkt[] = [];
  for (const p of s.punkty) {
    const q = pozycjaPunktu(s, p.id);
    if (q) pts.push(q);
  }
  for (const l of s.linie) {
    const g = geometriaLinii(s, l);
    if (g) pts.push(g.m);
  }
  return pts;
}

export function nazwaPunktu(s: SzkicGeodezyjny, id: string): string {
  return s.punkty.find((p) => p.id === id)?.nazwa ?? '?';
}
