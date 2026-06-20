// ============================================================
// EKSPORT PLIKÓW – zapis i udostępnianie (nowe API expo-file-system)
// ============================================================

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function zapiszIUdostepnijPlik(
  nazwaPliku: string,
  tresc: string,
  mimeType: string,
  tytulDialogu: string,
): Promise<void> {
  const plik = new File(Paths.document, nazwaPliku);
  if (plik.exists) plik.delete();
  plik.create();
  plik.write(tresc);

  const dostepne = await Sharing.isAvailableAsync();
  if (!dostepne) {
    throw new Error('Udostępnianie nie jest dostępne na tym urządzeniu.');
  }

  await Sharing.shareAsync(plik.uri, {
    mimeType,
    dialogTitle: tytulDialogu,
    UTI: mimeType,
  });
}
