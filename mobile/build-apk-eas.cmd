@echo off
REM APK w chmurze Expo (bez lokalnego Gradle) - profil preview
setlocal
cd /d "%~dp0"
set EAS_NO_VCS=1

echo === Kalkulator MMA - APK preview (EAS, bez gradlew) ===
echo Po zakonczeniu pobierz APK z https://expo.dev
echo.
call npx eas-cli@latest whoami
if errorlevel 1 (
  echo Najpierw: npx eas-cli@latest login
  exit /b 1
)
call npx eas-cli@latest build --platform android --profile preview --non-interactive --message "Kalkulator MMA - test preview APK"
endlocal
