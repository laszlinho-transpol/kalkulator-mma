import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DzialkaRobocza, FiguraProstokat } from '../types';
import { obliczTabeleAutPlanuCiagla } from './planCiagly';
import { znajdzAktywnaDzialke } from './liveProgress';
import type { Plan, WpisLive, SesjaDzialkiLive } from '../types';

const baza = { numeracja: 1, kilometrazPoczatkowy: 0 };

const dz1: DzialkaRobocza = {
  id: 'dz1', nazwa: 'Działka 1', mieszankaId: 'm1', grubosc: 4,
  kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 0, kierunekUkladania: 'rosnacy',
  figury: [{ ...baza, id: 'f1', typ: 'prostokat', szerokosc: 3.5, dlugosc: 50 } as FiguraProstokat],
};

const dz2: DzialkaRobocza = {
  id: 'dz2', nazwa: 'Działka 2', mieszankaId: 'm1', grubosc: 4,
  kilometrazPoczatkowyKm: 0, kilometrazPoczatkowyM: 50, kierunekUkladania: 'rosnacy',
  figury: [{ ...baza, id: 'f2', typ: 'prostokat', szerokosc: 3.5, dlugosc: 50 } as FiguraProstokat],
};

describe('planCiagly', () => {
  it('tabela aut – to samo auto na dwóch działkach przy reszcie tonażu', () => {
    const tab = obliczTabeleAutPlanuCiagla([dz1, dz2], [{ id: '1', numerRzutu: 1, iloscSamochodow: 20 }], 25, () => 2.4);
    const dz1w = tab.dzialki.find((d) => d.dzialkaId === 'dz1')?.wiersze ?? [];
    const dz2w = tab.dzialki.find((d) => d.dzialkaId === 'dz2')?.wiersze ?? [];
    const wspolneNumery = dz1w.map((w) => w.numerAuta).filter((n) => dz2w.some((w2) => w2.numerAuta === n));
    assert.ok(wspolneNumery.length > 0, 'przynajmniej jedno auto przechodzi między działkami');
  });

  it('znajdzAktywnaDzialke – puste wpisy ignoruje sesje', () => {
    const plan: Plan = {
      id: 'p1', dataWbudowywania: '2026-06-30', iloscDzialek: 2, dzialki: [dz1, dz2],
      tonazAuta: 25, rzuty: [], status: 'aktywny', createdAt: '', updatedAt: '',
    };
    const sesje: SesjaDzialkiLive[] = [{ planId: 'p1', dzialkaId: 'dz1', zakonczona: true }];
    const ak = znajdzAktywnaDzialke(plan, [], sesje);
    assert.equal(ak?.dzialka.id, 'dz1');
  });
});
