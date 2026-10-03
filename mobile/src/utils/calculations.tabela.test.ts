import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obliczTabeleAutDlaDzialki, generujDomyslneRzuty } from './calculations';
import type { DzialkaRobocza, FiguraProstokat } from '../types';

const baza = { id: 'f1', numeracja: 1, kilometrazPoczatkowy: 0 };

describe('obliczTabeleAutDlaDzialki', () => {
  it('różne szerokości → różne metry przy tym samym tonażu', () => {
    const dzialka: DzialkaRobocza = {
      id: 'd1',
      nazwa: 'Działka 1',
      mieszankaId: 'm1',
      grubosc: 4,
      gruboscWbudowywania: 4,
      kilometrazPoczatkowyKm: 0,
      kilometrazPoczatkowyM: 0,
      kierunekUkladania: 'rosnacy',
      figury: [
        { ...baza, typ: 'prostokat', szerokosc: 3.65, dlugosc: 100 } as FiguraProstokat,
        { ...baza, id: 'f2', numeracja: 2, typ: 'prostokat', szerokosc: 3.4, dlugosc: 100 } as FiguraProstokat,
      ],
    };
    const rzuty = generujDomyslneRzuty(4);
    const tabela = obliczTabeleAutDlaDzialki(dzialka, 2.455, rzuty, 26);
    assert.ok(tabela.length >= 3 && tabela.length <= 4);
    assert.ok(tabela.every((w) => w.masa > 0));
    assert.notEqual(tabela[0].metry, tabela[1].metry);
  });

  it('profil szerokości z PZT: to samo 26 t daje różne metry', () => {
    const dzialka: DzialkaRobocza = {
      id: 'd1',
      nazwa: '114+020 – 113+605',
      mieszankaId: 'm1',
      grubosc: 4,
      gruboscWbudowywania: 4,
      kilometrazPoczatkowyKm: 114,
      kilometrazPoczatkowyM: 20,
      kierunekUkladania: 'malejacy',
      figury: [
        { ...baza, typ: 'prostokat', szerokosc: 7, dlugosc: 415 } as FiguraProstokat,
      ],
      profilSzerokosci: [
        { dlugoscM: 200, szerokoscM: 5 },
        { dlugoscM: 215, szerokoscM: 9 },
      ],
    };
    const rzuty = generujDomyslneRzuty(8);
    const tabela = obliczTabeleAutDlaDzialki(dzialka, 2.45, rzuty, 26);
    assert.ok(tabela.length >= 2);
    const unikalne = new Set(tabela.map((w) => w.metry.toFixed(2)));
    assert.ok(unikalne.size >= 2, `oczekiwano różnych metrów, jest ${[...unikalne]}`);
  });
});
