@echo off
REM Najszybsze testowanie - Expo Go na telefonie (sekundy na zmiane, bez Gradle)
cd /d "%~dp0"
echo === Kalkulator MMA - test na telefonie (Expo Go) ===
echo.
echo 1. Zainstaluj / zaktualizuj Expo Go w Play Store
echo 2. Zeskanuj QR kodem w Expo Go
echo 3. Zmiany w kodzie - Reload w aplikacji
echo.
echo Pelna instrukcja: TESTOWANIE.md
echo.
call npx expo start --tunnel
pause
