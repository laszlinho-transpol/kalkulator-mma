// Status budowy: aktywna, gwarancja (opcjonalnie do daty) albo zakończona.
// Gwarancja po dacie końca liczy się jako zakończona – bez zapisu, przy każdym odczycie.

import type { Budowa } from '../types';

export type StatusBudowy = 'aktywna' | 'gwarancja' | 'zakonczona';

export const STATUSY_BUDOWY: { id: StatusBudowy; nazwa: string }[] = [
  { id: 'aktywna', nazwa: 'Aktywna' },
  { id: 'gwarancja', nazwa: 'Gwarancja' },
  { id: 'zakonczona', nazwa: 'Zakończona' },
];

export const NAZWA_STATUSU: Record<StatusBudowy, string> = {
  aktywna: 'Aktywna',
  gwarancja: 'Gwarancja',
  zakonczona: 'Zakończona',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const dzisIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Zapisany status (bez automatycznego przejścia gwarancji). Stare „archiwalna” = zakończona. */
export function zapisanyStatus(b: Pick<Budowa, 'status'>): StatusBudowy {
  if (b.status === 'gwarancja') return 'gwarancja';
  if (b.status === 'zakonczona' || b.status === 'archiwalna') return 'zakonczona';
  return 'aktywna';
}

export function statusBudowy(b: Pick<Budowa, 'status' | 'gwarancjaDo'>, dzis = dzisIso()): StatusBudowy {
  const s = zapisanyStatus(b);
  if (s === 'gwarancja' && b.gwarancjaDo && b.gwarancjaDo < dzis) return 'zakonczona';
  return s;
}

/** Budowa, na której można jeszcze planować i raportować (aktywna albo w gwarancji). */
export const budowaWToku = (b: Pick<Budowa, 'status' | 'gwarancjaDo'>, dzis = dzisIso()) => statusBudowy(b, dzis) !== 'zakonczona';

export function opisStatusu(b: Pick<Budowa, 'status' | 'gwarancjaDo'>, dzis = dzisIso()): string {
  const s = statusBudowy(b, dzis);
  const doDnia = b.gwarancjaDo ? b.gwarancjaDo.split('-').reverse().join('.') : '';
  if (s === 'gwarancja') return doDnia ? `Gwarancja do ${doDnia}` : 'Gwarancja';
  if (s === 'zakonczona' && zapisanyStatus(b) === 'gwarancja') return `Zakończona (gwarancja do ${doDnia})`;
  return NAZWA_STATUSU[s];
}

/** Grupy listy budów w stałej kolejności, w grupie wg kodu. */
export function grupyBudow<T extends Pick<Budowa, 'status' | 'gwarancjaDo' | 'kodBudowy'>>(budowy: T[], dzis = dzisIso()) {
  return STATUSY_BUDOWY.map(({ id, nazwa }) => ({
    status: id,
    nazwa,
    budowy: budowy
      .filter((b) => statusBudowy(b, dzis) === id)
      .sort((a, b) => a.kodBudowy.localeCompare(b.kodBudowy, 'pl', { numeric: true })),
  }));
}
