// Zapis rysunku jako plik SVG: na webie pobranie pliku, na telefonie arkusz udostępniania.

import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export function nazwaPlikuSvg(nazwa: string): string {
  const baza = nazwa
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${baza || 'rysunek'}.svg`;
}

export async function udostepnijSvg(svg: string, nazwa: string): Promise<void> {
  const plikNazwa = nazwaPlikuSvg(nazwa);
  const tresc = `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([tresc], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = plikNazwa;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  const plik = new File(Paths.cache, plikNazwa);
  if (plik.exists) plik.delete();
  plik.write(tresc);
  await Sharing.shareAsync(plik.uri, { mimeType: 'image/svg+xml', UTI: 'public.svg-image', dialogTitle: `Udostępnij: ${nazwa}` });
}
