import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obliczPowierzchniFigury,
  dlugoscFigury,
  obliczLacznaDlugosc,
  obliczWynikiDzialki,
  parsujRzuty,
  walidujRzuty,
  round2,
} from './calculations';
import type { DzialkaRobocza, FiguraProstokat, FiguraTrapez, FiguraTrojkat } from '../types';

const baza = { id: 'f1', numeracja: 1, kilometrazPoczatkowy: 0 };

describe('calculations', () => {
  it('round2 zaokrągla do 2 miejsc', () => {
    assert.equal(round2(1.234), 1.23);
    assert.equal(round2(1.235), 1.24);
  });

  it('oblicza powierzchnię prostokąta', () => {
    const figura: FiguraProstokat = { ...baza, typ: 'prostokat', szerokosc: 7, dlugosc: 100 };
    assert.equal(obliczPowierzchniFigury(figura), 700);
    assert.equal(dlugoscFigury(figura), 100);
  });

  it('oblicza powierzchnię trapezu', () => {
    const figura: FiguraTrapez = { ...baza, typ: 'trapez', szerokosc1: 6, szerokosc2: 8, dlugosc: 50 };
    assert.equal(obliczPowierzchniFigury(figura), 350);
  });

  it('oblicza powierzchnię trójkąta', () => {
    const figura: FiguraTrojkat = { ...baza, typ: 'trojkat', szerokosc: 6, dlugosc: 10 };
    assert.equal(obliczPowierzchniFigury(figura), 30);
  });

  it('sumuje długość figur działki', () => {
    const dzialka: DzialkaRobocza = {
      id: 'd1',
      nazwa: 'Działka 1',
      mieszankaId: 'm1',
      grubosc: 4,
      kilometrazPoczatkowyKm: 0,
      kilometrazPoczatkowyM: 0,
      kierunekUkladania: 'rosnacy',
      figury: [
        { ...baza, typ: 'prostokat', szerokosc: 7, dlugosc: 100 },
        { ...baza, id: 'f2', numeracja: 2, typ: 'prostokat', szerokosc: 7, dlugosc: 50 },
      ],
    };
    assert.equal(obliczLacznaDlugosc(dzialka), 150);
  });

  it('działka: masa i liczba aut', () => {
    const dz: DzialkaRobocza = {
      id: 'd1', nazwa: 'Test', mieszankaId: 'm1', grubosc: 5,
      kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 0,
      kierunekUkladania: 'rosnacy',
      figury: [{ ...baza, typ: 'prostokat', szerokosc: 10, dlugosc: 100 }],
    };
    const w = obliczWynikiDzialki(dz, 2.4, 25.5);
    assert.equal(w.lacznaPowierzchnia, 1000);
    assert.equal(w.lacznaIloscMasy, 120);
    assert.equal(w.iloscSamochodow, 5);
  });

  it('rzuty: parsowanie i walidacja', () => {
    const r = parsujRzuty('3+2');
    assert.ok(r);
    assert.equal(r!.reduce((s, x) => s + x.iloscSamochodow, 0), 5);
    assert.equal(walidujRzuty('3+2', 5), true);
    assert.equal(walidujRzuty('3+3', 5), false);
  });
});
