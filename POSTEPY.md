# POSTEPY – KALKULATOR MMA
# Dziennik postępów projektu

---

## ETAP 0 – START PROJEKTU
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **Analiza specyfikacji** – Przeczytano i przeanalizowano plik `cel_projektu.pdf`.
   Zrozumiano cztery główne moduły aplikacji: Mieszanki, Zaplanuj Masę, Wbudowywanie, Archiwum.

2. **Wybór technologii** (zatwierdzony przez właściciela):
   - React Native + Expo SDK 56
   - TypeScript
   - Expo Router (nawigacja plikowa)
   - Zustand (stan globalny)
   - AsyncStorage (dane lokalne, offline-first)
   - expo-print, expo-sharing, expo-mail-composer
   - react-native-svg
   - @react-native-community/datetimepicker

3. **Inicjalizacja projektu** w katalogu `/workspace/mobile/`:
   - Projekt Expo z szablonem `blank-typescript`
   - Zainstalowane wszystkie wymagane paczki
   - Skonfigurowany `app.json` (nazwa "Kalkulator MMA", tryb auto dark/light, scheme)

4. **Struktura katalogów** – utworzono:
   ```
   mobile/
   ├── app/               (ekrany – Expo Router)
   │   ├── _layout.tsx    (root layout, ładowanie store'ów)
   │   ├── index.tsx      (ekran główny – 4 kafelki)
   │   ├── mieszanki/     (CRUD mieszanek)
   │   ├── plan/          (lista planów + tworzenie)
   │   ├── wbudowywanie/  (realizacja live)
   │   └── archiwum/      (zakończone roboty)
   ├── src/
   │   ├── components/common/  (ThemedView, ThemedText, InfoTooltip)
   │   ├── components/shapes/  (formularze figur – do zrobienia)
   │   ├── components/sketch/  (wizualizacja 2D – do zrobienia)
   │   ├── stores/             (mieszankiStore, planyStore, liveStore)
   │   ├── utils/              (calculations.ts, chainage.ts)
   │   ├── types/index.ts      (definicje TypeScript)
   │   └── constants/          (index.ts, theme.ts)
   └── assets/svg/             (SVG: rozkładarka, auto – do zrobienia)
   ```

5. **Pliki konfiguracyjne**:
   - `.clinerules` – zasady projektu i Trzy Żelazne Zasady
   - `POSTEPY.md` – ten plik

6. **Implementacja bazowa**:
   - ✅ `src/types/index.ts` – pełny model danych TypeScript (Mieszanka, Plan, Figura, Live)
   - ✅ `src/constants/index.ts` – stałe (tonaz 25.5t, kolory, format pikietażu)
   - ✅ `src/constants/theme.ts` – lightTheme / darkTheme
   - ✅ `src/utils/calculations.ts` – wzory na powierzchnię wszystkich figur, masa, kontrola
   - ✅ `src/utils/chainage.ts` – pikietaż ciągły (format km+mmm, dziedziczenie)
   - ✅ `src/stores/mieszankiStore.ts` – Zustand + AsyncStorage (CRUD)
   - ✅ `src/stores/planyStore.ts` – Zustand + AsyncStorage (CRUD planów)
   - ✅ `src/stores/liveStore.ts` – Zustand + AsyncStorage (wpisy live)
   - ✅ `src/components/common/ThemedView.tsx`
   - ✅ `src/components/common/ThemedText.tsx`
   - ✅ `src/components/common/InfoTooltip.tsx` – ikonka "i" z modalem
   - ✅ `app/_layout.tsx` – root layout z ładowaniem store'ów
   - ✅ `app/index.tsx` – ekran główny (4 kafelki + 3 statystyki)
   - ✅ `app/mieszanki/index.tsx` – lista mieszanek + formularz Dodaj/Edytuj
   - ✅ `app/plan/index.tsx` – lista aktywnych planów
   - ✅ `app/wbudowywanie/index.tsx` – lista aktywnych planów do realizacji
   - ✅ `app/archiwum/index.tsx` – lista archiwalnych planów

### Na jakim etapie jesteśmy:
Fundament aplikacji jest gotowy. Mamy działającą strukturę nawigacji, system motywów,
modele danych i store'y. Ekran główny i lista mieszanek są funkcjonalne.

---

---

## ETAP 1 – Rdzeń aplikacji (pełna funkcjonalność)
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **Naprawiono i rozszerzono obliczenia** (`src/utils/calculations.ts`):
   - Poprawiono `obliczTabeleAut` – używa metrów liniowych (nie m²) dla kolumny "m"
   - Dodano `obliczLacznaDlugosc`, `parsujRzuty`, `walidujRzuty`, `generujDomyslneRzuty`
   - Poprawiono `obliczKontrolę` – prawidłowe obliczenia pozostałych metrów/masy

2. **Nowe utilities**:
   - ✅ `src/utils/dates.ts` – następny dzień roboczy, formatowanie dat, aktualna godzina
   - ✅ `src/utils/pdfGenerator.ts` – generator raportu HTML→PDF z bilansem końcowym

