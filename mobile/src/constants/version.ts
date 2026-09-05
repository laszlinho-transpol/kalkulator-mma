// ============================================================
// WERSJA APLIKACJI + lista zmian (changelog)
// ============================================================

export const WERSJA_APLIKACJI = '1.7.0';

export interface WpisChangelog {
  wersja: string;
  data: string;
  tytul?: string;
  zmiany: string[];
}

export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.7.0',
    data: '2026-09-05',
    tytul: 'Obmiar PZT – UX, skala, LIVE na wielokącie',
    zmiany: [
      'Nagłówek Obmiaru: tytuł w jednej linii z „Wstecz”, bez zbędnego podtytułu',
      'Usunięta niebieska ramka z wyjaśnieniem',
      'Przycisk „Nowy” na liście sesji',
      'Podgląd obszaru: zoom, przesuwanie, obrót; pełne zacieniowanie; centrowanie przy wyborze',
      'Ustaw skalę – presety i własny mianownik, przelicza m²',
      'Sesja dnia sumuje powierzchnię ze wszystkich XFDF',
      'Etap B: role START/KONIEC/LEWA/PRAWA, kilometraż, LIVE (metry/tony, zamalowanie)',
    ],
  },
  {
    wersja: '1.6.0',
    data: '2026-09-04',
    tytul: 'Obmiar PZT – import XFDF, kolejność obszarów, wiele PDF',
    zmiany: [
      'Nowy moduł Obmiar PZT (Niezbędnik): import wielokątów z XFDF PDF-XChange',
      'Automatyczne wyciąganie węzłów – bez Excela i „Tekst jako kolumny”',
      'Skala 1:500 (1 cm = 5 m) + przliczanie powierzchni w m²',
      'Kolejność układania obszarów (↑↓) – jak działki w LIVE',
      'Obszary z różnych PDF w jednej sesji dnia (kolejne importy XFDF)',
      'Podgląd SVG kształtu obszaru z węzłami',
    ],
  },
  {
    wersja: '1.5.9',
    data: '2026-07-06',
    tytul: 'LIVE – metry z auta / od startu, sumy Mg w bilansie',
    zmiany: [
      'LIVE: wybór wpisu metrów z auta lub odległości od startu (drugie pole liczy się auto)',
      'LIVE: „Gdzie dojechać” – od startu i z auta (np. 310 m / 32,5 m)',
      'LIVE: bilans – do wbudowania z sumą łączną w nawiasie (wbudowano + pozostało)',
      'Eksport HTML: te same poprawki w formularzu LIVE i bilansie',
    ],
  },
  {
    wersja: '1.5.8',
    data: '2026-07-06',
    tytul: 'LIVE – scalony szkic, HTML zsynchronizowany, Wyczyść LIVE',
    zmiany: [
      'LIVE: jeden przewijalny szkic całego planu dnia (skala live, auta czytelne)',
      'LIVE: modal odcinka 1→N liczy na całym planie, nie per działka',
      'LIVE: „Do końca metrów” w bilansie i niebieskim podsumowaniu',
      'LIVE: „Gdzie powinniśmy dojechać” przy dodawaniu auta (jak Kontrola)',
      'LIVE: przycisk „Wyczyść LIVE” – usuwa wszystkie auta i resetuje sesje',
      'Eksport HTML v3.1: ten sam LIVE co aplikacja (szkic, tabela, modal, Wyczyść)',
    ],
  },
  {
    wersja: '1.5.7',
    data: '2026-07-06',
    tytul: 'LIVE – scalony szkic i podsumowanie całego dnia',
    zmiany: [
      'LIVE: PlanCalySketch – ciągły odcinek wszystkich działek',
      'LIVE: podsumowanie odcinka od auta #1 na całym planie',
      'LIVE: metry do końca planu w bilansie i formularzu auta',
    ],
  },
  {
    wersja: '1.5.6',
    data: '2026-06-30',
    tytul: 'Kontrola całego dnia, podsumowanie planu, LIVE bez zakładek',
    zmiany: [
      'Kontrola: jeden odcinek na cały dzień (tony + metry od startu planu)',
      'Kontrola: pole „Gdzie powinniśmy dojechać” (metry wg wbudowanych ton)',
      'Plan: podsumowanie całego dnia (łączna masa, powierzchnia, auta)',
      'Tabela aut: reszta tonażu przechodzi na kolejną działkę (to samo auto #N)',
      'LIVE: tylko widok całości – bez zakładek działek',
      'LIVE: po usunięciu wszystkich aut start od pierwszej działki (czysta karta)',
      'Eksport HTML: Kontrola całego dnia, podsumowanie planu, LIVE bez zakładek działek',
    ],
  },
  {
    wersja: '1.5.5',
    data: '2026-06-30',
    tytul: 'LIVE – usuwanie aut, numeracja ciągła, HTML jak aplikacja',
    zmiany: [
      'LIVE: usunięcie auta kasuje wszystkie segmenty i odświeża bilans planu',
      'LIVE: po usunięciu aut – przenumerowanie 1…N, kolejne auto od właściwego numeru',
      'LIVE: bilans liczy unikalne auta (nie segmenty po rozbiciu)',
      'Szkic LIVE: naprawione czarne zamalowanie przy wielu działkach na ekranie',
      'Tabela aut (plan/HTML): ciągła numeracja między działkami (np. działka 4 od #18)',
      'Eksport HTML v3.0: tryb LIVE jak w aplikacji (bilans, auto-podział metrów, Całość)',
    ],
  },
  {
    wersja: '1.5.4',
    data: '2026-06-30',
    tytul: 'LIVE – automatyczny postęp między działkami',
    zmiany: [
      'LIVE: wpisujesz auto + metry – program sam liczy pozycję na działce',
      'LIVE: metry automatycznie przechodzą na kolejne działki (rozbicie jednego auta)',
      'LIVE: działka zamyka się sama po wypełnieniu metrami (bez ręcznego „Ostatnie auto”)',
      'LIVE: karta „Bilans całego planu” – łączna grubość, powierzchnia, tony',
      'LIVE: aktywna działka wybierana automatycznie z postępu robót',
    ],
  },
  {
    wersja: '1.5.3',
    data: '2026-06-26',
    tytul: 'Edycja figur, tabela aut całość, LIVE zbiorczy',
    zmiany: [
      'Planowanie: edycja i usuwanie figur (ikona ✎ w liście figur)',
      'Tabela aut: zakładka Całość + działki z ciągłą numeracją aut (bez pustych wierszy)',
      'LIVE: widok zbiorczy wszystkich działek (scroll w dół)',
      'LIVE: ciągła numeracja aut między działkami (np. auto 22 na 2. działce)',
      'LIVE: po „Ostatnie auto” automatyczne przejście do kolejnej działki',
      'Szkic LIVE: przejechane odcinki zamalowane na czarno',
    ],
  },
  {
    wersja: '1.5.2',
    data: '2026-06-26',
    tytul: 'Szkic LIVE – proporcje i przewijanie',
    zmiany: [
      'LIVE: szkic proporcjonalny do długości odcinka (długie pola czytelne po przewinięciu)',
      'LIVE: podział ekranu – przewijany szkic po lewej, statystyki po prawej',
      'Spójny wygląd szkicu w planie, archiwum i LIVE (ten sam komponent)',
      'Publikacja: wyraźniejsza informacja o google-service-account.json (szablon .example nie wystarczy)',
      'Skrypt publish-play-store.cmd: automatyczny upload gdy jest prawdziwy klucz JSON',
    ],
  },
  {
    wersja: '1.5.1',
    data: '2026-06-26',
    tytul: 'Naprawa otwierania planu po zapisie',
    zmiany: [
      'Naprawiono błąd „Maximum update depth exceeded” przy otwieraniu planu',
      'Plan zapisuje się poprawnie i można go edytować oraz udostępniać',
      'Bezpieczniejsza nawigacja po zapisie nowego planu',
    ],
  },
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
      'Test weryfikacyjny przed wydaniem (npm run verify)',
    ],
  },
];

export function najnowszyChangelog(): WpisChangelog {
  return CHANGELOG[0];
}

export const OSTATNI_CHANGELOG = CHANGELOG[0];
