// Recepty (mieszanki) wytwórni – cena obowiązująca w dniu i opis pól historii ceny.

import { linieStawekPola, type OpisPolaStawki } from '../budzet/pracownicy';
import { stawkiObowiazujace } from '../budzet/rozliczenie';
import type { CenaRecepty, Mieszanka } from '../types';

export const POLA_CENY: OpisPolaStawki<'cena'>[] = [
  { id: 'cena', nazwa: 'Cena', jednostka: 'zł / t', podpowiedz: 'Cena netto za tonę mieszanki.' },
];

export const linieCeny = (cena: CenaRecepty): string[] => linieStawekPola(POLA_CENY, cena);

/** Cena z okresu historii obejmującego dzień, a poza okresami – cena z karty recepty. */
export function cenaReceptyNaDzien(recepta: Pick<Mieszanka, 'cena' | 'historiaCen'>, iso: string): number | undefined {
  const cena = stawkiObowiazujace<CenaRecepty>({ cena: recepta.cena }, recepta.historiaCen, iso).cena;
  return cena && cena > 0 ? cena : undefined;
}

export function receptyWytworni(mieszanki: Mieszanka[], wytworniaId: string): Mieszanka[] {
  return mieszanki
    .filter((m) => m.wytworniaId === wytworniaId)
    .sort((a, b) => a.rodzaj.localeCompare(b.rodzaj, 'pl') || (a.nrRecepty ?? '').localeCompare(b.nrRecepty ?? '', 'pl'));
}
