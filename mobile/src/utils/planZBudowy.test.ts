import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, KonstrukcjaObszaru, ObszarObmiaru, ProjektBudowy, WarstwaKonstrukcji } from '../types';
import { parsujXfdfTekst } from './xfdfParser';
import { arkuszZWynikuXfdf, dlugoscArkuszaM, nowaWarstwa, pustyProjektBudowy, zastosujKilometrazArkuszy } from './projektBudowy';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  komentarzPlanuBudowy,
  odcinkiKonstrukcjiDlaWarstwy,
  policzOdcinkiPlanu,
  tytulPlanuBudowy,
  zbudujPlanZBudowy,
} from './planZBudowy';
import { segmentyKonstrukcji } from './projektBudowy';

function warstwa(nazwa: string, kategoria: WarstwaKonstrukcji['kategoria'], cm: number): WarstwaKonstrukcji {
  return nowaWarstwa({ nazwa, kategoria, kolejnosc: 1, gruboscCm: cm, odsadzkaCm: 0 });
}

function prostokatLewy(dl: number, szer: number): ObszarObmiaru {
  return {
    id: 'l',
    nazwa: 'Trasa L',
    kolejnosc: 1,
    wierzcholkiPdf: [{ x: 0, y: szer }, { x: 0, y: 0 }, { x: dl, y: 0 }, { x: dl, y: szer }],
    wierzcholkiM: [{ x: 0, y: szer }, { x: 0, y: 0 }, { x: dl, y: 0 }, { x: dl, y: szer }],
    powierzchniaM2: dl * szer,
    obwodM: 2 * (dl + szer),
    zrodloNazwa: 'test.xfdf',
    kolorWypelnienia: '#FFEE58',
    stronaTrasy: 'lewa',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('planZBudowy / oś XFDF', () => {
  it('przerywana czarna linia to oś, nie krawężnik, a pikietaż bierze etykietę 435,68 m', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58" subject="Obszar"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#FF0000" subject="Obwód"><vertices>0,40;100,40</vertices></polyline>
<polyline color="#000000" style="dash" dashes="8,4,4,4" subject="Obwód">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>0,20;100,20</vertices>
</polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark_2_1.xfdf');
    assert.ok(w.osTrasy);
    assert.equal(w.osTrasy?.style, 'dash');
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 435.68) < 0.01);
    const arkusz = arkuszZWynikuXfdf(w, { kolejnosc: 1, kontynuacjaPoprzedniego: false, skala: DOMYSLNA_SKALA_PZT });
    assert.equal(dlugoscArkuszaM(arkusz), 435.68);
    assert.ok(arkusz.osTrasy);
    const kr = arkusz.obszary[0].krawedzniki ?? [];
    assert.ok(kr.every((k) => (k.kolor || '').toUpperCase() !== '#000000'));
  });

  it('107+000–108+000 z wyjątkiem 107+500–107+600 dzieli wiążącą na 3 odcinki', () => {
    const sma = warstwa('SMA', 'scieralna', 4);
    const wiaz = warstwa('Wiążąca', 'wiazaca', 8);
    const podb = warstwa('Podbudowa', 'podbudowa', 10);
    const wiazW = { ...wiaz, id: 'ww', gruboscCm: 5 };
    const podbW = { ...podb, id: 'pw', gruboscCm: 7 };
    const k: KonstrukcjaObszaru = {
      legendaId: 'legL',
      warstwy: [sma, wiaz, podb],
      wyjatki: [{
        id: 'w1',
        kmOdM: 107500,
        kmDoM: 107600,
        warstwy: [sma, wiazW, podbW],
      }],
    };
    const seg = segmentyKonstrukcji(k, 107000, 108000);
    assert.equal(seg.length, 3);
    assert.equal(seg[0].od, 107000);
    assert.equal(seg[0].do, 107500);
    assert.equal(seg[1].od, 107500);
    assert.equal(seg[1].do, 107600);
    assert.equal(seg[2].od, 107600);
    assert.equal(seg[2].do, 108000);
    assert.equal(seg[0].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 8);
    assert.equal(seg[1].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 5);
    assert.equal(seg[2].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 8);

    const projekt: ProjektBudowy = {
      ...pustyProjektBudowy(106850),
      arkusze: zastosujKilometrazArkuszy([{
        id: 'a1',
        nazwa: 'ark',
        zrodloNazwa: 'a.xfdf',
        kolejnosc: 1,
        kontynuacjaPoprzedniego: false,
        kilometrazPoczatkowyM: 0,
        kilometrazKoncowyM: 0,
        obszary: [prostokatLewy(9200, 7)],
        osTrasy: {
          wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
          wierzcholkiM: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
          dlugoscM: 9200,
        },
      } as ArkuszPzt], 106850),
      legenda: [{ id: 'legL', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna strona lewa' }],
      konstrukcje: [k],
    };

    const odc = odcinkiKonstrukcjiDlaWarstwy(projekt, 'legL', 107000, 108000, 'Wiążąca', 'wiazaca');
    assert.equal(odc.length, 3);
    assert.deepEqual(odc.map((o) => o.gruboscProjektowaCm), [8, 5, 8]);

    const licz = policzOdcinkiPlanu(projekt, {
      legendaId: 'legL',
      odM: 107000,
      doM: 108000,
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    assert.equal(licz.length, 3);
    assert.ok(Math.abs(licz[0].powierzchniaM2 - 3500) < 2, `oczekiwano ~3500, jest ${licz[0].powierzchniaM2}`);
    assert.ok(Math.abs(licz[1].powierzchniaM2 - 700) < 2, `oczekiwano ~700, jest ${licz[1].powierzchniaM2}`);
    assert.ok(Math.abs(licz[2].powierzchniaM2 - 2800) < 2, `oczekiwano ~2800, jest ${licz[2].powierzchniaM2}`);
    assert.ok(licz[0].masaMg > licz[1].masaMg);

    const plan = zbudujPlanZBudowy(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-09-10T06:00:00.000Z',
      legendaId: 'legL',
      obszarNazwa: 'Trasa główna strona lewa',
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      kilometrazOdM: 107000,
      kilometrazDoM: 108000,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      mieszankaId: 'mix1',
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    assert.equal(plan.zrodlo, 'budowa');
    assert.equal(plan.dzialki.length, 3);
    assert.equal(tytulPlanuBudowy(plan), 'Wiążąca 10.09.2026');
    assert.equal(komentarzPlanuBudowy(plan), '107+000 - 108+000 Trasa główna strona lewa');
  });
});
