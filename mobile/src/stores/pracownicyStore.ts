// Baza pracowników budżetu i ich raportów pracy. Raport sprzętu też wybiera osobę z tej listy.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OkresStawek, Pracownik, RaportPracownika } from '../budzet/typy';
import { rozdzielImieNazwisko, type StawkiPracownika } from '../budzet/pracownicy';
import { przeliczoneRaporty } from '../budzet/nieobecnosci';

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
  dodajRaporty: (dane: Omit<RaportPracownika, 'id' | 'createdAt'>[]) => Promise<string[]>;
  zmienRaport: (id: string, dane: Omit<RaportPracownika, 'id' | 'createdAt'>) => Promise<void>;
  usunRaport: (id: string) => Promise<void>;
  /** `null` usuwa odłożenie w miesiącu. */
  ustawGodzinyNaZime: (pracownikId: string, miesiac: string, godziny: number | null) => Promise<void>;
  raportyPracownika: (pracownikId: string) => RaportPracownika[];
}

export const usePracownicyStore = create<PracownicyStore>((set, get) => {
  /** Kwoty UW / L4 / R8 zależą od wcześniejszych wypłat – po każdej zmianie przeliczamy pracowników, których dotyczy. */
  const zapiszRaporty = async (raporty: RaportPracownika[], pracownicyIds: Set<string>) => {
    let wynik = raporty;
    for (const id of pracownicyIds) {
      const p = get().pracownicy.find((x) => x.id === id);
      if (p) wynik = przeliczoneRaporty(p, wynik);
    }
    set({ raporty: wynik });
    await AsyncStorage.setItem(KLUCZ_RAPORTY, JSON.stringify(wynik));
  };

  return {
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

  dodajRaport: async (dane) => (await get().dodajRaporty([dane]))[0],

  dodajRaporty: async (dane) => {
    const teraz = new Date().toISOString();
    const nowe: RaportPracownika[] = dane.map((d) => ({ ...d, id: generujId(), createdAt: teraz }));
    await zapiszRaporty([...get().raporty, ...nowe], new Set(nowe.map((r) => r.pracownikId)));
    return nowe.map((r) => r.id);
  },

  zmienRaport: async (id, dane) => {
    const stary = get().raporty.find((r) => r.id === id);
    if (!stary) return;
    const raporty = get().raporty.map((r) => (r.id === id ? { ...dane, id, createdAt: r.createdAt } : r));
    await zapiszRaporty(raporty, new Set([stary.pracownikId, dane.pracownikId]));
  },

  usunRaport: async (id) => {
    const stary = get().raporty.find((r) => r.id === id);
    if (!stary) return;
    await zapiszRaporty(get().raporty.filter((r) => r.id !== id), new Set([stary.pracownikId]));
  },

  ustawGodzinyNaZime: async (pracownikId, miesiac, godziny) => {
    const p = get().pracownicy.find((x) => x.id === pracownikId);
    if (!p) return;
    const odlozone = { ...(p.odlozoneNadgodziny ?? {}) };
    if (godziny == null || !(godziny > 0)) delete odlozone[miesiac];
    else odlozone[miesiac] = godziny;
    await get().aktualizuj(pracownikId, { odlozoneNadgodziny: odlozone });
    await zapiszRaporty(get().raporty, new Set([pracownikId]));
  },

  raportyPracownika: (pracownikId) => get().raporty
    .filter((r) => r.pracownikId === pracownikId)
    .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)),
  };
});
