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

## DO ZROBIENIA (potencjalne rozszerzenia):

- [ ] EAS Build – build na urządzenie (Android APK / iOS IPA)
- [ ] Edycja aktywnego wpisu Live (zmiana tonażu/metrów po dodaniu)
- [ ] Wyszukiwanie w listach mieszanek i archiwum
- [ ] Więcej kształtów figur (kołowe inne, itp.)
- [ ] Widżet systemu (Android) z aktywnym planem

---
