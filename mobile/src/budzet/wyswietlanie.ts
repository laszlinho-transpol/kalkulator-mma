import { formatLiczby } from '../utils/calculations';
import { OPISY_ROZLICZENIA, type StawkiSprzetu } from './rozliczenie';

export function linieStawek(stawki: StawkiSprzetu): string[] {
  return OPISY_ROZLICZENIA
    .filter((opis) => (stawki[opis.id] ?? 0) > 0)
    .map((opis) => `${opis.nazwa}: ${formatLiczby(stawki[opis.id]!)} zł`);
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
