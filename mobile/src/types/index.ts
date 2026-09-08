// ============================================================
// TYPY DANYCH – KALKULATOR MMA
// ============================================================

// --- Wytwórnia (zakład produkcyjny) ---

export interface Wytwornia {
  id: string;
  nazwa: string;
  /** Link Google Maps (np. maps.app.goo.gl/...) */
  linkGoogleMaps?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Budowa (inwestycja drogowa) ---

export interface Budowa {
  id: string;
  nazwaInwestycji: string;   // np. DK25 Mąkowarsko
  kodBudowy: string;         // np. B128
  zalaczniki?: ZalacznikPlanu[];
  status?: 'aktywna' | 'archiwalna';
  createdAt: string;
  updatedAt: string;
}

// --- Załącznik planu (PDF: PZT, plan sytuacyjny) ---

export type TypZalacznika = 'pdf' | 'obraz';

export interface ZalacznikPlanu {
  id: string;
  nazwa: string;
  typ: TypZalacznika;
  /** URI pliku w pamięci lokalnej telefonu */
  uri: string;
  createdAt: string;
}

// --- Mieszanki (Mixes) ---

export interface Mieszanka {
  id: string;
  rodzaj: string;               // np. AC22P, SMA11
  nrRecepty?: string;
  ciezarObjetosciowy: number;   // [t/m3], do 3 miejsc po przecinku
  wytworniaId?: string;
  /** @deprecated użyj wytworniaId – zachowane dla importu starych danych */
  wytwórnia?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Figury geometryczne ---

export type TypFigury =
  | 'prostokat'
  | 'trapez'
  | 'trojkat'
  | 'pierscien'
  | 'wjazd';

export interface FiguraBazowa {
  id: string;
  typ: TypFigury;
  numeracja: number;
  /** Kilometraż początku tej figury (odziedziczony z poprzedniej) */
  kilometrazPoczatkowy: number; // [m], np. 105500 dla 105+500
}

export interface FiguraProstokat extends FiguraBazowa {
  typ: 'prostokat';
  szerokosc: number;  // [m]
  dlugosc: number;    // [m]
}

export interface FiguraTrapez extends FiguraBazowa {
  typ: 'trapez';
  szerokosc1: number;
  szerokosc2: number;
  dlugosc: number;
}

export interface FiguraTrojkat extends FiguraBazowa {
  typ: 'trojkat';
  szerokosc: number;
  dlugosc: number;
}

export interface FiguraPierscien extends FiguraBazowa {
  typ: 'pierscien';
  szerokosc: number;
  dlugoscZewnetrzna: number;
  dlugoscWewnetrzna: number;
}

export interface FiguraWjazd extends FiguraBazowa {
  typ: 'wjazd';
  L: number;
  s: number;
  R1: number;
  R2: number;
}

export type Figura =
  | FiguraProstokat
  | FiguraTrapez
  | FiguraTrojkat
  | FiguraPierscien
  | FiguraWjazd;

// --- Działka robocza ---

export type KierunekUkladania = 'rosnacy' | 'malejacy';

export interface DzialkaRobocza {
  id: string;
  nazwa: string;
  mieszankaId: string;
  /** @deprecated użyj gruboscWbudowywania */
  grubosc: number;        // [cm] – kompatybilność wsteczna
  gruboscProjektowa?: number;   // [cm]
  tolerancja?: number;          // [%], domyślnie 10
  gruboscWbudowywania?: number; // [cm]
  opis?: string;
  kilometrazPoczatkowyKm: number;   // część km, np. 105
  kilometrazPoczatkowyM: number;    // część m, np. 500
  kierunekUkladania: KierunekUkladania;
  figury: Figura[];
}

// --- Rzut (partia samochodów) ---

export interface Rzut {
  id: string;
  numerRzutu: number;
  iloscSamochodow: number;
}

// --- Plan wbudowywania ---

export type StatusPlanu = 'aktywny' | 'archiwalny';

export interface Plan {
  id: string;
  dataWbudowywania: string;     // ISO date string
  budowaId?: string;            // opcjonalne przypisanie do budowy
  iloscDzialek: number;
  dzialki: DzialkaRobocza[];
  tonazAuta: number;            // [t], domyślnie 25.5
  rzuty: Rzut[];
  zalaczniki?: ZalacznikPlanu[];
  status: StatusPlanu;
  /** figury = Zaplanuj masę; obmiar = zapis z Obmiaru PZT */
  zrodlo?: 'figury' | 'obmiar';
  sesjaObmiaruId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Wpis Live (pojedyncze auto) ---

export interface WpisLive {
  id: string;
  planId: string;
  dzialkaId: string;
  numerAuta: number;
  tonazPrzywieziony: number;    // [t]
  przejechaneMetry: number;     // [m]
  komentarz?: string;
  godzinaWybudowania: string;   // HH:MM
  createdAt: string;
}

/** Stan zakończenia działki w trybie Live („Ostatnie auto”) */
export interface SesjaDzialkiLive {
  planId: string;
  dzialkaId: string;
  zakonczona: boolean;
  zakonczonaAt?: string;
}

// --- Wyniki obliczeń (kalkulowane, nie przechowywane w DB) ---

export interface WynikiFigury {
  powierzchnia: number;         // [m2]
  kilometrazKoncowy: number;    // [m]
}

export interface WynikiDzialki {
  lacznaPowierzchnia: number;   // [m2]
  lacznaIloscMasy: number;      // [Mg]
  iloscSamochodow: number;      // zaokrąglone w górę
}

export interface WpisTabeliAut {
  numerAuta: number;
  numerRzutu: number;
  masa: number;                 // [Mg] – ostatnie auto może być mniej
  masaNarastajaco: number;      // [Mg]
  metry: number;                // [m] z tego auta
  metryNarastajaco: number;     // [m]
}

export interface WynikiKontroli {
  zakrytaPowierzchnia: number;  // [m2]
  uzyskanaGrubosc: number;      // [cm]
  bilansMasy: number;           // [Mg], + przepał, - oszczędność
  pozostaloMetrow: number;      // [m]
  pozostaloPowierzchni: number; // [m2]
  pozostaloMasyWgZalozen: number;
  pozostaloMasyWgSredniej: number;
}

// --- Obmiar PZT (wielokąt z PDF-XChange / XFDF) ---

/** Punkt w układzie PDF (przed skalowaniem) lub w metrach */
export interface Punkt2D {
  x: number;
  y: number;
}

export type RolaWezlaObmiaru =
  | 'start'
  | 'koniec'
  | 'lewa'
  | 'prawa'
  | 'zwykly'
  | 'startLewy'
  | 'startPrawy'
  | 'koniecLewy'
  | 'koniecPrawy';

export type TrybWyboruWezla =
  | 'startLewy'
  | 'startPrawy'
  | 'koniecLewy'
  | 'koniecPrawy'
  | 'odsadzkaP'
  | 'odsadzkaK'
  | 'pomiarP1'
  | 'pomiarP2';

export interface WezelObmiaru extends Punkt2D {
  /** Indeks w oryginalnej liście wierzchołków */
  idx: number;
  rola: RolaWezlaObmiaru;
}

/** Podstawa figury: L–P + kilometraż (np. 1+500) */
export interface BazaObmiaru {
  idxLewy?: number;
  idxPrawy?: number;
  kilometrazKm?: number;
  kilometrazM?: number;
}

export interface OdsadzkaObmiaru {
  id: string;
  nr: number;
  idxP?: number;
  idxK?: number;
  /** + na zewnątrz, − do wewnątrz [m] */
  dystansM?: number;
  zastosowana: boolean;
  /** Poprzedni obrys (szary, nieaktywny) po zastosowaniu */
  wierzcholkiPrzed?: Punkt2D[];
  /** Bok jezdni przy odsadzce po kilometrażu */
  strona?: 'lewa' | 'prawa';
  kmOdKm?: number;
  kmOdM?: number;
  kmDoKm?: number;
  kmDoM?: number;
  /** Cały bok L/P od startu do końca obszaru */
  calosc?: boolean;
}

export interface WpisWzObmiaru {
  id: string;
  numer: number;
  tony: number;
  przejechaneMetry: number;
  createdAt: string;
}

/**
 * Skala rysunku PZT.
 * Przy 1:500 → 1 cm na papierze = 5 m w terenie.
 * Współrzędne XFDF są w punktach PDF (72 pt = 1 cal).
 */
export interface SkalaPzt {
  /** Mianownik skali, np. 500 dla 1:500 */
  mianownik: number;
  /** Metry rzeczywiste na 1 cm papieru (przy 1:500 = 5) */
  metryNaCm: number;
}

export const DOMYSLNA_SKALA_PZT: SkalaPzt = {
  mianownik: 500,
  metryNaCm: 5,
};

/** Predefiniowane skale planów drogowych */
export const PRESETY_SKALI_PZT: SkalaPzt[] = [
  { mianownik: 250, metryNaCm: 2.5 },
  { mianownik: 500, metryNaCm: 5 },
  { mianownik: 1000, metryNaCm: 10 },
  { mianownik: 2000, metryNaCm: 20 },
];

export function skalaZMianownika(mianownik: number): SkalaPzt {
  const m = Math.max(1, mianownik);
  return { mianownik: m, metryNaCm: m / 100 };
}

/** Pojedynczy obszar obmiaru (jeden <polygon> z XFDF) */
export interface ObszarObmiaru {
  id: string;
  nazwa: string;
  /** Kolejność układania w dniu (1 = pierwszy) */
  kolejnosc: number;
  /** Wierzchołki w jednostkach PDF (surowe z XFDF) */
  wierzcholkiPdf: Punkt2D[];
  /** Wierzchołki w metrach terenowych (po skali) */
  wierzcholkiM: Punkt2D[];
  powierzchniaM2: number;
  obwodM: number;
  /** Nazwa pliku źródłowego XFDF / PDF */
  zrodloNazwa: string;
  /** Ścieżka / href z XFDF jeśli dostępna */
  zrodloPdfHref?: string;
  /** Kolor z XFDF (hex) */
  kolorWypelnienia?: string;
  /** Oznaczenia ról węzłów */
  wezlyRole?: WezelObmiaru[];
  kilometrazStartKm?: number;
  kilometrazStartM?: number;
  kilometrazKoniecKm?: number;
  kilometrazKoniecM?: number;
  /** LIVE: przejechane metry od startu na tym obszarze */
  przejechaneMetry?: number;
  /** LIVE: suma ton z aut na tym obszarze */
  sumaTon?: number;
  /** Nowa konfiguracja: podstawa start / koniec (L, P, kilometraż) */
  bazaStart?: BazaObmiaru;
  bazaKoniec?: BazaObmiaru;
  odsadzki?: OdsadzkaObmiaru[];
  wpisyWz?: WpisWzObmiaru[];
  /** Grubość układania [cm] – jak w Zaplanuj masę (alias / wstecz) */
  gruboscCm?: number;
  nazwaDzialki?: string;
  gruboscProjektowa?: number;
  tolerancja?: number;
  gruboscWbudowywania?: number;
  mieszankaId?: string;
  konfiguracjaZablokowana?: boolean;
  /** Rosnący / malejący – do auto-kilometrażu końca */
  kierunekUkladania?: 'rosnacy' | 'malejacy';
  /** Start km = koniec poprzedniego obszaru w kolejności dnia */
  kontynuacjaPoprzedniego?: boolean;
  createdAt: string;
}

/** Tło PZT pod obszarami – ta sama strona PDF co w PDF-XChange (współrzędne XFDF). */
export interface TloPztObmiaru {
  uri: string;
  nazwa: string;
  typ: 'pdf' | 'obraz';
  /** 1-based */
  strona: number;
  liczbaStron: number;
  /** Szerokość / wysokość strony w punktach PDF (72 pt = 1 cal) */
  pageW: number;
  pageH: number;
  /** Zrastrowana strona (JPEG/PNG) – ten sam układ co XFDF */
  obrazUri: string;
  widoczne?: boolean;
  /** 0.15–1 */
  opacity?: number;
  /** Gdy poligon i strona PDF są lustrzane w pionie */
  odwrocY?: boolean;
}

/** Sesja obmiaru na dzień – wiele obszarów z jednego lub wielu PDF */
export interface SesjaObmiaruDnia {
  id: string;
  nazwa: string;
  data: string; // ISO date
  planId?: string;
  budowaId?: string;
  skala: SkalaPzt;
  obszary: ObszarObmiaru[];
  status?: 'aktywna' | 'archiwalna';
  zakonczonoAt?: string;
  tonazAuta?: number;
  rzuty?: Rzut[];
  tloPzt?: TloPztObmiaru;
  createdAt: string;
  updatedAt: string;
}
