// ============================================================
// STORE – TRYB LIVE (śledzenie postępu w czasie rzeczywistym)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WpisLive } from '../types';

const KLUCZ_STORAGE = '@mma:live';

interface LiveStore {
  wpisy: WpisLive[];
  zaladowane: boolean;
  zaladujWpisy: () => Promise<void>;
  dodajWpisAuta: (wpis: Omit<WpisLive, 'id' | 'createdAt'>) => Promise<void>;
  edytujWpisAuta: (id: string, dane: Partial<Omit<WpisLive, 'id' | 'createdAt'>>) => Promise<void>;
  usunWpisAuta: (id: string) => Promise<void>;
  wpisyDlaPlanu: (planId: string) => WpisLive[];
  wpisyDlaDzialki: (planId: string, dzialkaId: string) => WpisLive[];
  wyczyścWpisyPlanu: (planId: string) => Promise<void>;
  importujWpisyPlanu: (planId: string, wpisy: Omit<WpisLive, 'id' | 'createdAt' | 'planId'>[]) => Promise<void>;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (wpisy: WpisLive[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(wpisy));
};

export const useLiveStore = create<LiveStore>((set, get) => ({
  wpisy: [],
  zaladowane: false,

  zaladujWpisy: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ_STORAGE);
      if (json) {
        set({ wpisy: JSON.parse(json), zaladowane: true });
      } else {
        set({ zaladowane: true });
      }
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
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },

  importujWpisyPlanu: async (planId, wpisyNowe) => {
    const bezPlanu = get().wpisy.filter((w) => w.planId !== planId);
    const teraz = new Date().toISOString();
    const zaimportowane: WpisLive[] = wpisyNowe.map((w) => ({
      ...w,
      planId,
      id: generujId(),
      createdAt: teraz,
    }));
    const zaktualizowane = [...bezPlanu, ...zaimportowane];
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
  },
}));
