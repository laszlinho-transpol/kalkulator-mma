import { formatLiczby } from '../utils/calculations';
import { OPISY_ROZLICZENIA, opisRozliczenia, type StawkiSprzetu } from './rozliczenie';
import type { PozycjaRaportuSprzetu } from './typy';

export function linieStawek(stawki: StawkiSprzetu): string[] {
  return OPISY_ROZLICZENIA
    .filter((opis) => (stawki[opis.id] ?? 0) > 0)
    .map((opis) => `${opis.nazwa}: ${formatLiczby(stawki[opis.id]!)} ${opis.jednostkaStawki}`);
}

export function etykietaSprzetu(numer?: string): string {
  const czysty = numer?.trim();
  return czysty ? czysty : 'bez numeru';
}

export function dataKrotko(iso: string): string {
  const [rok, miesiac, dzien] = iso.split('-');
  if (!rok || !miesiac || !dzien) return iso;
  return `${dzien}.${miesiac}.${rok}`;
}

/** Wyliczenie jednej pozycji raportu sprzętu, np. „Dniówka: 1,00 × 900,00 zł = 900,00 zł”. */
export function opisPozycjiSprzetu(pozycja: PozycjaRaportuSprzetu): string {
  const nazwa = opisRozliczenia(pozycja.rodzaj).nazwa;
  if (pozycja.rodzaj === 'miesieczny' && pozycja.dniRobocze) {
    return `${nazwa}: ${formatLiczby(pozycja.stawka)} zł ÷ ${pozycja.dniRobocze} × ${formatLiczby(pozycja.ilosc)} = ${formatLiczby(pozycja.kwota)} zł`;
  }
  if (pozycja.rodzaj === 'dozowanie') {
    return `Dozowanie: ${formatLiczby(pozycja.dozowanie ?? 0)} kg/m² × ${formatLiczby(pozycja.ilosc)} m² × ${formatLiczby(pozycja.stawka)} zł/kg = ${formatLiczby(pozycja.kwota)} zł`;
  }
  return `${nazwa}: ${formatLiczby(pozycja.ilosc)} × ${formatLiczby(pozycja.stawka)} zł = ${formatLiczby(pozycja.kwota)} zł`;
}
