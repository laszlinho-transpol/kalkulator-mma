// ============================================================
// IMPORT XFDF – DocumentPicker + odczyt pliku (jeden lub wiele)
// ============================================================

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parsujXfdfTekst, type WynikParsowaniaXfdf } from './xfdfParser';

const TYPY_XFDF = [
  'application/vnd.adobe.xfdf',
  'text/xml',
  'application/xml',
  'text/plain',
  '*/*',
];

async function odczytajWynikZAssetu(
  plik: DocumentPicker.DocumentPickerAsset,
): Promise<{ sukces: true; wynik: WynikParsowaniaXfdf } | { sukces: false; blad: string }> {
  const nazwa = plik.name || 'import.xfdf';
  let tekst: string;
  try {
    const f = new File(plik.uri);
    tekst = await f.text();
  } catch {
    return { sukces: false, blad: `Nie udało się odczytać pliku ${nazwa}.` };
  }

  if (!tekst.includes('<xfdf') && !tekst.includes('<polygon')) {
    return { sukces: false, blad: `${nazwa} nie wygląda na plik XFDF z wielokątami PDF-XChange.` };
  }

  const wynik = parsujXfdfTekst(tekst, nazwa);
  if (wynik.polygony.length === 0) {
    return { sukces: false, blad: `W pliku ${nazwa} nie znaleziono żadnego wielokąta (<polygon>).` };
  }

  return { sukces: true, wynik };
}

export async function wybierzIParsujXfdf(): Promise<
  | { sukces: true; wynik: WynikParsowaniaXfdf }
  | { sukces: false; blad: string }
> {
  let picker: DocumentPicker.DocumentPickerResult;
  try {
    picker = await DocumentPicker.getDocumentAsync({
      type: TYPY_XFDF,
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
      type: TYPY_XFDF,
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

  const wyniki: WynikParsowaniaXfdf[] = [];
  const pominiete: string[] = [];
  for (const asset of posortowane) {
    const r = await odczytajWynikZAssetu(asset);
    if (r.sukces) wyniki.push(r.wynik);
    else pominiete.push(r.blad);
  }

  if (wyniki.length === 0) {
    return { sukces: false, blad: pominiete[0] || 'Nie udało się wczytać żadnego arkusza XFDF.' };
  }

  return { sukces: true, wyniki, pominiete };
}
