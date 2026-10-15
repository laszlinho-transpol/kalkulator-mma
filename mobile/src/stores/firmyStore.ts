// Baza firm używanych przy sprzęcie. Ta sama nazwa wskazuje jedną firmę.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Firma } from '../budzet/typy';

const KLUCZ_STORAGE = '@mma:firmy';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

function uporzadkuj(firmy: Firma[]): Firma[] {
  return [...firmy].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

function czystaNazwa(nazwa: string): string {
  return nazwa.trim().replace(/\s+/g, ' ');
}

interface FirmyStore {
  firmy: Firma[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  znajdzLubDodaj: (nazwa: string) => Promise<string | undefined>;
}

export const useFirmyStore = create<FirmyStore>((set, get) => ({
  firmy: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      set({ firmy: json ? uporzadkuj(JSON.parse(json)) : [], zaladowane: true });
    } catch {
      set({ zaladowane: true });
    }
  },

  znajdzLubDodaj: async (nazwa) => {
    const czysta = czystaNazwa(nazwa);
    if (!czysta) return undefined;
    const jest = get().firmy.find((f) => f.nazwa.toLowerCase() === czysta.toLowerCase());
    if (jest) return jest.id;
    const firma: Firma = { id: generujId(), nazwa: czysta, createdAt: new Date().toISOString() };
    const firmy = uporzadkuj([...get().firmy, firma]);
    set({ firmy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(firmy));
    return firma.id;
  },
}));
