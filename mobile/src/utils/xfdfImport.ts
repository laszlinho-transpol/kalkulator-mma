// ============================================================
// IMPORT XFDF – picker (web: <input>, native: DocumentPicker) + odczyt
// ============================================================

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  parsujListeTekstowXfdf,
  parsujZawartoscXfdf,
  scalWynikiXfdf,
  type WynikParsowaniaXfdf,
} from './xfdfParser';

export { parsujListeTekstowXfdf, parsujZawartoscXfdf, scalWynikiXfdf };

/** Rozszerzenia – XFDF z PDF-XChange często nie ma MIME, więc filtr po rozszerzeniu. */
export const ACCEPT_XFDF = '.xfdf,.xml,.txt,text/xml,text/plain,application/xml,*/*';

async function odczytajTekstZUri(uri: string): Promise<string> {
  try {
    const res = await fetch(uri);
    if (res.ok) return await res.text();
  } catch {
    /* blob:/data: czasem wymaga File API */
  }
  const f = new File(uri);
  return f.text();
}

async function odczytajTekstZAssetu(plik: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (plik.file) {
    return plik.file.text();
  }
  return odczytajTekstZUri(plik.uri);
}

export async function parsujWebFileList(lista: ArrayLike<{ name: string; text: () => Promise<string> }>): Promise<
  | { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] }
  | { sukces: false; blad: string }
> {
  const kopia: Array<{ name: string; text: () => Promise<string> }> = [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (f) kopia.push(f);
  }
  const pliki: Array<{ nazwa: string; tekst: string }> = [];
  const bledy: string[] = [];
  for (let i = 0; i < kopia.length; i++) {
    const f = kopia[i];
    const nazwa = f.name || `arkusz_${i + 1}.xfdf`;
    try {
      pliki.push({ nazwa, tekst: await f.text() });
    } catch {
      bledy.push(`Nie udało się odczytać pliku ${nazwa}.`);
    }
  }
  if (pliki.length === 0) {
    return { sukces: false, blad: bledy[0] || 'Nie udało się odczytać wybranych plików.' };
  }
  const r = parsujListeTekstowXfdf(pliki);
  if (!r.sukces) return r;
  return { sukces: true, wyniki: r.wyniki, pominiete: [...bledy, ...r.pominiete] };
}

async function odczytajWynikZAssetu(
  plik: DocumentPicker.DocumentPickerAsset,
): Promise<{ sukces: true; wynik: WynikParsowaniaXfdf } | { sukces: false; blad: string }> {
  const nazwa = plik.name || 'import.xfdf';
  let tekst: string;
  try {
    tekst = await odczytajTekstZAssetu(plik);
  } catch {
    return { sukces: false, blad: `Nie udało się odczytać pliku ${nazwa}.` };
  }
  return parsujZawartoscXfdf(tekst, nazwa);
}

export async function wybierzIParsujXfdf(): Promise<
  | { sukces: true; wynik: WynikParsowaniaXfdf }
  | { sukces: false; blad: string }
> {
  let picker: DocumentPicker.DocumentPickerResult;
  try {
    picker = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć pickera pliku.' };
  }

  if (picker.canceled || !picker.assets?.[0]) {
    return { sukces: false, blad: 'Anulowano wybór pliku.' };
  }

  return odczytajWynikZAssetu(picker.assets[0]);
}

/** Import wielu arkuszy PZT (XFDF / XML / TXT z polygonami). */
export async function wybierzIParsujWieleXfdf(): Promise<
  | { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] }
  | { sukces: false; blad: string }
> {
  let picker: DocumentPicker.DocumentPickerResult;
  try {
    picker = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć pickera plików.' };
  }

  if (picker.canceled || !picker.assets?.length) {
    return { sukces: false, blad: 'Anulowano wybór plików.' };
  }

  const posortowane = [...picker.assets].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }),
  );

  const czesci = [];
  for (const asset of posortowane) {
    const r = await odczytajWynikZAssetu(asset);
    czesci.push(r.sukces
      ? { nazwa: asset.name || 'import.xfdf', wynik: r.wynik }
      : { nazwa: asset.name || 'import.xfdf', blad: r.blad });
  }
  return scalWynikiXfdf(czesci);
}
