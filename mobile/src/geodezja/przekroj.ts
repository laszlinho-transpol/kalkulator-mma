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
  { id: 'asfalt', nazwa: 'Jezdnia – konstrukcja', ksztalt: 'asfalt', typ: 'pas', szer: 300, wys: 29, spadek: 2 },
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
  /** Grubość ławy [cm] (domyślnie 15). */
  lawaGrubosc?: number;
  /** Szerokość ławy [cm] (domyślnie szerokość elementu). */
  lawaSzer?: number;
  /** Opór betonowy na ławie z boku elementu. */
  opor?: OporElementu;
  /** Lustrzane odbicie (np. skos krawężnika w lewo). */
  odwroc?: boolean;
  /** Warstwy konstrukcji jezdni od góry (z podbudową); suma grubości = `wys`. */
  warstwy?: WarstwaNawierzchni[];
  /** Strony, po których działają odsadzki i skosy warstw. */
  strony?: StronyWarstw;
  /** Zagłębienie korytka / muldy względem krawędzi [cm]. */
  zaglebienie?: number;
  /** Zapis 1.8.52 – zamieniane przez `normalizujElement`. */
  krawedzL?: number;
  krawedzP?: number;
}

export interface OporElementu {
  strona: 'l' | 'p';
  /** Szerokość u podstawy [cm]. */
  szer: number;
  /** Odległość góry oporu od góry elementu [cm]. */
  odGory: number;
}

export type StronyWarstw = 'obie' | 'lewa' | 'prawa' | 'brak';

export type WypelnienieWarstwy =
  | 'asfalt' | 'asfalt_jasny' | 'kruszywo' | 'kropki' | 'kreski' | 'ukosne' | 'ukosne_odwrotne'
  | 'kratka' | 'kratka_ukosna' | 'beton' | 'grunt' | 'biale';

export interface WarstwaNawierzchni {
  id: string;
  nazwa: string;
  /** Grubość [cm]. */
  grubosc: number;
  /** Dodatkowa szerokość za skosem warstwy wyżej [cm] (po każdej stronie z `strony`). */
  odsadzka?: number;
  /** Skos krawędzi 1:n (n cm w poziomie na 1 cm grubości); 0 = pionowo. */
  skos?: number;
  wypelnienie?: WypelnienieWarstwy;
  /** Zapis 1.8.52 – pomijany. */
  szer?: number;
}

export const NAZWY_WARSTW_KONSTRUKCJI = [
  'Warstwa ścieralna', 'Warstwa wiążąca', 'Podbudowa zasadnicza', 'Podbudowa pomocnicza', 'Warstwa mrozoochronna', 'Warstwa odsączająca',
];

/** Nowa warstwa pod istniejącymi – pierwsza nieużyta typowa nazwa, wypełnienie dobierane z nazwy. */
export function nowaWarstwa(warstwy: WarstwaNawierzchni[], id = generujIdGeo()): WarstwaNawierzchni {
  const nazwa = NAZWY_WARSTW_KONSTRUKCJI.find((n) => !warstwy.some((w) => w.nazwa === n)) ?? `Warstwa ${warstwy.length + 1}`;
  return { id, nazwa, grubosc: warstwy.length >= 2 ? 15 : 5 };
}

export function domyslneWarstwy(): WarstwaNawierzchni[] {
  return [
    { id: generujIdGeo(), nazwa: 'Warstwa ścieralna', grubosc: 4, wypelnienie: 'asfalt' },
    { id: generujIdGeo(), nazwa: 'Warstwa wiążąca', grubosc: 5, wypelnienie: 'asfalt_jasny' },
    { id: generujIdGeo(), nazwa: 'Podbudowa', grubosc: 20, wypelnienie: 'kruszywo' },
  ];
}

/** Wypełnienie warstwy: wybrane albo domyślne z nazwy (bitumiczne ciemne, podbudowa z kruszywa w kropki). */
export function wypelnienieWarstwy(w: WarstwaNawierzchni, indeks: number): WypelnienieWarstwy {
  if (w.wypelnienie) return w.wypelnienie;
  if (/bitum|asfalt|ście|wiąż|sma|ac\d/i.test(w.nazwa)) return indeks % 2 ? 'asfalt_jasny' : 'asfalt';
  if (/podbud|kruszyw|tłucz|stabiliz/i.test(w.nazwa)) return 'kruszywo';
  if (/grunt|piasek|mrozo|odsącz/i.test(w.nazwa)) return 'grunt';
  if (/beton/i.test(w.nazwa)) return 'beton';
  return indeks % 2 ? 'asfalt_jasny' : 'asfalt';
}

