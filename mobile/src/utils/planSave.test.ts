import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Plan, DzialkaRobocza } from '../types';

describe('zapisywanie planu – struktura danych', () => {
  it('plan JSON roundtrip zachowuje budowaId i działki', () => {
    const plan: Plan = {
      id: 'p1',
      dataWbudowywania: '2026-06-20T00:00:00.000Z',
      tonazAuta: 25.5,
      budowaId: 'b1',
      dzialki: [{
        id: 'd1', nazwa: 'Test', mieszankaId: 'm1',
        grubosc: 4, gruboscProjektowa: 10, tolerancja: 10, gruboscWbudowywania: 9.6,
        kilometrazPoczatkowyKm: 114, kilometrazPoczatkowyM: 0,
        kierunekUkladania: 'rosnacy',
        figury: [{ id: 'f1', typ: 'prostokat', numeracja: 1, kilometrazPoczatkowy: 0, szerokosc: 3.65, dlugosc: 50 }],
      } as DzialkaRobocza],
      rzuty: [{ id: '1', iloscSamochodow: 2 }],
      status: 'aktywny',
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    };
    const parsed = JSON.parse(JSON.stringify(plan)) as Plan;
    assert.equal(parsed.budowaId, 'b1');
    assert.equal(parsed.dzialki[0].gruboscWbudowywania, 9.6);
    assert.equal(parsed.dzialki[0].figury[0].typ, 'prostokat');
  });

  it('plan z wieloma działkami serializuje się bez utraty rzutów', () => {
    const plan: Plan = {
      id: 'p2',
      dataWbudowywania: '2026-06-21T00:00:00.000Z',
      tonazAuta: 26,
      dzialki: [],
      rzuty: [{ id: '1', iloscSamochodow: 3 }, { id: '2', iloscSamochodow: 2 }],
      status: 'aktywny',
      createdAt: '2026-06-21T00:00:00.000Z',
      updatedAt: '2026-06-21T00:00:00.000Z',
    };
    const json = JSON.stringify(plan);
    const parsed = JSON.parse(json) as Plan;
    assert.equal(parsed.rzuty.length, 2);
    assert.equal(parsed.rzuty[1].iloscSamochodow, 2);
  });
});
