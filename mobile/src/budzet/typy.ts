import type { RodzajRozliczenia, StawkiSprzetu } from './rozliczenie';
import type { StawkiPracownika } from './pracownicy';
import type { KontaktWytworni } from '../types';

export interface Firma {
  id: string;
  nazwa: string;
  komentarz?: string;
  adres?: string;
  email?: string;
  kontakty?: KontaktWytworni[];
  createdAt: string;
  updatedAt?: string;
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
  telefon?: string;
  grupaId?: string;
  stawki: StawkiPracownika;
  historiaStawek?: OkresStawek<StawkiPracownika>[];
  /** Nadgodziny odłożone „na zimę” (R8): miesiąc YYYY-MM → godziny. Pomniejszają wypłatę tego miesiąca. */
  odlozoneNadgodziny?: Record<string, number>;
  ulubiony?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RaportPracownika {
  id: string;
  pracownikId: string;
  data: string;
  /** Brak rodzaju = dzień pracy na budowie. UW, L4 i R8 nie mają budowy – koszt idzie na brygadę. */
  rodzaj?: 'UW' | 'L4' | 'R8';
  /** Pusty przy UW / L4 / R8. */
  budowaId: string;
  /** Brygada (grupa) pracownika w dniu nieobecności. */
  grupaId?: string;
  godziny: number;
  godzinyPodstawowe: number;
  nadgodziny: number;
  godzinyKierowca?: number;
  godzinyPasazer?: number;
  /** Dzień w delegacji – do kosztu dolicza się stawki.delegacja. */
  delegacja?: boolean;
  /** Raport utworzony razem z raportem sprzętu (pracownik jako operator). */
  sprzetId?: string;
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
  /** kg/m² – rozliczenie dozowaniem; ilosc to wtedy powierzchnia m². */
  dozowanie?: number;
}

export interface RaportSprzetu {
  id: string;
  sprzetId: string;
  data: string;
  budowaId: string;
  /** Brak przy sprzęcie z firmy zewnętrznej, gdy nie przypisano pracownika. */
  pracownikId?: string;
  raportPracownikaId?: string;
  pozycje: PozycjaRaportuSprzetu[];
  uwagi?: string;
  kwota: number;
  createdAt: string;
}