3. **Nowe komponenty**:
   - ✅ `src/components/common/NumericInput.tsx` – input numeryczny z jednostką i tooltipem
   - ✅ `src/components/common/DatePickerButton.tsx` – cross-platform date picker (iOS/Android)
   - ✅ `src/components/common/MieszankaPicker.tsx` – modal wyboru mieszanki z bazy
   - ✅ `src/components/shapes/ShapeModal.tsx` – picker 5 figur + formularze wymiarów
   - ✅ `src/components/sketch/DzialkaSketch.tsx` – wizualizacja 2D (bloki figur + pikietaże + modal po kliknięciu)

4. **Nowe ekrany**:
   - ✅ `app/plan/nowy.tsx` – pełny formularz: data, tonaż, licznik działek, mieszanka, grubość, pikietaż, kierunek, figury, rzuty, podgląd obliczeń
   - ✅ `app/plan/[id].tsx` – szczegóły planu (3 zakładki: Plan, Tabela aut, Szkic)
   - ✅ `app/wbudowywanie/[id].tsx` – Live Tracker (3 zakładki: Plan, Kontrola, Live)
     - Kontrola: porównanie faktyczne vs plan z kolorowym bilansmem i piktogramami grubości
     - Live: tabela wpisów aut, formularz dodawania, szkic z postępem, "Zakończ i archiwizuj"
   - ✅ `app/archiwum/[id].tsx` – szczegóły archiwum (Podsumowanie, Tabela Live, Szkic, generowanie PDF)

5. **Poprawki typów TypeScript**:
   - `AppTheme = typeof lightTheme | typeof darkTheme` (union type)
   - Wszystkie komponenty pomocnicze używają `AppTheme`

**Weryfikacja**: `npx tsc --noEmit` → **0 błędów** ✅

---

---

