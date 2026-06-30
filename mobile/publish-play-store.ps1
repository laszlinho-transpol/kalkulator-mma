# ============================================================
# PUBLIKACJA DO GOOGLE PLAY – Kalkulator MMA (Windows PowerShell)
# ============================================================
# Użycie:
#   .\publish-play-store.ps1 build          – buduje AAB
#   .\publish-play-store.ps1 submit         – wysyła ostatni build do Play Store
#   .\publish-play-store.ps1 all            – build + automatyczny submit
#
# Wymagania:
#   - Zalogowanie: npx eas-cli@latest login
#   - Dla submit: plik google-service-account.json w tym folderze
#   - Przy ZIP bez Gita: $env:EAS_NO_VCS = "1"
#
# Jesli PowerShell blokuje skrypt (niepodpisany):
#   Opcja A: dwuklik publish-play-store.cmd
#   Opcja B: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#            .\publish-play-store.ps1 all

param(
    [Parameter(Position = 0)]
    [ValidateSet("build", "submit", "all")]
    [string]$Command = "build"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "Konto Expo:" -ForegroundColor Cyan
npx eas-cli@latest whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "Najpierw zaloguj sie: npx eas-cli@latest login" -ForegroundColor Red
    exit 1
}

switch ($Command) {
    "build" {
        Write-Host ""
        Write-Host "Buduje AAB (profil: production)..." -ForegroundColor Yellow
        if (Test-Path "google-service-account.json") {
            npx eas-cli@latest build `
                --platform android `
                --profile production `
                --non-interactive `
                --auto-submit `
                --message "Kalkulator MMA - aktualizacja Play Store"
        } else {
            Write-Host "Brak google-service-account.json - tylko build (bez auto-upload)." -ForegroundColor Yellow
            npx eas-cli@latest build `
                --platform android `
                --profile production `
                --non-interactive `
                --message "Kalkulator MMA - aktualizacja Play Store"
        }
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host ""
        Write-Host "Build gotowy. Pobierz .aab z expo.dev lub uruchom: .\publish-play-store.ps1 submit" -ForegroundColor Green
    }
    "submit" {
        if (-not (Test-Path "google-service-account.json")) {
            Write-Host ""
            Write-Host "Brak pliku google-service-account.json" -ForegroundColor Red
            Write-Host ""
            Write-Host "google-service-account.json.example to tylko SZABLON - nie zadziala!" -ForegroundColor Yellow
            Write-Host "Utworz konto serwisowe w Google Cloud, pobierz klucz JSON i zapisz jako:"
            Write-Host "  mobile\google-service-account.json"
            Write-Host "Instrukcja: PUBLIKACJA_PLAY_STORE.md -> CZESC E"
            Write-Host ""
            Write-Host "Alternatywa: pobierz AAB z expo.dev i wgraj recznie w Play Console."
            exit 1
        }
        Write-Host ""
        Write-Host "Wysylam ostatni build na tor internal (Google Play)..." -ForegroundColor Yellow
        npx eas-cli@latest submit --platform android --profile production --latest --non-interactive
    }
    "all" {
        & $PSCommandPath build
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        if (Test-Path "google-service-account.json") {
            & $PSCommandPath submit
        } else {
            Write-Host ""
            Write-Host "Build gotowy. Brak google-service-account.json - wgraj AAB recznie." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "google-service-account.json.example to tylko SZABLON - nie zadziala!" -ForegroundColor Red
            Write-Host "Potrzebujesz prawdziwego klucza JSON z Google Cloud (patrz PUBLIKACJA_PLAY_STORE.md - CZESC E)."
            Write-Host "Zapisz go jako: mobile\google-service-account.json (NIE commituj do GitHuba!)"
        }
    }
}

Write-Host ""
Write-Host "Gotowe." -ForegroundColor Green
