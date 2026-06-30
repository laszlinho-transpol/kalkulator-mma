@echo off
REM Publikacja do Play Store - dziala bez zmiany ExecutionPolicy w PowerShell
cd /d "%~dp0"
set EAS_NO_VCS=1

echo.
echo === Kalkulator MMA - build Play Store ===
echo.

call npx eas-cli@latest whoami
if errorlevel 1 (
  echo Najpierw zaloguj sie: npx eas-cli@latest login
  exit /b 1
)

if exist google-service-account.json (
  echo Znaleziono google-service-account.json - po buildzie automatyczny upload do Play Store.
  echo.
) else (
  echo UWAGA: Brak pliku google-service-account.json
  echo.
  echo   google-service-account.json.example to tylko SZABLON - nie zadziala!
  echo   Potrzebujesz prawdziwego klucza JSON z Google Cloud / Play Console.
  echo   Instrukcja krok po kroku: PUBLIKACJA_PLAY_STORE.md - CZESC E
  echo.
  echo   Bez tego pliku: build sie wykona, ale AAB trzeba wgrac recznie w Play Console.
  echo.
  pause
)

echo Buduje AAB (10-20 min na serwerach Expo)...
if exist google-service-account.json (
  call npx eas-cli@latest build --platform android --profile production --non-interactive --auto-submit --message "Kalkulator MMA - aktualizacja Play Store"
) else (
  call npx eas-cli@latest build --platform android --profile production --non-interactive --message "Kalkulator MMA - aktualizacja Play Store"
)
if errorlevel 1 exit /b 1

if not exist google-service-account.json (
  echo.
  echo Build gotowy. Pobierz AAB z https://expo.dev i wgraj w Play Console.
  echo Aby nastepnym razem wyslac automatycznie, dodaj google-service-account.json
  echo zobacz: PUBLIKACJA_PLAY_STORE.md - CZESC E
)

echo.
echo Gotowe.
pause
