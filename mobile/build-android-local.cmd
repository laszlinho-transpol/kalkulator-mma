@echo off
REM Build APK debug na Windows (lokalnie, bez EAS)
setlocal
cd /d "%~dp0"

if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo === Kalkulator MMA - lokalny build Android ===
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo.

call npm run fix:gradle 2>nul

if not exist android (
  echo Brak folderu android - uruchamiam prebuild...
  call npx expo prebuild --platform android
)

call node scripts\setup-android-local.mjs
if errorlevel 1 exit /b 1

cd android
echo.
echo Budowanie APK debug (przy cache 5-15 min, pierwszy raz dluzej)...
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo BUILD FAILED - zobacz BUILD_WINDOWS.md
  exit /b 1
)

echo.
echo === SUKCES ===
echo APK: %cd%\app\build\outputs\apk\debug\app-debug.apk
endlocal
