// Przekrój poprzeczny drogi – kreator szczegółu z elementów (od lewej do prawej) i szablon do pomiarów łatą.
// Wymiary elementów w cm, wysokości względne w cm (dodatnie w górę), spadki pasów w % (dodatni = opada w prawo).

import { generujIdGeo } from './szkic';

export type KsztaltElementu =
  | 'kraweznik'
  | 'kraweznik_najazdowy'
  | 'kraweznik_trapezowy'
  | 'obrzeze'
  | 'opornik'
  | 'korytko_sciekowe'
  | 'korytko_muldowe'
  | 'kostka_betonowa'
  | 'kostka_kamienna'
  | 'asfalt';

export type TypElementu = 'blok' | 'pas';

export interface WzorElementu {
  id: string;
  nazwa: string;
  ksztalt: KsztaltElementu;
  typ: TypElementu;
  /** Szerokość [cm]. */
  szer: number;
  /** Wysokość / grubość [cm]. */
  wys: number;
  spadek?: number;
  podbudowa?: number;
  lawa?: boolean;
}

export const KATALOG_ELEMENTOW: WzorElementu[] = [
  { id: 'kr-20x30', nazwa: 'Krawężnik 20×30', ksztalt: 'kraweznik', typ: 'blok', szer: 20, wys: 30, lawa: true },
  { id: 'kr-15x30', nazwa: 'Krawężnik 15×30', ksztalt: 'kraweznik', typ: 'blok', szer: 15, wys: 30, lawa: true },
  { id: 'krn-20x22', nazwa: 'Krawężnik najazdowy 20×22', ksztalt: 'kraweznik_najazdowy', typ: 'blok', szer: 20, wys: 22, lawa: true },
  { id: 'krn-15x22', nazwa: 'Krawężnik najazdowy 15×22', ksztalt: 'kraweznik_najazdowy', typ: 'blok', szer: 15, wys: 22, lawa: true },
  { id: 'krt-lezacy', nazwa: 'Krawężnik trapezowy leżący', ksztalt: 'kraweznik_trapezowy', typ: 'blok', szer: 22, wys: 15, lawa: true },
  { id: 'ob-8x30', nazwa: 'Obrzeże 8×30', ksztalt: 'obrzeze', typ: 'blok', szer: 8, wys: 30, lawa: true },
  { id: 'ob-6x20', nazwa: 'Obrzeże 6×20', ksztalt: 'obrzeze', typ: 'blok', szer: 6, wys: 20, lawa: true },
  { id: 'op-12x25', nazwa: 'Opornik 12×25', ksztalt: 'opornik', typ: 'blok', szer: 12, wys: 25, lawa: true },
  { id: 'ko-sciekowe', nazwa: 'Korytko ściekowe', ksztalt: 'korytko_sciekowe', typ: 'blok', szer: 50, wys: 15, lawa: true },
  { id: 'ko-muldowe', nazwa: 'Korytko muldowe', ksztalt: 'korytko_muldowe', typ: 'blok', szer: 60, wys: 15, lawa: true },
  { id: 'kb-8', nazwa: 'Kostka betonowa 8 cm', ksztalt: 'kostka_betonowa', typ: 'pas', szer: 150, wys: 8, spadek: 2, podbudowa: 15 },
  { id: 'kb-6', nazwa: 'Kostka betonowa 6 cm', ksztalt: 'kostka_betonowa', typ: 'pas', szer: 150, wys: 6, spadek: 2, podbudowa: 15 },
  { id: 'kk-8-11', nazwa: 'Kostka kamienna 8/11', ksztalt: 'kostka_kamienna', typ: 'pas', szer: 150, wys: 11, spadek: 2, podbudowa: 15 },
  { id: 'kk-15-17', nazwa: 'Kostka kamienna 15/17', ksztalt: 'kostka_kamienna', typ: 'pas', szer: 300, wys: 17, spadek: 2, podbudowa: 20 },
  { id: 'asfalt', nazwa: 'Jezdnia – nawierzchnia bitumiczna', ksztalt: 'asfalt', typ: 'pas', szer: 300, wys: 9, spadek: 2, podbudowa: 20 },
];

