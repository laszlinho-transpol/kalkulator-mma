// Okienka „Zasada działania”: które strony mają schowany samouczek (przycisk „i” w nagłówku).

import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { odczytajUkryte, przelaczUkryta } from '../utils/zasady';

const KLUCZ = '@mma:zasadyUkryte';

interface ZasadyStore {
  ukryte: string[];
  wczytane: boolean;
  wczytaj: () => Promise<void>;
  przelacz: (klucz: string) => Promise<void>;
}

export const useZasadyStore = create<ZasadyStore>((set, get) => ({
  ukryte: [],
  wczytane: false,

  wczytaj: async () => {
    if (get().wczytane) return;
    try {
      set({ ukryte: odczytajUkryte(await AsyncStorage.getItem(KLUCZ)), wczytane: true });
    } catch {
      set({ wczytane: true });
    }
  },

  przelacz: async (klucz) => {
    const nowe = przelaczUkryta(get().ukryte, klucz);
    set({ ukryte: nowe });
    await AsyncStorage.setItem(KLUCZ, JSON.stringify(nowe));
  },
}));

/** Czy okienko zasady działania tej strony jest pokazane (domyślnie tak, dopóki go nie schowasz). */
export function useZasadaWidoczna(klucz: string): { widoczna: boolean; przelacz: () => void } {
  const wczytane = useZasadyStore((s) => s.wczytane);
  const ukryta = useZasadyStore((s) => s.ukryte.includes(klucz));
  const przelacz = useZasadyStore((s) => s.przelacz);
  useEffect(() => {
    if (!wczytane) void useZasadyStore.getState().wczytaj();
  }, [wczytane]);
  return { widoczna: wczytane && !ukryta, przelacz: () => { void przelacz(klucz); } };
}
