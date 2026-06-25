// ============================================================
// STORE – WYTWÓRNIE (zakłady produkcyjne MMA)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wytwornia } from '../types';

const KLUCZ_STORAGE = '@mma:wytwornie';

interface WytwornieStore {
  wytwornie: Wytwornia[];
  zaladowane: boolean;
  zaladujWytwornie: () => Promise<void>;
  dodajWytwornie: (dane: Omit<Wytwornia, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  edytujWytwornie: (id: string, dane: Partial<Omit<Wytwornia, 'id' | 'createdAt'>>) => Promise<void>;
  usunWytwornie: (id: string) => Promise<void>;
  pobierzWytwornie: (id: string) => Wytwornia | undefined;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (wytwornie: Wytwornia[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(wytwornie));
};

export const useWytwornieStore = create<WytwornieStore>((set, get) => ({
  wytwornie: [],
  zaladowane: false,

  zaladujWytwornie: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      set({ wytwornie: json ? JSON.parse(json) : [], zaladowane: true });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajWytwornie: async (dane) => {
    const teraz = new Date().toISOString();
    const id = generujId();
    const nowa: Wytwornia = { ...dane, id, createdAt: teraz, updatedAt: teraz };
    const zaktualizowane = [...get().wytwornie, nowa];
    set({ wytwornie: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
    return id;
  },

  edytujWytwornie: async (id, dane) => {
    const zaktualizowane = get().wytwornie.map((w) =>
      w.id === id ? { ...w, ...dane, updatedAt: new Date().toISOString() } : w,
    );
    set({ wytwornie: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  usunWytwornie: async (id) => {
    const zaktualizowane = get().wytwornie.filter((w) => w.id !== id);
    set({ wytwornie: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  pobierzWytwornie: (id) => get().wytwornie.find((w) => w.id === id),
}));
