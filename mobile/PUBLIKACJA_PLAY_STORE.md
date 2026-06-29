# Publikacja w Google Play – Kalkulator MMA

Instrukcja dla **testów wewnętrznych** (Internal testing). To najszybsza ścieżka: bez publicznej widoczności, instalacja z linku w Play Store.

---

## Szybka ściąga – automatyczna aktualizacja (Windows)

### Jednorazowa konfiguracja (15 min)

1. Zaloguj się: `npx eas-cli@latest login`
2. Utwórz konto serwisowe Google → pobierz plik JSON
3. Zapisz jako `mobile/google-service-account.json` (patrz CZĘŚĆ E)
4. W Play Console dodaj e-mail konta serwisowego z uprawnieniem **Zarządzaj wydaniami**

### Każda kolejna aktualizacja (2 komendy)

W PowerShell, w folderze `mobile`:

```powershell
$env:EAS_NO_VCS = "1"
.\publish-play-store.cmd
```

Lub dwukrotne kliknięcie **`publish-play-store.cmd`** w Eksploratorze plików.

Jeśli PowerShell blokuje `.ps1` (błąd „not digitally signed”):

- **Używaj `.cmd`**, nie `.ps1`
- Albo: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` i dopiero `.\publish-play-store.ps1 all`

To zrobi **build AAB + automatyczne wysłanie do Play Store** (jeśli jest `google-service-account.json`).

Potem w Play Console kliknij **Rozpocznij wdrażanie** (jeśli wymagane) i na telefonie **Aktualizuj** w Play Store.

Alternatywa jedną komendą (nie wymaga globalnej instalacji `eas`):

```powershell
$env:EAS_NO_VCS = "1"
npm run release:play
```

Używa `npx eas-cli@latest` – działa bez `npm install -g eas-cli`.

---

## Co musisz mieć

| Element | Status |
|---------|--------|
| Konto Google Play Developer (zweryfikowane) | ✅ masz |
| Konto na [expo.dev](https://expo.dev) (darmowe) | potrzebne |
| Komputer z terminalem | Twój PC |

**Pakiet aplikacji (musi się zgadzać!):** `com.kalkulatormma.app`

---

## CZĘŚĆ A – Jednorazowo: utwórz aplikację w Play Console

1. Wejdź na [Google Play Console](https://play.google.com/console)
2. **Utwórz aplikację** → nazwa: **Kalkulator MMA**
3. Gdy zapyta o typ: aplikacja, bezpłatna
4. W **Panel → Testy → Test wewnętrzny** (Internal testing):
   - Na razie nic nie wgrywaj – najpierw zbudujesz plik AAB (krok B)

5. **Ustawienia aplikacji** (wymagane minimum przed pierwszym uploadem):
   - **Kategoria:** Narzędzia / Produktywność
   - **Kontakt e-mail** developera
   - **Polityka prywatności** – możesz na start użyć prostej strony (np. GitHub Pages) z tekstem: *„Aplikacja nie zbiera danych osobowych. Wszystkie dane (plany, mieszanki) są przechowywane wyłącznie lokalnie na urządzeniu użytkownika.”*

---

## CZĘŚĆ B – Zbuduj plik AAB (format wymagany przez Play Store)

Na swoim komputerze:

```bash
cd mobile

# 1. Zaloguj się do Expo (jednorazowo)
npx eas login

