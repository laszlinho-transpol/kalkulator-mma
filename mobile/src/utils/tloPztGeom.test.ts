import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prostokatTlaPdf } from './tloPztGeom';

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
});
