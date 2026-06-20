#!/bin/bash
# ============================================================
# SKRYPT BUDOWANIA APK – Kalkulator MMA
# ============================================================
# Uruchom: bash build-android.sh TWÓJ_EXPO_TOKEN
# Token utwórz na: https://expo.dev/accounts/[nick]/settings/access-tokens

set -e

TOKEN="${1:-$EXPO_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo ""
  echo "❌ BRAK TOKENU EXPO"
  echo ""
  echo "Użycie: bash build-android.sh TWÓJ_TOKEN"
  echo ""
  echo "Jak uzyskać token:"
  echo "  1. Otwórz: https://expo.dev/accounts/[twój-nick]/settings/access-tokens"
  echo "  2. Kliknij 'Create Token'"
  echo "  3. Skopiuj token i wklej tutaj"
  echo ""
  exit 1
fi

export EXPO_TOKEN="$TOKEN"

echo ""
echo "✅ Token ustawiony"
echo ""

# Sprawdź zalogowanie
echo "🔍 Sprawdzam konto Expo..."
./node_modules/.bin/eas whoami

echo ""
echo "🔗 Inicjalizuję projekt EAS..."
./node_modules/.bin/eas init --non-interactive 2>/dev/null || echo "Projekt już powiązany lub wpisz ID ręcznie."

echo ""
echo "🔨 Buduję APK Android (profil: preview)..."
echo "   To zajmie ok. 10-15 minut na serwerach Expo."
echo ""
./node_modules/.bin/eas build \
  --platform android \
  --profile preview \
  --non-interactive \
  --message "Build Kalkulator MMA v1.0.0"

echo ""
echo "✅ Build zakończony! Sprawdź link powyżej lub:"
echo "   https://expo.dev/accounts/[nick]/projects/kalkulator-mma/builds"
