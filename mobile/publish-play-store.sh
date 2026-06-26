#!/bin/bash
# ============================================================
# PUBLIKACJA DO GOOGLE PLAY – Kalkulator MMA
# ============================================================
# Użycie:
#   bash publish-play-store.sh build [EXPO_TOKEN]     – buduje AAB
#   bash publish-play-store.sh submit [EXPO_TOKEN]     – wysyła ostatni build (wymaga google-service-account.json)
#   bash publish-play-store.sh all [EXPO_TOKEN]        – build + submit
#
# Token Expo: https://expo.dev/accounts/laszlinho/settings/access-tokens

set -e

CMD="${1:-build}"
TOKEN="${2:-$EXPO_TOKEN}"
EAS="./node_modules/.bin/eas"

if [ -z "$TOKEN" ]; then
  echo ""
  echo "❌ Brak tokena Expo."
  echo "Użycie: bash publish-play-store.sh build TWÓJ_EXPO_TOKEN"
  echo "Token: https://expo.dev/accounts/laszlinho/settings/access-tokens"
  echo ""
  exit 1
fi

export EXPO_TOKEN="$TOKEN"

cd "$(dirname "$0")"

echo "🔍 Konto Expo:"
$EAS whoami

case "$CMD" in
  build)
    echo ""
    echo "🔨 Buduję AAB (profil: production) dla Google Play..."
    echo "   Po zakończeniu pobierz .aab i wgraj ręcznie w Play Console → Test wewnętrzny"
    echo "   Instrukcja: mobile/PUBLIKACJA_PLAY_STORE.md"
    echo ""
    $EAS build \
      --platform android \
      --profile production \
      --non-interactive \
      --message "Kalkulator MMA – wydanie Play Store"
    ;;
  submit)
    if [ ! -f "google-service-account.json" ]; then
      echo ""
      echo "❌ Brak pliku google-service-account.json"
      echo "   Utwórz konto serwisowe Google i zapisz klucz JSON w tym katalogu."
      echo "   Szczegóły: PUBLIKACJA_PLAY_STORE.md → CZĘŚĆ E"
      echo ""
      echo "   Alternatywa: pobierz AAB z expo.dev i wgraj ręcznie w Play Console."
      exit 1
    fi
    echo ""
    echo "📤 Wysyłam ostatni build na tor internal (Google Play)..."
    $EAS submit --platform android --profile production --latest --non-interactive
    ;;
  all)
    $0 build "$TOKEN"
    if [ -f "google-service-account.json" ]; then
      $0 submit "$TOKEN"
    else
      echo ""
      echo "ℹ️  Build gotowy. Brak google-service-account.json – wgraj AAB ręcznie."
      echo "   Zobacz: PUBLIKACJA_PLAY_STORE.md → CZĘŚĆ C"
    fi
    ;;
  *)
    echo "Nieznana komenda: $CMD"
    echo "Użyj: build | submit | all"
    exit 1
    ;;
esac

echo ""
echo "✅ Gotowe."
