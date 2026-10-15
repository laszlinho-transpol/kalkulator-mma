// Grupy pracowników. Ta sama nazwa wskazuje jedną grupę.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GrupaPracownikow } from '../budzet/typy';

const KLUCZ_STORAGE = '@mma:grupy_pracownikow';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

function uporzadkuj(grupy: GrupaPracownikow[]): GrupaPracownikow[] {
  return [...grupy].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

interface GrupyPracownikowStore {
  grupy: GrupaPracownikow[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  znajdzLubDodaj: (nazwa: string) => Promise<string | undefined>;
  przelaczUlubiona: (id: string) => Promise<void>;
}

export const useGrupyPracownikowStore = create<GrupyPracownikowStore>((set, get) => ({
  grupy: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      set({ grupy: json ? uporzadkuj(JSON.parse(json)) : [], zaladowane: true });
    } catch {
      set({ zaladowane: true });
    }
  },

  znajdzLubDodaj: async (nazwa) => {
    const czysta = nazwa.trim().replace(/\s+/g, ' ');
    if (!czysta) return undefined;
    const jest = get().grupy.find((g) => g.nazwa.toLowerCase() === czysta.toLowerCase());
    if (jest) return jest.id;
    const grupa: GrupaPracownikow = { id: generujId(), nazwa: czysta, createdAt: new Date().toISOString() };
    const grupy = uporzadkuj([...get().grupy, grupa]);
    set({ grupy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(grupy));
    return grupa.id;
  },

  przelaczUlubiona: async (id) => {
    const grupy = get().grupy.map((g) => (g.id === id ? { ...g, ulubiona: !g.ulubiona } : g));
    set({ grupy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(grupy));
  },
}));
