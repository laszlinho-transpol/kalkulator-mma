import type { RodzajRozliczenia, StawkiSprzetu } from './rozliczenie';

export interface Firma {
  id: string;
  nazwa: string;
  createdAt: string;
}

export interface Pracownik {
  id: string;
  imieNazwisko: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sprzet {
  id: string;
  rodzajId: string;
  numer?: string;
  firmaId?: string;
  stawki: StawkiSprzetu;
  spalanieLnaMth?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PozycjaRaportuSprzetu {
  rodzaj: RodzajRozliczenia;
  stawka: number;
  ilosc: number;
  kwota: number;
}

export interface RaportSprzetu {
  id: string;
  sprzetId: string;
  data: string;
  budowaId: string;
  pracownikId: string;
  pozycje: PozycjaRaportuSprzetu[];
  uwagi?: string;
  kwota: number;
  createdAt: string;
}