/** Warstwy jezdni (stary zapis bez warstw = jedna warstwa o grubości elementu). */
export function warstwyElementu(e: Pick<ElementPrzekroju, 'ksztalt' | 'wys' | 'warstwy'>): WarstwaNawierzchni[] {
  if (e.ksztalt !== 'asfalt') return [];
  return e.warstwy?.length ? e.warstwy : [{ id: 'calosc', nazwa: '', grubosc: e.wys }];
}

/** Zmiana warstw z przeliczeniem grubości elementu. */
export function zWarstwami(warstwy: WarstwaNawierzchni[]): Pick<ElementPrzekroju, 'warstwy' | 'wys'> {
  return { warstwy, wys: Math.max(0.1, warstwy.reduce((s, w) => s + (w.grubosc > 0 ? w.grubosc : 0), 0)) };
}

export function przesunWarstwe(warstwy: WarstwaNawierzchni[], id: string, o: -1 | 1): WarstwaNawierzchni[] {
  const i = warstwy.findIndex((w) => w.id === id);
  const j = i + o;
  if (i < 0 || j < 0 || j >= warstwy.length) return warstwy;
  const nowe = [...warstwy];
  [nowe[i], nowe[j]] = [nowe[j], nowe[i]];
  return nowe;
}

export interface GeometriaWarstwy {
  warstwa: WarstwaNawierzchni;
  wypelnienie: WypelnienieWarstwy;
  /** Głębokość górnej krawędzi pod powierzchnią [cm]. */
  gora: number;
  /** Wysunięcie poza lewą / prawą krawędź elementu u góry i u dołu warstwy [cm]. */
  lGora: number;
  pGora: number;
  lDol: number;
  pDol: number;
  /** Szerokość u góry i u dołu [cm]. */
  szerGora: number;
  szerDol: number;
}

/** Każda warstwa zaczyna się od dołu warstwy wyżej + odsadzka, a jej krawędź schodzi skosem 1:n. */
export function geometriaWarstw(e: ElementPrzekroju): GeometriaWarstwy[] {
  const strony = e.strony ?? 'obie';
  const naL = strony === 'obie' || strony === 'lewa' ? 1 : 0;
  const naP = strony === 'obie' || strony === 'prawa' ? 1 : 0;
  const wynik: GeometriaWarstwy[] = [];
  let gora = 0;
  let l = 0;
  let p = 0;
  warstwyElementu(e).forEach((w, i) => {
    const g = Math.max(0, w.grubosc);
    const ods = Math.max(0, w.odsadzka ?? 0);
    const n = Math.max(0, w.skos ?? 0);
    const lGora = l + ods * naL;
    const pGora = p + ods * naP;
    const lDol = lGora + n * g * naL;
    const pDol = pGora + n * g * naP;
    wynik.push({
      warstwa: w, wypelnienie: wypelnienieWarstwy(w, i), gora, lGora, pGora, lDol, pDol,
      szerGora: e.szer + lGora + pGora, szerDol: e.szer + lDol + pDol,
    });
    gora += g;
    l = lDol;
    p = pDol;
  });
  return wynik;
}

export const NAZWA_JEZDNI = 'Jezdnia – konstrukcja';

/** Ujednolicenie starszych zapisów (1.8.51–1.8.52): podbudowa jezdni jako warstwa, skos krawędzi w warstwach. */
export function normalizujElement(e: ElementPrzekroju): ElementPrzekroju {
  if (e.ksztalt !== 'asfalt') return e;
  let n: ElementPrzekroju = { ...e };
  if (n.nazwa === 'Jezdnia – nawierzchnia bitumiczna') n.nazwa = NAZWA_JEZDNI;
  let warstwy = (n.warstwy?.length ? n.warstwy : [{ id: generujIdGeo(), nazwa: 'Nawierzchnia', grubosc: n.wys, wypelnienie: 'asfalt' as const }])
    .map(({ szer: _szer, ...w }) => w);
  if (n.krawedzL != null || n.krawedzP != null) {
    const kL = n.krawedzL ?? 0;
    const kP = n.krawedzP ?? 0;
    const skos = Math.max(kL, kP);
    if (skos > 0) warstwy = warstwy.map((w) => ({ ...w, skos: w.skos ?? skos }));
    n.strony = kL > 0 && kP > 0 ? 'obie' : kL > 0 ? 'lewa' : kP > 0 ? 'prawa' : n.strony;
    delete n.krawedzL;
    delete n.krawedzP;
  }
  if (n.podbudowa && n.podbudowa > 0) {
    warstwy = [...warstwy, { id: generujIdGeo(), nazwa: 'Podbudowa', grubosc: n.podbudowa, wypelnienie: 'kruszywo' }];
    n.podbudowa = undefined;
  }
  n = { ...n, ...zWarstwami(warstwy) };
  return n;
}

