import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { oczyscSvg } from './grafikaMaszyn';

describe('oczyscSvg', () => {
  it('przyjmuje prosty plik SVG', () => {
    const r = oczyscSvg('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#00aa00"/></svg>');
    assert.equal(r.ok, true);
  });

  it('odrzuca skrypt i plik bez svg', () => {
    assert.equal(oczyscSvg('<svg><script>alert(1)</script></svg>').ok, false);
    assert.equal(oczyscSvg('nie svg').ok, false);
  });

  it('odrzuca zbyt duży plik', () => {
    const r = oczyscSvg(`<svg>${'a'.repeat(200_000)}</svg>`);
    assert.equal(r.ok, false);
  });
});
