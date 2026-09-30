// ============================================================
// TŁO PZT – prostokąt strony PDF w układzie SVG podglądu
//
// XFDF (PDF-XChange) i pdf.js używają tych samych punktów PDF.
// Wierzchołki: pdfNaMetry (Y w górę). JPEG z pdf.js ma Y w dół,
// więc górna krawędź obrazu = (0, pageH) w przestrzeni PDF.
// ============================================================

export function prostokatTlaPdf(opts: {
  pageW: number;
  pageH: number;
  k: number;
  cx: number;
  cy: number;
  skalaFit: number;
  w: number;
  h: number;
}): { x: number; y: number; width: number; height: number } {
  const pageWm = opts.pageW * opts.k;
  const pageHm = opts.pageH * opts.k;
  const toSvg = (x: number, y: number) => ({
    x: opts.w / 2 + (x - opts.cx) * opts.skalaFit,
    y: opts.h / 2 - (y - opts.cy) * opts.skalaFit,
  });
  const a = toSvg(0, pageHm);
  const b = toSvg(pageWm, 0);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Punkt PDF (Y w górę) → piksel ekranu z pan/zoom jak w SVG G. */
export function pdfPunktNaEkran(opts: {
  pdfX: number;
  pdfY: number;
  cx: number;
  cy: number;
  sfit: number;
  tx: number;
  ty: number;
  szer: number;
  wys: number;
}): { x: number; y: number } {
  return {
    x: opts.szer / 2 + opts.tx + opts.sfit * (opts.pdfX - opts.cx),
    y: opts.wys / 2 + opts.ty - opts.sfit * (opts.pdfY - opts.cy),
  };
}

export function ekranPunktNaPdf(opts: {
  x: number;
  y: number;
  cx: number;
  cy: number;
  sfit: number;
  tx: number;
  ty: number;
  szer: number;
  wys: number;
}): { x: number; y: number } {
  const s = Math.max(opts.sfit, 1e-9);
  return {
    x: opts.cx + (opts.x - opts.szer / 2 - opts.tx) / s,
    y: opts.cy - (opts.y - opts.wys / 2 - opts.ty) / s,
  };
}

export interface WidocznyFragmentPdf {
  dest: { x: number; y: number; width: number; height: number };
  pdf: { x0: number; y0: number; x1: number; y1: number };
}

/** Wycinek strony PDF pokrywający aktualny widok (do ostrego rastra). */
export function widocznyFragmentPdf(opts: {
  pageW: number;
  pageH: number;
  cx: number;
  cy: number;
  skalaFit: number;
  skala: number;
  tx: number;
  ty: number;
  szer: number;
  wys: number;
}): WidocznyFragmentPdf | null {
  const sfit = Math.max(opts.skala * opts.skalaFit, 1e-9);
  const baza = {
    cx: opts.cx, cy: opts.cy, sfit, tx: opts.tx, ty: opts.ty, szer: opts.szer, wys: opts.wys,
  };
  const tl = pdfPunktNaEkran({ ...baza, pdfX: 0, pdfY: opts.pageH });
  const br = pdfPunktNaEkran({ ...baza, pdfX: opts.pageW, pdfY: 0 });
  const destX = Math.min(tl.x, br.x);
  const destY = Math.min(tl.y, br.y);
  const destW = Math.max(Math.abs(br.x - tl.x), 1);
  const destH = Math.max(Math.abs(br.y - tl.y), 1);

  const iL = Math.max(destX, 0);
  const iT = Math.max(destY, 0);
  const iR = Math.min(destX + destW, opts.szer);
  const iB = Math.min(destY + destH, opts.wys);
  if (iR - iL < 2 || iB - iT < 2) return null;

  const rogi = [
    ekranPunktNaPdf({ ...baza, x: iL, y: iT }),
    ekranPunktNaPdf({ ...baza, x: iR, y: iT }),
    ekranPunktNaPdf({ ...baza, x: iL, y: iB }),
    ekranPunktNaPdf({ ...baza, x: iR, y: iB }),
  ];
  const pad = 8 / sfit;
  const x0 = Math.max(0, Math.min(...rogi.map((p) => p.x)) - pad);
  const x1 = Math.min(opts.pageW, Math.max(...rogi.map((p) => p.x)) + pad);
  const y0 = Math.max(0, Math.min(...rogi.map((p) => p.y)) - pad);
  const y1 = Math.min(opts.pageH, Math.max(...rogi.map((p) => p.y)) + pad);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return null;

  const a = pdfPunktNaEkran({ ...baza, pdfX: x0, pdfY: y1 });
  const b = pdfPunktNaEkran({ ...baza, pdfX: x1, pdfY: y0 });
  return {
    dest: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.max(Math.abs(b.x - a.x), 1),
      height: Math.max(Math.abs(b.y - a.y), 1),
    },
    pdf: { x0, y0, x1, y1 },
  };
}
