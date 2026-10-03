import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Mieszanka, ObszarObmiaru, SesjaObmiaruDnia } from '../types';
import {
  brakiZatwierdzeniaObszaru,
  etykietaMasy,
  etykietaPowierzchni,
  obszarNaDzialke,
  podsumowaniePlanuObmiaru,
} from './obmiarDoPlanu';

const mix = (id: string, rodzaj: string, nrRecepty?: string, rho = 2.5): Mieszanka => ({
  id,
  rodzaj,
  nrRecepty,
  ciezarObjetosciowy: rho,
  createdAt: '',
  updatedAt: '',
});

const obszar = (p: Partial<ObszarObmiaru> & Pick<ObszarObmiaru, 'id' | 'powierzchniaM2'>): ObszarObmiaru => ({
  nazwa: p.nazwa ?? p.id,
  kolejnosc: p.kolejnosc ?? 1,
  wierzcholkiPdf: [],
  wierzcholkiM: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 5 },
    { x: 0, y: 5 },
  ],
  obwodM: 210,
  zrodloNazwa: 't',
  createdAt: '',
  ...p,
});

describe('brakiZatwierdzeniaObszaru', () => {
  it('wymaga start/koniec L+P, mieszanki i grubosci', () => {
    const o = obszar({ id: 'a', powierzchniaM2: 500 });
    const braki = brakiZatwierdzeniaObszaru(o);
    assert.equal(braki.some((b) => b.pole === 'start'), true);
    assert.equal(braki.some((b) => b.pole === 'konstrukcja'), true);
  });

  it('puste gdy komplet', () => {
    const o = obszar({
      id: 'a',
      powierzchniaM2: 500,
      bazaStart: { idxLewy: 3, idxPrawy: 0 },
      bazaKoniec: { idxLewy: 2, idxPrawy: 1 },
      mieszankaId: 'm1',
      gruboscWbudowywania: 5,
    });
    assert.equal(brakiZatwierdzeniaObszaru(o).length, 0);
  });
});

describe('podsumowaniePlanuObmiaru', () => {
  const sesja = (obszary: ObszarObmiaru[]): SesjaObmiaruDnia => ({
    id: 's1',
    nazwa: 'Dzień',
    data: '2026-09-07',
    skala: { mianownik: 500, metryNaCm: 5 },
    obszary,
    createdAt: '',
    updatedAt: '',
  });

  it('liczy auta osobno per mieszanka (12 t + 10 t = 2 auta)', () => {
    const obszary = [
      obszar({
        id: 'a', powierzchniaM2: 96, mieszankaId: 'ac16', gruboscWbudowywania: 5, kolejnosc: 1,
      }),
      obszar({
        id: 'b', powierzchniaM2: 80, mieszankaId: 'ac8', gruboscWbudowywania: 5, kolejnosc: 2,
      }),
    ];
    // 96 * 0.05 * 2.5 = 12 t; 80 * 0.05 * 2.5 = 10 t
    const p = podsumowaniePlanuObmiaru(
      sesja(obszary),
      [mix('ac16', 'AC16W', 'KR1-2'), mix('ac8', 'AC8S', 'KR1-2')],
      25.5,
    );
    assert.equal(p.sumaAut, 2);
    assert.equal(p.masaNaMieszanke.length, 2);
    assert.ok(p.masaNaMieszanke.every((m) => m.auta === 1));
  });

  it('rozdziela te sama mieszanke przy roznej grubosci', () => {
    const obszary = [
      obszar({
        id: 'a', powierzchniaM2: 280, mieszankaId: 'ac16', gruboscWbudowywania: 5, kolejnosc: 1,
      }),
      obszar({
        id: 'b', powierzchniaM2: 750, mieszankaId: 'ac16', gruboscWbudowywania: 8, kolejnosc: 2,
      }),
    ];
    // 280*0.05*2.5 = 35 t; 750*0.08*2.5 = 150 t
    const p = podsumowaniePlanuObmiaru(sesja(obszary), [mix('ac16', 'AC16W', 'KR1-2')], 25.5);
    assert.equal(p.mieszanki.length, 2);
    assert.ok(p.mieszanki.some((m) => m.gruboscCm === 5 && Math.abs(m.masaMg - 35) < 0.05));
    assert.ok(p.mieszanki.some((m) => m.gruboscCm === 8 && Math.abs(m.masaMg - 150) < 0.05));
    assert.equal(p.masaNaMieszanke.length, 1);
    assert.equal(p.masaNaMieszanke[0].auta, Math.ceil(185 / 25.5));
    assert.match(etykietaMasy(p.mieszanki.find((m) => m.gruboscCm === 5)!), /35/);
    assert.match(etykietaPowierzchni(p.powierzchnie[0]), /AC16W/);
  });
});

describe('obszarNaDzialke', () => {
  it('kopiuje nazwe dzialki i grubosci', () => {
    const dz = obszarNaDzialke(obszar({
      id: 'a',
      powierzchniaM2: 500,
      nazwaDzialki: 'Pas 1',
      mieszankaId: 'm1',
      gruboscProjektowa: 6,
      tolerancja: 8,
      gruboscWbudowywania: 5,
      bazaStart: { idxLewy: 3, idxPrawy: 0, kilometrazKm: 1, kilometrazM: 200 },
      bazaKoniec: { idxLewy: 2, idxPrawy: 1 },
    }));
    assert.equal(dz.nazwa, 'Pas 1');
    assert.equal(dz.gruboscWbudowywania, 5);
    assert.equal(dz.gruboscProjektowa, 6);
    assert.equal(dz.tolerancja, 8);
    assert.equal(dz.mieszankaId, 'm1');
  });
});
