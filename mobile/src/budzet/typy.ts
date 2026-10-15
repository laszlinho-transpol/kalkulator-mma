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

/** Stawki obowiązujące od–do. Raport z daty w zakresie bierze te kwoty zamiast stawek z karty. */
export interface OkresStawek {
  id: string;
  od: string;
  do: string;
  stawki: StawkiSprzetu;
}

export interface Sprzet {
  id: string;
  rodzajId: string;
  numer?: string;
  firmaId?: string;
  stawki: StawkiSprzetu;
  spalanieLnaMth?: number;
  historiaStawek?: OkresStawek[];
  createdAt: string;
  updatedAt: string;
}

export interface PozycjaRaportuSprzetu {
  rodzaj: RodzajRozliczenia;
  stawka: number;
  ilosc: number;
  kwota: number;
  /** Dzielnik kosztu miesięcznego. Użytkownik może zmienić podpowiedź dni roboczych. */
  dniRobocze?: number;
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
