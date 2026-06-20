// ============================================================
// STORE – TRYB LIVE (śledzenie postępu w czasie rzeczywistym)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WpisLive } from '../types';

const KLUCZ_STORAGE = '@mma:live';
const KLUCZ_ZAKONCZONE = '@mma:dzialkiZakonczone';

/** Klucz: planId, wartość: lista ID zakończonych działek */
type ZakonczoneMap = Record<string, string[]>;

interface LiveStore {
  wpisy: WpisLive[];
  dzialkiZakonczone: ZakonczoneMap;
  zaladowane: boolean;
  zaladujWpisy: () => Promise<void>;
  dodajWpisAuta: (wpis: Omit<WpisLive, 'id' | 'createdAt'>) => Promise<void>;
  edytujWpisAuta: (id: string, dane: Partial<Omit<WpisLive, 'id' | 'createdAt'>>) => Promise<void>;
  usunWpisAuta: (id: string) => Promise<void>;
  wpisyDlaPlanu: (planId: string) => WpisLive[];
  wpisyDlaDzialki: (planId: string, dzialkaId: string) => WpisLive[];
  wyczyścWpisyPlanu: (planId: string) => Promise<void>;
  czyDzialkaZakonczona: (planId: string, dzialkaId: string) => boolean;
  zakonczDzialke: (planId: string, dzialkaId: string) => Promise<void>;
  cofnijZakonczenieDzialki: (planId: string, dzialkaId: string) => Promise<void>;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (wpisy: WpisLive[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(wpisy));
};

const zapiszZakonczone = async (mapa: ZakonczoneMap) => {
  await AsyncStorage.setItem(KLUCZ_ZAKONCZONE, JSON.stringify(mapa));
};

export const useLiveStore = create<LiveStore>((set, get) => ({
  wpisy: [],
  dzialkiZakonczone: {},
  zaladowane: false,

  zaladujWpisy: async () => {
    try {
      const [json, jsonZ] = await Promise.all([
        AsyncStorage.getItem(KLUCZ_STORAGE),
        AsyncStorage.getItem(KLUCZ_ZAKONCZONE),
      ]);
      set({
        wpisy: json ? JSON.parse(json) : [],
        dzialkiZakonczone: jsonZ ? JSON.parse(jsonZ) : {},
        zaladowane: true,
      });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajWpisAuta: async (dane) => {
    const teraz = new Date().toISOString();
    const nowy: WpisLive = {
      ...dane,
      id: generujId(),
      createdAt: teraz,
    };
    const zaktualizowane = [...get().wpisy, nowy];
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  edytujWpisAuta: async (id, dane) => {
    const zaktualizowane = get().wpisy.map((w) =>
      w.id === id ? { ...w, ...dane } : w,
    );
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  usunWpisAuta: async (id) => {
    const zaktualizowane = get().wpisy.filter((w) => w.id !== id);
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  wpisyDlaPlanu: (planId) => get().wpisy.filter((w) => w.planId === planId),

  wpisyDlaDzialki: (planId, dzialkaId) =>
    get().wpisy.filter((w) => w.planId === planId && w.dzialkaId === dzialkaId),

  wyczyścWpisyPlanu: async (planId) => {
    const zaktualizowane = get().wpisy.filter((w) => w.planId !== planId);
    const { [planId]: _, ...resztaZakonczonych } = get().dzialkiZakonczone;
    set({ wpisy: zaktualizowane, dzialkiZakonczone: resztaZakonczonych });
    await zapiszDoStorage(zaktualizowane);
    await zapiszZakonczone(resztaZakonczonych);
  },

  czyDzialkaZakonczona: (planId, dzialkaId) => {
    const lista = get().dzialkiZakonczone[planId] ?? [];
    return lista.includes(dzialkaId);
  },

  zakonczDzialke: async (planId, dzialkaId) => {
    const poprzednia = get().dzialkiZakonczone[planId] ?? [];
    if (poprzednia.includes(dzialkaId)) return;
    const nowa: ZakonczoneMap = {
      ...get().dzialkiZakonczone,
      [planId]: [...poprzednia, dzialkaId],
    };
    set({ dzialkiZakonczone: nowa });
    await zapiszZakonczone(nowa);
  },

  cofnijZakonczenieDzialki: async (planId, dzialkaId) => {
    const poprzednia = get().dzialkiZakonczone[planId] ?? [];
    const nowa: ZakonczoneMap = {
      ...get().dzialkiZakonczone,
      [planId]: poprzednia.filter((id) => id !== dzialkaId),
    };
    set({ dzialkiZakonczone: nowa });
    await zapiszZakonczone(nowa);
  },
}));
