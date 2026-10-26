import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { powierzchniaWielokata } from './obmiarGeometry';
import { poszerzWielokat, powierzchniaWarstwyObszaru, PROG_KRAWEDZNIKA_M } from './odsadzkaObszaru';
import type { ArkuszPzt, ObszarObmiaru } from '../types';

function prostokat(dl: number, szer: number, y0 = 0): ObszarObmiaru {
  const wierzcholki = [
    { x: 0, y: y0 + szer },
    { x: 0, y: y0 },
    { x: dl, y: y0 },
    { x: dl, y: y0 + szer },
  ];
  return {
    id: 'o',
    nazwa: 'test',
    kolejnosc: 1,
    wierzcholkiPdf: wierzcholki,
    wierzcholkiM: wierzcholki.map((p) => ({ ...p })),
    powierzchniaM2: dl * szer,
    obwodM: 2 * (dl + szer),
    zrodloNazwa: 't.xfdf',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('odsadzka obszaru', () => {
  it('prostokąt 100×10 bez krawężnika rośnie o 15 cm z każdej strony', () => {
    const poly = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }, { x: 0, y: 10 },
    ];
    const os = [{ x: 0, y: 5 }, { x: 100, y: 5 }];
    const out = poszerzWielokat(poly, os, [], 0.15, 0.15, PROG_KRAWEDZNIKA_M);
    const pole = powierzchniaWielokata(out);
    assert.ok(Math.abs(pole - 1030) < 0.05, `oczekiwano 1030, jest ${pole}`);
  });

  it('krawężnik na prawej krawędzi nie poszerza tej strony', () => {
    const poly = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }, { x: 0, y: 10 },
    ];
    const os = [{ x: 0, y: 5 }, { x: 100, y: 5 }];
    const krawedzPrawa = [[{ x: 0, y: 0 }, { x: 100, y: 0 }]];
    const out = poszerzWielokat(poly, os, krawedzPrawa, 0.15, 0.15, PROG_KRAWEDZNIKA_M);
    const pole = powierzchniaWielokata(out);
    assert.ok(Math.abs(pole - 1015) < 0.05, `oczekiwano 1015, jest ${pole}`);
    const prawe = out.filter((p) => Math.abs(p.y) < 0.02);
    assert.equal(prawe.length, 2);
  });

  it('krawężnik na lewej krawędzi zostawia poszerzenie tylko z prawej', () => {
    const obszar = prostokat(100, 10);
    obszar.krawedzniki = [{
      id: 'k',
      wierzcholkiPdf: [{ x: 0, y: 10 }, { x: 100, y: 10 }],
      wierzcholkiM: [{ x: 0, y: 10 }, { x: 100, y: 10 }],
      dlugoscM: 100,
      odlegloscOdKrawedziM: 0,
      polozenie: 'zewnetrzna',
    }];
    const arkusz = {
      id: 'a',
      nazwa: 'a',
      zrodloNazwa: 'a',
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 100,
      obszary: [obszar],
      osTrasy: {
        wierzcholkiPdf: [{ x: 0, y: 5 }, { x: 100, y: 5 }],
        wierzcholkiM: [{ x: 0, y: 5 }, { x: 100, y: 5 }],
        dlugoscM: 100,
      },
    } as ArkuszPzt;
    const pole = powierzchniaWarstwyObszaru(obszar, arkusz, 15, 15);
    assert.ok(Math.abs(pole - 1015) < 0.05, `oczekiwano 1015, jest ${pole}`);
  });
});
