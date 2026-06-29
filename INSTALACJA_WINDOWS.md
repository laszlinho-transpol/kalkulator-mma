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

## Krok 5 – Build i wysłanie do Play Store (BEZ Git — pobierasz ZIP)

Pobrany ZIP **nie jest** repozytorium Git — trzeba powiedzieć EAS, żeby tego nie wymagał.

### Najprościej: plik `publish-play-store.cmd`

W PowerShell (w folderze `mobile`):

```powershell
cd C:\Users\Admin\Desktop\kalkulator-mma-main\mobile
npm install
$env:EAS_NO_VCS = "1"
npx eas-cli@latest login
.\publish-play-store.cmd
```

Dwukrotne kliknięcie `publish-play-store.cmd` w Eksploratorze też działa.

Build trwa ok. **15–20 minut**. Postęp: https://expo.dev

### Ręcznie (jeśli wolisz komendy)

```powershell
cd C:\Users\Admin\Desktop\kalkulator-mma-main\mobile
$env:EAS_NO_VCS = "1"
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production --non-interactive
```

> **EAS_NO_VCS=1** — konieczne przy pobraniu ZIP (bez Git).  
> Używaj **`npx eas-cli@latest`**, nie samego `eas` (może nie być zainstalowane).

---

## Rozwiązywanie problemów

| Błąd | Rozwiązanie |
|------|-------------|
| `could not determine executable to run` | Użyj `npm run build:android` lub `npx eas-cli@latest build ...` |
| `Not logged in` | `npx eas-cli@latest login` w tej samej sesji PowerShell |
| `Cannot find path mobile` | Sprawdź ścieżkę: `dir` i dopasuj `cd` |
| `git command not found` / `Repair your Git` | `$env:EAS_NO_VCS="1"` przed buildem |
| `not digitally signed` / `UnauthorizedAccess` przy `.ps1` | Użyj **`publish-play-store.cmd`** albo: `Set-ExecutionPolicy -Scope Process Bypass` |
| `eas is not recognized` | Zamiast `eas` wpisz `npx eas-cli@latest` |

---

## Krok 6 – Google Play

Pełna instrukcja: `mobile/PUBLIKACJA_PLAY_STORE.md`

Po buildzie: Play Console → **Testy** → **Test wewnętrzny** → **Rozpocznij wdrażanie** → na telefonie **Aktualizuj** w Play Store.
