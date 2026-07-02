# Testowanie na telefonie — najszybsze metody

**Nie używaj `gradlew` do codziennych poprawek.** Lokalny build (30–60 min) służy tylko do **finalnego APK** lub **Play Store**.

Do testów przy komputerze: **Expo Go + Metro** — zmiana kodu widoczna w **kilka–kilkanaście sekund**.

---

## Metoda 1 — NAJSZYBSZA (codzienne poprawki przy PC)

### Jednorazowo na telefonie
1. Zainstaluj **Expo Go** z Google Play.
2. **Zaktualizuj** Expo Go do najnowszej wersji (wymagane dla Expo SDK 56).

### Za każdym razem gdy testujesz zmiany

W PowerShell:

```powershell
cd C:\kalkulator-mma\mobile
npm install
npx expo start --tunnel
```

Albo dwuklik: **`start-telefon.cmd`**

Na telefonie:
1. Otwórz **Expo Go**.
2. Zeskanuj **QR** z terminala (tryb `--tunnel` działa nawet gdy Wi‑Fi jest kapryśne).

Zmieniasz kod → zapisujesz plik → w Expo Go **potrząśnij telefonem → Reload** (albo automatyczny refresh).

| Czas na jedną poprawkę | ~10–30 sekund |
|------------------------|---------------|

### Jeśli „Project is incompatible with Expo Go”
- Play Store → **Expo Go → Aktualizuj**.
- Zamknij Expo Go całkowicie i uruchom ponownie.
- W terminalu: `npx expo start --tunnel --clear`

---

## Metoda 2 — APK z chmury Expo (jak wcześniej, bez Gradle na PC)

Gdy chcesz **paczkę na telefon bez włączonego komputera** (np. na budowie), ale **nie chcesz** lokalnego `gradlew`:

```powershell
cd C:\kalkulator-mma\mobile
$env:EAS_NO_VCS = "1"
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

Po zakończeniu:
1. Wejdź na https://expo.dev → swoje buildy.
2. **Pobierz APK** linkiem na telefonie.
3. Zainstaluj.

| Czas | ~10–20 min w chmurze (Ty nic nie kompilujesz lokalnie) |
|------|--------------------------------------------------------|
| Kiedy | Test na budowie bez laptopa; rzadkie wersje |

> Wymaga kredytów EAS (darmowy limit miesięczny). Gdy limit wyczerpany — poczekaj na reset lub używaj Metody 1 przy PC.

---

## Metoda 3 — lokalny Gradle (tylko na koniec / Play Store)

```powershell
cd C:\kalkulator-mma\mobile\android
.\gradlew.bat assembleRelease
```

| Czas | 15–60 min |
|------|-----------|
| Kiedy | **Ostateczna** wersja przed Play Store; gdy EAS niedostępny |

Szczegóły: [`BUILD_WINDOWS.md`](BUILD_WINDOWS.md)

**Nie używaj** `assembleDebug` na telefon — wymaga Metro (`Unable to load script`).

---

## Co wybrać — ściąga

| Cel | Metoda | Czas |
|-----|--------|------|
| Poprawki kodu przy biurku | **Expo Go** + `npx expo start --tunnel` | **sekundy** |
| Test na budowie bez PC | **EAS preview** APK | ~15 min, bez Gradle u Ciebie |
| Wersja do Google Play | EAS production AAB lub `assembleRelease` | na koniec projektu |

---

## Typowe błędy

| Problem | Rozwiązanie |
|---------|-------------|
| `Unable to load script` | Zainstalowałeś **debug/release APK** bez Metro — użyj **Expo Go** albo zbuduj **release** |
| Expo Go incompatible | Zaktualizuj Expo Go w Play Store |
| QR nie łączy | `npx expo start --tunnel` |
| Gradle wisi 15%+ | **Przerwij** — to nie jest droga do testów; użyj Metody 1 |

---

## Szybki start (kopiuj)

```powershell
cd C:\kalkulator-mma\mobile
npx expo start --tunnel
```

Telefon: **Expo Go** → skanuj QR → testujesz.
