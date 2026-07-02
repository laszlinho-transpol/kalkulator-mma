# Build Android na Windows (lokalnie, bez EAS)

Instrukcja po udanym pierwszym buildzie. Projekt **musi** leżeć w ścieżce **bez polskich znaków i spacji**, np.:

```
C:\kalkulator-mma\mobile
```

---

## Co zrobić po pierwszym sukcesie (APK na telefon)

1. Skopiuj plik na telefon:
   ```
   C:\kalkulator-mma\mobile\android\app\build\outputs\apk\debug\app-debug.apk
   ```
2. Na telefonie otwórz APK i zainstaluj.
3. Jeśli masz wersję ze sklepu — **odinstaluj ją** przed instalacją debug APK (inny podpis).

---

## Jednorazowa konfiguracja (zapisz na stałe)

### 1. Zmienne środowiskowe Windows

**Win + R** → `sysdm.cpl` → **Zaawansowane** → **Zmienne środowiskowe**:

| Nazwa | Wartość |
|--------|---------|
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |
| `ANDROID_HOME` | `C:\Users\TWOJ_USER\AppData\Local\Android\Sdk` |

W **Path** dodaj:
```
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
```

### 2. Plik `android/local.properties`

Po `expo prebuild` utwórz (jednorazowo):

```
C:\kalkulator-mma\mobile\android\local.properties
```

Zawartość (podmień użytkownika):

```properties
sdk.dir=C\:\\Users\\Admin\\AppData\\Local\\Android\\Sdk
```

Albo uruchom: `npm run setup:android` (tworzy plik automatycznie).

### 3. Poprawka Gradle 9 (foojay 0.5.0 → 1.0.0)

**Automatyczna** — przy każdym `npm install` skrypt `scripts/fix-gradle-foojay.mjs` podmienia wersję w:

```
node_modules/@react-native/gradle-plugin/settings.gradle.kts
```

Ręcznie (gdy trzeba): `npm run fix:gradle`

> Bez tej poprawki build na Windows kończy się błędem `IBM_SEMERU`.

### 4. Android Studio – SDK Tools (zalecane)

**Tools → SDK Manager → SDK Tools**:
- Android SDK Build-Tools
- Android SDK Platform-Tools
- NDK (Side by side)
- Android SDK Command-line Tools (latest)

---

## Kolejne aktualizacje — SZYBKA ŚCIEŻKA (5–15 min)

Gdy zmieniasz tylko kod JS/TS (bez nowych bibliotek natywnych):

```powershell
cd C:\kalkulator-mma\mobile
git pull
npm install
cd android
.\gradlew.bat assembleDebug
```

**Nie uruchamiaj** `prebuild --clean` ani `Remove-Item android` — Gradle cache przyspiesza build.

APK: `android\app\build\outputs\apk\debug\app-debug.apk`

### Skrót jednym plikiem

Dwuklik lub w PowerShell:

```powershell
cd C:\kalkulator-mma\mobile
.\build-android-local.cmd
```

---

## Kiedy robić pełny prebuild (wolniej, 15–30 min)

Uruchom `npm run prebuild:android` (lub `npx expo prebuild --platform android --clean`) gdy:

- aktualizujesz **Expo SDK** lub **React Native**,
- dodajesz bibliotekę z kodem natywnym (np. nowy moduł expo),
- po błędach Gradle po dużej zmianie zależności.

Kolejność:

```powershell
cd C:\kalkulator-mma\mobile
npm install
npm run prebuild:android
npm run setup:android
cd android
.\gradlew.bat assembleDebug
```

---

## Publikacja w Play Store (AAB, nie APK debug)

### Opcja A — EAS w chmurze (gdy masz kredyty)

```powershell
cd C:\kalkulator-mma\mobile
$env:EAS_NO_VCS = "1"
.\publish-play-store.cmd
```

### Opcja B — build lokalny AAB (Android Studio)

1. Otwórz `C:\kalkulator-mma\mobile\android` w Android Studio.
2. **Build → Generate Signed App Bundle or APK** → **Android App Bundle**.
3. Keystore: jeśli wcześniej publikowałeś przez EAS:
   ```powershell
   npx eas-cli@latest credentials -p android
   ```
4. Wgraj `.aab` w [Play Console](https://play.google.com/console) → **Testy → Test wewnętrzny → Utwórz wydanie**.

Przed wgraniem zwiększ w `app.json`:
- `version` (np. `1.5.7`)
- `android.versionCode` (zawsze +1, np. `15`)

---

## Problemy i rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| `JAVA_HOME is not set` | Ustaw zmienne (sekcja wyżej) lub w sesji: `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"` |
| `SDK location not found` | Utwórz `android/local.properties` lub `npm run setup:android` |
| `IBM_SEMERU` | `npm run fix:gradle` |
| `non-ASCII characters` / `react-native-svg` nie istnieje | Przenieś projekt do `C:\kalkulator-mma` |
| Build wisi na 25% | Słaba sieć — czekaj lub inna sieć; drugi build szybszy dzięki cache |
| `Could not GET` z maven.org | Powtórz build; sprawdź internet / wyłącz VPN |
| `eas build --local` na Windows | **Nie działa** — używaj Gradle (`gradlew`) lub EAS w chmurze |

---

## Czasy orientacyjne

| Etap | Pierwszy raz | Kolejne (cache) |
|------|--------------|-----------------|
| `npm install` + prebuild | 5–10 min | — |
| `gradlew assembleDebug` | 30–60 min (sieć) | **5–15 min** |
| Tylko zmiana kodu + gradlew | — | **3–10 min** |

---

## Szybka ściąga

```
Pierwszy raz:  npm install → npm run prebuild:android → npm run setup:android → gradlew assembleDebug
Kolejne:       git pull → npm install → cd android → gradlew assembleDebug
APK:           android\app\build\outputs\apk\debug\app-debug.apk
```
