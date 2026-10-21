// Szczegóły konstrukcyjne budowy: kopie szablonów przekroju zapisane w projekcie budowy.

import type { ProjektBudowy, SzczegolBudowy } from '../types';
import { kopiaPrzekroju, nowyPrzekroj, type PrzekrojPoprzeczny } from './przekroj';

/** Dodaje kopię szablonu (albo pusty przekrój) na koniec listy szczegółów. */
export function dodajSzczegolBudowy(projekt: ProjektBudowy, szablon?: PrzekrojPoprzeczny, teraz = new Date()): ProjektBudowy {
  const lista = projekt.szczegoly ?? [];
  const szczegol: SzczegolBudowy = szablon
    ? { ...kopiaPrzekroju(szablon, teraz), szablonId: szablon.id }
    : nowyPrzekroj(`Szczegół ${lista.length + 1}`, teraz);
  return { ...projekt, szczegoly: [...lista, szczegol] };
}

export function zapiszSzczegolBudowy(projekt: ProjektBudowy, p: PrzekrojPoprzeczny, teraz = new Date()): ProjektBudowy {
  const lista = projekt.szczegoly ?? [];
  const z = { ...p, updatedAt: teraz.toISOString() };
  return { ...projekt, szczegoly: lista.some((s) => s.id === p.id) ? lista.map((s) => (s.id === p.id ? { ...s, ...z } : s)) : [...lista, z] };
}

export function usunSzczegolBudowy(projekt: ProjektBudowy, id: string): ProjektBudowy {
  return { ...projekt, szczegoly: (projekt.szczegoly ?? []).filter((s) => s.id !== id) };
}

export function przesunSzczegolBudowy(projekt: ProjektBudowy, id: string, o: -1 | 1): ProjektBudowy {
  const lista = [...(projekt.szczegoly ?? [])];
  const i = lista.findIndex((s) => s.id === id);
  const j = i + o;
  if (i < 0 || j < 0 || j >= lista.length) return projekt;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return { ...projekt, szczegoly: lista };
}
