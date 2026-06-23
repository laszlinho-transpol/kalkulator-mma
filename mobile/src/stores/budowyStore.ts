// ============================================================
// STORE – BUDOWY (inwestycje drogowe)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Budowa } from '../types';

const KLUCZ_STORAGE = '@mma:budowy';

interface BudowyStore {
  budowy: Budowa[];
  zaladowane: boolean;
  zaladujBudowy: () => Promise<void>;
  dodajBudowe: (dane: Omit<Budowa, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  edytujBudowe: (id: string, dane: Partial<Omit<Budowa, 'id' | 'createdAt'>>) => Promise<void>;
  usunBudowe: (id: string) => Promise<void>;
  pobierzBudowe: (id: string) => Budowa | undefined;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (budowy: Budowa[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(budowy));
};

export const useBudowyStore = create<BudowyStore>((set, get) => ({
  budowy: [],
  zaladowane: false,

  zaladujBudowy: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      set({ budowy: json ? JSON.parse(json) : [], zaladowane: true });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajBudowe: async (dane) => {
    const teraz = new Date().toISOString();
    const id = generujId();
    const nowa: Budowa = { ...dane, id, createdAt: teraz, updatedAt: teraz };
    const zaktualizowane = [...get().budowy, nowa];
    set({ budowy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
    return id;
  },

  edytujBudowe: async (id, dane) => {
    const zaktualizowane = get().budowy.map((b) =>
      b.id === id ? { ...b, ...dane, updatedAt: new Date().toISOString() } : b,
    );
    set({ budowy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  usunBudowe: async (id) => {
    const zaktualizowane = get().budowy.filter((b) => b.id !== id);
    set({ budowy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  pobierzBudowe: (id) => get().budowy.find((b) => b.id === id),
}));
