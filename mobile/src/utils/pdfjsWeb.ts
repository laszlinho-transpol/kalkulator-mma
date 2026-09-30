// ============================================================
// pdf.js w przeglądarce – skrypty z assets (ten sam silnik co raster Obmiaru)
// ============================================================

export type PdfjsOpcjonalnaTresc = {
  getGroups?: () => Record<string, unknown> | null;
  setVisibility?: (id: string, visible: boolean) => void;
};

export type PdfjsDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfjsPage>;
  getOptionalContentConfig?: () => Promise<PdfjsOpcjonalnaTresc | null>;
};

type PdfjsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array | ArrayBuffer; verbosity?: number }) => {
    promise: Promise<PdfjsDocument>;
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
    optionalContentConfig?: PdfjsOpcjonalnaTresc | null;
    transform?: number[];
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
  const kopia = data.slice();
  const doc = await pdfjs.getDocument({ data: kopia, verbosity: 0 }).promise;
  const p = Math.max(1, Math.min(doc.numPages, strona));
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  return { pageW: vp.width, pageH: vp.height, liczbaStron: doc.numPages };
}

export async function wlaczWszystkieWarstwyOcg(
  doc: PdfjsDocument,
): Promise<PdfjsOpcjonalnaTresc | null> {
  try {
    const oc = await doc.getOptionalContentConfig?.();
    if (!oc) return null;
    const groups = oc.getGroups?.();
    if (groups && oc.setVisibility) {
      for (const id of Object.keys(groups)) oc.setVisibility(id, true);
    }
    return oc;
  } catch {
    return null;
  }
}

export async function otworzStronePdf(
  data: Uint8Array,
  strona = 1,
): Promise<{
  doc: PdfjsDocument;
  page: PdfjsPage;
  pageW: number;
  pageH: number;
  oc: PdfjsOpcjonalnaTresc | null;
}> {
  const pdfjs = await zaladujPdfjs();
  const kopia = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
    ? data.slice()
    : data.slice();
  const doc = await pdfjs.getDocument({ data: kopia, verbosity: 0 }).promise;
  const p = Math.max(1, Math.min(doc.numPages, strona));
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const oc = await wlaczWszystkieWarstwyOcg(doc);
  return { doc, page, pageW: vp.width, pageH: vp.height, oc };
}

const MAX_KRAWEDZ_RASTRA = 4096;

function canvasDoUri(canvas: HTMLCanvasElement): string {
  const png = canvas.toDataURL('image/png');
  if (png.length < 6_500_000) return png;
  return canvas.toDataURL('image/jpeg', 0.93);
}

/** Raster wycinka strony (Y PDF w górę) → data URL (jak tło Obmiaru, działa w SVG). */
export async function rasterujFragmentStrony(
  page: PdfjsPage,
  opts: {
    pageW: number;
    pageH: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    pxNaPunkt: number;
    oc?: PdfjsOpcjonalnaTresc | null;
  },
): Promise<{ uri: string; cancel: () => void }> {
  const pdfW = Math.max(opts.x1 - opts.x0, 0.5);
  const pdfH = Math.max(opts.y1 - opts.y0, 0.5);
  let rs = Math.max(opts.pxNaPunkt, 2.5);
  rs = Math.min(rs, MAX_KRAWEDZ_RASTRA / pdfW, MAX_KRAWEDZ_RASTRA / pdfH);
  rs = Math.max(rs, 1.5);

  const srcX = opts.x0 * rs;
  const srcY = (opts.pageH - opts.y1) * rs;
  const srcW = pdfW * rs;
  const srcH = pdfH * rs;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW));
  canvas.height = Math.max(1, Math.round(srcH));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Brak kontekstu canvas.');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const wspRender = {
    intent: 'print' as const,
    optionalContentConfig: opts.oc ?? undefined,
  };

  let task: { cancel: () => void };
  try {
    const viewport = page.getViewport({ scale: rs });
    const t = page.render({
      canvasContext: ctx,
      viewport,
      transform: [1, 0, 0, 1, -srcX, -srcY],
      ...wspRender,
    });
    task = t;
    await t.promise;
  } catch {
    const rsFull = Math.max(
      0.9,
      Math.min(rs, MAX_KRAWEDZ_RASTRA / Math.max(opts.pageW, 1), MAX_KRAWEDZ_RASTRA / Math.max(opts.pageH, 1)),
    );
    const vp = page.getViewport({ scale: rsFull });
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(vp.width));
    off.height = Math.max(1, Math.round(vp.height));
    const offCtx = off.getContext('2d');
    if (!offCtx) throw new Error('Brak offscreen canvas.');
    offCtx.fillStyle = '#FFFFFF';
    offCtx.fillRect(0, 0, off.width, off.height);
    const t = page.render({ canvasContext: offCtx, viewport: vp, ...wspRender });
    task = t;
    await t.promise;
    ctx.drawImage(
      off,
      opts.x0 * rsFull,
      (opts.pageH - opts.y1) * rsFull,
      pdfW * rsFull,
      pdfH * rsFull,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
  return { uri: canvasDoUri(canvas), cancel: () => task.cancel() };
}
