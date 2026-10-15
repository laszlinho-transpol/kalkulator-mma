// Baza sprzętu i raportów pracy maszyn.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OkresStawek, RaportSprzetu, Sprzet } from '../budzet/typy';
import { round2 } from '../utils/calculations';

const KLUCZ_SPRZET = '@mma:sprzet';
const KLUCZ_RAPORTY = '@mma:sprzet_raporty';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

interface SprzetStore {
  sprzet: Sprzet[];
  raporty: RaportSprzetu[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  dodajSprzet: (dane: Omit<Sprzet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  aktualizujSprzet: (id: string, zmiany: Partial<Omit<Sprzet, 'id' | 'createdAt'>>) => Promise<void>;
  dodajOkresStawek: (sprzetId: string, okres: Omit<OkresStawek, 'id'>) => Promise<string | undefined>;
  zmienOkresStawek: (sprzetId: string, okres: OkresStawek) => Promise<void>;
  usunOkresStawek: (sprzetId: string, okresId: string) => Promise<void>;
  dodajRaport: (dane: Omit<RaportSprzetu, 'id' | 'createdAt' | 'kwota'> & { kwota?: number }) => Promise<string>;
  raportySprzetu: (sprzetId: string) => RaportSprzetu[];
}

export const useSprzetStore = create<SprzetStore>((set, get) => ({
  sprzet: [],
  raporty: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const [sprzetJson, raportyJson] = await Promise.all([
        AsyncStorage.getItem(KLUCZ_SPRZET),
        AsyncStorage.getItem(KLUCZ_RAPORTY),
      ]);
      set({
        sprzet: sprzetJson ? JSON.parse(sprzetJson) : [],
        raporty: raportyJson ? JSON.parse(raportyJson) : [],
        zaladowane: true,
      });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodajSprzet: async (dane) => {
    const teraz = new Date().toISOString();
    const nowy: Sprzet = { ...dane, id: generujId(), createdAt: teraz, updatedAt: teraz };
    const sprzet = [...get().sprzet, nowy];
    set({ sprzet });
    await AsyncStorage.setItem(KLUCZ_SPRZET, JSON.stringify(sprzet));
    return nowy.id;
  },

  aktualizujSprzet: async (id, zmiany) => {
    const sprzet = get().sprzet.map((pozycja) => (
      pozycja.id === id
        ? { ...pozycja, ...zmiany, id: pozycja.id, createdAt: pozycja.createdAt, updatedAt: new Date().toISOString() }
        : pozycja
    ));
    set({ sprzet });
    await AsyncStorage.setItem(KLUCZ_SPRZET, JSON.stringify(sprzet));
  },

  dodajOkresStawek: async (sprzetId, okres) => {
    const maszyna = get().sprzet.find((pozycja) => pozycja.id === sprzetId);
    if (!maszyna) return undefined;
    const nowy: OkresStawek = { ...okres, id: generujId() };
    await get().aktualizujSprzet(sprzetId, { historiaStawek: [...(maszyna.historiaStawek ?? []), nowy] });
    return nowy.id;
  },

  zmienOkresStawek: async (sprzetId, okres) => {
    const maszyna = get().sprzet.find((pozycja) => pozycja.id === sprzetId);
    if (!maszyna) return;
    const historia = (maszyna.historiaStawek ?? []).map((jest) => (jest.id === okres.id ? okres : jest));
    await get().aktualizujSprzet(sprzetId, { historiaStawek: historia });
  },

  usunOkresStawek: async (sprzetId, okresId) => {
    const maszyna = get().sprzet.find((pozycja) => pozycja.id === sprzetId);
    if (!maszyna) return;
    await get().aktualizujSprzet(sprzetId, {
      historiaStawek: (maszyna.historiaStawek ?? []).filter((okres) => okres.id !== okresId),
    });
  },

  dodajRaport: async (dane) => {
    const kwota = round2(dane.pozycje.reduce((s, p) => s + p.kwota, 0));
    const raport: RaportSprzetu = {
      ...dane,
      kwota,
      id: generujId(),
      createdAt: new Date().toISOString(),
    };
    const raporty = [...get().raporty, raport];
    set({ raporty });
    await AsyncStorage.setItem(KLUCZ_RAPORTY, JSON.stringify(raporty));
    return raport.id;
  },

  raportySprzetu: (sprzetId) => get().raporty
    .filter((r) => r.sprzetId === sprzetId)
    .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)),
}));
