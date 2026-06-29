// ============================================================
// WERSJA APLIKACJI + lista zmian (changelog)
// ============================================================

export const WERSJA_APLIKACJI = '1.5.0';

export interface WpisChangelog {
  wersja: string;
  data: string;
  tytul: string;
  zmiany: string[];
}

export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.5.0',
    data: '2026-06-26',
    tytul: 'Etap 11 – poprawki z testów + Niezbędnik masiarza',
    zmiany: [
      'Naprawa zapisywania planu (błąd Maximum update depth)',
      'Budowy bez planów na liście + archiwizuj / usuń',
      'Udostępnianie planu (JSON/HTML) z listy Zaplanuj masę',
      'Tabela aut: metry wg szerokości każdego pola',
      'Kontrola: poprawne kolorowanie grubości (zielony/pomarańczowy/czerwony)',
      'Menu: ikona aplikacji + sekcja Niezbędnik masiarza',
      'Kalkulatory: masa, geodezja (start), notatnik',
      'Mieszanki: „Lokalizacja wytwórni” zamiast długiego linku',
      'LIVE: przewijany szkic przy wielu autach',
      'Archiwum: bilans z porównaniem do planu, kilometraż, tabela Live jak plan',
      'PDF: informacja o budowie w pierwszym wierszu raportu',
      'Szkic wjazd/pierścień: kolorowanie z lewej do prawej w trybie Live',
      'Przywracanie budów z archiwum na liście Zaplanuj masę',
      'Kalkulatory: wydajność grubościowa, wskaźnik rozkładarki, geodezja (spadki, łuki, kąt prosty)',
      'SafeArea na ustawieniach i archiwum',
      'Testy zapisywania planów i tabeli aut',
    ],
  },
  {
    wersja: '1.4.1',
    data: '2026-06-26',
    tytul: 'Naprawa crashu przy starcie (Play Store)',
    zmiany: [
      'Naprawiono awarię przy otwieraniu aplikacji po aktualizacji z Play Store',
      'Poprawione wersje bibliotek natywnych (clipboard, webview, gesture-handler)',
      'Bezpieczniejszy start aplikacji – nawigacja dopiero gdy system jest gotowy',
      'Ekran błędu zamiast natychmiastowego zamykania aplikacji',
    ],
  },
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
