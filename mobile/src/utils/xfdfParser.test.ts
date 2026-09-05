import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsujVertices, parsujXfdfTekst, obszaryZPolygony } from './xfdfParser';
import {
  powierzchniaWielokata,
  skalujWierzcholki,
  metryNaPunktPdf,
  skalaDoZnanejPowierzchni,
} from './obmiarGeometry';
import { DOMYSLNA_SKALA_PZT } from '../types';

const SAMPLE_VERTICES =
  '570.724731,1808.670044;535.141113,1801.249634;456.219025,1784.404907;417.53775,1776.069946;430.696442,1777.016846';

const SAMPLE_XFDF = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
<f href="../Documents/Budowy/PZT.2 Rozniaty.pdf"/>
<annots>
<polygon interior-color="#FFEE58" title="Admin" opacity="0.800001">
<vertices>${SAMPLE_VERTICES};499.779205,1699.869525;495.590363,1721.640015;417.53775,1776.069946</vertices>
</polygon>
<polygon interior-color="#FFEE58" title="Admin">
<vertices>31.721592,1712.597656;39.947086,1682.49707;75.004913,1692.67041;123.183395,1706.451782;31.721592,1712.597656</vertices>
</polygon>
</annots>
</xfdf>`;

describe('obmiarGeometry / xfdfParser', () => {
  it('parsujVertices – pary x,y ze średnikami', () => {
    const pts = parsujVertices(SAMPLE_VERTICES);
    assert.equal(pts.length, 5);
    assert.ok(Math.abs(pts[0].x - 570.724731) < 1e-6);
    assert.ok(Math.abs(pts[0].y - 1808.670044) < 1e-6);
  });

  it('parsujXfdfTekst – dwa polygony + href PDF', () => {
    const w = parsujXfdfTekst(SAMPLE_XFDF, 'PZT.2.xfdf');
    assert.equal(w.polygony.length, 2);
    assert.ok(w.zrodloPdfHref?.includes('Rozniaty'));
    assert.equal(w.polygony[0].kolorWypelnienia, '#FFEE58');
    assert.ok(w.polygony[0].wierzcholki.length >= 5);
  });

  it('skala 1:500 – metryNaPunkt > 0', () => {
    const k = metryNaPunktPdf(DOMYSLNA_SKALA_PZT);
    assert.ok(k > 0.17 && k < 0.18);
  });

  it('obszaryZPolygony – powierzchnia > 0 i kolejność', () => {
    const w = parsujXfdfTekst(SAMPLE_XFDF, 'test.xfdf');
    const obszary = obszaryZPolygony(w, DOMYSLNA_SKALA_PZT, 1);
    assert.equal(obszary.length, 2);
    assert.equal(obszary[0].kolejnosc, 1);
    assert.equal(obszary[1].kolejnosc, 2);
    assert.ok(obszary[0].powierzchniaM2 > 0);
    assert.equal(obszary[0].zrodloNazwa, 'test.xfdf');
  });

  it('kalibracja do znanej powierzchni CSV (~1821 m²)', () => {
    const pts = parsujVertices(
      '0,0;100,0;100,50;0,50',
    );
    // prostokąt 100×50 w PDF → kalibracja do 1821 m²
    const skala = skalaDoZnanejPowierzchni(pts, 1821);
    const metry = skalujWierzcholki(pts, skala);
    const pow = powierzchniaWielokata(metry);
    assert.ok(Math.abs(pow - 1821) < 1);
  });
});
