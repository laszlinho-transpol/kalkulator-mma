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

## Krok 5 – Token Expo + build (BEZ Git — pobierasz ZIP)

Pobrany ZIP **nie jest** repozytorium Git — trzeba powiedzieć EAS, żeby tego nie wymagał.

W PowerShell wpisz **po jednej linii**:

```powershell
cd C:\Users\Admin\Desktop\kalkulator-mma-main\mobile
```

```powershell
$env:EAS_NO_VCS="1"
```

```powershell
$env:EXPO_TOKEN="wklej_tutaj_sam_token"
```

```powershell
npx eas-cli@latest build --platform android --profile production
```

> **Token:** tylko ciąg znaków między cudzysłowami — nie hasło do expo.dev.  
> **EAS_NO_VCS=1** — konieczne przy pobraniu ZIP (bez Git).

Build trwa ok. **15–20 minut**. Na końcu dostaniesz link do pliku `.aab`.

---

## Rozwiązywanie problemów

| Błąd | Rozwiązanie |
|------|-------------|
| `could not determine executable to run` | Użyj `npm run build:android` zamiast `npx eas build` |
| `Not logged in` | Ustaw `$env:EXPO_TOKEN="..."` w **tej samej** sesji PowerShell |
| `Cannot find path mobile` | Sprawdź ścieżkę: `dir` i dopasuj `cd` |
| `git command not found` / `Repair your Git` | Ustaw `$env:EAS_NO_VCS="1"` przed buildem (patrz Krok 5) |

---

## Krok 6 – Google Play

`mobile/PUBLIKACJA_PLAY_STORE.md`
