// ============================================================
// STYL APLIKACJI – jedno źródło odstępów, zaokrągleń, typografii, cieni i kolorów dni.
// Zasady użycia: mobile/STYL.md. Komponenty: src/components/ui.
// ============================================================

import type { TextStyle, ViewStyle } from 'react-native';
import type { AppTheme } from './theme';
import { czySwieto } from '../budzet/kalendarzPracy';

export const ODSTEP = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
export const PROMIEN = { s: 8, m: 12, l: 16, pigulka: 999 } as const;
/** Czasy animacji [ms]: nacisk przycisku, wejście ekranu/karty. */
export const CZAS = { nacisk: 110, wejscie: 240 } as const;
/** Skala przycisku przy wciśnięciu. */
export const SKALA_NACISKU = 0.97;

export const TYPOGRAFIA = {
  tytulKarty: { fontSize: 16, fontWeight: '800' } as TextStyle,
  sekcja: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
  etykieta: { fontSize: 14 } as TextStyle,
  wartosc: { fontSize: 15, fontWeight: '700' } as TextStyle,
  opis: { fontSize: 13, lineHeight: 18 } as TextStyle,
  podsumowanie: { fontSize: 13, fontWeight: '700' } as TextStyle,
  duza: { fontSize: 18, fontWeight: '800' } as TextStyle,
};

export function cien(theme: AppTheme): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOpacity: theme.dark ? 0.35 : 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  };
}

export type RodzajDnia = 'roboczy' | 'sobota' | 'niedziela' | 'swieto';

/** Przyjmuje „RRRR-MM-DD” albo pełny znacznik ISO (wtedy liczy się dzień lokalny, nie UTC). */
function dzienLokalny(iso: string): string {
  if (iso.length <= 10) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function rodzajDnia(isoWejscie: string): RodzajDnia {
  const iso = dzienLokalny(isoWejscie);
  if (czySwieto(iso)) return 'swieto';
  const [rok, miesiac, dzien] = iso.split('-').map(Number);
  const numer = new Date(rok, miesiac - 1, dzien).getDay();
  if (numer === 6) return 'sobota';
  if (numer === 0) return 'niedziela';
  return 'roboczy';
}

/** Kolor numeru dnia w kalendarzu i na listach dat. */
export function kolorDnia(theme: AppTheme, iso: string): string {
  const rodzaj = rodzajDnia(iso);
  if (rodzaj === 'sobota') return theme.colors.sobota;
  if (rodzaj === 'niedziela' || rodzaj === 'swieto') return theme.colors.niedziela;
  return theme.colors.text;
}