export function normalizujPrzekroj(p: PrzekrojPoprzeczny): PrzekrojPoprzeczny {
  const potrzeba = p.elementy.some((e) => e.ksztalt === 'asfalt'
    && (!e.warstwy?.length || e.podbudowa || e.krawedzL != null || e.krawedzP != null || e.nazwa === 'Jezdnia – nawierzchnia bitumiczna'
      || e.warstwy.some((w) => w.szer != null)));
  return potrzeba ? { ...p, elementy: p.elementy.map(normalizujElement) } : p;
}

export const GRUBOSC_LAWY = 15;

export function gruboscLawy(e: Pick<ElementPrzekroju, 'lawa' | 'lawaGrubosc'>): number {
  return e.lawa ? (e.lawaGrubosc && e.lawaGrubosc > 0 ? e.lawaGrubosc : GRUBOSC_LAWY) : 0;
}

/** Opór stoi na ławie – bez ławy nie jest rysowany. */
export function oporElementu(e: Pick<ElementPrzekroju, 'typ' | 'lawa' | 'opor'>): OporElementu | undefined {
  return e.typ === 'blok' && e.lawa && e.opor && e.opor.szer > 0 ? e.opor : undefined;
}

/** Domyślny opór: po stronie tylnej elementu (krawężnik ma zaokrąglenie od strony jezdni – z prawej). */
export function domyslnyOpor(e: Pick<ElementPrzekroju, 'odwroc' | 'wys'>, strona?: 'l' | 'p'): OporElementu {
  return { strona: strona ?? (e.odwroc ? 'p' : 'l'), szer: 10, odGory: Math.min(10, Math.round(e.wys / 3)) };
}

const ZAGLEBIENIE_KORYTKA: Partial<Record<KsztaltElementu, number>> = { korytko_sciekowe: 0.2, korytko_muldowe: 0.3 };

export function maZaglebienie(e: Pick<ElementPrzekroju, 'ksztalt'>): boolean {
  return ZAGLEBIENIE_KORYTKA[e.ksztalt] != null;
}

/** Zagłębienie korytka / muldy [cm] (0 dla pozostałych elementów). */
export function zaglebienieElementu(e: Pick<ElementPrzekroju, 'ksztalt' | 'wys' | 'zaglebienie'>): number {
  const wzgl = ZAGLEBIENIE_KORYTKA[e.ksztalt];
  if (wzgl == null) return 0;
  const z = e.zaglebienie ?? wzgl * e.wys;
  return Math.max(0, Math.min(z, e.wys * 0.9));
}

