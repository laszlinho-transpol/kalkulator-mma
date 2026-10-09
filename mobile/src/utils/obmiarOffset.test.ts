import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { odsadzKrawedz, odsadzLancuch, odsadzPoLancuchu, odsadzPoLancuchuOdOsi, listaKrawedzi } from './obmiarOffset';
import { pelneKilometrazeCo100m, punktNaSciezceUkladania } from './obmiarKilometraz';
import type { ObszarObmiaru } from '../types';

describe('obmiarOffset', () => {
  const prostokat = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 5 },
    { x: 0, y: 5 },
  ];

  it('odsadzka 10 cm na zewnatrz na 100 m → +10 m2', () => {
    const w = odsadzKrawedz(prostokat, 0, 0.1);
    assert.ok(Math.abs(w.dlugoscKrawedziM - 100) < 0.01);
    assert.ok(Math.abs(w.deltaPowierzchniaM2 - 10) < 0.15, `delta=${w.deltaPowierzchniaM2}`);
    assert.ok(Math.abs(w.powierzchniaM2 - 510) < 0.15, `pow=${w.powierzchniaM2}`);
  });

  it('odsadzka do wewnatrz zmniejsza powierzchnie', () => {
    const w = odsadzKrawedz(prostokat, 0, -0.1);
    assert.ok(w.deltaPowierzchniaM2 < 0);
    assert.ok(Math.abs(w.powierzchniaM2 - 490) < 0.15);
  });

  it('lista krawedzi – 4', () => {
    assert.equal(listaKrawedzi(prostokat).length, 4);
  });

  it('odsadz lancuch dlugiej krawedzi', () => {
    const w = odsadzLancuch(prostokat, 0, 1, 0.1);
    assert.ok(Math.abs(w.deltaPowierzchniaM2 - 10) < 0.15);
  });

  it('odsadz po lancuchu prawego boku', () => {
    const w = odsadzPoLancuchu(prostokat, [3, 2], 0.1);
    assert.ok(Math.abs(Math.abs(w.deltaPowierzchniaM2) - 10) < 0.2);
  });

  it('odsadzka od osi: zewnatrz na boku L (wzdłuż układania) zwieksza pole', () => {
    const obszar: ObszarObmiaru = {
      id: 'o1',
      nazwa: 'T',
      kolejnosc: 1,
      wierzcholkiPdf: [],
      wierzcholkiM: prostokat,
      powierzchniaM2: 500,
      obwodM: 210,
      zrodloNazwa: 't',
      bazaStart: { idxLewy: 3, idxPrawy: 0 },
      bazaKoniec: { idxLewy: 2, idxPrawy: 1 },
      createdAt: '',
    };
    const w = odsadzPoLancuchuOdOsi(obszar, [3, 2], 0.1);
    assert.ok(w.deltaPowierzchniaM2 > 0, `delta=${w.deltaPowierzchniaM2}`);
    assert.ok(Math.abs(w.deltaPowierzchniaM2 - 10) < 0.2, `delta=${w.deltaPowierzchniaM2}`);
    assert.ok(Math.abs(w.wierzcholki[3].y - 5.1) < 0.02, `yL=${w.wierzcholki[3].y}`);
  });

  it('odsadzka do osi zmniejsza pole na tym samym boku L', () => {
    const obszar: ObszarObmiaru = {
      id: 'o1',
      nazwa: 'T',
      kolejnosc: 1,
      wierzcholkiPdf: [],
      wierzcholkiM: prostokat,
      powierzchniaM2: 500,
      obwodM: 210,
      zrodloNazwa: 't',
      bazaStart: { idxLewy: 3, idxPrawy: 0 },
      bazaKoniec: { idxLewy: 2, idxPrawy: 1 },
      createdAt: '',
    };
    const w = odsadzPoLancuchuOdOsi(obszar, [3, 2], -0.1);
    assert.ok(w.deltaPowierzchniaM2 < 0);
    assert.ok(Math.abs(w.powierzchniaM2 - 490) < 0.2);
    assert.ok(Math.abs(w.wierzcholki[3].y - 4.9) < 0.02);
  });
});

describe('obmiarKilometraz', () => {
  it('pelne pikiety co 100 m od 1+830', () => {
    const z = pelneKilometrazeCo100m(1, 830, 400);
    assert.deepEqual(
      z.map((x) => x.etykieta),
      ['1+900', '2+000', '2+100', '2+200'],
    );
    assert.equal(z[0].odStartuM, 70);
    assert.equal(z[1].odStartuM, 170);
  });

  it('brak znacznikow gdy dlugosc za krotka', () => {
    assert.equal(pelneKilometrazeCo100m(1, 830, 50).length, 0);
  });

  it('pikiety malejace od 1+830 na 400 m', () => {
    const z = pelneKilometrazeCo100m(1, 830, 400, 'malejacy');
    assert.deepEqual(
      z.map((x) => x.etykieta),
      ['1+800', '1+700', '1+600', '1+500'],
    );
    assert.equal(z[0].odStartuM, 30);
  });

  it('punkt na sciezce – w polowie boku', () => {
    const obszar: ObszarObmiaru = {
      id: 'o1',
      nazwa: 'T',
      kolejnosc: 1,
      wierzcholkiPdf: [],
      wierzcholkiM: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 5 },
        { x: 0, y: 5 },
      ],
      powierzchniaM2: 500,
      obwodM: 210,
      zrodloNazwa: 't',
      wezlyRole: [
        { x: 0, y: 0, idx: 0, rola: 'start' },
        { x: 100, y: 0, idx: 1, rola: 'koniec' },
      ],
      createdAt: '',
    };
    const p = punktNaSciezceUkladania(obszar, 50);
    assert.ok(p.ok);
    assert.ok(Math.abs(p.punkt.x - 50) < 0.01);
    assert.ok(Math.abs(p.headingRad) < 0.01);
  });
});
