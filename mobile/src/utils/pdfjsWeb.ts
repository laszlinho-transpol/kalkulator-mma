// ============================================================
// pdf.js w przeglądarce – skrypty z assets (ten sam silnik co raster Obmiaru)
// ============================================================

type PdfjsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array | ArrayBuffer; verbosity?: number }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<PdfjsPage>;
    }>;
  };
};

export type PdfjsPage = {
  getViewport: (opts: {
    scale: number;
    offsetX?: number;
    offsetY?: number;
    dontFlip?: boolean;
  }) => { width: number; height: number; transform: number[] };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number; transform: number[] };
    intent?: string;
  }) => { promise: Promise<void>; cancel: () => void };
};

let ladowanie: Promise<PdfjsLib> | null = null;

async function pobierzTekst(urls: string[]): Promise<string> {
  let ostatni = 'Brak silnika PDF.';
  for (const u of urls) {
    if (!u) continue;
    try {
      const res = await fetch(u);
      if (res.ok) return await res.text();
      ostatni = `${u} (${res.status})`;
    } catch (e) {
      ostatni = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Nie udało się wczytać silnika PDF: ${ostatni}`);
}

async function tekstAssetu(mod: number): Promise<string> {
  const { Asset } = await import('expo-asset');
  const a = Asset.fromModule(mod);
  await a.downloadAsync();
  const uri = a.localUri ?? a.uri;
  const baza = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  const prefix = baza.includes('kalkulator-mma') ? '/kalkulator-mma' : '';
  return pobierzTekst([
    uri ?? '',
    `${prefix}/assets/pdf.min.js`,
    '/kalkulator-mma/assets/pdf.min.js',
  ].filter(Boolean));
}

async function tekstWorkera(mod: number): Promise<string> {
  const { Asset } = await import('expo-asset');
  const a = Asset.fromModule(mod);
  await a.downloadAsync();
  const uri = a.localUri ?? a.uri;
  return pobierzTekst([uri ?? ''].filter(Boolean));
}

function blobUrl(tekst: string): string {
  return URL.createObjectURL(new Blob([tekst], { type: 'text/javascript' }));
}

export async function zaladujPdfjs(): Promise<PdfjsLib> {
  if (typeof window === 'undefined') {
    throw new Error('Tło PDF jest dostępne w przeglądarce.');
  }
  const w = window as unknown as { pdfjsLib?: PdfjsLib };
  if (w.pdfjsLib) return w.pdfjsLib;
  if (ladowanie) return ladowanie;
  ladowanie = (async () => {
    const jsTekst = await tekstAssetu(require('../../assets/pdfjs/pdf.min.js.txt'));
    const wkTekst = await tekstWorkera(require('../../assets/pdfjs/pdf.worker.min.js.txt'));
    const jsUrl = blobUrl(jsTekst);
    const wkUrl = blobUrl(wkTekst);
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = jsUrl;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Nie udało się uruchomić pdf.js'));
      document.head.appendChild(s);
    });
    if (!w.pdfjsLib) throw new Error('Silnik PDF nie załadował się.');
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = wkUrl;
    return w.pdfjsLib;
  })();
  try {
    return await ladowanie;
  } catch (e) {
    ladowanie = null;
    throw e;
  }
}

export async function wymiaryStronyPdf(
  data: Uint8Array,
  strona = 1,
): Promise<{ pageW: number; pageH: number; liczbaStron: number }> {
  const pdfjs = await zaladujPdfjs();
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const p = Math.max(1, Math.min(doc.numPages, strona));
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  return { pageW: vp.width, pageH: vp.height, liczbaStron: doc.numPages };
}
