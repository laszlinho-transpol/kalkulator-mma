# Kalkulator MMA – wskazówki dla agentów

- Reguły projektu: `.clinerules` (przeczytaj na początku), dziennik: `POSTEPY.md`.
- **Wygląd i nowe ekrany: `mobile/STYL.md`** – ekrany składamy z klocków `mobile/src/components/ui`
  (nagłówek z domkiem, karty, sekcje, dwie kolumny, opisy w „i”, wspólny kalendarz). Reguła Cursor:
  `.cursor/rules/styl-aplikacji.mdc`.
- Sprawdzanie: `cd mobile && npx tsc --noEmit && npx tsx --test src/**/*.test.ts`.
