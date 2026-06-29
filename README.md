# Kalkulator MMA

Aplikacja mobilna (React Native + Expo) do planowania i śledzenia wbudowywania mieszanek mineralno-asfaltowych.

**Aktualna wersja: 1.5.1** (Android `versionCode` 9)

## Szybki start

```bash
cd mobile
npm install
npm run verify    # test przed buildem
npx expo start    # test na telefonie (Expo Go)
```

## Aktualizacja w Google Play (Windows)

Szczegóły: `INSTALACJA_WINDOWS.md` i `mobile/PUBLIKACJA_PLAY_STORE.md`

Pobierz ZIP z gałęzi **`main`**, wejdź do folderu `mobile/`, potem w **PowerShell**:

```powershell
npm install
$env:EAS_NO_VCS = "1"
npx eas-cli@latest login
.\publish-play-store.cmd
```

Plik `.cmd` omija blokadę PowerShell dla niepodpisanych skryptów `.ps1`.

Alternatywa (bez skryptu):

```powershell
npx eas-cli@latest build --platform android --profile production --non-interactive
```

## Pobierz projekt (ZIP)

https://github.com/laszlinho-transpol/kalkulator-mma/archive/refs/heads/main.zip

Po rozpakowaniu wejdź do folderu `mobile/`.

## Struktura

```
kalkulator-mma/
├── mobile/                      ← aplikacja
│   ├── publish-play-store.cmd   ← build + Play Store (Windows)
│   └── publish-play-store.ps1
├── INSTALACJA_WINDOWS.md        ← instrukcja krok po kroku (Windows)
├── POSTEPY.md                   ← dziennik postępów
├── .clinerules                  ← zasady projektu (czytaj przed pracą)
└── README.md
```
