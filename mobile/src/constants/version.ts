// ============================================================
// WERSJA APLIKACJI + lista zmian (changelog)
// ============================================================

export const WERSJA_APLIKACJI = '1.4.0';

export interface WpisChangelog {
  wersja: string;
  data: string;
  tytul: string;
  zmiany: string[];
}

export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.4.0',
    data: '2026-06-20',
    tytul: 'Etap 8 – poprawki z PDF',
    zmiany: [
      'Naprawiono awarię przy zapisywaniu i otwieraniu planu',
      'Puste listy: ikony jak w menu, wyśrodkowanie na ekranie',
      'Plan: grubość projektowa, tolerancja i grubość wbudowywania',
      'Wbudowywanie → zakładka Plan: tabela samochodów',
      'LIVE: kolorowanie przejechanej części w kształcie figury (bez ciemnej nakładki)',
      'LIVE: przycisk „Ostatnie auto” i zakończenie dniówki na działce',
      'Zakończenie LIVE z raportem PDF i archiwum pogrupowanym po budowach',
      'Mieszanki: wytwórnie z Google Maps (link, podgląd, kopiowanie, otwarcie w Maps)',
      'Wybór wytwórni przy dodawaniu mieszanki',
      'SafeArea na ekranie Import i w modalu auta na szkicu',
      'Załączniki PDF przypisane do budowy + zakładka PZT w wbudowywaniu',
    ],
  },
  {
    wersja: '1.3.0',
    data: '2026-06-20',
    tytul: 'Etap 7 – budowy i załączniki',
    zmiany: [
      'Grupowanie planów po budowach (nazwa inwestycji + kod)',
      'Listy mieszanek zwijane po wytwórni',
      'Edycja wpisu Live po dodaniu auta',
      'Szkic z kształtami geometrycznymi (trapez, trójkąt, pierścień, wjazd)',
      'Załączniki PDF/PZT w planie z podglądem',
      'Eksport HTML z trybem Live i import raportu z powrotem',
    ],
  },
];

export function najnowszyChangelog(): WpisChangelog {
  return CHANGELOG[0];
}