## ETAP 2 – Live SVG + Udostępnianie
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **SVG: Rozkładarka** (`assets/svg/Rozkladarka.tsx`):
   - Widok z boku – kabina, skrzynia zasypowa (hopper), stół wyrównujący (screed) z elementami grzewczymi
   - Obsługa kierunku pracy (rosnący/malejący = obrót SVG)
   - Kolor: pomarańczowy (#E8A020)

2. **SVG: Wywrotka** (`assets/svg/Wywrotka.tsx`):
   - Widok z boku – kabina, skrzynia wywrotu z numerem auta na skrzyni
   - Numer widoczny na materiale wywrotu (żądanie z PDF)

3. **DzialkaSketch – tryb Live** (przepisany na SVG):
   - Nakładka 70% czarnego na całą działkę (surowe podłoże)
   - Nakładka 100% czarnego na część wykonaną (świeży asfalt)
   - Żółta linia granicy wykonania
   - Rozkładarka SVG przesuwa się do bieżącego frontu robót
   - Linie przerywane na końcu każdego auta
   - Ikony wywrotek z lewej strony szkicu (klikalne)
   - Pikietaże po prawej stronie

4. **Modal kliknięcia auta** w wbudowywanie/[id].tsx:
   - Otwiera się po kliknięciu ikony wywrotki na szkicu
   - Pokazuje: tonaż, metry, zakrytą powierzchnię, uzyskaną grubość (z ▲▼), bilans masy (zielony/czerwony)
   - Komentarz kierowcy jeśli podany

5. **Udostępnianie** (modale z opcjami):
   - Eksport JSON: `eksportujJSON()` → plik .json przez share sheet
   - Interaktywny HTML: `generujInteraktywnyHTML()` → samodzielny offline kalkulator z zakładkami Plan/Kontrola/Tabela aut
   - Modal udostępniania w planie (JSON + HTML)
   - Modal udostępniania w archiwum (PDF + email + JSON + HTML)
   - Wysyłka e-mail: `expo-mail-composer`

**Weryfikacja**: `npx tsc --noEmit` → 0 błędów ✅ | `npx expo-doctor` → 21/21 ✅

---

---

## ETAP 3 – Animacje, Ikona, Onboarding, Import JSON
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **Ikona aplikacji** (wygenerowana AI):
   - `assets/icon.png` – ikona główna (rozkładarka + droga + "MMA")
   - `assets/android-icon-foreground.png` – warstwa przodowa Android
   - `assets/android-icon-background.png` – ciemne tło Android
   - `app.json` zaktualizowany (name: "Kalkulator MMA", scheme: "kalkulator-mma")

2. **Onboarding** (`app/onboarding.tsx`):
   - 4 slajdy z paginacją (ScrollView pagingEnabled)
   - Animacje fade + spring przy zmianie slajdu
   - Animowany wskaźnik dot (szerokość 24px gdy aktywny, 8px gdy nieaktywny)
   - Przycisk "Pomiń" (prawy górny róg)
   - Przycisk "Dalej →" / "Zacznij pracę →"
   - Zapis do AsyncStorage (`@mma:onboardingComplete`) po zakończeniu
   - `_layout.tsx` sprawdza flagę i przekierowuje do onboardingu jeśli pierwsze uruchomienie

3. **Animacje**:
   - `AnimatedCard` – fade + spring slide-in przy wejściu na ekran (z opóźnieniem kaskadowym)
   - `AnimatedCounter` – licznik odliczający do wartości docelowej (strona główna: mieszanki/aktywne/archiwum)
   - `AnimatedTabBar` – pasek zakładek z animowanym wskaźnikiem (translateX timing 220ms)
   - `PressableScale` – efekt "wciśnięcia" kafelka przy dotknięciu (spring scale 0.96→1.0)
   - Kaskadowe animacje kafelków na ekranie głównym (delay co 80ms)
   - Nagłówek Home: animacja fade + slide-down przy starcie
   - Przejścia ekranów (Expo Router): `slide_from_right`, `slide_from_bottom` (nowy plan), `fade` (Home/Onboarding)
   - AnimatedTabBar we wszystkich 3 ekranach z zakładkami (Plan, Wbudowywanie, Archiwum)
   - AnimatedCard na liście mieszanek (fade kaskadowy)

4. **Import JSON** (`app/plan/import.tsx`):
   - Picker pliku (`expo-document-picker`)
   - Parsowanie i walidacja struktury
   - Podgląd przed importem (data, działki, mieszanki)
   - Auto-import brakujących mieszanek
   - Generacja nowego ID (brak konfliktów)
   - Przycisk "↓ Import" na liście planów
   - `src/utils/jsonImporter.ts` – funkcja `importujJSON()`

**Weryfikacja**: `npx tsc --noEmit` → 0 błędów ✅

---

---

## ETAP 4 – Edycja planu, Loading screen, Ustawienia, Empty states
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **Edycja planu** – refaktoryzacja formularza do reużywalnego komponentu:
   - `src/components/plan/PlanForm.tsx` – główny formularz (nowy + edycja)
   - Funkcje konwersji: `dzialkaDoFormu()`, `formDoDzialki()`
   - `app/plan/nowy.tsx` – uproszczony wrapper (12 linii)
   - `app/plan/edytuj/[id].tsx` – wrapper z istniejącymi danymi
   - Przycisk "✏ Edytuj" w szczegółach aktywnego planu

2. **Loading screen** (`src/components/common/LoadingScreen.tsx`):
   - Animowane logo MMA (spring scale + fade-in)
   - Animowany pasek postępu (timing)
   - Fade-out do zera po załadowaniu danych
   - Integracja z `_layout.tsx` (widoczny podczas ładowania AsyncStorage)

3. **Ekran Ustawień** (`app/ustawienia.tsx`):
   - Dostęp: ikona ⚙ w nagłówku ekranu głównego
   - Statystyki bazy (mieszanki, plany, wpisy)
   - Edytowalny domyślny tonaż auta (zapis do AsyncStorage)
   - Reset onboardingu (pokaże ekran powitalny przy kolejnym starcie)
   - Wyczyszczenie wszystkich danych (z potwierdzeniem)
   - Sekcja "O aplikacji" z wersją i tech stack

4. **EmptyState** (`src/components/common/EmptyState.tsx`):
   - Reużywalny komponent z ikoną, tytułem, opisem, przyciskiem akcji
   - Użyty we wszystkich 4 listach: Mieszanki, Plany, Wbudowywanie, Archiwum
   - AnimatedCard – wlatuje z opóźnieniem

5. **AnimatedCard w listach**:
   - Mieszanki, Plany, Wbudowywanie, Archiwum – każdy wiersz fade + slide z delay

**Weryfikacja**: `npx tsc --noEmit` → 0 błędów ✅

---

---

## ETAP 5 – Konfiguracja EAS Build
**Data:** 2026-06-19
**Status:** ✅ UKOŃCZONY

### Co zostało zrobione:

1. **EAS CLI** – zainstalowane (`npx eas-cli@latest`)

2. **`eas.json`** z 4 profilami budowania:
   - `development` – debug APK z dev clientem (do testów z Expo Go / dev menu)
   - `preview` – release APK (do sideloadowania na Androidzie bez sklepu)
   - `preview-sim` – symulator iOS
   - `production` – AAB dla Play Store, IPA dla App Store z auto-increment

3. **`.npmrc`** – `legacy-peer-deps=true` (rozwiązuje konflikty peerDeps podczas buildu EAS)

4. **`babel.config.js`** – preset babel-preset-expo + react-native-reanimated/plugin

5. **`metro.config.js`** – obsługa plików `.svg` jako komponentów React (react-native-svg-transformer)

6. **Ikona aplikacji** – naprawiona na kwadratowy format 1024×1024 (wszystkie warianty)
   - `icon.png` – 1024×1024 ✅
   - `android-icon-foreground.png` – 1024×1024 ✅
   - `android-icon-background.png` – 1024×1024 ✅
   - `splash-icon.png` – 1284×2778 ✅

7. **`app.json`** zaktualizowany:
   - `android.versionCode: 1`
   - `ios.buildNumber: "1"`
   - `ios.bundleIdentifier: com.kalkulatormma.app`
   - `android.package: com.kalkulatormma.app`
   - Uprawnienia Android (INTERNET, READ/WRITE_EXTERNAL_STORAGE)
   - iOS NSUsageDescription (kamera, foto, lokalizacja)

**Weryfikacja**: `npx expo-doctor` → **21/21 zdanych** ✅ | `npx tsc --noEmit` → 0 błędów ✅

### Jak uruchomić build:

```bash
# 1. Przejdź do katalogu mobile
cd mobile

# 2. Zainstaluj EAS CLI (jednorazowo)
npm install -g eas-cli

# 3. Zaloguj się do Expo (potrzebujesz konta na expo.dev)
eas login

# 4. Połącz projekt z Expo (jednorazowo – tworzy wpis w app.json)
eas init

# 5. Zbuduj APK (Android) – do testów na telefonie bez sklepu
eas build --platform android --profile preview

# 6. (Opcjonalnie) Build produkcyjny AAB do Play Store
eas build --platform android --profile production
```

**WAŻNE:** Do buildu potrzebujesz konta na expo.dev (darmowe).
Link: https://expo.dev/signup

---

## DO ZROBIENIA (potencjalne rozszerzenia):

- [x] Instrukcja publikacji w Google Play (`mobile/PUBLIKACJA_PLAY_STORE.md`)
- [ ] Opublikowanie w Google Play Store (wymaga Twojego `eas login` + upload AAB)
- [ ] Push notifications (expo-notifications)
- [x] Edycja aktywnego wpisu Live po dodaniu
- [ ] Wyszukiwanie w listach mieszanek i archiwum
- [ ] Widżet systemu Android z aktywnym planem
- [ ] Integracja z Google Drive (OAuth + automatyczny upload raportów)
- [ ] Link do pobrania HTML z własnego serwera (zamiast e-maila)

---

## ETAP 7 – Budowy, grupowanie, LIVE w HTML, załączniki PDF
**Data:** 2026-06-20
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-etap7-0a0b`

### Co zostało zrobione:

1. **Globalne style UI** (`src/constants/layout.ts`):
   - Odpowiednik „style.css” – teksty w ramkach, przyciski bez łamania wyrazów
   - Zastosowane w `AppHeader`, listach, modalach

2. **Komponenty wspólne**:
   - `CollapsibleSection.tsx` – sekcje zwijane (domyślnie zwinięte)
   - `SafeModal.tsx` – modal z `AppHeader` i bezpiecznymi marginesami (status bar, przyciski)
   - `BudowaPicker.tsx` – wybór budowy w formularzu planu

3. **Budowy** (`src/stores/budowyStore.ts`):
   - Nowy typ `Budowa` (nazwa inwestycji + kod budowy, np. DK25 Mąkowarsko / B128)
   - Przypisywanie planów do budowy (`Plan.budowaId`)
   - Lista planów zwijana po budowach, sortowanie po dacie wbudowania
   - Plany bez budowy – pojedynczy wiersz na końcu
   - Modal „+ Budowa” na ekranie Zaplanuj Masę

4. **Mieszanki – listy zwijane**:
   - Ekran mieszanek: grupy po wytwórni (zwinięte domyślnie)
   - `MieszankaPicker`: SafeModal + grupy wytwórni (jak figury w planie)

5. **LIVE – edycja auta**:
   - Przycisk ✎ Edytuj przed ✕ Usuń w tabeli aut
   - Formularz przełącza się w tryb edycji z „Zapisz zmiany”

6. **Szkic – kształty geometryczne** (`DzialkaSketch.tsx`):
   - Prostokąt, trapez, trójkąt, pierścień (łuk), wjazd – z zachowaniem skali wysokości
   - Nadal proporcjonalna długość wzdłuż osi drogi

7. **Załączniki PDF/PZT** (`Plan.zalaczniki`):
   - Dodawanie plików PDF/obrazów w formularzu planu
   - `ZalacznikiViewer` – zakładki, pinch-zoom w WebView
   - Podgląd w szczegółach planu

8. **HTML export z trybem LIVE** (`htmlGenerator.ts` v2.0):
   - Zakładka ● Live w pliku HTML (wpisy aut na budowie)
   - Formularz autora raportu przed eksportem z aplikacji
   - Majster podpisuje raport w HTML i pobiera uzupełniony plik
   - Import raportu HTML z powrotem do aplikacji (`htmlImporter.ts`)

9. **ShapeModal** – migracja na `SafeModal` (bezpieczne marginesy)

10. **PlanForm** – `AppHeader`, wybór budowy, załączniki, kopiowanie plików przy nowym planie

### Gdzie są pliki (ważne dla użytkownika):

| Co | Gdzie |
|---|---|
| Kod projektu | `/workspace/mobile/` na serwerze Cursor |
| APK (EAS Build) | **Nie na dysku lokalnym** – na expo.dev po `eas build` |
| Dane na telefonie | **AsyncStorage** – lokalnie, offline |
| Załączniki PDF | Katalog dokumentów aplikacji (`zalaczniki/<planId>/`) |
| Eksport HTML/JSON | Tymczasowo przy udostępnianiu (share sheet) |

### Przechowywanie danych – odpowiedź na pytanie:

- **Obecnie:** wszystko lokalnie na telefonie (offline-first).
- **Google Drive / własny dysk:** wymaga osobnej integracji (OAuth + API) – zaplanowane jako przyszłe rozszerzenie.
- **Link do pobrania zamiast maila:** wymaga serwera lub chmury – nie zaimplementowano w tym etapie.

### Kontynuacja pracy w nowym czacie:

- Wystarczy wskazać AI pliki `.clinerules` i `POSTEPY.md` – zawierają pełny kontekst projektu.
- Kontynuacja w obecnym czacie zachowuje dodatkowy kontekst rozmowy.

**Weryfikacja**: `npx tsc --noEmit` → **0 błędów** ✅

---

## ETAP 8 – Poprawki z PDF (wytwórnie, PZT, LIVE, grubości)
**Data:** 2026-06-20
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-etap8-0a0b`
**Wersja aplikacji:** 1.4.0 (versionCode 6)

### Co zostało zrobione:

1. **Naprawa crashu planu** (`app/plan/nowy.tsx`):
   - Uproszczony zapis planu bez kopiowania załączników przy tworzeniu
   - Stabilne otwieranie i edycja istniejących planów

2. **Empty states** (`EmptyState.tsx`):
   - Ikony zgodne z menu głównym
   - Wyśrodkowanie pionowe na pustych listach

3. **Grubości w planie** (`PlanForm.tsx`, `grubosc.ts`):
   - Grubość projektowa, tolerancja (%), grubość wbudowywania
   - Kompatybilność wsteczna ze starym polem `grubosc`

4. **Wbudowywanie → zakładka Plan** (`TabelaAut.tsx`):
   - Tabela samochodów widoczna podczas realizacji

5. **LIVE – szkic** (`DzialkaSketch.tsx`):
   - Kolorowanie przejechanej części w kształcie figury (ClipPath)
   - Bez ciemnej nakładki na nieprzejechanej części

6. **LIVE – sesje działek** (`liveStore.ts`):
   - Przycisk „Ostatnie auto” (cofnięcie ostatniego wpisu)
   - Zakończenie dniówki na działce i wznowienie pracy

7. **Zakończenie LIVE + raport PDF** (`wbudowywanie/[id].tsx`, `pdfGenerator.ts`):
   - Archiwizacja planu po zakończeniu
   - Generowanie raportu PDF z bilansem

8. **Wytwórnie z Google Maps** (`wytwornieStore.ts`, `mieszanki/index.tsx`):
   - Dodawanie wytwórni z linku Google Maps
   - Podgląd mapy, kopiowanie linku, otwarcie w Maps
   - Wybór wytwórni przy dodawaniu mieszanki

9. **SafeArea** (`plan/import.tsx`, modal auta w `wbudowywanie/[id].tsx`):
   - Poprawione marginesy na ekranie Import i w modalu auta na szkicu

10. **Załączniki PDF pod budową + PZT** (`plan/index.tsx`, `wbudowywanie/[id].tsx`):
    - Załączniki przypisane do budowy (nie do planu)
    - Zakładka PZT w module Wbudowywanie z podglądem PDF

11. **Archiwum po budowach** (`archiwum/index.tsx`):
    - Lista zakończonych robót pogrupowana po budowach

12. **Wersja i changelog w aplikacji** (`src/constants/version.ts`, `ustawienia.tsx`):
    - Sekcja „Co nowego” w Ustawieniach
    - Wersja 1.4.0 w `app.json` i na ekranie O aplikacji

### Nowe pliki:
- `src/stores/wytwornieStore.ts`
- `src/utils/grubosc.ts`
- `src/components/plan/TabelaAut.tsx`
- `src/constants/version.ts`
- `src/utils/calculations.test.ts`
- `src/utils/grubosc.test.ts`

### Weryfikacja (2026-06-20):
- `npm run verify` → `tsc --noEmit` **0 błędów** ✅
- Testy jednostkowe (`calculations`, `grubosc`) → **6/6 zaliczonych** ✅
- `npx expo-doctor` → 19/21 (ostrzeżenia: wersja `expo-clipboard` – nie blokuje buildu)

### Publikacja Play Store:
- Instrukcja: `mobile/PUBLIKACJA_PLAY_STORE.md`
- Skrypt: `mobile/publish-play-store.sh`

---

## ETAP 9 – Porządkowanie repozytorium
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY

Usunięto stare, nieużywane pliki z poprzedniego projektu (frontend, backend, testy agenta AI).
W repozytorium zostały tylko pliki potrzebne do aplikacji mobilnej:

```
kalkulator-mma/
├── mobile/       ← aplikacja Expo (TYLKO TO BUDUJESZ)
├── POSTEPY.md
├── INSTALACJA_WINDOWS.md
├── .clinerules
└── README.md
```

Instrukcja instalacji na Windows: `INSTALACJA_WINDOWS.md`

---

## ETAP 10 – Naprawa crashu Play Store + auto-submit
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY
**Wersja aplikacji:** 1.4.1 (versionCode 7)

### Diagnoza crashu po aktualizacji z Play Store (1.4.0):

1. **Niezgodne wersje bibliotek natywnych** – `expo-clipboard` 8.x i `react-native-webview` 14.x zamiast wersji dla Expo SDK 56
2. **Nawigacja do onboardingu przed gotowością routera** – `router.replace()` w `_layout.tsx` wywoływane zbyt wcześnie
3. **Możliwy konflikt APK sideload + Play Store** – różne podpisy cyfrowe

### Naprawy:

1. Poprawne wersje bibliotek: `expo-clipboard`, `react-native-webview`, `react-native-gesture-handler`
2. `app/_layout.tsx` – bezpieczny start, `useRootNavigationState`, try/catch
3. `ErrorBoundary.tsx` – ekran błędu zamiast natychmiastowego zamknięcia
4. `publish-play-store.ps1` – skrypt Windows: build + auto-submit
5. `npm run release:play` – jedna komenda: build + wysłanie do Play Store

**Weryfikacja**: `npm run verify` → **0 błędów, 6/6 testów** ✅

---

## ETAP 11 – Poprawki z testów, Niezbędnik masiarza, archiwum
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-etap11-0a0b`
**Wersja aplikacji:** 1.5.0 (versionCode 8)

### Co zostało zrobione:

1. **Naprawa crashu zapisywania planu** (`PlanForm.tsx`, `plan/nowy.tsx`):
   - `minimumDate` przez `useMemo` (bez nowego `Date()` przy każdym renderze)
   - Nawigacja po zapisie przez `router.push` + `InteractionManager`

2. **Zaplanuj masę** (`plan/index.tsx`):
   - Budowy widoczne na liście nawet bez planów
   - Przyciski Archiwizuj / Usuń budowę / + Plan
   - Udostępnianie planu (JSON/HTML) z listy
   - Sekcja „Budowy w archiwum” z przywracaniem

3. **Wbudowywanie**:
   - Tabela aut: metry wg szerokości każdego pola (`calculations.ts`, `TabelaAut.tsx`)
   - Kontrola: kolorowanie grubości zielony/pomarańczowy/czerwony (`grubosc.ts`)
   - LIVE: szkic scrollowany po lewej, statystyki po prawej
   - Szkic: wjazd/pierścień – kolorowanie z lewej do prawej w trybie Live

4. **Archiwum** (`archiwum/[id].tsx`):
   - Bilans z różnicą do planu w nawiasach
   - Metry z kilometrażem (np. 114+000 – 114+298)
   - Grubość z uzyskaną + piktogram ▲▼
   - Tabela Live w układzie jak tabela planu (`TabelaLive.tsx`)
   - SafeArea (paddingTop/Bottom z insets)

5. **PDF** (`pdfGenerator.ts`):
   - Pierwszy wiersz z informacją o budowie

6. **Menu główne** (`index.tsx`):
   - Ikona aplikacji + „Niezbędnik masiarza”
   - Kafelki: Masa i sprzęt, Geodezja, Notatnik

7. **Niezbędnik masiarza** (`app/niezbednik/`):
   - Wydajność powierzchniowa i grubościowa
   - Wskaźnik rozkładarki (walidacja asymetryczna)
   - Geodezja: spadki, tyczenie łuków, kąt prosty
   - Notatnik z zapisem wyników z kalkulatorów

8. **Mieszanki**: „Lokalizacja wytwórni” zamiast długiego linku

9. **Ustawienia**: SafeArea (insets)

10. **Testy**:
    - `calculations.tabela.test.ts` – różne metry przy różnych szerokościach
    - `grubosc.test.ts` – kolorowanie wg specyfikacji
    - `planSave.test.ts` – serializacja planu JSON

**Weryfikacja**: `npm run verify` → **0 błędów TS, 10/10 testów** ✅

---

## ETAP 12 – Naprawa otwierania planu po zapisie (1.5.1)
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY
**Wersja aplikacji:** 1.5.1 (versionCode 9)

### Przyczyna błędu

Ekran `plan/[id].tsx` używał `useLiveStore((s) => s.wpisyDlaPlanu(id))`.
Metoda `filter()` zwracała **nową tablicę** przy każdym renderze → Zustand wykrywał zmianę → nieskończona pętla → „Maximum update depth exceeded”.
Plan zapisywał się do pamięci, ale ekran szczegółów padał przy otwarciu.

### Naprawa

- Hooki: `useWpisyDlaPlanu`, `usePlanPoId`, `useRouteId`
- `plan/nowy.tsx`: `router.replace` zamiast `push` po zapisie
- Test regresji: `useWpisyDlaPlanu.test.ts`

**Weryfikacja**: `npm run verify` → **0 błędów TS, testy OK** ✅

---

## ETAP 13 – Szkic LIVE proporcjonalny + publikacja Play Store (1.5.2)
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY
**Wersja aplikacji:** 1.5.2 (versionCode 10)

### Co zostało zrobione

1. **Szkic LIVE** (`sketchLayout.ts`, `DzialkaSketch.tsx`, `wbudowywanie/[id].tsx`):
   - Tryb `live`: wysokość figur wg metrów (~1,15 px/m) zamiast ściskania do 110 px
   - Lewa kolumna: przewijany szkic w oknie ~42% wysokości ekranu
   - Prawa kolumna: statystyki (auta, Mg, m, śr. grubość) na stałe
   - Tryb `standard` bez zmian (plan, archiwum, zakładka Plan w wbudowywaniu)

2. **Publikacja Play Store**:
   - `publish-play-store.cmd`: `--auto-submit` gdy jest prawdziwy `google-service-account.json`
   - Wyjaśnienie: `.example` to szablon, nie działa z EAS Submit
   - `PUBLIKACJA_PLAY_STORE.md` – doprecyzowana CZĘŚĆ E

3. **Testy**: `sketchLayout.test.ts` – proporcje standard vs live

**Weryfikacja**: `npm run verify` → **0 błędów TS, testy OK** ✅

---

## ETAP 14 – Edycja figur, tabela aut całość, LIVE zbiorczy (1.5.3)
**Data:** 2026-06-26
**Status:** ✅ UKOŃCZONY
**Wersja aplikacji:** 1.5.3 (versionCode 11)

### Co zostało zrobione

1. **Planowanie** – edycja figur (`ShapeModal` + ✎), usuwanie (✕)
2. **Tabela aut** (`obliczTabeleAutPlanu`) – zakładka Całość + działki, ciągła numeracja aut, bez pustych wierszy
3. **LIVE zbiorczy** – widok Całość ze scrollem wszystkich działek, ciągła numeracja produkcji
4. **Szkic LIVE** – przejechane odcinki zamalowane na czarno

**Weryfikacja**: `npm run verify` → **testy OK** ✅

---

## ETAP 15 – LIVE automatyczny postęp między działkami (1.5.4)
**Data:** 2026-06-30
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-live-progress-0a0b`
**Wersja aplikacji:** 1.5.4 (versionCode 12)

### Założenie właściciela

Użytkownik wpisuje **auto + metry**, a program:
- sam liczy pozycję na bieżącej działce,
- automatycznie przechodzi między działkami gdy metry przekraczają długość odcinka,
- pokazuje **zbiorczy bilans** całego planu (grubość, powierzchnia, tony).

### Co zostało zrobione

1. **`src/utils/liveProgress.ts`** – rdzeń logiki LIVE:
   - `znajdzAktywnaDzialke` – pierwsza nieukończona działka
   - `rozdzielMetryNaDzialki` – rozbicie metrów (i tonażu proporcjonalnie) na kolejne działki
   - `obliczBilansLivePlanu` – łączna powierzchnia, śr. grubość, pozostała masa
   - `dzialkiDoAutoZamkniecia` – auto-zamknięcie działki po wypełnieniu metrami

2. **`liveStore.ts`** – `dodajAutoZRozbiciem` (wiele wpisów z jednego auta)

3. **`wbudowywanie/[id].tsx`** – przebudowany LIVE:
   - karta **„Bilans całego planu”** na górze widoku Całość
   - formularz bez ręcznego wyboru działki – aktywna wyznaczana z postępu
   - alert po rozbiciu auta na wiele działek lub auto-zamknięciu działki
   - przycisk „Ostatnie auto” nadal dostępny jako ręczne zamknięcie

4. **Testy** – `liveProgress.test.ts` (6 scenariuszy)

**Weryfikacja**: `npm run verify` → **0 błędów TS, 27/27 testów, expo-doctor 21/21** ✅

---

## ETAP 16 – LIVE usuwanie, numeracja, HTML v3 (1.5.5)
**Data:** 2026-06-30
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-live-progress-0a0b`
**Wersja aplikacji:** 1.5.5 (versionCode 13)

### Naprawione błędy

1. **Bilans po usunięciu aut** – liczba aut i tony/metry liczone po unikalnych `numerAuta`, reaktywny hook `useWpisyDlaPlanu`
2. **Usuwanie auta** – `usunAutoPlanu` usuwa wszystkie segmenty jednego auta + `przenumerujAutaPlanu` (kolejne auto od #1 po wyczyszczeniu)
3. **Szkic czarny** – unikalny `idPrefix` na clipPath przy wielu szkicach w widoku Całość
4. **Numeracja ciągła** – zakres aut na działce (#18–22), tabela planu/HTML z `obliczTabeleAutPlanu`
5. **HTML v3.0** – ten sam LIVE co aplikacja: bilans planu, rozdzielanie metrów, widok Całość/działki

**Weryfikacja**: `npm run verify` → **29/29 testów** ✅

---

## ETAP 17 – Kontrola całego dnia, plan zbiorczy, LIVE bez zakładek (1.5.6)
**Data:** 2026-06-30
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-live-progress-0a0b`
**Wersja aplikacji:** 1.5.6 (versionCode 14)

### Co zostało zrobione

1. **`planCiagly.ts`** – plan jako jeden ciągły odcinek:
   - `obliczKontrolePlanu` – kontrola całego dnia od startu
   - `metryOdMasyPlanu` – „Gdzie powinniśmy dojechać”
   - `obliczTabeleAutPlanuCiagla` – przenoszenie reszty tonażu między działkami
   - `obliczPodsumowaniePlanuDnia` – karta podsumowania w zakładce Plan

2. **Kontrola** – bez selektora działek; pola: tony → szare „Gdzie dojechać” → metry od startu

3. **Plan** – karta „Podsumowanie całego dnia” + tabela aut z zakresem aut per działka

4. **LIVE** – usunięte zakładki działek; tylko całość odcinka; po usunięciu aut czyszczone sesje

**Weryfikacja**: `npm run verify` → **32/32 testów** ✅

---

## ETAP 18 – LIVE scalony szkic, HTML v3.1, Wyczyść LIVE (1.5.8)
**Data:** 2026-07-06
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-live-progress-0a0b`
**Wersja aplikacji:** 1.5.8 (versionCode 15)

### Co zostało zrobione

1. **`PlanCalySketch`** – jeden ciągły, przewijalny szkic planu dnia (skala live)
2. **Modal auta** – odcinek 1→N na całym planie (`obliczPodsumowanieOdcinkaPlanu`)
3. **Bilans LIVE** – „Do końca metrów” + pole „Gdzie powinniśmy dojechać” przy dodawaniu auta
4. **Wyczyść LIVE** – przycisk w Zakończeniu dniówki (`wyczyścWpisyPlanu` + reset sesji)
5. **Eksport HTML v3.1** – zsynchronizowany LIVE z aplikacją (szkic, tabela całości, modal, Wyczyść)

**Weryfikacja**: `npm run verify` → **34/34 testów** ✅

---

## ETAP 19 – LIVE metry z auta / od startu, sumy Mg (1.5.9)
**Data:** 2026-07-06
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-live-progress-0a0b`
**Wersja aplikacji:** 1.5.9 (versionCode 16)

### Co zostało zrobione

1. Formularz auta – przełącznik **metry z auta** / **od startu planu** z auto-przeliczaniem drugiego pola
2. „Gdzie dojechać” – **od startu / z auta**
3. Bilans – **do wbudowania (plan/śr.)** z sumą łączną w nawiasie
4. HTML v3.1 – zsynchronizowany formularz i bilans

---

## ETAP 20 – Obmiar PZT: XFDF, kolejność, wiele PDF (1.6.0)
**Data:** 2026-09-04
**Status:** ✅ UKOŃCZONY (fundament)
**Branch:** `cursor/kalkulator-mma-obmiar-xfdf-0a0b`
**Wersja aplikacji:** 1.6.0 (versionCode 17)

### Co zostało zrobione

1. **Import XFDF** z PDF-XChange – automatyczne wyciąganie `<vertices>` (bez Excela)
2. **Skala 1:500** (1 cm = 5 m) → powierzchnia i obwód w m²
3. **Sesja dnia** z kolejnością obszarów (↑↓) – jak działki w LIVE
4. **Wiele PDF** – kolejne importy XFDF do tej samej sesji (obszary z różnych plików)
5. **Podgląd SVG** kształtu obszaru
6. Wejście: ekran główny → Niezbędnik → **Obmiar PZT**

### Następne (Etap B)
- Oznaczenie START/KONIEC/LEWA/PRAWA + kilometraż
- LIVE na wielokącie (tony, metry, rozkładarka, zamalowanie)

---

## ETAP 21 – Obmiar PZT: UX + LIVE na wielokącie (1.7.0)
**Data:** 2026-09-05
**Status:** ✅ UKOŃCZONY
**Branch:** `cursor/kalkulator-mma-obmiar-xfdf-0a0b`
**Wersja aplikacji:** 1.7.0 (versionCode 18)

### UX (poprawki po teście APK)
1. Tytuł wyrównany z „Wstecz” – usunięty zbędny podtytuł w nagłówku
2. Usunięta niebieska ramka z wyjaśnieniem
3. Przycisk **Nowy** na liście sesji
4. Podgląd: pinch zoom, pan, obrót; pełne zacieniowanie pola; centrowanie po wyborze obszaru
5. **Ustaw skalę** – presety + własny mianownik, przelicza m²
6. Sesja dnia sumuje powierzchnię ze wszystkich XFDF

### Etap B
1. Role węzłów: START / KONIEC / LEWA / PRAWA (dotknięcie węzła na podglądzie)
2. Kilometraż start/koniec
3. LIVE: metry + tony → postęp %, zakryte m², pozostało m/m²/Mg, zielone zamalowanie od START

---
