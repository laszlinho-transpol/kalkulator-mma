// ============================================================
// PIKIETAŻ (CHAINAGE) – obliczenia kilometrażu ciągłego
// ============================================================

import { DO_METROW_BIEZACYCH, Z_METROW_BIEZACYCH, FORMAT_KILOMETRAZU } from '../constants';
import type { DzialkaRobocza, Figura } from '../types';
import { dlugoscFigury } from './calculations';

/** Zwraca pikietaż początku i końca każdej figury */
export function obliczPikietazFigur(
  dzialka: DzialkaRobocza,
): Array<{ figura: Figura; poczatek: number; koniec: number }> {
  const startMetry = DO_METROW_BIEZACYCH(
    dzialka.kilometrazPoczatkowyKm,
    dzialka.kilometrazPoczatkowyM,
  );

  const wyniki: Array<{ figura: Figura; poczatek: number; koniec: number }> = [];
  let biezacyMetr = startMetry;

  for (const figura of dzialka.figury) {
    const dlugosc = dlugoscFigury(figura);
    const poczatek = biezacyMetr;
    const delta = dzialka.kierunekUkladania === 'rosnacy' ? dlugosc : -dlugosc;
    const koniec = biezacyMetr + delta;
    wyniki.push({ figura, poczatek, koniec });
    biezacyMetr = koniec;
  }

  return wyniki;
}

/** Formatuje pikietaż w metrach bieżących jako "km+mmm" */
export function formatujPikietaz(metry: number): string {
  const { km, m } = Z_METROW_BIEZACYCH(Math.abs(Math.round(metry)));
  return FORMAT_KILOMETRAZU(km, m);
}

/** Pikietaż po przejechaniu `metry` od startu w zadanym kierunku układania. */
export function pikietazPoMetrach(
  startM: number,
  metry: number,
  kierunek: 'rosnacy' | 'malejacy',
): number {
  return startM + (kierunek === 'malejacy' ? -metry : metry);
}

/** Kilometraż początku i końca jednego wbudowania (w kolejności układania). */
export function zakresOdcinkaKm(
  startM: number,
  metryPrzed: number,
  metryOdcinka: number,
  kierunek: 'rosnacy' | 'malejacy',
): { odM: number; doM: number } {
  return {
    odM: pikietazPoMetrach(startM, metryPrzed, kierunek),
    doM: pikietazPoMetrach(startM, metryPrzed + metryOdcinka, kierunek),
  };
}

/** Oblicza domyślny pikietaż początku dla nowej figury (koniec ostatniej) */
export function nastepnyPikietaz(dzialka: DzialkaRobocza): number {
  if (dzialka.figury.length === 0) {
    return DO_METROW_BIEZACYCH(
      dzialka.kilometrazPoczatkowyKm,
      dzialka.kilometrazPoczatkowyM,
    );
  }
  const pikietaze = obliczPikietazFigur(dzialka);
  return pikietaze[pikietaze.length - 1].koniec;
}
