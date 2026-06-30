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
  wycinekRzutow,
  obliczTabeleAutPlanu,
  generujDomyslneRzuty,
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

describe('tabela aut planu – ciągła numeracja', () => {
  const dz1: DzialkaRobocza = {
    id: 'd1', nazwa: 'Działka 1', mieszankaId: 'm1', grubosc: 4,
    kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 0, kierunekUkladania: 'rosnacy',
    figury: [{ ...baza, typ: 'prostokat', szerokosc: 7, dlugosc: 300 }],
  };
  const dz2: DzialkaRobocza = {
    id: 'd2', nazwa: 'Działka 2', mieszankaId: 'm1', grubosc: 4,
    kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 300, kierunekUkladania: 'rosnacy',
    figury: [{ ...baza, id: 'f2', typ: 'prostokat', szerokosc: 7, dlugosc: 80 }],
  };

  it('wycinekRzutow wybiera właściwy fragment podziału', () => {
    const rzuty = parsujRzuty('10+5+5')!;
    const w = wycinekRzutow(rzuty, 10, 5);
    assert.equal(w.reduce((s, r) => s + r.iloscSamochodow, 0), 5);
  });

  it('obliczTabeleAutPlanu numeruje auta ciągle między działkami', () => {
    const aut1 = obliczWynikiDzialki(dz1, 2.4, 25.5).iloscSamochodow;
    const aut2 = obliczWynikiDzialki(dz2, 2.4, 25.5).iloscSamochodow;
    const suma = aut1 + aut2;
    const rzuty = generujDomyslneRzuty(suma);
    const tab = obliczTabeleAutPlanu([dz1, dz2], rzuty, 25.5, () => 2.4);
    assert.equal(tab.dzialki[0].numerAutaOd, 1);
    // Reszta tonażu z ostatniego auta może przechodzić na kolejną działkę (ten sam numer)
    assert.ok(tab.dzialki[1].numerAutaOd <= tab.dzialki[0].numerAutaDo + 1);
    assert.ok(tab.dzialki[1].numerAutaOd >= tab.dzialki[0].numerAutaDo);
    const unikalne = new Set(tab.calosc.map((w) => w.numerAuta)).size;
    assert.equal(tab.lacznaIloscAut, unikalne);
  });
});
