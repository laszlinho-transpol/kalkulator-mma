import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsujVertices, parsujXfdfTekst, obszaryZPolygony, parsujListeTekstowXfdf, scalLinieOsi, bazyWzdluzOsi } from './xfdfParser';
import { dlugoscPolilinii, orientujLancuchDoKm, osPdfZorientowana, rozciagnijLancuchDoDlugosci, rozmiarPodzialkiOsi, stacjePodzialki, stronaWzgledemOsi } from './osPzt';
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
    assert.equal(w.polilinie.length, 0);
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

  it('żółty/różowy + czerwony obwód: L/P, krawężnik na krawędzi, bez odsadzki', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58" subject="Obszar">
<vertices>0,40;0,20;100,20;100,40</vertices>
</polygon>
<polygon interior-color="#FFC0CB" subject="Obszar">
<vertices>0,20;0,0;100,0;100,20</vertices>
</polygon>
<polyline color="#FF0000" subject="Obwód">
<vertices>0,40;50,40;100,40</vertices>
</polyline>
<polyline color="#FF0000" subject="Obwód">
<vertices>40,20;60,20</vertices>
</polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'dk25.xfdf');
    assert.equal(w.polygony.length, 2);
    assert.equal(w.polilinie.length, 2);
    const obszary = obszaryZPolygony(w, DOMYSLNA_SKALA_PZT);
    assert.equal(obszary[0].nazwa, 'Trasa L');
    assert.equal(obszary[1].nazwa, 'Trasa P');
    assert.equal(obszary[0].stronaTrasy, 'lewa');
    assert.equal(obszary[1].stronaTrasy, 'prawa');
    const krL = obszary[0].krawedzniki ?? [];
    const krP = obszary[1].krawedzniki ?? [];
    assert.ok(krL.length >= 1);
    assert.ok(krL.every((k) => k.odlegloscOdKrawedziM < 0.05));
    assert.ok(krL.some((k) => k.polozenie === 'zewnetrzna'));
    assert.ok(krL.some((k) => k.polozenie === 'odOsi') || krP.some((k) => k.polozenie === 'odOsi'));
    assert.ok(obszary[0].odsadzki?.every((o) => !o.zastosowana));
    assert.ok(obszary[0].bazaStart?.idxLewy != null && obszary[0].bazaStart.idxPrawy != null);
  });

  it('parsujListeTekstowXfdf – sortuje arkusze i pomija śmieci', () => {
    const xfdf = (kolor: string) =>
      `<?xml version="1.0"?><xfdf><polygon interior-color="${kolor}"><vertices>0,0;10,0;10,10;0,10</vertices></polygon></xfdf>`;
    const r = parsujListeTekstowXfdf([
      { nazwa: 'ark_2_10.xfdf', tekst: xfdf('#FFC0CB') },
      { nazwa: 'ark_2_2.xfdf', tekst: xfdf('#FFEE58') },
      { nazwa: 'notatka.txt', tekst: 'to nie jest xfdf' },
    ]);
    assert.equal(r.sukces, true);
    if (!r.sukces) return;
    assert.equal(r.wyniki.length, 2);
    assert.equal(r.wyniki[0].zrodloNazwa, 'ark_2_2.xfdf');
    assert.equal(r.wyniki[1].zrodloNazwa, 'ark_2_10.xfdf');
    assert.equal(r.pominiete.length, 1);
  });

  it('scala kreski osi i nie dubluje tej samej etykiety metrażu', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polyline color="#000000" style="dash">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>0,20;50,20</vertices>
</polyline>
<polyline color="#000000" style="dash">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>50,20;100,20</vertices>
</polyline>
<polyline color="#FF0000" subject="Obwód"><vertices>0,40;100,40</vertices></polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark.xfdf');
    assert.ok(w.osTrasy);
    assert.ok((w.osTrasy?.wierzcholki.length ?? 0) >= 4);
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 435.68) < 0.01);
    const scalona = scalLinieOsi(w.polilinie);
    assert.equal(scalona?.dlugoscEtykietaM, 435.68);
    assert.equal(w.polilinie.filter((p) => (p.color || '').toUpperCase() === '#FF0000').length, 1);
  });

  it('czyta wymiar osi mimo podzielonych tagów HTML i osobnej linii wymiarowej', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#000000" style="dash"><vertices>0,20;100,20</vertices></polyline>
<line color="#000000" start="0,28" end="100,28">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68</span><span> m</span></p></body></contents-richtext>
</line>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark.xfdf');
    assert.ok(w.osTrasy);
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 435.68) < 0.01);
  });

  it('lewa/prawa i podstawy idą wzdłuż osi rosnącego km', () => {
    const os = [{ x: 0, y: 10 }, { x: 100, y: 10 }];
    assert.equal(stronaWzgledemOsi({ x: 50, y: 20 }, os), 'lewa');
    assert.equal(stronaWzgledemOsi({ x: 50, y: 0 }, os), 'prawa');
    const poly = [
      { x: 0, y: 20 }, { x: 0, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 20 },
    ];
    const b = bazyWzdluzOsi(poly, os);
    assert.ok(b);
    assert.equal(b?.start.idxLewy, 0);
    assert.equal(b?.start.idxPrawy, 1);
    assert.equal(b?.koniec.idxLewy, 3);
    assert.equal(b?.koniec.idxPrawy, 2);
  });

  it('podziałka 50 m od 106+850 zawiera 106+850 i 106+900, bez 116+031', () => {
    const s = stacjePodzialki(106850, 116031, 50);
    assert.equal(s[0], 106850);
    assert.ok(s.includes(106900));
    assert.ok(s.includes(107000));
    assert.equal(s[s.length - 1], 116000);
    assert.ok(!s.includes(116031));
  });

  it('nie wciąga linii wymiarowej ani kreski poza jezdnią do osi', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;400,20;400,40</vertices></polygon>
<polyline color="#000000" style="dash"><vertices>0,20;400,20</vertices></polyline>
<line color="#000000" style="dash" start="200,20" end="200,200">
<contents>113,89 m</contents>
</line>
<polyline color="#000000" style="dash"><vertices>0,400;80,400</vertices></polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark.xfdf');
    assert.ok(w.osTrasy);
    assert.ok(w.osTrasy!.wierzcholki.every((p) => p.y < 80));
    assert.ok(!w.osTrasy!.wierzcholki.some((p) => p.y > 100));
    assert.ok(w.osTrasy!.wierzcholki[0].x <= w.osTrasy!.wierzcholki[w.osTrasy!.wierzcholki.length - 1].x);
  });

  it('orientuje oś od strony startu km, nawet gdy wierzchołki są od prawej', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;400,20;400,40</vertices></polygon>
<polyline color="#000000" style="dash"><vertices>400,20;0,20</vertices></polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark.xfdf');
    const os = w.osTrasy?.wierzcholki ?? [];
    assert.ok(os.length >= 2);
    assert.ok(os[0].x < os[os.length - 1].x);
  });

  it('bierze wymiar arkusza bliski długości osi, nie poprzeczny 113 m', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;400,20;400,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents>435,68 m</contents>
<vertices>0,20;400,20</vertices>
</polyline>
<line color="#000000" start="50,0" end="50,80"><contents>113,89 m</contents></line>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark.xfdf');
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 435.68) < 0.01);
  });

  it('orientujLancuchDoKm idzie w kierunku arkusza, nie do punktu z innej strony PDF', () => {
    const rtl = [{ x: 100, y: 10 }, { x: 0, y: 10 }];
    const out = orientujLancuchDoKm(rtl, { x: 1, y: 0 });
    assert.equal(out[0].x, 0);
    assert.equal(out[out.length - 1].x, 100);
  });

  it('osPdfZorientowana odwraca zapisaną oś narysowaną od końca arkusza', () => {
    const os = osPdfZorientowana({
      id: 'a',
      nazwa: 'a',
      zrodloNazwa: 'a.xfdf',
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 100,
      obszary: [{
        id: 'o',
        nazwa: 'L',
        kolejnosc: 1,
        wierzcholkiPdf: [{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 20 }],
        wierzcholkiM: [],
        powierzchniaM2: 1,
        obwodM: 1,
        zrodloNazwa: 'a.xfdf',
        createdAt: '',
      }],
      osTrasy: {
        wierzcholkiPdf: [{ x: 100, y: 10 }, { x: 0, y: 10 }],
        wierzcholkiM: [],
        dlugoscM: 100,
      },
    });
    assert.equal(os[0].x, 0);
    assert.equal(os[os.length - 1].x, 100);
  });

  it('poprzeczka km nie szersza niż obszar i ma drobny opis', () => {
    const r = rozmiarPodzialkiOsi(40);
    assert.ok(r.halfPdf * 2 <= 40 + 1e-6);
    assert.ok(r.fontPdf <= 6.2);
    assert.ok(r.odstepTekstuPdf < 40);
  });

  it('rozciąga oś do etykiety XFDF, bez zmiany kierunku', () => {
    const os = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 140, y: 0 }];
    const out = rozciagnijLancuchDoDlugosci(os, 210);
    assert.ok(Math.abs(dlugoscPolilinii(out) - 210) < 1e-6);
    assert.ok(out[out.length - 1].x > 200);
    assert.ok(Math.abs(out[out.length - 1].y) < 1e-9);
  });

  it('Ark_2_22: przerywana oś 422,07 m od lewej do prawej, bez odwrócenia', () => {
    const xml = readFileSync(join(process.cwd(), 'src/utils/fixtures/dk25_ark_2_22.xfdf'), 'utf8');
    const w = parsujXfdfTekst(xml, 'DK25M_kowarsko_2_22.xfdf');
    const os = w.osTrasy?.wierzcholki ?? [];
    assert.ok(os.length >= 50);
    assert.ok(os[0].x < 120 && os[os.length - 1].x > 2300);
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 422.07) < 0.01);
    assert.ok(w.zrodloPdfHref?.includes('Ark_2_22'));
  });
});
