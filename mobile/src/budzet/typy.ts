import type { RodzajRozliczenia, StawkiSprzetu } from './rozliczenie';
import type { StawkiPracownika } from './pracownicy';

export interface Firma {
  id: string;
  nazwa: string;
  createdAt: string;
}

export interface GrupaPracownikow {
  id: string;
  nazwa: string;
  ulubiona?: boolean;
  createdAt: string;
}

/** Stawki obowiązujące od–do. Raport z daty w zakresie bierze te kwoty zamiast stawek z karty. */
export interface OkresStawek<T = StawkiSprzetu> {
  id: string;
  od: string;
  do: string;
  stawki: T;
}

export interface Pracownik {
  id: string;
  nazwisko: string;
  imie: string;
  grupaId?: string;
  stawki: StawkiPracownika;
  historiaStawek?: OkresStawek<StawkiPracownika>[];
  ulubiony?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RaportPracownika {
  id: string;
  pracownikId: string;
  data: string;
  budowaId: string;
  godziny: number;
  godzinyPodstawowe: number;
  nadgodziny: number;
  godzinyKierowca?: number;
  godzinyPasazer?: number;
  stawki: StawkiPracownika;
  wynagrodzenie: number;
  /** Wynagrodzenie × mnożnik ZUS. */
  kwota: number;
  uwagi?: string;
  createdAt: string;
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
