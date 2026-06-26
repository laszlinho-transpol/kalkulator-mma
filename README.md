# Kalkulator MMA

Aplikacja mobilna (React Native + Expo) do planowania i śledzenia wbudowywania mieszanek mineralno-asfaltowych.

## Szybki start

```bash
cd mobile
npm install
npx expo start
```

Na telefonie zainstaluj aplikację **Expo Go** i zeskanuj kod QR.

## Build APK / Google Play

Szczegóły w `mobile/PUBLIKACJA_PLAY_STORE.md`.

```bash
cd mobile
npx eas login
npx eas build --platform android --profile production
```

## Struktura projektu

```
kalkulator-mma/
├── mobile/          ← aplikacja (cały kod)
├── POSTEPY.md       ← dziennik postępów
├── .clinerules      ← zasady projektu
└── README.md        ← ten plik
```

## Wymagania

- Node.js 20+ (https://nodejs.org)
- Konto na https://expo.dev (darmowe)
