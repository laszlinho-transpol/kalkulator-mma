// ============================================================
// STORE – TRYB LIVE (śledzenie postępu w czasie rzeczywistym)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WpisLive, SesjaDzialkiLive } from '../types';
import { przenumerujAutaPlanu } from '../utils/liveProgress';

const KLUCZ_STORAGE = '@mma:live';
const KLUCZ_SESJE = '@mma:live_sesje';

interface LiveStore {
  wpisy: WpisLive[];
  sesje: SesjaDzialkiLive[];
  zaladowane: boolean;
  zaladujWpisy: () => Promise<void>;
  dodajWpisAuta: (wpis: Omit<WpisLive, 'id' | 'createdAt'>) => Promise<void>;
  dodajAutoZRozbiciem: (
    wspolne: Omit<WpisLive, 'id' | 'createdAt' | 'dzialkaId' | 'tonazPrzywieziony' | 'przejechaneMetry'>,
    segmenty: { dzialkaId: string; tonaz: number; metry: number }[],
  ) => Promise<void>;
  edytujWpisAuta: (id: string, dane: Partial<Omit<WpisLive, 'id' | 'createdAt'>>) => Promise<void>;
  usunWpisAuta: (id: string) => Promise<void>;
  usunAutoPlanu: (planId: string, numerAuta: number) => Promise<void>;
  /** Podmienia wpisy i zamknięcia jednego planu naraz (edycja, usunięcie, przebudowa). */
  zastapPostepPlanu: (planId: string, wpisyPlanu: WpisLive[], sesjePlanu: SesjaDzialkiLive[]) => Promise<void>;
  wpisyDlaPlanu: (planId: string) => WpisLive[];
  wpisyDlaDzialki: (planId: string, dzialkaId: string) => WpisLive[];
  wyczyścWpisyPlanu: (planId: string) => Promise<void>;
  wyczyscSesjePlanu: (planId: string) => Promise<void>;
  importujWpisyPlanu: (planId: string, wpisy: Omit<WpisLive, 'id' | 'createdAt' | 'planId'>[]) => Promise<void>;
  czyDzialkaZakonczona: (planId: string, dzialkaId: string) => boolean;
  oznaczOstatnieAuto: (planId: string, dzialkaId: string) => Promise<void>;
  wznowDzialke: (planId: string, dzialkaId: string) => Promise<void>;
}

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapiszDoStorage = async (wpisy: WpisLive[]) => {
  await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(wpisy));
};

const zapiszSesje = async (sesje: SesjaDzialkiLive[]) => {
  await AsyncStorage.setItem(KLUCZ_SESJE, JSON.stringify(sesje));
};

const kluczSesji = (planId: string, dzialkaId: string) => `${planId}:${dzialkaId}`;

export const useLiveStore = create<LiveStore>((set, get) => ({
  wpisy: [],
  sesje: [],
  zaladowane: false,

  zaladujWpisy: async () => {
    try {
      const [json, jsonSesje] = await Promise.all([
        AsyncStorage.getItem(KLUCZ_STORAGE),
        AsyncStorage.getItem(KLUCZ_SESJE),
      ]);
      set({
        wpisy: json ? JSON.parse(json) : [],
        sesje: jsonSesje ? JSON.parse(jsonSesje) : [],
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

  dodajAutoZRozbiciem: async (wspolne, segmenty) => {
    if (segmenty.length === 0) return;
    const teraz = new Date().toISOString();
    const nowe: WpisLive[] = segmenty.map((seg) => ({
      ...wspolne,
      dzialkaId: seg.dzialkaId,
      tonazPrzywieziony: seg.tonaz,
      przejechaneMetry: seg.metry,
      id: generujId(),
      createdAt: teraz,
    }));
    const zaktualizowane = [...get().wpisy, ...nowe];
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
    const wpis = get().wpisy.find((w) => w.id === id);
    if (!wpis) return;
    await get().usunAutoPlanu(wpis.planId, wpis.numerAuta);
  },

  zastapPostepPlanu: async (planId, wpisyPlanu, sesjePlanu) => {
    const wpisy = [
      ...get().wpisy.filter((w) => w.planId !== planId),
      ...wpisyPlanu.map((w) => ({ ...w, planId, id: w.id || generujId() })),
    ];
    const sesje = [
      ...get().sesje.filter((s) => s.planId !== planId),
      ...sesjePlanu.filter((s) => s.planId === planId),
    ];
    set({ wpisy, sesje });
    await zapiszDoStorage(wpisy);
    await zapiszSesje(sesje);
  },

  usunAutoPlanu: async (planId, numerAuta) => {
    const poUsunieciu = get().wpisy.filter(
      (w) => !(w.planId === planId && w.numerAuta === numerAuta),
    );
    const zaktualizowane = przenumerujAutaPlanu(poUsunieciu, planId);
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
    if (!zaktualizowane.some((w) => w.planId === planId)) {
      await get().wyczyscSesjePlanu(planId);
    }
  },

  wpisyDlaPlanu: (planId) => get().wpisy.filter((w) => w.planId === planId),

  wpisyDlaDzialki: (planId, dzialkaId) =>
    get().wpisy.filter((w) => w.planId === planId && w.dzialkaId === dzialkaId),

  wyczyścWpisyPlanu: async (planId) => {
    const zaktualizowane = get().wpisy.filter((w) => w.planId !== planId);
    set({ wpisy: zaktualizowane });
    await zapiszDoStorage(zaktualizowane);
    await get().wyczyscSesjePlanu(planId);
  },

  wyczyscSesjePlanu: async (planId) => {
    const zaktualizowane = get().sesje.filter((s) => s.planId !== planId);
    set({ sesje: zaktualizowane });
    await zapiszSesje(zaktualizowane);
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

  czyDzialkaZakonczona: (planId, dzialkaId) => {
    const k = kluczSesji(planId, dzialkaId);
    return get().sesje.some((s) => kluczSesji(s.planId, s.dzialkaId) === k && s.zakonczona);
  },

  oznaczOstatnieAuto: async (planId, dzialkaId) => {
    const k = kluczSesji(planId, dzialkaId);
    const teraz = new Date().toISOString();
    const bez = get().sesje.filter((s) => kluczSesji(s.planId, s.dzialkaId) !== k);
    const zaktualizowane = [...bez, { planId, dzialkaId, zakonczona: true, zakonczonaAt: teraz }];
    set({ sesje: zaktualizowane });
    await zapiszSesje(zaktualizowane);
  },

  wznowDzialke: async (planId, dzialkaId) => {
    const k = kluczSesji(planId, dzialkaId);
    const zaktualizowane = get().sesje.filter((s) => kluczSesji(s.planId, s.dzialkaId) !== k);
    set({ sesje: zaktualizowane });
    await zapiszSesje(zaktualizowane);
  },
}));
