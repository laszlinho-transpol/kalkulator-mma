// ============================================================
// STORE – MIESZANKI (baza danych receptur)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mieszanka } from '../types';

const KLUCZ_STORAGE = '@mma:mieszanki';

interface MieszankiStore {
  mieszanki: Mieszanka[];
  zaladowane: boolean;
  zaladujMieszanki: () => Promise<void>;
  dodajMieszanke: (mieszanka: Omit<Mieszanka, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  edytujMieszanke: (id: string, dane: Partial<Omit<Mieszanka, 'id' | 'createdAt'>>) => Promise<void>;
  usunMieszanke: (id: string) => Promise<void>;
  pobierzMieszanke: (id: string) => Mieszanka | undefined;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export const useMieszankiStore = create<MieszankiStore>((set, get) => ({
  mieszanki: [],
  zaladowane: false,

  zaladujMieszanki: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      if (json) {
        set({ mieszanki: JSON.parse(json), zaladowane: true });
      } else {
        set({ zaladowane: true });
      }
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajMieszanke: async (dane) => {
    const teraz = new Date().toISOString();
    const nowa: Mieszanka = {
      ...dane,
      id: generujId(),
      createdAt: teraz,
      updatedAt: teraz,
    };
    const zaktualizowane = [...get().mieszanki, nowa];
    set({ mieszanki: zaktualizowane });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(zaktualizowane));
  },

  edytujMieszanke: async (id, dane) => {
    const zaktualizowane = get().mieszanki.map((m) =>
      m.id === id ? { ...m, ...dane, updatedAt: new Date().toISOString() } : m,
    );
    set({ mieszanki: zaktualizowane });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(zaktualizowane));
  },

  usunMieszanke: async (id) => {
    const zaktualizowane = get().mieszanki.filter((m) => m.id !== id);
    set({ mieszanki: zaktualizowane });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(zaktualizowane));
  },

  pobierzMieszanke: (id) => get().mieszanki.find((m) => m.id === id),
}));
