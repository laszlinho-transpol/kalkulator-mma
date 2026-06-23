// ============================================================
// TESTY OBLICZEŃ – uruchom: npm run test
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  obliczPowierzchniFigury,
  dlugoscFigury,
  obliczWynikiDzialki,
  parsujRzuty,
  walidujRzuty,
} from './calculations';
import type { FiguraProstokat, FiguraTrapez, FiguraTrojkat, DzialkaRobocza } from '../types';

const figuraBaza = { id: 't1', numeracja: 1, kilometrazPoczatkowy: 0 };

test('prostokąt: powierzchnia 10×5 = 50 m²', () => {
  const f: FiguraProstokat = { ...figuraBaza, typ: 'prostokat', szerokosc: 10, dlugosc: 5 };
  assert.equal(obliczPowierzchniFigury(f), 50);
  assert.equal(dlugoscFigury(f), 5);
});

test('trapez: powierzchnia ((8+12)/2)×20 = 200 m²', () => {
  const f: FiguraTrapez = { ...figuraBaza, typ: 'trapez', szerokosc1: 8, szerokosc2: 12, dlugosc: 20 };
  assert.equal(obliczPowierzchniFigury(f), 200);
});

test('trójkąt: powierzchnia (6×10)/2 = 30 m²', () => {
  const f: FiguraTrojkat = { ...figuraBaza, typ: 'trojkat', szerokosc: 6, dlugosc: 10 };
  assert.equal(obliczPowierzchniFigury(f), 30);
});

test('działka: masa i liczba aut', () => {
  const dz: DzialkaRobocza = {
    id: 'd1', nazwa: 'Test', mieszankaId: 'm1', grubosc: 5,
    kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 0,
    kierunekUkladania: 'rosnacy',
    figury: [{ ...figuraBaza, typ: 'prostokat', szerokosc: 10, dlugosc: 100 }],
  };
  const w = obliczWynikiDzialki(dz, 2.4, 25.5);
  assert.equal(w.lacznaPowierzchnia, 1000);
  assert.equal(w.lacznaIloscMasy, 120);
  assert.equal(w.iloscSamochodow, 5);
});

test('rzuty: parsowanie i walidacja', () => {
  const r = parsujRzuty('3+2');
  assert.ok(r);
  assert.equal(r!.reduce((s, x) => s + x.iloscSamochodow, 0), 5);
  assert.equal(walidujRzuty('3+2', 5), true);
  assert.equal(walidujRzuty('3+3', 5), false);
});