# 2. Zbuduj AAB produkcyjny (10–20 min na serwerach Expo)
npx eas-cli@latest build --platform android --profile production
```

Po zakończeniu dostaniesz **link do pobrania pliku `.aab`**.

Alternatywnie ze skryptem (token z expo.dev):

```bash
bash publish-play-store.sh build TWÓJ_EXPO_TOKEN
```

---

## CZĘŚĆ C – Wgraj AAB do Play Store (ręcznie – najprościej)

1. Play Console → **Testy** → **Test wewnętrzny**
2. **Utwórz nowe wydanie** → **Prześlij** → wybierz pobrany plik `.aab`
3. Wpisz **nazwę wydania** (np. „Wersja 1.2.0 – test wewnętrzny”)
4. **Zapisz** → **Przejrzyj wydanie** → **Rozpocznij wdrażanie do testów wewnętrznych**

Pierwsze wydanie może wymagać wypełnienia kwestionariusza „Treść aplikacji” i deklaracji uprawnień – odpowiedz szczerze (aplikacja offline, dane lokalne).

---

## CZĘŚĆ D – Dodaj siebie jako testera

1. Play Console → **Testy** → **Test wewnętrzny** → zakładka **Testujący**
2. **Utwórz listę testerów** → dodaj swój adres Gmail
3. Skopiuj **link do opt-in** (dołączenia do testów)
4. Na telefonie Android:
   - Otwórz link w przeglądarce
   - Zaakceptuj udział w teście
   - Wejdź w **Google Play** → wyszukaj **Kalkulator MMA** → **Zainstaluj**

Od kolejnych wersji: po nowym buildzie i wgraniu AAB aktualizacja pojawi się w Play Store jak zwykła aplikacja.

---

## CZĘŚĆ E – (Opcjonalnie) Automatyczny upload przez EAS Submit

Jeśli chcesz, żeby `eas submit` sam wgrywał build:

### 1. Utwórz konto serwisowe Google

1. [Google Cloud Console](https://console.cloud.google.com/) → wybierz projekt (lub utwórz)
2. **IAM i administracja** → **Konta serwisowe** → **Utwórz**
3. Pobierz plik JSON z kluczem
4. Zapisz jako: `mobile/google-service-account.json`  
   ⚠️ **Nigdy nie commituj tego pliku do GitHuba!**

### 2. Nadaj uprawnienia w Play Console

1. Play Console → **Użytkownicy i uprawnienia**
2. **Zaproś nowego użytkownika** → wklej e-mail konta serwisowego (z pliku JSON: `client_email`)
3. Uprawnienia: **Administrator wydania** (Release manager) lub **Zarządzaj wydaniami**

### 3. Wyślij build automatycznie

```bash
cd mobile

# Build + submit na tor wewnętrzny (internal)
npx eas-cli@latest build --platform android --profile production --auto-submit
```

Lub osobno:

```bash
npx eas submit --platform android --profile production --latest
```

Profil `production` w `eas.json` jest ustawiony na tor **internal** (test wewnętrzny).

---

## Wersjonowanie

Przed każdym kolejnym wgraniem zwiększ w `app.json`:

```json
"version": "1.2.1",
"android": {
  "versionCode": 5
}
```

- `version` – widoczna dla użytkownika (np. 1.2.0)
- `versionCode` – liczba całkowita, **zawsze większa** niż poprzednia (Play Store tego wymaga)

Profil `production` ma `autoIncrement: true` – EAS może sam podbijać `versionCode` przy buildzie.

---

## Różnica: APK vs AAB vs Play Store

| Sposób | Plik | Gdzie instalujesz |
|--------|------|-------------------|
| Preview (dotychczas) | APK | Pobierasz link z expo.dev, instalujesz ręcznie |
| **Play Store Internal** | **AAB** | Instalujesz z Google Play (wygodne aktualizacje) |

---

## Problemy i rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| **Aplikacja się nie otwiera / zamyka od razu** | Odinstaluj starą wersję → zainstaluj ponownie z Play Store. Jeśli nadal crash: poczekaj na wersję **1.4.1** (naprawa startu). Stara wersja 1.4.0 mogła mieć niezgodne biblioteki natywne. |
| „Pakiet już istnieje” | Ktoś wcześniej zarejestrował `com.kalkulatormma.app` – użyj tej samej aplikacji w konsoli |
| „versionCode musi być większy” | Zwiększ `versionCode` w `app.json` i zbuduj ponownie |
| Nie widzę aplikacji w Play | Czy zaakceptowałeś link opt-in testera? Czy wydanie jest „wdrożone”? |
| Brak polityki prywatności | Dodaj URL w Ustawieniach aplikacji w konsoli |
| Aktualizacja z APK (ręczna) na Play Store | Odinstaluj APK sideloadowany, zainstaluj z Play Store — inny podpis uniemożliwia aktualizację „w miejscu” |

### Diagnoza crashu po aktualizacji (wersja 1.4.0)

Najczęstsze przyczyny:
1. **Niezgodne wersje bibliotek** (`expo-clipboard`, `react-native-webview`) — naprawione w **1.4.1**
2. **Nawigacja przed gotowością aplikacji** przy pierwszym uruchomieniu — naprawione w **1.4.1**
3. **Stara wersja APK + nowa z Play Store** — odinstaluj i zainstaluj od nowa
4. **Uszkodzone dane lokalne** po aktualizacji — odinstaluj (czyści dane) i zainstaluj ponownie

---

## Szybka ściąga (3 kroki)

```
1. eas login
2. eas build --platform android --profile production
3. Play Console → Test wewnętrzny → wgraj AAB → dodaj siebie jako testera
```

**Projekt Expo:** https://expo.dev/accounts/laszlinho/projects/kalkulator-mma