export interface ElementPrzekroju {
  id: string;
  wzor: string;
  nazwa: string;
  ksztalt: KsztaltElementu;
  typ: TypElementu;
  szer: number;
  wys: number;
  /** Różnica wysokości lewej góry elementu względem prawej góry poprzedniego [cm]. */
  skok: number;
  spadek?: number;
  podbudowa?: number;
  lawa?: boolean;
  /** Lustrzane odbicie (np. skos krawężnika w lewo). */
  odwroc?: boolean;
}

export interface PomiarPrzekroju {
  /** Punkt, w którym wpisano odczyt / rzędną. */
  klucz: string;
  odczyt?: number;
  rzedna?: number;
}

export interface PrzekrojPoprzeczny {
  id: string;
  nazwa: string;
  opis?: string;
  elementy: ElementPrzekroju[];
  /** Punkt „0” opisów wysokości (domyślnie ostatni punkt). */
  zero?: string;
  pomiar?: PomiarPrzekroju;
  /** Szerokie pasy rysowane skrócone (z przerwaniem). */
  skrocone: boolean;
  archiwum?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function nowyPrzekroj(nazwa: string, teraz = new Date(), id = generujIdGeo()): PrzekrojPoprzeczny {
  const iso = teraz.toISOString();
  return { id, nazwa, elementy: [], skrocone: true, createdAt: iso, updatedAt: iso };
}

// ------------------------------------------------------------
// Kształty (współrzędne znormalizowane: u 0…1 w prawo, v 0…1 w dół od góry elementu)
// ------------------------------------------------------------

export type Komenda = ['M', number, number] | ['L', number, number] | ['Q', number, number, number, number] | ['Z'];

interface OpisKsztaltu {
  obrys: Komenda[];
  /** Miejsce przyłożenia łaty (u) i zagłębienie powierzchni w tym miejscu (v). */
  pomiarU: number;
  pomiarV: number;
  /** Typowe wystawienie ponad sąsiedni pas [cm] – domyślny skok przy dodawaniu. */
  wystawienie: number;
}

const prostokat: Komenda[] = [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']];

export const KSZTALTY: Record<KsztaltElementu, OpisKsztaltu> = {
  kraweznik: {
    obrys: [['M', 0, 0], ['L', 0.82, 0], ['Q', 1, 0, 1, 0.1], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.4, pomiarV: 0, wystawienie: 12,
  },
  kraweznik_najazdowy: {
    obrys: [['M', 0, 0], ['L', 0.45, 0], ['L', 1, 0.5], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.22, pomiarV: 0, wystawienie: 4,
  },
  kraweznik_trapezowy: {
    obrys: [['M', 0, 0.55], ['L', 0.3, 0], ['L', 0.7, 0], ['L', 1, 0.55], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, pomiarV: 0, wystawienie: 3,
  },
  obrzeze: {
    obrys: [['M', 0, 1], ['L', 0, 0.12], ['Q', 0, 0, 0.5, 0], ['Q', 1, 0, 1, 0.12], ['L', 1, 1], ['Z']],
    pomiarU: 0.5, pomiarV: 0, wystawienie: 2,
  },
  opornik: {
    obrys: [['M', 0, 1], ['L', 0, 0.08], ['L', 0.12, 0], ['L', 0.88, 0], ['L', 1, 0.08], ['L', 1, 1], ['Z']],
    pomiarU: 0.5, pomiarV: 0, wystawienie: 0,
  },
  korytko_sciekowe: {
    obrys: [['M', 0, 0], ['L', 0.3, 0], ['L', 0.44, 0.2], ['L', 0.56, 0.2], ['L', 0.7, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, pomiarV: 0.2, wystawienie: 0,
  },
  korytko_muldowe: {
    obrys: [['M', 0, 0], ['L', 0.08, 0], ['Q', 0.5, 0.6, 0.92, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, pomiarV: 0.3, wystawienie: 0,
  },
  kostka_betonowa: { obrys: prostokat, pomiarU: 0, pomiarV: 0, wystawienie: 0 },
  kostka_kamienna: { obrys: prostokat, pomiarU: 0, pomiarV: 0, wystawienie: 0 },
  asfalt: { obrys: prostokat, pomiarU: 0, pomiarV: 0, wystawienie: 0 },
};

/** Moduł spoin kostki [cm]. */
export function modulKostki(e: Pick<ElementPrzekroju, 'ksztalt' | 'wys'>): number | null {
  if (e.ksztalt === 'kostka_betonowa') return 20;
  if (e.ksztalt === 'kostka_kamienna') return e.wys >= 15 ? 16 : 10;
  return null;
}

/** Skok przy dodaniu: krawężnik za pasem wystaje ponad niego, pas za krawężnikiem schodzi w dół. */
export function domyslnySkok(poprzedni: ElementPrzekroju | undefined, wzor: WzorElementu): number {
  if (!poprzedni) return 0;
  if (wzor.typ === 'blok' && poprzedni.typ === 'pas') return KSZTALTY[wzor.ksztalt].wystawienie;
  if (wzor.typ === 'pas' && poprzedni.typ === 'blok') return -KSZTALTY[poprzedni.ksztalt].wystawienie;
  return 0;
}

export function elementZWzoru(wzor: WzorElementu, poprzedni?: ElementPrzekroju, id = generujIdGeo()): ElementPrzekroju {
  return {
    id,
    wzor: wzor.id,
    nazwa: wzor.nazwa,
    ksztalt: wzor.ksztalt,
    typ: wzor.typ,
    szer: wzor.szer,
    wys: wzor.wys,
    skok: domyslnySkok(poprzedni, wzor),
    spadek: wzor.spadek,
    podbudowa: wzor.podbudowa,
    lawa: wzor.lawa,
  };
}

export function dodajElement(p: PrzekrojPoprzeczny, wzor: WzorElementu, poIndeksie = p.elementy.length - 1): PrzekrojPoprzeczny {
  const e = elementZWzoru(wzor, p.elementy[poIndeksie]);
  const elementy = [...p.elementy];
  elementy.splice(poIndeksie + 1, 0, e);
  return { ...p, elementy };
}

export function edytujElement(p: PrzekrojPoprzeczny, id: string, zmiany: Partial<ElementPrzekroju>): PrzekrojPoprzeczny {
  return { ...p, elementy: p.elementy.map((e) => (e.id === id ? { ...e, ...zmiany } : e)) };
}

export function usunElement(p: PrzekrojPoprzeczny, id: string): PrzekrojPoprzeczny {
  const elementy = p.elementy.filter((e) => e.id !== id);
  const czyste = (k?: string) => (k && !k.startsWith(`${id}:`) ? k : undefined);
  const pomiar = p.pomiar && czyste(p.pomiar.klucz) ? p.pomiar : undefined;
  return { ...p, elementy, zero: czyste(p.zero), pomiar };
}

export function przesunElement(p: PrzekrojPoprzeczny, id: string, o: -1 | 1): PrzekrojPoprzeczny {
  const i = p.elementy.findIndex((e) => e.id === id);
  const j = i + o;
  if (i < 0 || j < 0 || j >= p.elementy.length) return p;
  const elementy = [...p.elementy];
  [elementy[i], elementy[j]] = [elementy[j], elementy[i]];
  return { ...p, elementy };
}

// ------------------------------------------------------------
// Układ: położenie elementów, wysokości, punkty pomiarowe
// ------------------------------------------------------------

export interface PunktPomiarowy {
  klucz: string;
  elementId: string;
  nazwa: string;
  /** Odległość od lewej krawędzi przekroju [cm]. */
  x: number;
  /** Wysokość projektowa względem lewej góry pierwszego elementu [cm]. */
  h: number;
}

export interface UlozonyElement {
  element: ElementPrzekroju;
  indeks: number;
  /** Rzeczywiste położenie [cm]. */
  x0: number;
  x1: number;
  /** Wysokość lewej / prawej góry [cm]. */
  hL: number;
  hP: number;
  /** Położenie na rysunku (szerokie pasy skrócone) [cm]. */
  rx0: number;
  rx1: number;
  skrocony: boolean;
  punkty: PunktPomiarowy[];
}

export const SZEROKOSC_SKROCONA = 120;

export function ulozPrzekroj(p: PrzekrojPoprzeczny): UlozonyElement[] {
  const wynik: UlozonyElement[] = [];
  let x = 0;
  let rx = 0;
  let h = 0;
  p.elementy.forEach((e, indeks) => {
    const hL = indeks === 0 ? 0 : h + e.skok;
    const hP = e.typ === 'pas' ? hL - (e.szer * (e.spadek ?? 0)) / 100 : hL;
    const skrocony = p.skrocone && e.typ === 'pas' && e.szer > SZEROKOSC_SKROCONA;
    const rw = skrocony ? SZEROKOSC_SKROCONA : e.szer;
    const nr = indeks + 1;
    const punkty: PunktPomiarowy[] = [];
    if (e.typ === 'pas') {
      punkty.push({ klucz: `${e.id}:l`, elementId: e.id, nazwa: `${nr}. ${e.nazwa} – lewa`, x, h: hL });
      punkty.push({ klucz: `${e.id}:p`, elementId: e.id, nazwa: `${nr}. ${e.nazwa} – prawa`, x: x + e.szer, h: hP });
    } else {
      const k = KSZTALTY[e.ksztalt];
      const u = e.odwroc ? 1 - k.pomiarU : k.pomiarU;
      punkty.push({ klucz: `${e.id}:s`, elementId: e.id, nazwa: `${nr}. ${e.nazwa}`, x: x + u * e.szer, h: hL - k.pomiarV * e.wys });
    }
    wynik.push({ element: e, indeks, x0: x, x1: x + e.szer, hL, hP, rx0: rx, rx1: rx + rw, skrocony, punkty });
    x += e.szer;
    rx += rw;
    h = hP;
  });
  return wynik;
}

export function punktyPomiarowe(p: PrzekrojPoprzeczny): PunktPomiarowy[] {
  return ulozPrzekroj(p).flatMap((u) => u.punkty);
}

export function szerokoscPrzekroju(p: PrzekrojPoprzeczny): number {
  return p.elementy.reduce((s, e) => s + e.szer, 0);
}

export function kluczZera(p: PrzekrojPoprzeczny): string | undefined {
  const pkt = punktyPomiarowe(p);
  return pkt.find((q) => q.klucz === p.zero)?.klucz ?? pkt[pkt.length - 1]?.klucz;
}

export interface WynikPunktu extends PunktPomiarowy {
  /** Wysokość względem punktu „0” [cm]. */
  wzgledem0: number;
  odczyt?: number;
  rzedna?: number;
  /** Punkt, w którym wpisano pomiar. */
  wpisany: boolean;
}

/** Odczyty [mm] i rzędne [m] wszystkich punktów z jednego wpisanego pomiaru (wyżej = mniejszy odczyt). */
export function przeliczPomiar(p: PrzekrojPoprzeczny): WynikPunktu[] {
  const pkt = punktyPomiarowe(p);
  const zero = pkt.find((q) => q.klucz === kluczZera(p));
  const ref = p.pomiar ? pkt.find((q) => q.klucz === p.pomiar!.klucz) : undefined;
  return pkt.map((q) => {
    const wynik: WynikPunktu = { ...q, wzgledem0: zero ? q.h - zero.h : q.h, wpisany: !!ref && ref.klucz === q.klucz };
    if (ref && p.pomiar) {
      const dh = q.h - ref.h;
      if (p.pomiar.odczyt != null) wynik.odczyt = Math.round(p.pomiar.odczyt - dh * 10);
      if (p.pomiar.rzedna != null) wynik.rzedna = p.pomiar.rzedna + dh / 100;
    }
    return wynik;
  });
}
