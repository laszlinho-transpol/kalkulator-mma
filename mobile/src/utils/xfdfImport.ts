// ============================================================
// IMPORT XFDF – DocumentPicker + odczyt pliku
// ============================================================

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parsujXfdfTekst, type WynikParsowaniaXfdf } from './xfdfParser';

export async function wybierzIParsujXfdf(): Promise<
  | { sukces: true; wynik: WynikParsowaniaXfdf }
  | { sukces: false; blad: string }
> {
  let picker: DocumentPicker.DocumentPickerResult;
  try {
    picker = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.adobe.xfdf', 'text/xml', 'application/xml', '*/*'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć pickera pliku.' };
  }

  if (picker.canceled || !picker.assets?.[0]) {
    return { sukces: false, blad: 'Anulowano wybór pliku.' };
  }

  const plik = picker.assets[0];
  const nazwa = plik.name || 'import.xfdf';

  let tekst: string;
  try {
    const f = new File(plik.uri);
    tekst = await f.text();
  } catch {
    return { sukces: false, blad: 'Nie udało się odczytać pliku XFDF.' };
  }

  if (!tekst.includes('<xfdf') && !tekst.includes('<polygon')) {
    return { sukces: false, blad: 'To nie wygląda na plik XFDF z wielokątami PDF-XChange.' };
  }

  const wynik = parsujXfdfTekst(tekst, nazwa);
  if (wynik.polygony.length === 0) {
    return { sukces: false, blad: 'W pliku XFDF nie znaleziono żadnego wielokąta (<polygon>).' };
  }

  return { sukces: true, wynik };
}
