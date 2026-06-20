// ============================================================
// USTAWIENIA APLIKACJI – tonaż, motyw, wersja
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export const KLUCZ_USTAWIEN = '@mma:settings';
export const WERSJA_APLIKACJI = '1.1.0';

export type MotywPreferencja = 'auto' | 'dark' | 'light';

export interface Ustawienia {
  tonazDomyslny: number;
  motyw: MotywPreferencja;
}

export const DOMYSLNE_USTAWIENIA: Ustawienia = {
  tonazDomyslny: 25.5,
  motyw: 'auto',
};

export interface WpisChangelog {
  wersja: string;
  data: string;
  zmiany: string[];
}

export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.1.0',
    data: '2026-06-20',
    zmiany: [
      'Wybór motywu: automatyczny, ciemny lub jasny w ustawieniach',
      'Poprawione marginesy SafeArea na wszystkich ekranach i modalach',
      'Grupowanie mieszanek według wytwórni',
      'Przywrócony boczny widok wywrotek na szkicu Live',
      'Przycisk „Zakończ działkę" w trybie Live',
      'Szkic trasy bardziej czytelny – większa skala i przewijanie',
      'Tony zaokrąglane do 2 miejsc po przecinku',
      'Naprawione udostępnianie planu jako HTML',
      'Poprawione zliczanie samochodów w podsumowaniu planu',
    ],
  },
  {
    wersja: '1.0.0',
    data: '2026-06-19',
    zmiany: [
      'Pierwsza wersja: mieszanki, planowanie, wbudowywanie Live, archiwum',
      'Eksport PDF, JSON i interaktywny HTML',
      'Import planów z pliku JSON',
      'Onboarding i animacje',
    ],
  },
];

export async function pobierzUstawienia(): Promise<Ustawienia> {
  try {
    const json = await AsyncStorage.getItem(KLUCZ_USTAWIEN);
    if (json) return { ...DOMYSLNE_USTAWIENIA, ...JSON.parse(json) };
  } catch {}
  return DOMYSLNE_USTAWIENIA;
}

export async function zapiszUstawienia(u: Ustawienia): Promise<void> {
  await AsyncStorage.setItem(KLUCZ_USTAWIEN, JSON.stringify(u));
}
