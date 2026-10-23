// Udostępnianie strony jako PDF: na telefonie plik PDF + arkusz udostępniania, w przeglądarce okno drukowania („Zapisz jako PDF”).

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { htmlDokumentu, type DokumentPdf } from './dokumentPdf';

/** Na webie expo-print drukuje całą aplikację – dokument idzie przez osobną ramkę. */
export function drukujHtmlWRamce(html: string) {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:fixed;width:0;height:0;border:0;');
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 250);
}

export async function udostepnijHtmlJakoPdf(html: string, tytul = 'Udostępnij PDF'): Promise<void> {
  if (Platform.OS === 'web') {
    drukujHtmlWRamce(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: tytul });
}

export function udostepnijDokumentPdf(dokument: DokumentPdf): Promise<void> {
  return udostepnijHtmlJakoPdf(htmlDokumentu(dokument), `Udostępnij: ${dokument.tytul}`);
}
