import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ekranPunktNaPdf, pdfPunktNaEkran, prostokatTlaPdf, widocznyFragmentPdf } from './tloPztGeom';

describe('prostokatTlaPdf', () => {
  it('strona 100×50 wyśrodkowana wypełnia widok 100×50', () => {
    const r = prostokatTlaPdf({
      pageW: 100, pageH: 50, k: 1, cx: 50, cy: 25, skalaFit: 1, w: 100, h: 50,
    });
    assert.ok(Math.abs(r.x) < 0.01, `x=${r.x}`);
    assert.ok(Math.abs(r.y) < 0.01, `y=${r.y}`);
    assert.ok(Math.abs(r.width - 100) < 0.01, `w=${r.width}`);
    assert.ok(Math.abs(r.height - 50) < 0.01, `h=${r.height}`);
  });

  it('strona PDF leży w tym samym układzie co wierzchołki (bbox poza środkiem strony)', () => {
    const r = prostokatTlaPdf({
      pageW: 100, pageH: 50, k: 1, cx: 15, cy: 15, skalaFit: 1, w: 100, h: 100,
    });
    assert.ok(Math.abs(r.x - 35) < 0.01, `x=${r.x}`);
    assert.ok(Math.abs(r.y - 15) < 0.01, `y=${r.y}`);
    assert.ok(Math.abs(r.width - 100) < 0.01, `w=${r.width}`);
    assert.ok(Math.abs(r.height - 50) < 0.01, `h=${r.height}`);
  });

  it('pdf ↔ ekran jest odwrotnością (ten sam układ co poligony)', () => {
    const baza = { cx: 40, cy: 12, sfit: 2, tx: 10, ty: -4, szer: 320, wys: 200 };
    const e = pdfPunktNaEkran({ ...baza, pdfX: 70, pdfY: 30 });
    const p = ekranPunktNaPdf({ ...baza, x: e.x, y: e.y });
    assert.ok(Math.abs(p.x - 70) < 1e-6);
    assert.ok(Math.abs(p.y - 30) < 1e-6);
  });

  it('widoczny fragment to przecięcie strony z widokiem', () => {
    const f = widocznyFragmentPdf({
      pageW: 100, pageH: 50, cx: 50, cy: 25, skalaFit: 1, skala: 1, tx: 0, ty: 0, szer: 100, wys: 50,
    });
    assert.ok(f);
    assert.ok(f!.pdf.x0 <= 1);
    assert.ok(f!.pdf.x1 >= 99);
    assert.ok(f!.pdf.y0 <= 1);
    assert.ok(f!.pdf.y1 >= 49);
  });
});
