# Instalacja na Windows – Kalkulator MMA

## Krok 1 – Pobierz projekt

https://github.com/laszlinho-transpol/kalkulator-mma/archive/refs/heads/main.zip

Rozpakuj np. na Pulpit. Folder będzie nazywał się `kalkulator-mma-main`.

Sprawdź:

```powershell
dir C:\Users\Admin\Desktop\kalkulator-mma-main\mobile
```

---

## Krok 2 – Node.js

https://nodejs.org → **LTS** → zainstaluj → **zamknij i otwórz PowerShell od nowa**

```powershell
node -v
npm -v
```

---

## Krok 3 – Zależności

```powershell
cd C:\Users\Admin\Desktop\kalkulator-mma-main\mobile
npm install
```

---

## Krok 4 – Test (opcjonalnie, ale zalecany)

```powershell
npm run verify
```

Jeśli na końcu widzisz ✅ — aplikacja jest gotowa do buildu.  
(Czerwony `npm error` **po** zielonym komunikacie można zignorować — to znany drobiazg, testy przeszły.)

---

## Krok 5 – Token Expo (BEZ logowania hasłem)

1. Wejdź na: https://expo.dev/accounts/laszlinho/settings/access-tokens  
2. **Create Token** → skopiuj **sam token** (długi ciąg znaków)  
3. **Nie wpisuj hasła do konta Expo w terminalu** — token zastępuje login

W PowerShell **dwie osobne komendy** (Enter po każdej):

```powershell
$env:EXPO_TOKEN="wklej_tutaj_sam_token"
```

```powershell
npm run build:android
```

> **Ważne:** W pierwszej linii wklejasz **tylko token**, nie hasło do expo.dev.  
> **Nie używaj** `npx eas login` jeśli masz token — to zbędne.

Build trwa ok. **15–20 minut**. Na końcu dostaniesz link do pliku `.aab`.

---

## Rozwiązywanie problemów

| Błąd | Rozwiązanie |
|------|-------------|
| `could not determine executable to run` | Użyj `npm run build:android` zamiast `npx eas build` |
| `Not logged in` | Ustaw `$env:EXPO_TOKEN="..."` w **tej samej** sesji PowerShell |
| `Cannot find path mobile` | Sprawdź ścieżkę: `dir` i dopasuj `cd` |
| `npx not recognized` | Zainstaluj Node.js i otwórz PowerShell od nowa |

---

## Krok 6 – Google Play

`mobile/PUBLIKACJA_PLAY_STORE.md`
