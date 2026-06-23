# Instalacja na Windows – Kalkulator MMA

## Krok 1 – Pobierz projekt

Pobierz ZIP z GitHub (gałąź **main**):

https://github.com/laszlinho-transpol/kalkulator-mma/archive/refs/heads/main.zip

Rozpakuj np. do: `C:\Users\Admin\kalkulator-mma`

Po rozpakowaniu sprawdź w PowerShell:

```powershell
dir C:\Users\Admin\kalkulator-mma\mobile
```

Powinieneś zobaczyć: `package.json`, `app.json`, folder `app`.

> **Uwaga:** folder po rozpakowaniu może nazywać się `kalkulator-mma-main` – to normalne.

---

## Krok 2 – Zainstaluj Node.js

1. https://nodejs.org → pobierz **LTS**
2. Zainstaluj (Next, Next…)
3. **Zamknij i otwórz PowerShell od nowa**
4. Sprawdź: `node -v` (powinna być wersja, np. v22.x)

---

## Krok 3 – Zainstaluj zależności

```powershell
cd C:\Users\Admin\kalkulator-mma\mobile
```

(Jeśli folder nazywa się inaczej – dopasuj ścieżkę.)

```powershell
npm install
```

---

## Krok 4 – Test przed buildem

```powershell
npm run verify
```

Jeśli wszystko OK – zobaczysz zielone ✅.

---

## Krok 5 – Zbuduj aplikację na Androida

```powershell
$env:EXPO_TOKEN="twój_token_z_expo.dev"
npx eas build --platform android --profile production
```

Token: https://expo.dev/accounts/laszlinho/settings/access-tokens

---

## Krok 6 – Google Play

Instrukcja: `mobile/PUBLIKACJA_PLAY_STORE.md`
