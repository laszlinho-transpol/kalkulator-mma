# Kalkulator MMA

Aplikacja mobilna (React Native + Expo) do planowania i śledzenia wbudowywania mieszanek mineralno-asfaltowych.

**Aktualna wersja: 1.3.0**

## Szybki start

```bash
cd mobile
npm install
npm run verify    # test przed buildem
npx expo start    # test na telefonie (Expo Go)
```

## Build na Androida / Google Play

Szczegóły: `INSTALACJA_WINDOWS.md` i `mobile/PUBLIKACJA_PLAY_STORE.md`

```bash
cd mobile
npx eas login
npx eas build --platform android --profile production
```

## Pobierz projekt (ZIP)

https://github.com/laszlinho-transpol/kalkulator-mma/archive/refs/heads/main.zip

Po rozpakowaniu wejdź do folderu `mobile/`.

## Struktura

```
kalkulator-mma/
├── mobile/                 ← aplikacja
├── INSTALACJA_WINDOWS.md   ← instrukcja krok po kroku (Windows)
├── POSTEPY.md                ← dziennik postępów
└── README.md
```
