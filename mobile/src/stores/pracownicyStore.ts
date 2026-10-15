// Baza pracowników budżetu i ich raportów pracy. Raport sprzętu też wybiera osobę z tej listy.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OkresStawek, Pracownik, RaportPracownika } from '../budzet/typy';
import { rozdzielImieNazwisko, type StawkiPracownika } from '../budzet/pracownicy';

const KLUCZ_STORAGE = '@mma:pracownicy';
const KLUCZ_RAPORTY = '@mma:pracownicy_raporty';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

type ZapisanyPracownik = Partial<Pracownik> & { id: string; imieNazwisko?: string; createdAt: string; updatedAt: string };

function odczytaj(zapis: ZapisanyPracownik): Pracownik {
  const { imieNazwisko, ...reszta } = zapis;
  const rozdzielone = reszta.nazwisko == null && imieNazwisko ? rozdzielImieNazwisko(imieNazwisko) : null;
  return {
    ...reszta,
    nazwisko: reszta.nazwisko ?? rozdzielone?.nazwisko ?? '',
    imie: reszta.imie ?? rozdzielone?.imie ?? '',
    stawki: reszta.stawki ?? {},
  };
}

type OkresPracownika = OkresStawek<StawkiPracownika>;

interface PracownicyStore {
  pracownicy: Pracownik[];
  raporty: RaportPracownika[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  dodaj: (dane: Omit<Pracownik, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  aktualizuj: (id: string, zmiany: Partial<Omit<Pracownik, 'id' | 'createdAt'>>) => Promise<void>;
  przelaczUlubiony: (id: string) => Promise<void>;
  dodajOkresStawek: (pracownikId: string, okres: Omit<OkresPracownika, 'id'>) => Promise<string | undefined>;
  zmienOkresStawek: (pracownikId: string, okres: OkresPracownika) => Promise<void>;
  usunOkresStawek: (pracownikId: string, okresId: string) => Promise<void>;
  dodajRaport: (dane: Omit<RaportPracownika, 'id' | 'createdAt'>) => Promise<string>;
  raportyPracownika: (pracownikId: string) => RaportPracownika[];
}

export const usePracownicyStore = create<PracownicyStore>((set, get) => ({
  pracownicy: [],
  raporty: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const [json, raportyJson] = await Promise.all([
        AsyncStorage.getItem(KLUCZ_STORAGE),
        AsyncStorage.getItem(KLUCZ_RAPORTY),
      ]);
      const zapisane: ZapisanyPracownik[] = json ? JSON.parse(json) : [];
      set({
        pracownicy: zapisane.map(odczytaj),
        raporty: raportyJson ? JSON.parse(raportyJson) : [],
        zaladowane: true,
      });
    } catch {
      set({ zaladowane: true });
    }
  },

  dodaj: async (dane) => {
    const teraz = new Date().toISOString();
    const nowy: Pracownik = { ...dane, id: generujId(), createdAt: teraz, updatedAt: teraz };
    const pracownicy = [...get().pracownicy, nowy];
    set({ pracownicy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(pracownicy));
    return nowy.id;
  },

  aktualizuj: async (id, zmiany) => {
    const pracownicy = get().pracownicy.map((p) => (
      p.id === id
        ? { ...p, ...zmiany, id: p.id, createdAt: p.createdAt, updatedAt: new Date().toISOString() }
        : p
    ));
    set({ pracownicy });
    await AsyncStorage.setItem(KLUCZ_STORAGE, JSON.stringify(pracownicy));
  },

  przelaczUlubiony: async (id) => {
    const p = get().pracownicy.find((x) => x.id === id);
    if (p) await get().aktualizuj(id, { ulubiony: !p.ulubiony });
  },

  dodajOkresStawek: async (pracownikId, okres) => {
    const p = get().pracownicy.find((x) => x.id === pracownikId);
    if (!p) return undefined;
    const nowy: OkresPracownika = { ...okres, id: generujId() };
    await get().aktualizuj(pracownikId, { historiaStawek: [...(p.historiaStawek ?? []), nowy] });
    return nowy.id;
  },

  zmienOkresStawek: async (pracownikId, okres) => {
    const p = get().pracownicy.find((x) => x.id === pracownikId);
    if (!p) return;
    await get().aktualizuj(pracownikId, {
      historiaStawek: (p.historiaStawek ?? []).map((jest) => (jest.id === okres.id ? okres : jest)),
    });
  },

  usunOkresStawek: async (pracownikId, okresId) => {
    const p = get().pracownicy.find((x) => x.id === pracownikId);
    if (!p) return;
    await get().aktualizuj(pracownikId, {
      historiaStawek: (p.historiaStawek ?? []).filter((okres) => okres.id !== okresId),
    });
  },

  dodajRaport: async (dane) => {
    const raport: RaportPracownika = { ...dane, id: generujId(), createdAt: new Date().toISOString() };
    const raporty = [...get().raporty, raport];
    set({ raporty });
    await AsyncStorage.setItem(KLUCZ_RAPORTY, JSON.stringify(raporty));
    return raport.id;
  },

  raportyPracownika: (pracownikId) => get().raporty
    .filter((r) => r.pracownikId === pracownikId)
    .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)),
}));
