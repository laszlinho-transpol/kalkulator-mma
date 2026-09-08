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
