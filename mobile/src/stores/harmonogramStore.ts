// Proste wpisy harmonogramu (budowa, mieszanka, tony na dzień). Plany z „Zaplanuj masę” są w planyStore.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WpisHarmonogramu } from '../harmonogram/harmonogram';

const KLUCZ_STORAGE = '@mma:harmonogram';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

type DaneWpisu = Omit<WpisHarmonogramu, 'id' | 'createdAt' | 'updatedAt'>;

interface HarmonogramStore {
  wpisy: WpisHarmonogramu[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  dodaj: (dane: DaneWpisu) => Promise<string>;
  aktualizuj: (id: string, zmiany: Partial<DaneWpisu>) => Promise<void>;
  usun: (id: string) => Promise<void>;
}

export const useHarmonogramStore = create<HarmonogramStore>((set, get) => {
  const zapisz = async (wpisy: WpisHarmonogramu[]) => {
    set({ wpisy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(wpisy));
  };
  return {
    wpisy: [],
    zaladowane: false,

    zaladuj: async () => {
      try {
        const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
        set({ wpisy: json ? JSON.parse(json) : [], zaladowane: true });
      } catch {
        set({ zaladowane: true });
      }
    },

    dodaj: async (dane) => {
      const teraz = new Date().toISOString();
      const wpis: WpisHarmonogramu = { ...dane, id: generujId(), createdAt: teraz, updatedAt: teraz };
      await zapisz([...get().wpisy, wpis]);
      return wpis.id;
    },

    aktualizuj: async (id, zmiany) => {
      const teraz = new Date().toISOString();
      await zapisz(get().wpisy.map((w) => (w.id === id ? { ...w, ...zmiany, id, updatedAt: teraz } : w)));
    },

    usun: async (id) => {
      await zapisz(get().wpisy.filter((w) => w.id !== id));
    },
  };
});
