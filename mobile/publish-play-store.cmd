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

echo.
echo Buduje AAB (10-20 min na serwerach Expo)...
call npx eas-cli@latest build --platform android --profile production --non-interactive --message "Kalkulator MMA - aktualizacja Play Store"
if errorlevel 1 exit /b 1

if exist google-service-account.json (
  echo.
  echo Wysylam do Play Store...
  call npx eas-cli@latest submit --platform android --profile production --latest --non-interactive
) else (
  echo.
  echo Brak google-service-account.json - pobierz AAB z expo.dev i wgraj recznie w Play Console.
)

echo.
echo Gotowe.
pause
