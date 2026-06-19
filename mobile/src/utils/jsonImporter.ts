// ============================================================
// IMPORTER JSON – wczytanie i walidacja planu z pliku
// ============================================================

import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system';
import type { Plan, Mieszanka } from '../types';

export interface DaneImportu {
  plan: Plan;
  mieszanki: Mieszanka[];
  wersja: string;
}

export type WynikImportu =
  | { sukces: true; dane: DaneImportu }
  | { sukces: false; blad: string };

/** Otwiera picker pliku JSON i parsuje zawartość */
export async function importujJSON(): Promise<{ sukces: true; dane: DaneImportu } | { sukces: false; blad: string }> {
  let wynik: DocumentPicker.DocumentPickerResult;
  try {
    wynik = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć pickera pliku.' };
  }

  if (wynik.canceled || !wynik.assets?.[0]) {
    return { sukces: false, blad: 'Anulowano wybór pliku.' };
  }

  const plik = wynik.assets[0];

  let zawartosc: string;
  try {
    zawartosc = await readAsStringAsync(plik.uri);
  } catch {
    return { sukces: false, blad: 'Nie udało się odczytać pliku.' };
  }

  let parsowane: any;
  try {
    parsowane = JSON.parse(zawartosc);
  } catch {
    return { sukces: false, blad: 'Plik nie jest prawidłowym JSON.' };
  }

  // Walidacja struktury
  if (!parsowane?.plan) {
    return { sukces: false, blad: 'Plik nie zawiera danych planu MMA. Upewnij się, że eksportujesz plik z aplikacji Kalkulator MMA.' };
  }

  const plan = parsowane.plan as Plan;

  if (!plan.id || !plan.dataWbudowywania || !Array.isArray(plan.dzialki)) {
    return { sukces: false, blad: 'Struktura planu jest nieprawidłowa lub uszkodzona.' };
  }

  // Generuj nowe ID, żeby uniknąć konfliktów
  const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const planZNowymId: Plan = {
    ...plan,
    id: generujId(),
    status: 'aktywny',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mieszanki: Mieszanka[] = Array.isArray(parsowane.mieszanki) ? parsowane.mieszanki : [];

  return {
    sukces: true,
    dane: {
      plan: planZNowymId,
      mieszanki,
      wersja: parsowane.wersja ?? '1.0',
    },
  };
}
