// ============================================================
// STORE – GEODEZJA (szkice geodezyjne – rzut z góry, przekroje poprzeczne – szablony)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SzkicGeodezyjny } from '../geodezja/szkic';
import { normalizujPrzekroj, type PrzekrojPoprzeczny } from '../geodezja/przekroj';

const KLUCZ_SZKICE = '@mma:geodezja_szkice';
const KLUCZ_PRZEKROJE = '@mma:geodezja_przekroje';

interface GeodezjaStore {
  szkice: SzkicGeodezyjny[];
  przekroje: PrzekrojPoprzeczny[];
  zaladuj: () => Promise<void>;
  zapiszSzkic: (s: SzkicGeodezyjny) => Promise<void>;
  usunSzkic: (id: string) => Promise<void>;
  zapiszPrzekroj: (p: PrzekrojPoprzeczny) => Promise<void>;
  usunPrzekroj: (id: string) => Promise<void>;
}

async function czytaj<T>(klucz: string): Promise<T[]> {
  try {
    const json = await AsyncStorage.getItem(klucz);
    const dane = json ? JSON.parse(json) : [];
    return Array.isArray(dane) ? dane : [];
  } catch {
    return [];
  }
}

const zUpsertem = <T extends { id: string; updatedAt: string }>(lista: T[], el: T): T[] => {
  const z = { ...el, updatedAt: new Date().toISOString() };
  return lista.some((x) => x.id === el.id) ? lista.map((x) => (x.id === el.id ? z : x)) : [z, ...lista];
};

export const useGeodezjaStore = create<GeodezjaStore>((set, get) => ({
  szkice: [],
  przekroje: [],

  zaladuj: async () => {
    const [szkice, przekroje] = await Promise.all([
      czytaj<SzkicGeodezyjny>(KLUCZ_SZKICE),
      czytaj<PrzekrojPoprzeczny>(KLUCZ_PRZEKROJE),
    ]);
    set({ szkice, przekroje: przekroje.map(normalizujPrzekroj) });
  },

  zapiszSzkic: async (s) => {
    const szkice = zUpsertem(get().szkice, s);
    set({ szkice });
    await AsyncStorage.setItem(KLUCZ_SZKICE, JSON.stringify(szkice));
  },

  usunSzkic: async (id) => {
    const szkice = get().szkice.filter((s) => s.id !== id);
    set({ szkice });
    await AsyncStorage.setItem(KLUCZ_SZKICE, JSON.stringify(szkice));
  },

  zapiszPrzekroj: async (p) => {
    const przekroje = zUpsertem(get().przekroje, p);
    set({ przekroje });
    await AsyncStorage.setItem(KLUCZ_PRZEKROJE, JSON.stringify(przekroje));
  },

  usunPrzekroj: async (id) => {
    const przekroje = get().przekroje.filter((p) => p.id !== id);
    set({ przekroje });
    await AsyncStorage.setItem(KLUCZ_PRZEKROJE, JSON.stringify(przekroje));
  },
}));
