import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obliczTabeleAutDlaDzialki, generujDomyslneRzuty, powierzchniaZMasyMg } from './calculations';
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

  it('26 t → m² / (grubość × gęstość); rozjazd 15 m daje krótsze metry niż stała szerokość', () => {
    const pow26 = powierzchniaZMasyMg(26, 4, 2.45);
    assert.ok(Math.abs(pow26 - 265.306) < 0.01, `26 t / (0,04×2,45) = 265,306 m², jest ${pow26}`);

    const dzialka: DzialkaRobocza = {
      id: 'd1',
      nazwa: 'rozjazd',
      mieszankaId: 'm1',
      grubosc: 4,
      gruboscWbudowywania: 4,
      kilometrazPoczatkowyKm: 114,
      kilometrazPoczatkowyM: 20,
      kierunekUkladania: 'malejacy',
      figury: [
        { ...baza, typ: 'prostokat', szerokosc: 7.47, dlugosc: 415 } as FiguraProstokat,
      ],
      profilSzerokosci: [
        { dlugoscM: 15, szerokoscM: 20, powierzchniaM2: 300 },
        { dlugoscM: 400, szerokoscM: 7, powierzchniaM2: 2800 },
      ],
    };
    const tabela = obliczTabeleAutDlaDzialki(dzialka, 2.45, generujDomyslneRzuty(20), 26);
    assert.ok(tabela.length >= 2);
    assert.ok(Math.abs(tabela[0].metry - 13.27) < 0.05, `rozjazd 20 m: 265,3/20 ≈ 13,27 m, jest ${tabela[0].metry}`);
    const autoNa7m = tabela.find((w) => w.metryNarastajaco - w.metry >= 15);
    assert.ok(autoNa7m, 'powinno dojść do stałej szerokości 7 m');
    assert.ok(Math.abs(autoNa7m!.metry - 37.9) < 0.15, `przy 7 m to samo 26 t ≈ 37,9 m, jest ${autoNa7m!.metry}`);
    assert.ok(tabela[0].metry < autoNa7m!.metry);
  });
});
