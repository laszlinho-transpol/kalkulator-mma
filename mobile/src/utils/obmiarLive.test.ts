import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bilansLiveObszaru, dlugoscMiedzyWierzcholkami, zastosujRoleWezla } from './obmiarLive';
import type { ObszarObmiaru } from '../types';

describe('obmiarLive', () => {
  const prostokat: ObszarObmiaru = {
    id: 'o1',
    nazwa: 'Test',
    kolejnosc: 1,
    wierzcholkiPdf: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 }, { x: 0, y: 40 },
    ],
    wierzcholkiM: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 }, { x: 0, y: 40 },
    ],
    powierzchniaM2: 4000,
    obwodM: 280,
    zrodloNazwa: 't.xfdf',
    wezlyRole: [
      { x: 0, y: 0, idx: 0, rola: 'start' },
      { x: 100, y: 0, idx: 1, rola: 'koniec' },
    ],
    przejechaneMetry: 50,
    sumaTon: 120,
    createdAt: '',
  };

  it('liczy krotsza sciezke miedzy wierzcholkami', () => {
    assert.equal(dlugoscMiedzyWierzcholkami(prostokat.wierzcholkiM, 0, 1), 100);
  });

  it('bilans LIVE – postep i pozostalosci', () => {
    const b = bilansLiveObszaru(prostokat);
    assert.equal(b.dlugoscM, 100);
    assert.equal(b.postep, 0.5);
    assert.equal(b.zakrytaPowierzchniaM2, 2000);
    assert.equal(b.pozostaloMetrow, 50);
    assert.notEqual(b.sredniaGruboscCm, null);
  });

  it('zastosujRoleWezla – jedna rola start', () => {
    const w = zastosujRoleWezla(prostokat.wierzcholkiM, prostokat.wezlyRole, 2, 'start');
    assert.equal(w.filter((x) => x.rola === 'start').length, 1);
    assert.equal(w.find((x) => x.rola === 'start')?.idx, 2);
    assert.equal(w.find((x) => x.rola === 'koniec')?.idx, 1);
  });
});
