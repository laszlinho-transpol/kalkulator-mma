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

## ETAP 8 – Publikacja Google Play (przygotowanie)
**Data:** 2026-06-20
**Status:** 🟡 W TRAKCIE (wymaga działań właściciela konta)

### Co zostało przygotowane:

1. **`mobile/PUBLIKACJA_PLAY_STORE.md`** – pełna instrukcja po polsku (test wewnętrzny)
2. **`mobile/publish-play-store.sh`** – skrypt build AAB + opcjonalny submit
3. **Wersja aplikacji** – `1.2.0` / `versionCode: 4` w `app.json`
4. **`eas.json`** – profil `production` buduje AAB, submit na tor `internal`
5. **`.gitignore`** – wykluczenie `google-service-account.json`

### Co musisz zrobić sam:

1. `npx eas login` na swoim komputerze
2. `npx eas build --platform android --profile production`
3. Play Console → Test wewnętrzny → wgraj plik `.aab`
4. Dodaj swój Gmail jako testera → zainstaluj z Play Store

Szczegóły: **`mobile/PUBLIKACJA_PLAY_STORE.md`**

---

## ETAP 9 – Porządkowanie repozytorium
**Data:** 2026-06-23
**Status:** ✅ UKOŃCZONY

Usunięto stare, nieużywane pliki z poprzedniego projektu (frontend, backend, testy Emergent).
W repozytorium zostały tylko pliki potrzebne do aplikacji mobilnej:

```
kalkulator-mma/
├── mobile/       ← aplikacja Expo
├── POSTEPY.md
├── .clinerules
└── README.md
```

---
