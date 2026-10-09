import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { folderTlaSesji } from '../../utils/tloPztImport';

const HTML_RASTER = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<script src="pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
function fail(msg) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, blad: String(msg) }));
}
window.rasteruj = function(strona, skala) {
  if (typeof pdfjsLib === 'undefined') { fail('Brak silnika PDF.'); return; }
  pdfjsLib.getDocument({ url: 'plan.pdf', verbosity: 0 }).promise.then(function(doc) {
    var n = doc.numPages;
    var p = Math.max(1, Math.min(n, strona|0));
    return doc.getPage(p).then(function(page) {
      var vp1 = page.getViewport({ scale: 1 });
      var s = skala || 1.5;
      var MAX = 3072;
      if (vp1.width * s > MAX) s = MAX / vp1.width;
      if (vp1.height * s > MAX) s = MAX / vp1.height;
      var vp = page.getViewport({ scale: s });
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(vp.width));
      c.height = Math.max(1, Math.round(vp.height));
      return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          ok: true,
          pageW: vp1.width,
          pageH: vp1.height,
          liczbaStron: n,
          strona: p,
          dataUrl: c.toDataURL('image/jpeg', 0.82)
        }));
      });
    });
  }).catch(function(e) { fail(e && e.message ? e.message : e); });
};
window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, ready: true }));
</script></body></html>`;

async function kopiujAsset(mod: number, dest: File) {
  const a = await Asset.fromModule(mod).downloadAsync();
  const uri = a.localUri ?? a.uri;
  if (!uri) throw new Error('Brak silnika PDF.');
  new File(uri).copySync(dest, { overwrite: true });
}

async function przygotujFolder(sesjaId: string, pdfUri: string): Promise<string> {
  const folder = folderTlaSesji(sesjaId);
  await kopiujAsset(require('../../../assets/pdfjs/pdf.min.js.txt'), new File(folder, 'pdf.min.js'));
  await kopiujAsset(require('../../../assets/pdfjs/pdf.worker.min.js.txt'), new File(folder, 'pdf.worker.min.js'));
  const plan = new File(folder, 'plan.pdf');
  const zrodlo = new File(pdfUri);
  if (zrodlo.uri !== plan.uri) zrodlo.copySync(plan, { overwrite: true });
  const base = folder.uri.endsWith('/') ? folder.uri : `${folder.uri}/`;
  return base;
}

export interface WynikRasteruPdf {
  pageW: number;
  pageH: number;
  liczbaStron: number;
  strona: number;
  dataUrl: string;
}

interface Props {
  sesjaId: string;
  pdfUri: string;
  strona: number;
  onGotowe: (w: WynikRasteruPdf) => void;
  onBlad: (komunikat: string) => void;
}

export function PdfRasterizer({ sesjaId, pdfUri, strona, onGotowe, onBlad }: Props) {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const gotowy = useRef(false);
  const zakonczony = useRef(false);
  const wv = useRef<WebView>(null);

  useEffect(() => {
    gotowy.current = false;
    zakonczony.current = false;
    setBaseUrl(null);
    przygotujFolder(sesjaId, pdfUri)
      .then(setBaseUrl)
      .catch((e) => onBlad(String(e?.message ?? e)));
  }, [sesjaId, pdfUri]);

  const odpal = () => {
    if (!gotowy.current || zakonczony.current) return;
    wv.current?.injectJavaScript(`window.rasteruj(${strona}, 1.5); true;`);
  };

  useEffect(() => {
    if (baseUrl && gotowy.current) odpal();
  }, [strona, baseUrl]);

  useEffect(() => {
    if (!baseUrl) return;
    const t = setTimeout(() => {
      if (!zakonczony.current) {
        zakonczony.current = true;
        onBlad('PDF nie wczytał się. Wyeksportuj stronę jako JPG z PDF-XChange i wczytaj jako obraz.');
      }
    }, 90000);
    return () => clearTimeout(t);
  }, [baseUrl, strona]);

  if (!baseUrl) return null;

  return (
    <View style={styl.ukryty} pointerEvents="none">
      <WebView
        ref={wv}
        source={{ html: HTML_RASTER, baseUrl }}
        originWhitelist={['*', 'file://']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL={baseUrl}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        onLoadEnd={() => {
          if (!gotowy.current) {
            gotowy.current = true;
            odpal();
          }
        }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.ready) {
              gotowy.current = true;
              odpal();
              return;
            }
            if (zakonczony.current) return;
            if (!msg.ok) {
              zakonczony.current = true;
              onBlad(msg.blad || 'Nie udało się odczytać PDF.');
              return;
            }
            zakonczony.current = true;
            onGotowe({
              pageW: msg.pageW,
              pageH: msg.pageH,
              liczbaStron: msg.liczbaStron,
              strona: msg.strona,
              dataUrl: msg.dataUrl,
            });
          } catch {
            if (!zakonczony.current) {
              zakonczony.current = true;
              onBlad('Błąd odczytu strony PDF.');
            }
          }
        }}
        style={styl.ukryty}
      />
    </View>
  );
}

const styl = StyleSheet.create({
  ukryty: { width: 1, height: 1, opacity: 0, position: 'absolute' },
});