/** Obrys elementu blokowego (korytka z zagłębieniem wpisanym przez użytkownika). */
export function obrysElementu(e: ElementPrzekroju): Komenda[] {
  if (e.ksztalt === 'korytko_sciekowe') {
    const v = zaglebienieElementu(e) / e.wys;
    return [['M', 0, 0], ['L', 0.3, 0], ['L', 0.44, v], ['L', 0.56, v], ['L', 0.7, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']];
  }
  if (e.ksztalt === 'korytko_muldowe') {
    const v = zaglebienieElementu(e) / e.wys;
    return [['M', 0, 0], ['L', 0.08, 0], ['Q', 0.5, 2 * v, 0.92, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']];
  }
  return KSZTALTY[e.ksztalt].obrys;
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

/** Niezależna kopia szablonu (np. szczegół budowy) – bez pomiaru i archiwum. */
export function kopiaPrzekroju(p: PrzekrojPoprzeczny, teraz = new Date(), id = generujIdGeo()): PrzekrojPoprzeczny {
  const iso = teraz.toISOString();
  const kopia: PrzekrojPoprzeczny = JSON.parse(JSON.stringify(normalizujPrzekroj(p)));
  delete kopia.pomiar;
  delete kopia.archiwum;
  return { ...kopia, id, createdAt: iso, updatedAt: iso };
}

// ------------------------------------------------------------
// Kształty (współrzędne znormalizowane: u 0…1 w prawo, v 0…1 w dół od góry elementu)
// ------------------------------------------------------------

export type Komenda = ['M', number, number] | ['L', number, number] | ['Q', number, number, number, number] | ['Z'];

interface OpisKsztaltu {
  obrys: Komenda[];
  /** Miejsce przyłożenia łaty (u, 0…1 od lewej). */
  pomiarU: number;
  /** Typowe wystawienie ponad sąsiedni pas [cm] – domyślny skok przy dodawaniu. */
  wystawienie: number;
}

const prostokat: Komenda[] = [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']];

export const KSZTALTY: Record<KsztaltElementu, OpisKsztaltu> = {
  kraweznik: {
    obrys: [['M', 0, 0], ['L', 0.82, 0], ['Q', 1, 0, 1, 0.1], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.4, wystawienie: 12,
  },
  kraweznik_najazdowy: {
    obrys: [['M', 0, 0], ['L', 0.45, 0], ['L', 1, 0.5], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.22, wystawienie: 4,
  },
  kraweznik_trapezowy: {
    obrys: [['M', 0, 0.55], ['L', 0.3, 0], ['L', 0.7, 0], ['L', 1, 0.55], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, wystawienie: 3,
  },
  obrzeze: {
    obrys: [['M', 0, 1], ['L', 0, 0.12], ['Q', 0, 0, 0.5, 0], ['Q', 1, 0, 1, 0.12], ['L', 1, 1], ['Z']],
    pomiarU: 0.5, wystawienie: 2,
  },
  opornik: {
    obrys: [['M', 0, 1], ['L', 0, 0.08], ['L', 0.12, 0], ['L', 0.88, 0], ['L', 1, 0.08], ['L', 1, 1], ['Z']],
    pomiarU: 0.5, wystawienie: 0,
  },
  korytko_sciekowe: {
    obrys: [['M', 0, 0], ['L', 0.3, 0], ['L', 0.44, 0.2], ['L', 0.56, 0.2], ['L', 0.7, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, wystawienie: 0,
  },
  korytko_muldowe: {
    obrys: [['M', 0, 0], ['L', 0.08, 0], ['Q', 0.5, 0.6, 0.92, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
    pomiarU: 0.5, wystawienie: 0,
  },
  kostka_betonowa: { obrys: prostokat, pomiarU: 0, wystawienie: 0 },
  kostka_kamienna: { obrys: prostokat, pomiarU: 0, wystawienie: 0 },
  asfalt: { obrys: prostokat, pomiarU: 0, wystawienie: 0 },
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
  const e: ElementPrzekroju = {
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
  return wzor.ksztalt === 'asfalt' ? { ...e, ...zWarstwami(domyslneWarstwy()), strony: 'obie' } : e;
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
  /** Wysunięcie ławy poza element w lewo / w prawo [cm]. */
  lawaL: number;
  lawaP: number;
}

export const SZEROKOSC_SKROCONA = 120;

/** Najniższy punkt elementu przy jego lewej / prawej krawędzi [cm]. */
function spodPrzyKrawedzi(u: UlozonyElement, strona: 'l' | 'p'): number {
  const e = u.element;
  if (e.typ === 'pas') return (strona === 'l' ? u.hL : u.hP) - e.wys - (e.podbudowa ?? 0);
  return u.hL - e.wys - gruboscLawy(e);
}

export function ulozPrzekroj(przekroj: PrzekrojPoprzeczny): UlozonyElement[] {
  const p = normalizujPrzekroj(przekroj);
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
      punkty.push({ klucz: `${e.id}:s`, elementId: e.id, nazwa: `${nr}. ${e.nazwa}`, x: x + u * e.szer, h: hL - zaglebienieElementu(e) });
    }
    wynik.push({ element: e, indeks, x0: x, x1: x + e.szer, hL, hP, rx0: rx, rx1: rx + rw, skrocony, punkty, lawaL: 0, lawaP: 0 });
    x += e.szer;
    rx += rw;
    h = hP;
  });
  // Ława: pod oporem zawsze, nadmiar szerokości tylko tam, gdzie sąsiad kończy się nad nią (nie wchodzi pod poprzedni ani następny obiekt).
  wynik.forEach((u, i) => {
    const e = u.element;
    if (e.typ !== 'blok' || !e.lawa) return;
    const gora = u.hL - e.wys;
    const lewy = wynik[i - 1];
    const prawy = wynik[i + 1];
    const oporL = oporElementu(e)?.strona === 'l' ? Math.max(0, e.opor!.szer) : 0;
    const oporP = oporElementu(e)?.strona === 'p' ? Math.max(0, e.opor!.szer) : 0;
    const wolnyL = !lewy || spodPrzyKrawedzi(lewy, 'p') >= gora;
    const wolnyP = !prawy || spodPrzyKrawedzi(prawy, 'l') >= gora;
    const nadmiar = Math.max(0, (e.lawaSzer ?? e.szer) - e.szer - oporL - oporP);
    let naL = wolnyL || oporL > 0;
    let naP = wolnyP || oporP > 0;
    if (!naL && !naP) { naL = true; naP = true; }
    const czesc = nadmiar / ((naL ? 1 : 0) + (naP ? 1 : 0));
    u.lawaL = oporL + (naL ? czesc : 0);
    u.lawaP = oporP + (naP ? czesc : 0);
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
