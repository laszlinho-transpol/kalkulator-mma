import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOMYSLNA_GRAFIKA, type GrafikaMaszyn } from './grafikaMaszyn';

const KLUCZ_USTAWIEN = '@mma:settings';

export interface Ustawienia {
  tonazDomyslny: number;
  grafikaMaszyn: GrafikaMaszyn;
}

const DOMYSLNE_USTAWIENIA: Ustawienia = {
  tonazDomyslny: 25.5,
  grafikaMaszyn: DOMYSLNA_GRAFIKA,
};

export async function pobierzUstawienia(): Promise<Ustawienia> {
  try {
    const json = await AsyncStorage.getItem(KLUCZ_USTAWIEN);
    if (json) {
      const z = JSON.parse(json) as Partial<Ustawienia>;
      return {
        ...DOMYSLNE_USTAWIENIA,
        ...z,
        grafikaMaszyn: { ...DOMYSLNA_GRAFIKA, ...z.grafikaMaszyn },
      };
    }
  } catch {
    /* uszkodzony zapis wraca do domyślnych */
  }
  return DOMYSLNE_USTAWIENIA;
}

export async function zapiszUstawienia(patch: Partial<Ustawienia>): Promise<void> {
  const aktualne = await pobierzUstawienia();
  await AsyncStorage.setItem(KLUCZ_USTAWIEN, JSON.stringify({ ...aktualne, ...patch }));
}
