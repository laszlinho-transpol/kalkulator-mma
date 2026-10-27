import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, KonstrukcjaObszaru, ObszarObmiaru, OsBocznaPzt } from '../types';
import { domyslneWarstwyKonstrukcji, nowaKonstrukcja } from './projektBudowy';
import { kmNaOsiBocznej, lancuchOsiBocznej, lokalizacjaObszaru, odcinkiObszaru } from './lokalizacjaObszaru';

function arkusz(obszary: ObszarObmiaru[], boczne: OsBocznaPzt[] = []): ArkuszPzt {
  return {
    id: 'a',
    nazwa: 'Ark. 1',
    zrodloNazwa: 'a.xfdf',
    kolejnosc: 1,
    kontynuacjaPoprzedniego: false,
    kilometrazPoczatkowyM: 1000,
    kilometrazKoncowyM: 1100,
    obszary,
    osTrasy: {
      wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      wierzcholkiM: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      dlugoscM: 100,
      kolor: '#000000',
    },
    osieBoczne: boczne,
  };
}

function prostokat(id: string, x0: number, x1: number, y0: number, y1: number): ObszarObmiaru {
  const w = [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
  return {
    id,
    nazwa: id,
    kolejnosc: 1,
    wierzcholkiPdf: w,
    wierzcholkiM: w,
    powierzchniaM2: Math.abs(x1 - x0) * Math.abs(y1 - y0),
    obwodM: 0,
    zrodloNazwa: 'a.xfdf',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('lokalizacja obszaru', () => {
  it('obszar wzdłuż czarnej osi dostaje odcinek od–do', () => {
    const obszar = prostokat('jezdnia', 20, 70, 0, 7);
    const lok = lokalizacjaObszaru(obszar, arkusz([obszar]));
    assert.equal(lok?.rodzaj, 'os');
    assert.equal(Math.round(lok?.kmTrasyOdM ?? 0), 1020);
    assert.equal(Math.round(lok?.kmTrasyDoM ?? 0), 1070);
    assert.match(lok?.tekst ?? '', /1\+020/);
    assert.match(lok?.tekst ?? '', /1\+070/);
  });

  it('niebieska prostopadła: 0+000 na końcu dalszym, styk jest końcem i lokalizacją na trasie', () => {
    const boczna: OsBocznaPzt = {
      id: 'nb',
      wierzcholkiPdf: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      wierzcholkiM: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      dlugoscM: 60,
      kolor: '#0000FF',
    };
    const obszar = prostokat('wjazd', 32, 48, -2, 62);
    const a = arkusz([obszar], [boczna]);
    const lancuch = lancuchOsiBocznej(boczna, a);
    assert.equal(lancuch?.prostopadla, true);
    assert.equal(Math.round(lancuch?.kmTrasyM ?? 0), 1040);
    assert.equal(Math.round(kmNaOsiBocznej(boczna, lancuch!, 0)), 60);
    assert.equal(Math.round(kmNaOsiBocznej(boczna, lancuch!, 60)), 0);
    const lok = lokalizacjaObszaru(obszar, a);
    assert.equal(lok?.rodzaj, 'boczna');
    assert.equal(Math.round(lok?.kmTrasyOdM ?? 0), 1040);
    assert.equal(Math.round(lok?.kmBocznaOdM ?? -1), 0);
    assert.equal(Math.round(lok?.kmBocznaDoM ?? 0), 60);
    const reczna: OsBocznaPzt = { ...boczna, pikietaWezla: { indeks: 1, kmM: 10 } };
    const lancuchR = lancuchOsiBocznej(reczna, a);
    assert.equal(Math.round(kmNaOsiBocznej(reczna, lancuchR!, 60)), 10);
    assert.equal(Math.round(kmNaOsiBocznej(reczna, lancuchR!, 0)), 70);
  });

  it('zmiana konstrukcji dzieli obszar na trzy odcinki 1, 1.1 i 1', () => {
    const obszar = prostokat('jezdnia', 0, 100, 0, 10);
    const a = arkusz([obszar]);
    const baza = nowaKonstrukcja('leg', 1);
    const konstrukcja: KonstrukcjaObszaru = {
      ...baza,
      warstwy: domyslneWarstwyKonstrukcji(),
      wyjatki: [{
        id: 'w1',
        numer: 1,
        kmOdM: 1050,
        kmDoM: 1060,
        warstwy: domyslneWarstwyKonstrukcji(),
      }],
    };
    const odcinki = odcinkiObszaru(obszar, a, konstrukcja);
    assert.equal(odcinki.length, 3);
    assert.deepEqual(odcinki.map((o) => o.numer), ['1', '1.1', '1']);
    assert.equal(Math.round(odcinki[0].kmOdM), 1000);
    assert.equal(Math.round(odcinki[0].kmDoM), 1050);
    assert.equal(Math.round(odcinki[1].kmOdM), 1050);
    assert.equal(Math.round(odcinki[1].kmDoM), 1060);
    assert.ok(odcinki[1].powierzchniaM2 > 0);
    assert.ok(odcinki[1].powierzchniaM2 < obszar.powierzchniaM2);
    assert.ok(odcinki[1].wierzcholkiPdf.length >= 3);
  });
});
