// Baza pracowników budżetu. Raport sprzętu wybiera osobę z tej listy.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pracownik } from '../budzet/typy';

const KLUCZ_STORAGE = '@mma:pracownicy';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

function uporzadkuj(lista: Pracownik[]): Pracownik[] {
  return [...lista].sort((a, b) => a.imieNazwisko.localeCompare(b.imieNazwisko, 'pl'));
}

interface PracownicyStore {
  pracownicy: Pracownik[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  dodaj: (imieNazwisko: string) => Promise<string | undefined>;
}

export const usePracownicyStore = create<PracownicyStore>((set, get) => ({
  pracownicy: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      set({ pracownicy: json ? uporzadkuj(JSON.parse(json)) : [], zaladowane: true });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodaj: async (imieNazwisko) => {
    const czyste = imieNazwisko.trim().replace(/\s+/g, ' ');
    if (!czyste) return undefined;
    const jest = get().pracownicy.find((p) => p.imieNazwisko.toLowerCase() === czyste.toLowerCase());
    if (jest) return jest.id;
    const teraz = new Date().toISOString();
    const pracownik: Pracownik = { id: generujId(), imieNazwisko: czyste, createdAt: teraz, updatedAt: teraz };
    const pracownicy = uporzadkuj([...get().pracownicy, pracownik]);
    set({ pracownicy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(pracownicy));
    return pracownik.id;
  },
}));
