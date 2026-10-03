// ============================================================
// WERSJA APLIKACJI + lista zmian (changelog)
// ============================================================

export const WERSJA_APLIKACJI = '1.8.13';

/** SHA wdrożenia Pages (`EXPO_PUBLIC_MMA_BUILD`) – widać, czy przeglądarka nie trzyma starego JS. */
export const MMA_WEB_BUILD =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_MMA_BUILD) || 'dev';

export interface WpisChangelog {
  wersja: string;
  data: string;
  tytul?: string;
  zmiany: string[];
}

export const CHANGELOG: WpisChangelog[] = [
  {
    wersja: '1.8.13',
    data: '2026-10-03',
    tytul: 'Szkic – START i KONIEC nie zasłaniają rysunku',
    zmiany: [
      'Napis START leży wzdłuż osi przed kreską startu, KONIEC za kreską końca – stały, mały rozmiar przy zoomie',
      'Biała kropka rozkładarki nie stoi na starcie, gdy nic jeszcze nie ułożono',
    ],
  },
  {
    wersja: '1.8.12',
    data: '2026-10-03',
    tytul: 'Plan – tabela aut nie wiesza otwarcia',
    zmiany: [
      'Wejście w zapisany plan liczy tabelę aut do końca – reszta poniżej 0,001 t nie kręci pętli',
    ],
  },
  {
    wersja: '1.8.11',
    data: '2026-10-03',
    tytul: 'Plan – otwieranie i usuwanie bez zawieszenia',
    zmiany: [
      'Zapisany plan otwiera się od razu – bez przeliczania PZT co 1 m przy starcie',
      'Usuń działa w przeglądarce (potwierdzenie + osobny przycisk, nie otwiera planu)',
    ],
  },
  {
    wersja: '1.8.10',
    data: '2026-10-03',
    tytul: 'Plan – dokładny obmiar m², nie średnia szerokość',
    zmiany: [
      '26 t → powierzchnia = masa / (grubość × gęstość), potem rzeczywista długość wzdłuż obrysu PZT',
      'Rozjazd na pierwszych metrach: to samo auto kładzie krócej niż przy stałej równej szerokości',
      'Profil obmiaru co 1 m (stała jezdnia scalana); stare plany przeliczane z projektu przy podglądzie',
    ],
  },
  {
    wersja: '1.8.9',
    data: '2026-10-03',
    tytul: 'Plan – kierunek malejący, zmienna szerokość, szkic zakresu',
    zmiany: [
      'Start 114+020 → koniec 113+605: działka i tabela aut idą malejąco (nie 114+067 w górę)',
      'Metry auta z szerokości PZT co 10 m – przy 26 t nie ma równych 46,68 m na zwężeniach i poszerzeniach',
      'Szkic: poprzeczki jak szerokość jezdni, zielony START i czerwony KONIEC zakresu',
      'Zmierz: punkty A/B skalują się z planem i przybliżeniem',
    ],
  },
  {
    wersja: '1.8.8',
    data: '2026-10-03',
    tytul: 'Zaplanuj masę – 0 cm = obrys, bez odsadzki przy krawężniku',
    zmiany: [
      '0 cm w planie to sam obrys PZT – odsadzka z konstrukcji (np. 15 cm) nie dodaje się sama',
      'Dodatnia odsadzka poszerza tylko tam, gdzie nie ma krawężnika; przy krawężniku zostaje obrys',
      'Ujemna nadal zwęża (np. −10 cm)',
    ],
  },
  {
    wersja: '1.8.7',
    data: '2026-10-03',
    tytul: 'Zaplanuj masę – korekta odsadzki, także ujemna',
    zmiany: [
      'Odsadzki w planie to korekta względem konstrukcji: 0 cm = odsadzka z warstwy (np. podbudowa 15 cm L)',
      'Ujemna korekta zwęża (np. −10 cm = 10 cm węziej niż konstrukcja); dodatnia poszerza i dolicza się drugi raz',
      'Stare plany bez korekty przeliczają się jak wcześniej (wartość wobec obrysu PZT)',
    ],
  },
  {
    wersja: '1.8.6',
    data: '2026-09-08',
    tytul: 'Obmiar – tło PZT z PDF',
    zmiany: [
      'Tło pod obszarem: ten sam PDF co w PDF-XChange (strona z poligonami) albo JPG/PNG',
      'Zoom i przesuwanie ruszają tło razem z obszarem – widać miejsca charakterystyczne w terenie',
      'Strona PDF, przezroczystość 35/50/70%, „Odwróć pion” gdy mapa jest lustrzana',
      'To samo tło na szkicach Plan i LIVE we Wbudowywaniu',
    ],
  },
  {
    wersja: '1.8.5',
    data: '2026-09-08',
    tytul: 'Obmiar – kłódka, czytelna odsadzka, scroll w wbudowywaniu',
    zmiany: [
      'Kłódka otwarta do ustawienia; po Zatwierdź się zamyka; ponowne kliknięcie otwiera edycję',
      'Odsadzka: zaznacz na mapie (P1/K1, można przewinąć do podglądu), lewa/prawa krawędź z całością, plusem i kilometrażem od–do w jednym wierszu',
      'Wbudowywanie Plan/LIVE: przywrócony scroll i wpisywanie aut (Ramka tylko gdy chcesz przesuwać szkic)',
      'Lista Wbudowywanie: rozwijane budowy, edycja i usuwanie każdego planu',
    ],
  },
  {
    wersja: '1.8.4',
    data: '2026-09-07',
    tytul: 'Obmiar – odsadzka od osi, plan dnia, zapis do wbudowywania',
    zmiany: [
      'Odsadzka: odbicie zewnętrzne od osi, wewnętrzne w kierunku osi; nowa linia pomarańczowa ciągła, stara szara przerywana',
      'Pan/zoom podglądu także przy wciśniętym wyborze węzła; „Wyczyść” przy pomiarze odległości',
      'Układ: Kolejność układania → podgląd + skala → 1 Start/Koniec, 2 Odsadzka, 3 Konstrukcja, 4 Zatwierdź (kłódka)',
      'Plan dnia (zamiast sesji dnia): data, powierzchnia i masa po mieszankach/grubościach, auta per mieszanka, kursy',
      'Zapisz plan → Wbudowywanie: Plan (PZT + rozpiska), Kontrola, LIVE (WZ, szkice obszarów, bilans, koniec mieszanki)',
    ],
  },
  {
    wersja: '1.8.3',
    data: '2026-09-07',
    tytul: 'Obmiar – ostry SVG, maszyny, WZ/Kontrola, archiwum',
    zmiany: [
      'Podgląd: zoom/pan/obrót w SVG (wektor) – obszar, węzły i kilometraż zostają ostre przy dużym przybliżeniu',
      'Ułożony odcinek ciemnoszary; rozkładarka i auta jako SVG na osi, między bokami L/P',
      'WZ: dwa pola (metry z auta i od startu) przeliczają się nawzajem',
      'Zakładki WZ i Kontrola (bilans jak we wbudowywaniu)',
      'Raport WZ do archiwum z budową, eksportem PDF i wysyłką na e-mail',
    ],
  },
  {
    wersja: '1.8.2',
    data: '2026-09-07',
    tytul: 'Obmiar – zoom jak PDF, odsadzki po km, edycja WZ',
    zmiany: [
      'Podgląd: lupka −/+, presety 10%…6400% i odczyt procentu; węzły, kreski i maszyny w metrach terenu (nie puchną przy zbliżeniu)',
      'Kilometraż co 100 m zostaje czytelny (etykiety stałej wielkości na ekranie); gesty na całym białym polu ramki',
      'Checkbox „Ramka” – zaznaczony blokuje scroll strony, tylko przesuwanie/zoom obszaru',
      'Odsadzka także po kilometrażu (lewa/prawa krawędź, od–do, np. 1+300…1+400 o 0,1 m) + edycja i usuwanie z przeliczeniem m²',
      'WZ: edycja i usuwanie auta; po usunięciu postęp od ostatniego WZ; grubość z auta jak w LIVE',
    ],
  },
  {
    wersja: '1.8.1',
    data: '2026-09-07',
    tytul: 'Obmiar – stabilny podgląd, kilometraż, WZ',
    zmiany: [
      'Bez bezwładności na podglądzie – obrys nie znika, scroll się nie blokuje; przycisk celownika przywraca widok',
      'Kilometraż wszędzie jako dwa pola [km] + [m] (puste km = 0, np. 450 → 0+450)',
      'Kierunek rosnący/malejący i automatyczny kilometraż końca z osi figury',
      'WZ: z tonażu i grubości liczone metry; kontynuacja obszaru w kolejności dnia',
      'Mniejsze węzły, bez etykiet SL/SP – kolor linii start/koniec',
    ],
  },
  {
    wersja: '1.8.0',
    data: '2026-09-06',
    tytul: 'Obmiar – podgląd jak Maps, konfiguracja L/P, WZ',
    zmiany: [
      'Podgląd obszaru jak Google Maps: pinch w punkcie między palcami, obrót, bezwładność — tylko w białej ramce',
      'Konfiguracja: start/koniec L i P + kilometraż podstaw, odsadzki O1/O2, pomiar odległości, blokada edycji',
      'Układanie z WZ: recepta i grubość jak w Zaplanuj masę; auta z numerem na rysunku, klik = bilans',
      'Maszyny (widok z góry) tylko podczas układania, przód zgodnie z kierunkiem jazdy, nie zasłaniają węzłów',
    ],
  },
  {
    wersja: '1.7.1',
    data: '2026-09-05',
    tytul: 'Obmiar – odsadzki, pikiety co 100 m, maszyny LIVE',
    zmiany: [
      'Odsadzka krawędzi: przesunięcie o cm na zewnątrz/do wewnątrz z automatycznym Δ m² (np. 100 m × 10 cm ≈ +10 m²)',
      'Automatyczne pełne kilometraże na obszarze co 100 m (np. start 1+830 → 1+900, 2+000…)',
      'LIVE: grafiki rozkładarki i samochodu na podglądzie, obrót zgodny z kierunkiem jazdy',
    ],
  },
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
