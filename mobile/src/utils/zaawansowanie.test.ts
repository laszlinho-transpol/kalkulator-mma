import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ProjektBudowy } from '../types';
import type { RaportDzienny } from '../raportyBudowy/typy';
import { domyslneWarstwyKonstrukcji, GESTOSC_MMA_DOMYSLNA, tonyZPowierzchni } from './projektBudowy';
import { obliczZaawansowanie, opisRoznicyTon } from './zaawansowanie';

describe('zaawansowanie', () => {
  it('zostaje powierzchnia × grubość, a różnica ton to oszczędność albo przepał', () => {
    const warstwy = domyslneWarstwyKonstrukcji().filter((w) => w.kategoria === 'sma');
    const projekt = {
      kilometrazPoczatkowyM: 0,
      skala: { mianownik: 500, metryNaCm: 5 },
      arkusze: [{
        id: 'a', nazwa: 'a', zrodloNazwa: 'a', kolejnosc: 1, kontynuacjaPoprzedniego: false,
        kilometrazPoczatkowyM: 0, kilometrazKoncowyM: 100,
        obszary: [{
          id: 'o', nazwa: 'Trasa L', kolejnosc: 1,
          wierzcholkiPdf: [{ x: 0, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }],
          wierzcholkiM: [{ x: 0, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }],
          powierzchniaM2: 1000, obwodM: 220, zrodloNazwa: 'a', kolorWypelnienia: '#FFEE58',
          stronaTrasy: 'lewa',
          kilometrazStartKm: 0, kilometrazStartM: 0, kilometrazKoniecKm: 0, kilometrazKoniecM: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
        }],
      }],
      legenda: [{ id: 'leg', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa L' }],
      konstrukcje: [{ legendaId: 'leg', warstwy, wyjatki: [] }],
      scaloneWiersze: [],
    } as ProjektBudowy;
    const teorWykonaniaT = tonyZPowierzchni(400, 4, GESTOSC_MMA_DOMYSLNA);
    const raport = {
      id: 'r', budowaId: 'b', data: '2026-10-26',
      pozycje: [{
        id: 'p', warstwaKlucz: 'sma8|4', warstwaNazwa: 'SMA8', kategoria: 'sma',
        gruboscProjCm: 4, gestoscTm3: GESTOSC_MMA_DOMYSLNA, ilosc: 10, mieszankaNazwa: 'SMA8',
        odcinki: [{ id: 'o1', legendaId: 'leg', nazwa: 'Trasa L', kmOdM: 0, kmDoM: 40, powierzchniaM2: 400 }],
      }],
      cenyMaterialu: {}, materialyDodatkowe: [], przerzuty: [], samochody: [],
      zatwierdzonePracownicy: [], zatwierdzonySprzet: [],
      createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z',
    } as RaportDzienny;
    const z = obliczZaawansowanie(projekt, [raport]);
    assert.equal(z.wiersze.length, 1);
    const w = z.wiersze[0];
    assert.equal(w.przedmiarM2, 1000);
    assert.equal(w.wykonaneM2, 400);
    assert.equal(w.zostaloM2, 600);
    assert.ok(Math.abs(w.zostaloT - tonyZPowierzchni(600, 4, GESTOSC_MMA_DOMYSLNA)) < 0.02);
    assert.equal(w.wykonaneT, 10);
    assert.ok(Math.abs(w.roznicaT - (teorWykonaniaT - 10)) < 0.02);
    assert.match(opisRoznicyTon(w.roznicaT, w.wykonaneT, w.wykonaneM2), /oszczędność/);
    assert.match(opisRoznicyTon(-3.2, 12, 400), /przepał/);
    assert.equal(opisRoznicyTon(0, 0, 0), 'jeszcze bez wbudowania');
    assert.equal(z.procentM2, 40);
  });
});
