import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DzialkaRobocza, FiguraProstokat } from '../types';
import { obliczTabeleAutPlanuCiagla, budujFiguryPlanu, budujSegmentyPlanu, metryOdMasyPlanu, obliczMarkeryPlanuCiaglego, obliczPodsumowanieOdcinkaPlanu } from './planCiagly';
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

  it('budujFiguryPlanu – ciągły offset metrów', () => {
    const plan: Plan = {
      id: 'p1', dataWbudowywania: '2026-06-30', iloscDzialek: 2, dzialki: [dz1, dz2],
      tonazAuta: 25, rzuty: [], status: 'aktywny', createdAt: '', updatedAt: '',
    };
    const fig = budujFiguryPlanu(plan, () => 2.4);
    assert.equal(fig.length, 2);
    assert.equal(fig[0].metryGlobalneStart, 0);
    assert.equal(fig[1].metryGlobalneStart, 50);
  });

  it('obliczPodsumowanieOdcinkaPlanu – metry od startu całego planu', () => {
    const plan: Plan = {
      id: 'p1', dataWbudowywania: '2026-06-30', iloscDzialek: 2, dzialki: [dz1, dz2],
      tonazAuta: 25, rzuty: [], status: 'aktywny', createdAt: '', updatedAt: '',
    };
    const wpisy: WpisLive[] = [
      { id: 'w1', planId: 'p1', dzialkaId: 'dz1', numerAuta: 1, tonazPrzywieziony: 20, przejechaneMetry: 50, godzinaWybudowania: '08:00', createdAt: '' },
      { id: 'w2', planId: 'p1', dzialkaId: 'dz2', numerAuta: 2, tonazPrzywieziony: 12, przejechaneMetry: 25, godzinaWybudowania: '09:00', createdAt: '' },
    ];
    const markery = obliczMarkeryPlanuCiaglego(plan, wpisy);
    assert.equal(markery[1].metryKumulatywne, 75);
    const pod = obliczPodsumowanieOdcinkaPlanu(plan, wpisy, 2, () => 2.4);
    assert.equal(pod.metryDo, 75);
    assert.equal(pod.tonDo, 32);
    assert.equal(pod.pozostaloMetrow, 25);
  });

  it('Całość: 26 t z dokładnego m² – rozjazd krótszy niż stała szerokość', () => {
    const dz: DzialkaRobocza = {
      id: 'dzR',
      nazwa: '114+020 – 113+605',
      mieszankaId: 'm1',
      grubosc: 4,
      gruboscWbudowywania: 4,
      kilometrazPoczatkowyKm: 114,
      kilometrazPoczatkowyM: 20,
      kierunekUkladania: 'malejacy',
      figury: [{ ...baza, id: 'f1', typ: 'prostokat', szerokosc: 7.47, dlugosc: 415 } as FiguraProstokat],
      profilSzerokosci: [
        { dlugoscM: 15, szerokoscM: 20, powierzchniaM2: 300 },
        { dlugoscM: 400, szerokoscM: 7, powierzchniaM2: 2800 },
      ],
    };
    const tab = obliczTabeleAutPlanuCiagla([dz], [{ id: '1', numerRzutu: 1, iloscSamochodow: 20 }], 26, () => 2.45);
    assert.ok(tab.calosc.length >= 2);
    assert.ok(Math.abs(tab.calosc[0].metry - 13.27) < 0.05, `pierwsze auto na rozjeździe, jest ${tab.calosc[0].metry}`);
    const autoWatskie = tab.calosc.find((w) => w.metryNarastajaco - w.metry >= 15);
    assert.ok(autoWatskie && Math.abs(autoWatskie.metry - 37.9) < 0.15, `stała 7 m ≈ 37,9 m, jest ${autoWatskie?.metry}`);

    const seg = budujSegmentyPlanu([dz], () => 2.45);
    assert.equal(seg.length, 2);
    assert.equal(seg[0].pow, 300);
    assert.ok(Math.abs(metryOdMasyPlanu(seg, 26) - 13.27) < 0.05);
  });
});
