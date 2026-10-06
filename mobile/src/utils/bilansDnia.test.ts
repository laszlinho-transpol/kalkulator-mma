import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Plan, WpisLive } from '../types';
import { opisAutPoRzutach, policzBilansDnia } from './bilansDnia';

const plan: Plan = {
  id: 'p',
  dataWbudowywania: '2026-10-05',
  iloscDzialek: 1,
  dzialki: [{
    id: 'dz1',
    nazwa: 'Jezdnia',
    mieszankaId: 'm1',
    grubosc: 6.8,
    gruboscWbudowywania: 6.8,
    kilometrazPoczatkowyKm: 114,
    kilometrazPoczatkowyM: 20,
    kierunekUkladania: 'malejacy',
    figury: [{
      id: 'f',
      typ: 'prostokat',
      numeracja: 1,
      kilometrazPoczatkowy: 114020,
      szerokosc: 11.5,
      dlugosc: 415,
    }],
  }],
  tonazAuta: 27,
  rzuty: [],
  status: 'archiwalny',
  kilometrazOdM: 114020,
  kilometrazDoM: 113605,
  createdAt: '',
  updatedAt: '',
};

function auto(numer: number, rzut: number, metry: number, tony: number): WpisLive {
  return {
    id: `w${numer}`,
    planId: 'p',
    dzialkaId: 'dz1',
    numerAuta: numer,
    numerRzutu: rzut,
    tonazPrzywieziony: tony,
    przejechaneMetry: metry,
    godzinaWybudowania: '08:00',
    createdAt: '',
  };
}

describe('bilans dniówki', () => {
  it('kilometraż malejący: 400 m od 114+020 kończy się na 113+620, nie rośnie', () => {
    const wpisy = [
      ...Array.from({ length: 6 }, (_, i) => auto(i + 1, 1, 50, 26.6775)),
      ...Array.from({ length: 2 }, (_, i) => auto(i + 7, 2, 50, 26.6775)),
    ];
    const b = policzBilansDnia(plan, wpisy, [{ id: 'm1', rodzaj: 'AC22P KR 3-7', ciezarObjetosciowy: 2.45 }]);
    assert.equal(b.kierunek, 'malejacy');
    assert.equal(b.dlugoscPlanM, 415);
    assert.equal(b.startM, 114020);
    assert.equal(b.koniecPlanM, 113605);
    assert.equal(b.metryWykonane, 400);
    assert.equal(b.koniecWykonanyM, 113620);
    assert.equal(b.deltaMetry, -15);
    assert.equal(b.mieszanka, 'AC22P KR 3-7');
    assert.equal(b.autOpis, '8 (6+2)');
    assert.ok(b.gruboscUzyskanaCm > 0);
  });

  it('jeden rzut bez nawiasu, brak numeru = I', () => {
    const wpisy = [auto(1, 1, 10, 26), { ...auto(2, 1, 10, 26), numerRzutu: undefined }];
    assert.equal(opisAutPoRzutach(wpisy), '2');
  });
});
