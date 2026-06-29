// ============================================================
// STORE – NOTATNIK (zapisane pomiary i notatki)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KLUCZ = '@mma:notatnik';

export interface WpisNotatnika {
  id: string;
  tresc: string;
  createdAt: string;
  zrodlo?: string;
}

interface NotatnikStore {
  wpisy: WpisNotatnika[];
  zaladuj: () => Promise<void>;
  dodaj: (tresc: string, zrodlo?: string) => Promise<void>;
  usun: (id: string) => Promise<void>;
}

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export const useNotatnikStore = create<NotatnikStore>((set, get) => ({
  wpisy: [],

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ);
      set({ wpisy: json ? JSON.parse(json) : [] });
    } catch {
      set({ wpisy: [] });
    }
  },

  dodaj: async (tresc, zrodlo) => {
    const wpis: WpisNotatnika = { id: generujId(), tresc, zrodlo, createdAt: new Date().toISOString() };
    const zaktualizowane = [wpis, ...get().wpisy];
    set({ wpisy: zaktualizowane });
    await AsyncStorage.setItem(KLUCZ, JSON.stringify(zaktualizowane));
  },

  usun: async (id) => {
    const zaktualizowane = get().wpisy.filter((w) => w.id !== id);
    set({ wpisy: zaktualizowane });
    await AsyncStorage.setItem(KLUCZ, JSON.stringify(zaktualizowane));
  },
}));
