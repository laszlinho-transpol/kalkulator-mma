// ============================================================
// TŁO PZT – wybór PDF/obrazu i kopia do pamięci sesji
// ============================================================

import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'react-native';

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export interface PlikTlaPzt {
  uri: string;
  nazwa: string;
  typ: 'pdf' | 'obraz';
}

export function folderTlaSesji(sesjaId: string): Directory {
  const folder = new Directory(Paths.document, 'obmiar-tlo', sesjaId);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  return folder;
}

export async function wybierzPlikTlaPzt(sesjaId: string): Promise<PlikTlaPzt | null> {
  const wynik = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
    copyToCacheDirectory: true,
  });
  if (wynik.canceled || !wynik.assets?.[0]) return null;
  const asset = wynik.assets[0];
  const nazwa = asset.name ?? 'pzt.pdf';
  const typ: PlikTlaPzt['typ'] = asset.mimeType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(nazwa)
    ? 'obraz'
    : 'pdf';
  const folder = folderTlaSesji(sesjaId);
  const ext = nazwa.split('.').pop() ?? (typ === 'pdf' ? 'pdf' : 'jpg');
  const docel = new File(folder, `zrodlo_${generujId()}.${ext}`);
  new File(asset.uri).copySync(docel, { overwrite: true });
  return { uri: docel.uri, nazwa, typ };
}

export function rozmiarObrazu(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export async function zapiszJpegTla(sesjaId: string, dataUrl: string, strona = 1): Promise<string> {
  const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) throw new Error('Brak obrazu strony PDF.');
  const folder = folderTlaSesji(sesjaId);
  const docel = new File(folder, `strona_${strona}.jpg`);
  if (docel.exists) docel.delete();
  docel.write(m[1], { encoding: 'base64' });
  return docel.uri;
}
