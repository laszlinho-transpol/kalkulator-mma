import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, ObszarObmiaru } from '../types';
import { CALY_PZT_ID, scalPztDoArkusza, transformStyku, zastosujTransform } from './pztPloter';
import { dlugoscPolilinii } from './osPzt';

function obszar(id: string, w: { x: number; y: number }[]): ObszarObmiaru {
  return {
    id,
    nazwa: id,
    kolejnosc: 1,
    wierzcholkiPdf: w,
    wierzcholkiM: w,
    powierzchniaM2: 100,
    obwodM: 40,
    zrodloNazwa: `${id}.xfdf`,
    createdAt: '',
  };
}

function arkusz(
  id: string,
  os: { x: number; y: number }[],
  km0: number,
  km1: number,
  poly: { x: number; y: number }[],
): ArkuszPzt {
  return {
    id,
    nazwa: id,
    zrodloNazwa: `${id}.xfdf`,
    kolejnosc: 1,
    kontynuacjaPoprzedniego: id !== 'a1',
    kilometrazPoczatkowyM: km0,
    kilometrazKoncowyM: km1,
    obszary: [obszar(`${id}-o`, poly)],
    osTrasy: {
      wierzcholkiPdf: os,
      wierzcholkiM: os,
      dlugoscM: km1 - km0,
    },
  };
}

describe('pztPloter', () => {
  it('transformStyku składa początek osi 2 w koniec osi 1 z tym samym kierunkiem', () => {
    const T = transformStyku(
      { x: 10, y: 4 },
      { x: 0, y: 1 },
      { x: 100, y: 0 },
      { x: 1, y: 0 },
    );
    const p = zastosujTransform(T, { x: 10, y: 4 });
    assert.ok(Math.abs(p.x - 100) < 1e-9);
    assert.ok(Math.abs(p.y) < 1e-9);
    const v = zastosujTransform(T, { x: 10, y: 5 });
    assert.ok(Math.abs(v.x - 101) < 1e-6);
    assert.ok(Math.abs(v.y) < 1e-6);
  });

  it('scalPztDoArkusza: drugi arkusz (lokalnie w +Y) dokleja się w +X', () => {
    const a1 = arkusz(
      'a1',
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      0,
      100,
      [{ x: 0, y: 5 }, { x: 0, y: -5 }, { x: 100, y: -5 }, { x: 100, y: 5 }],
    );
    const a2 = arkusz(
      'a2',
      [{ x: 0, y: 0 }, { x: 0, y: 50 }],
      100,
      150,
      [{ x: -4, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 50 }, { x: -4, y: 50 }],
    );
    const caly = scalPztDoArkusza([a1, a2]);
    assert.ok(caly);
    assert.equal(caly!.id, CALY_PZT_ID);
    const os = caly!.osTrasy!.wierzcholkiM;
    assert.ok(os.length >= 3);
    assert.ok(Math.abs(os[0].x) < 1e-6 && Math.abs(os[0].y) < 1e-6);
    const koniec = os[os.length - 1];
    assert.ok(Math.abs(koniec.x - 150) < 0.05, `koniec x=${koniec.x}`);
    assert.ok(Math.abs(koniec.y) < 0.05, `koniec y=${koniec.y}`);
    assert.ok(Math.abs(dlugoscPolilinii(os) - 150) < 0.1);
    assert.equal(caly!.obszary.length, 2);
    assert.equal(caly!.kilometrazPoczatkowyM, 0);
    assert.equal(caly!.kilometrazKoncowyM, 150);
  });
});
