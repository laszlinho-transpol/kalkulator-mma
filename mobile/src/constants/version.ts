// ============================================================
// WERSJA APLIKACJI – jedno źródło prawdy
// ============================================================

export const WERSJA_APLIKACJI = '1.3.0';

export interface WpisChangelog {
  wersja: string;
  data: string;
  zmiany: string[];
}

/** Lista zmian – najnowsza wersja na górze */
export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.3.0',
    data: '2026-06-23',
    zmiany: [
      'Porządkowanie projektu – tylko aplikacja mobilna',
      'Budowy i listy zwijane (mieszanki, plany)',
      'Tryb Live w eksporcie HTML + import raportu',
      'Załączniki PDF/PZT z podglądem',
      'Edycja auta w trybie Live przed usunięciem',
      'Szkic z kształtami geometrycznymi',
      'Test weryfikacyjny przed wydaniem (npm run verify)',
    ],
  },
  {
    wersja: '1.2.0',
    data: '2026-06-20',
    zmiany: [
      'Etap 7: grupowanie po wytwórniach i budowach',
      'SafeModal i globalne style tekstu',
      'Instrukcja publikacji Google Play',
    ],
  },
  {
    wersja: '1.1.0',
    data: '2026-06-19',
    zmiany: [
      'Motyw jasny/ciemny, poprawki po testach S24 Ultra',
      'Naprawa eksportu HTML i zliczania aut',
    ],
  },
  {
    wersja: '1.0.0',
    data: '2026-06-19',
    zmiany: [
      'Pierwsza wersja: mieszanki, plany, Live, archiwum, PDF',
    ],
  },
];

export const OSTATNI_CHANGELOG = CHANGELOG[0];
