// ============================================================
// TYPY DANYCH – KALKULATOR MMA
// ============================================================

// --- Budowa (inwestycja drogowa) ---

export interface Budowa {
  id: string;
  nazwaInwestycji: string;   // np. DK25 Mąkowarsko
  kodBudowy: string;         // np. B128
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
  grubosc: number;        // [cm]
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
