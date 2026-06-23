// ============================================================
// IMPORTER HTML – wczytanie raportu z podpisanym trybem LIVE
// ============================================================

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import type { Plan, Mieszanka, WpisLive } from '../types';

export interface DaneImportuHTML {
  plan: Plan;
  mieszanki: Mieszanka[];
  wpisyLive: Omit<WpisLive, 'id' | 'createdAt' | 'planId'>[];
  autorRaportu?: string;
  wersja: string;
}

export type WynikImportuHTML =
  | { sukces: true; dane: DaneImportuHTML }
  | { sukces: false; blad: string };

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function parsujDaneZHTML(zawartosc: string): any | null {
  const match = zawartosc.match(/<script type="application\/json" id="mma-export-data">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export async function importujHTML(): Promise<WynikImportuHTML> {
  let wynik: DocumentPicker.DocumentPickerResult;
  try {
    wynik = await DocumentPicker.getDocumentAsync({
      type: ['text/html', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć pickera pliku.' };
  }

  if (wynik.canceled || !wynik.assets?.[0]) {
    return { sukces: false, blad: 'Anulowano wybór pliku.' };
  }

  let zawartosc: string;
  try {
    const plik = new File(wynik.assets[0].uri);
    zawartosc = await plik.text();
  } catch {
    return { sukces: false, blad: 'Nie udało się odczytać pliku HTML.' };
  }

  const parsowane = parsujDaneZHTML(zawartosc);
  if (!parsowane?.plan) {
    return { sukces: false, blad: 'Plik HTML nie zawiera danych Kalkulatora MMA. Użyj pliku wyeksportowanego z aplikacji.' };
  }

  const plan = parsowane.plan as Plan;
  if (!plan.dataWbudowywania || !Array.isArray(plan.dzialki)) {
    return { sukces: false, blad: 'Struktura planu w pliku HTML jest uszkodzona.' };
  }

  const planZNowymId: Plan = {
    ...plan,
    id: generujId(),
    status: 'aktywny',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mieszankiRaw = parsowane.mieszanki;
  const mieszanki: Mieszanka[] = Array.isArray(mieszankiRaw)
    ? mieszankiRaw
    : Object.values(mieszankiRaw ?? {}) as Mieszanka[];

  const wpisyLive: Omit<WpisLive, 'id' | 'createdAt' | 'planId'>[] = Array.isArray(parsowane.wpisyLive)
    ? parsowane.wpisyLive.map((w: any) => ({
        dzialkaId: w.dzialkaId,
        numerAuta: w.numerAuta,
        tonazPrzywieziony: w.tonazPrzywieziony,
        przejechaneMetry: w.przejechaneMetry,
        komentarz: w.komentarz,
        godzinaWybudowania: w.godzinaWybudowania,
      }))
    : [];

  return {
    sukces: true,
    dane: {
      plan: planZNowymId,
      mieszanki,
      wpisyLive,
      autorRaportu: parsowane.autorRaportu,
      wersja: parsowane.wersja ?? '2.0',
    },
  };
}
