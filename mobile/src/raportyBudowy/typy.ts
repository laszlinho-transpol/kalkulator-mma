import type { KategoriaWarstwy } from '../types';

export interface OdcinekRaportu {
  id: string;
  /** Wpis legendy (obszar), np. „trasa główna strona lewa”. */
  legendaId: string;
  /** Zmiana konstrukcji, gdy warstwa pochodzi z wyjątku. */
  wyjatekId?: string;
  /** Nazwa w dniu zapisu – zostaje, nawet gdy legenda się zmieni. */
  nazwa: string;
  kmOdM: number;
  kmDoM: number;
  powierzchniaM2: number;
}

export interface PozycjaRaportu {
  id: string;
  /** nazwa|grubość – ta sama warstwa w kilku konstrukcjach. */
  warstwaKlucz: string;
  warstwaNazwa: string;
  rodzajOpis?: string;
  kategoria: KategoriaWarstwy;
  gruboscProjCm: number;
  mieszankaId?: string;
  /** Opis recepty w dniu zapisu, np. „SMA8 · 12/2025”. */
  mieszankaNazwa?: string;
  /** Ciężar objętościowy do liczenia grubości [t/m³]. */
  gestoscTm3: number;
  /** Wbudowana masa / kruszywo [t]. */
  ilosc: number;
  odcinki: OdcinekRaportu[];
}

export interface MaterialDodatkowy {
  id: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
  cena: number;
  uwagi?: string;
  /** Dostawca z bazy firm. */
  firma?: string;
}

export type RodzajRozliczeniaTransportu = 'km' | 'kurs' | 'tkm' | 'godz';

/** Jedna pozycja rozliczenia transportu. Kilka pozycji w jednym wpisie się sumuje. */
export interface RozliczenieTransportu {
  rodzaj: RodzajRozliczeniaTransportu;
  stawka: number;
  /** km na kurs (samochody) albo łącznie (przerzut). */
  km?: number;
  /** Tony łącznie (t × km). */
  tony?: number;
  godziny?: number;
}

export interface Przerzut {
  id: string;
  firma: string;
  rozliczenia: RozliczenieTransportu[];
  trasa: string;
  /** Link Google Maps z pinezkami. */
  mapaUrl?: string;
  ladunek: string;
  /** @deprecated zapis sprzed rozliczeń: stawka zł/km × km */
  stawka?: number;
  /** @deprecated */
  km?: number;
}

export type TypSamochodu = 'wanna' | 'oska';
/** @deprecated użyj RodzajRozliczeniaTransportu */
export type RozliczenieSamochodu = Exclude<RodzajRozliczeniaTransportu, 'godz'>;

export interface WpisSamochodow {
  id: string;
  /** Pusta = wpis zbiorczy. */
  firma?: string;
  typ: TypSamochodu;
  kursy: number;
  rozliczenia: RozliczenieTransportu[];
  /** @deprecated zapis sprzed listy rozliczeń */
  rozliczenie?: RozliczenieSamochodu;
  /** @deprecated */
  stawka?: number;
  /** @deprecated */
  km?: number;
  /** @deprecated */
  tony?: number;
}

export interface RaportDzienny {
  id: string;
  budowaId: string;
  data: string;
  pozycje: PozycjaRaportu[];
  uwagi?: string;
  /** Cena zmieniona w raporcie: klucz materiału → zł/t. */
  cenyMaterialu: Record<string, number>;
  materialyDodatkowe: MaterialDodatkowy[];
  przerzuty: Przerzut[];
  samochody: WpisSamochodow[];
  zatwierdzonePracownicy: string[];
  zatwierdzonySprzet: string[];
  createdAt: string;
  updatedAt: string;
}
