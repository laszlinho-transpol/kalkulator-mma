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

export interface PunktCeny {
  iso: string;
  cena: number;
  /** Początek okresu – na wykresie punkt z wartością. */
  poczatek: boolean;
}

/** Punkty wykresu historii ceny: początek i koniec każdego okresu, chronologicznie. */
export function punktyHistoriiCeny(historia: Mieszanka['historiaCen']): PunktCeny[] {
  const punkty: PunktCeny[] = [];
  for (const okres of [...(historia ?? [])].sort((a, b) => a.od.localeCompare(b.od))) {
    const cena = okres.stawki.cena;
    if (!cena || cena <= 0) continue;
    punkty.push({ iso: okres.od, cena, poczatek: true });
    if (okres.do !== okres.od) punkty.push({ iso: okres.do, cena, poczatek: false });
  }
  return punkty;
}

/** Numer dnia (oś X wykresów dat). */
export function numerDnia(iso: string): number {
  const [r, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(r, m - 1, d) / 86400000);
}

export function receptyWytworni(mieszanki: Mieszanka[], wytworniaId: string): Mieszanka[] {
  return mieszanki
    .filter((m) => m.wytworniaId === wytworniaId)
    .sort((a, b) => a.rodzaj.localeCompare(b.rodzaj, 'pl') || (a.nrRecepty ?? '').localeCompare(b.nrRecepty ?? '', 'pl'));
}
