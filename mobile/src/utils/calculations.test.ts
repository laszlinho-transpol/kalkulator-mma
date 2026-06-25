import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obliczPowierzchniFigury,
  dlugoscFigury,
  obliczLacznaDlugosc,
  round2,
} from './calculations';
import type { DzialkaRobocza, FiguraProstokat, FiguraTrapez } from '../types';

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
});
