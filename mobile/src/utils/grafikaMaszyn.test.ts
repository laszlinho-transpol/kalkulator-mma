import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { oczyscSvg, znormalizujGrafike } from './grafikaMaszyn';

describe('oczyscSvg', () => {
  it('przyjmuje prosty plik SVG', () => {
    const r = oczyscSvg('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#00aa00"/></svg>');
    assert.equal(r.ok, true);
  });

  it('odrzuca skrypt i plik bez svg', () => {
    assert.equal(oczyscSvg('<svg><script>alert(1)</script></svg>').ok, false);
    assert.equal(oczyscSvg('nie svg').ok, false);
  });

  it('stare jedno pole wyglad rozdziela na obie maszyny', () => {
    const g = znormalizujGrafike({ wyglad: 'bok', svgAuta: '<svg></svg>' });
    assert.equal(g.wygladRozkladarki, 'bok');
    assert.equal(g.wygladAuta, 'bok');
    assert.equal(g.svgAuta, '<svg></svg>');
    assert.equal(g.svgRozkladarki, null);
  });

  it('osobny wygląd rozkładarki nie zmienia auta', () => {
    const g = znormalizujGrafike({ wygladRozkladarki: 'bok', wygladAuta: 'obmiar', svgRozkladarki: '<svg id="r"/>' });
    assert.equal(g.wygladRozkladarki, 'bok');
    assert.equal(g.wygladAuta, 'obmiar');
    assert.equal(g.svgRozkladarki, '<svg id="r"/>');
  });

  it('odrzuca zbyt duży plik', () => {
    const r = oczyscSvg(`<svg>${'a'.repeat(200_000)}</svg>`);
    assert.equal(r.ok, false);
  });
});
