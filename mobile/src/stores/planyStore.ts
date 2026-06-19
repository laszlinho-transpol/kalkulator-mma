// ============================================================
// STORE – PLANY WBUDOWYWANIA
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Plan, DzialkaRobocza, Figura, Rzut } from '../types';

const KLUCZ_STORAGE = '@mma:plany';

interface PlanyStore {
  plany: Plan[];
  zaladowane: boolean;
  zaladujPlany: () => Promise<void>;
  dodajPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  edytujPlan: (id: string, dane: Partial<Omit<Plan, 'id' | 'createdAt'>>) => Promise<void>;
  usunPlan: (id: string) => Promise<void>;
  archiwizujPlan: (id: string) => Promise<void>;
  pobierzPlan: (id: string) => Plan | undefined;
  aktywne: () => Plan[];
  archiwalne: () => Plan[];
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (plany: Plan[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(plany));
};

export const usePlanyStore = create<PlanyStore>((set, get) => ({
  plany: [],
  zaladowane: false,

  zaladujPlany: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      if (json) {
        set({ plany: JSON.parse(json), zaladowane: true });
      } else {
        set({ zaladowane: true });
      }
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajPlan: async (dane) => {
    const teraz = new Date().toISOString();
    const id = generujId();
    const nowy: Plan = {
      ...dane,
      id,
      status: 'aktywny',
      createdAt: teraz,
      updatedAt: teraz,
    };
    const zaktualizowane = [...get().plany, nowy];
    set({ plany: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
    return id;
  },

  edytujPlan: async (id, dane) => {
    const zaktualizowane = get().plany.map((p) =>
      p.id === id ? { ...p, ...dane, updatedAt: new Date().toISOString() } : p,
    );
    set({ plany: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  usunPlan: async (id) => {
    const zaktualizowane = get().plany.filter((p) => p.id !== id);
    set({ plany: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  archiwizujPlan: async (id) => {
    const zaktualizowane = get().plany.map((p) =>
      p.id === id
        ? { ...p, status: 'archiwalny' as const, updatedAt: new Date().toISOString() }
        : p,
    );
    set({ plany: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  pobierzPlan: (id) => get().plany.find((p) => p.id === id),
  aktywne: () => get().plany.filter((p) => p.status === 'aktywny'),
  archiwalne: () => get().plany.filter((p) => p.status === 'archiwalny'),
}));
