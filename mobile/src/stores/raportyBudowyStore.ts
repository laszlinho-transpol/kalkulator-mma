// Raporty dzienne z budowy (zakładka Raporty na stronie budowy). Jeden raport na dzień budowy.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RaportDzienny } from '../raportyBudowy/typy';

const KLUCZ_STORAGE = '@mma:raporty_dzienne';

export const generujIdRaportu = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export type NowyRaportDzienny = Pick<RaportDzienny, 'budowaId' | 'data' | 'pozycje' | 'uwagi'>;

interface RaportyBudowyStore {
  raporty: RaportDzienny[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  dodaj: (dane: NowyRaportDzienny) => Promise<string>;
  aktualizuj: (id: string, zmiany: Partial<Omit<RaportDzienny, 'id' | 'createdAt'>>) => Promise<void>;
  usun: (id: string) => Promise<void>;
}

export const useRaportyBudowyStore = create<RaportyBudowyStore>((set, get) => {
  const zapisz = async (raporty: RaportDzienny[]) => {
    set({ raporty });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(raporty));
  };

  return {
    raporty: [],
    zaladowane: false,

    zaladuj: async () => {
      try {
        const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
        set({ raporty: json ? JSON.parse(json) : [], zaladowane: true });
      } catch {
        set({ zaladowane: true });
      }
    },

    dodaj: async (dane) => {
      const teraz = new Date().toISOString();
      const nowy: RaportDzienny = {
        ...dane,
        id: generujIdRaportu(),
        cenyMaterialu: {},
        materialyDodatkowe: [],
        przerzuty: [],
        samochody: [],
        zatwierdzonePracownicy: [],
        zatwierdzonySprzet: [],
        createdAt: teraz,
        updatedAt: teraz,
      };
      await zapisz([...get().raporty, nowy]);
      return nowy.id;
    },

    aktualizuj: async (id, zmiany) => {
      await zapisz(get().raporty.map((r) => (
        r.id === id ? { ...r, ...zmiany, id: r.id, createdAt: r.createdAt, updatedAt: new Date().toISOString() } : r
      )));
    },

    usun: async (id) => {
      await zapisz(get().raporty.filter((r) => r.id !== id));
    },
  };
});
