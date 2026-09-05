// ============================================================
// STORE – OBMIAR PZT (sesje dnia z obszarami XFDF)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ObszarObmiaru, RolaWezlaObmiaru, SesjaObmiaruDnia, SkalaPzt } from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import { zastosujRoleWezla } from '../utils/obmiarLive';
import { nadajKolejnosc, obszaryZPolygony, przeliczObszarySkalą, type WynikParsowaniaXfdf } from '../utils/xfdfParser';

const KLUCZ = '@mma:obmiar_sesje';

interface ObmiarStore {
  sesje: SesjaObmiaruDnia[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  utworzSesje: (nazwa: string, data: string, skala?: SkalaPzt) => Promise<SesjaObmiaruDnia>;
  usunSesje: (id: string) => Promise<void>;
  dodajObszaryZXfdf: (sesjaId: string, wynik: WynikParsowaniaXfdf) => Promise<void>;
  ustawKolejnosc: (sesjaId: string, obszaryIdsWKolejnosci: string[]) => Promise<void>;
  przesunObszar: (sesjaId: string, obszarId: string, kierunek: -1 | 1) => Promise<void>;
  usunObszar: (sesjaId: string, obszarId: string) => Promise<void>;
  zmienSkale: (sesjaId: string, skala: SkalaPzt) => Promise<void>;
  zmienNazweObszaru: (sesjaId: string, obszarId: string, nazwa: string) => Promise<void>;
  ustawRoleWezla: (sesjaId: string, obszarId: string, idx: number, rola: RolaWezlaObmiaru) => Promise<void>;
  ustawKilometraz: (
    sesjaId: string,
    obszarId: string,
    dane: Partial<Pick<ObszarObmiaru, 'kilometrazStartKm' | 'kilometrazStartM' | 'kilometrazKoniecKm' | 'kilometrazKoniecM'>>,
  ) => Promise<void>;
  ustawLiveObszaru: (
    sesjaId: string,
    obszarId: string,
    dane: { przejechaneMetry?: number; sumaTon?: number },
  ) => Promise<void>;
  sesjaPoId: (id: string) => SesjaObmiaruDnia | undefined;
}

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapisz = async (sesje: SesjaObmiaruDnia[]) => {
  await AsyncStorage.setItem(KLUCZ, JSON.stringify(sesje));
};

export const useObmiarStore = create<ObmiarStore>((set, get) => ({
  sesje: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ);
      set({ sesje: json ? JSON.parse(json) : [], zaladowane: true });
    } catch {
      set({ sesje: [], zaladowane: true });
    }
  },

  utworzSesje: async (nazwa, data, skala = DOMYSLNA_SKALA_PZT) => {
    const teraz = new Date().toISOString();
    const sesja: SesjaObmiaruDnia = {
      id: generujId(),
      nazwa,
      data,
      skala,
      obszary: [],
      createdAt: teraz,
      updatedAt: teraz,
    };
    const zaktualizowane = [sesja, ...get().sesje];
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return sesja;
  },

  usunSesje: async (id) => {
    const zaktualizowane = get().sesje.filter((s) => s.id !== id);
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  dodajObszaryZXfdf: async (sesjaId, wynik) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const start = sesja.obszary.length + 1;
    const nowe = obszaryZPolygony(wynik, sesja.skala, start);
    const obszary = nadajKolejnosc([...sesja.obszary, ...nowe]);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId
        ? { ...s, obszary, updatedAt: new Date().toISOString() }
        : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKolejnosc: async (sesjaId, obszaryIdsWKolejnosci) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const mapa = new Map(sesja.obszary.map((o) => [o.id, o]));
    const uporzadkowane: ObszarObmiaru[] = [];
    for (const id of obszaryIdsWKolejnosci) {
      const o = mapa.get(id);
      if (o) uporzadkowane.push(o);
    }
    // dopisz ewentualnie pominięte
    for (const o of sesja.obszary) {
      if (!obszaryIdsWKolejnosci.includes(o.id)) uporzadkowane.push(o);
    }
    const obszary = nadajKolejnosc(uporzadkowane);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  przesunObszar: async (sesjaId, obszarId, kierunek) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const idx = sesja.obszary.findIndex((o) => o.id === obszarId);
    if (idx < 0) return;
    const nowyIdx = idx + kierunek;
    if (nowyIdx < 0 || nowyIdx >= sesja.obszary.length) return;
    const kopia = [...sesja.obszary];
    const [el] = kopia.splice(idx, 1);
    kopia.splice(nowyIdx, 0, el);
    const obszary = nadajKolejnosc(kopia);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  usunObszar: async (sesjaId, obszarId) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const obszary = nadajKolejnosc(sesja.obszary.filter((o) => o.id !== obszarId));
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  zmienSkale: async (sesjaId, skala) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const obszary = przeliczObszarySkalą(sesja.obszary, skala);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId
        ? { ...s, skala, obszary, updatedAt: new Date().toISOString() }
        : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  zmienNazweObszaru: async (sesjaId, obszarId, nazwa) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => (o.id === obszarId ? { ...o, nazwa } : o)),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawRoleWezla: async (sesjaId, obszarId, idx, rola) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          return { ...o, wezlyRole: zastosujRoleWezla(o.wierzcholkiM, o.wezlyRole, idx, rola) };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKilometraz: async (sesjaId, obszarId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => (o.id === obszarId ? { ...o, ...dane } : o)),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawLiveObszaru: async (sesjaId, obszarId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          return {
            ...o,
            przejechaneMetry: dane.przejechaneMetry !== undefined
              ? Math.max(0, dane.przejechaneMetry)
              : o.przejechaneMetry,
            sumaTon: dane.sumaTon !== undefined ? Math.max(0, dane.sumaTon) : o.sumaTon,
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  sesjaPoId: (id) => get().sesje.find((s) => s.id === id),
}));
