// Rozliczenie sprzętu: stawki z karty maszyny i kwota raportu.

import { round2 } from '../utils/calculations';

interface ZakresStawek {
  id: string;
  od: string;
  do: string;
  stawki: StawkiSprzetu;
}

export type RodzajRozliczenia = 'miesieczny' | 'dzienny' | 'godzinowy' | 'kilometr';

export interface OpisRozliczenia {
  id: RodzajRozliczenia;
  nazwa: string;
  jednostkaStawki: string;
  etykietaIlosci: string;
  jednostkaIlosci: string;
}

export const OPISY_ROZLICZENIA: OpisRozliczenia[] = [
  { id: 'miesieczny', nazwa: 'Koszt miesięczny', jednostkaStawki: 'zł / mies.', etykietaIlosci: 'Liczba dni', jednostkaIlosci: 'dni' },
  { id: 'dzienny', nazwa: 'Stawka na dzień', jednostkaStawki: 'zł / dzień', etykietaIlosci: 'Liczba dni', jednostkaIlosci: 'dni' },
  { id: 'godzinowy', nazwa: 'Stawka godzinowa', jednostkaStawki: 'zł / mth', etykietaIlosci: 'Ilość mth', jednostkaIlosci: 'mth' },
  { id: 'kilometr', nazwa: 'Stawka za kilometr', jednostkaStawki: 'zł / km', etykietaIlosci: 'Ilość kilometrów', jednostkaIlosci: 'km' },
];

export interface StawkiSprzetu {
  miesieczny?: number;
  dzienny?: number;
  godzinowy?: number;
  kilometr?: number;
}

export function opisRozliczenia(id: RodzajRozliczenia): OpisRozliczenia {
  return OPISY_ROZLICZENIA.find((o) => o.id === id)!;
}

export function dostepneRozliczenia(stawki: StawkiSprzetu): RodzajRozliczenia[] {
  return OPISY_ROZLICZENIA.map((o) => o.id).filter((id) => (stawki[id] ?? 0) > 0);
}

/** Okres o najpóźniejszym początku, który obejmuje dzień. */
export function okresNaDzien(historia: ZakresStawek[] | undefined, iso: string): ZakresStawek | undefined {
  return (historia ?? [])
    .filter((okres) => okres.od <= iso && iso <= okres.do)
    .sort((a, b) => b.od.localeCompare(a.od) || b.do.localeCompare(a.do))[0];
}

export function stawkiObowiazujace(
  bazowe: StawkiSprzetu,
  historia: ZakresStawek[] | undefined,
  iso: string,
): StawkiSprzetu {
  return okresNaDzien(historia, iso)?.stawki ?? bazowe;
}

export function zakresNachodzi(
  historia: ZakresStawek[] | undefined,
  od: string,
  dokad: string,
  pominId?: string,
): boolean {
  return (historia ?? []).some((okres) => okres.id !== pominId && okres.od <= dokad && od <= okres.do);
}

export function tekstZapisanejStawki(stawka?: number): string {
  return stawka ? String(stawka).replace('.', ',') : '';
}

/** Poniedziałek–piątek w miesiącu daty raportu. */
export function dniRoboczeMiesiaca(isoData: string): number {
  const [rok, miesiac] = isoData.split('-').map(Number);
  if (!rok || !miesiac) return 0;
  const ostatni = new Date(rok, miesiac, 0).getDate();
  let dni = 0;
  for (let dzien = 1; dzien <= ostatni; dzien += 1) {
    const numer = new Date(rok, miesiac - 1, dzien).getDay();
    if (numer !== 0 && numer !== 6) dni += 1;
  }
  return dni;
}

/**
 * Koszt miesięczny ÷ dni robocze × liczba dni.
 * Stawka dzienna × dni, godzinowa × mth, kilometrowa × km.
 */
export function kwotaRozliczenia(
  rodzaj: RodzajRozliczenia,
  stawka: number,
  ilosc: number,
  dniRobocze: number,
): number {
  if (!(stawka > 0) || !(ilosc > 0)) return 0;
  if (rodzaj === 'miesieczny') {
    if (dniRobocze <= 0) return 0;
    return round2((stawka / dniRobocze) * ilosc);
  }
  return round2(stawka * ilosc);
}

export function wczorajIso(teraz = new Date()): string {
  const d = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dzien = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dzien}`;
}

export function parsujLiczbePola(tekst: string): number | null {
  const czysty = tekst.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(czysty)) return null;
  const n = Number(czysty);
  return Number.isFinite(n) ? n : null;
}
