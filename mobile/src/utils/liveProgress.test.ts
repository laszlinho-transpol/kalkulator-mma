import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Plan, WpisLive, SesjaDzialkiLive, DzialkaRobocza } from '../types';
import {
  rozdzielMetryNaDzialki,
  znajdzAktywnaDzialke,
  obliczBilansLivePlanu,
  dzialkiDoAutoZamkniecia,
  sumaMetrowDzialki,
  liczUnikalnychAut,
  nastepnyNumerAuta,
  przenumerujAutaPlanu,
  gruboscSegmentuLive,
  grupujAutaLive,
  ulozenieAutLive,
  sesjePoUlozeniu,
  zamknieciaReczneDzialek,
} from './liveProgress';

const dz1: DzialkaRobocza = {
  id: 'dz1',
  nazwa: 'Działka 1',
  mieszankaId: 'm1',
  grubosc: 4,
  kilometrazPoczatkowyKm: 0,
  kilometrazPoczatkowyM: 0,
  kierunekUkladania: 'rosnacy',
  figury: [{
    id: 'f1',
    typ: 'prostokat',
    numeracja: 1,
    kilometrazPoczatkowy: 0,
    szerokosc: 3.5,
    dlugosc: 100,
  }],
};

const dz2: DzialkaRobocza = {
  id: 'dz2',
  nazwa: 'Działka 2',
  mieszankaId: 'm1',
  grubosc: 4,
  kilometrazPoczatkowyKm: 0,
  kilometrazPoczatkowyM: 100,
  kierunekUkladania: 'rosnacy',
  figury: [{
    id: 'f2',
    typ: 'prostokat',
    numeracja: 1,
    kilometrazPoczatkowy: 100,
    szerokosc: 3.5,
    dlugosc: 50,
  }],
};

const plan: Plan = {
  id: 'p1',
  dataWbudowywania: '2026-06-26',
  iloscDzialek: 2,
  dzialki: [dz1, dz2],
  tonazAuta: 25.5,
  rzuty: [{ id: '1', numerRzutu: 1, iloscSamochodow: 10 }],
  status: 'aktywny',
  createdAt: '',
  updatedAt: '',
};

const sesje: SesjaDzialkiLive[] = [];

function wpis(dzialkaId: string, metry: number, ton = 25): WpisLive {
  return {
    id: `w-${dzialkaId}-${metry}`,
    planId: 'p1',
    dzialkaId,
    numerAuta: 1,
    tonazPrzywieziony: ton,
    przejechaneMetry: metry,
    godzinaWybudowania: '08:00',
    createdAt: '',
  };
}

describe('liveProgress', () => {
  it('znajdzAktywnaDzialke – pierwsza nieukończona', () => {
    const aktywna = znajdzAktywnaDzialke(plan, [], sesje);
    assert.equal(aktywna?.dzialka.id, 'dz1');
  });

  it('znajdzAktywnaDzialke – puste wpisy ignoruje zakończone sesje', () => {
    const sesjeZamkniete: SesjaDzialkiLive[] = [{ planId: 'p1', dzialkaId: 'dz1', zakonczona: true }];
    const aktywna = znajdzAktywnaDzialke(plan, [], sesjeZamkniete);
    assert.equal(aktywna?.dzialka.id, 'dz1');
  });

  it('rozdzielMetryNaDzialki – mieści się w jednej działce', () => {
    const seg = rozdzielMetryNaDzialki(plan, [], sesje, 40, 25);
    assert.equal(seg.length, 1);
    assert.equal(seg[0].dzialkaId, 'dz1');
    assert.equal(seg[0].metry, 40);
    assert.equal(seg[0].tonaz, 25);
  });

  it('rozdzielMetryNaDzialki – przechodzi na kolejną działkę', () => {
    const wpisy = [wpis('dz1', 80)];
    const seg = rozdzielMetryNaDzialki(plan, wpisy, sesje, 50, 25);
    assert.equal(seg.length, 2);
    assert.equal(seg[0].dzialkaId, 'dz1');
    assert.equal(seg[0].metry, 20);
    assert.equal(seg[1].dzialkaId, 'dz2');
    assert.equal(seg[1].metry, 30);
    assert.equal(seg[0].tonaz, 6.86);
    assert.equal(seg[1].tonaz, 18.14);
  });

  it('rozdzielMetryNaDzialki – grubość planu na pierwszym obszarze, reszta tony na drugim', () => {
    const a: DzialkaRobocza = {
      ...dz1,
      grubosc: 10,
      figury: [{ ...dz1.figury[0], dlugosc: 10, szerokosc: 3.5 }],
    };
    const b: DzialkaRobocza = {
      ...dz2,
      grubosc: 7,
      figury: [{ ...dz2.figury[0], dlugosc: 40, szerokosc: 3.5 }],
    };
    const p: Plan = { ...plan, dzialki: [a, b] };
    const seg = rozdzielMetryNaDzialki(p, [], sesje, 30, 25, () => 2.45);
    assert.equal(seg.length, 2);
    assert.equal(seg[0].metry, 10);
    assert.equal(seg[0].tonaz, 8.58);
    assert.equal(seg[1].metry, 20);
    assert.equal(seg[1].tonaz, 16.42);
    const gr1 = gruboscSegmentuLive(a, 0, seg[0].metry, seg[0].tonaz, 2.45);
    const gr2 = gruboscSegmentuLive(b, 0, seg[1].metry, seg[1].tonaz, 2.45);
    assert.equal(gr1.powierzchnia, 35);
    assert.ok(Math.abs(gr1.grubosc - 10) < 0.05);
    assert.equal(gr2.powierzchnia, 70);
    assert.ok(Math.abs(gr2.grubosc - 9.57) < 0.02);
  });

  it('rozdzielMetryNaDzialki – tony z grubości wbudowywania, nie z projektowej', () => {
    const a: DzialkaRobocza = {
      ...dz1,
      grubosc: 10,
      gruboscProjektowa: 12,
      gruboscWbudowywania: 10,
      figury: [{ ...dz1.figury[0], dlugosc: 10, szerokosc: 3.5 }],
    };
    const b: DzialkaRobocza = {
      ...dz2,
      grubosc: 7,
      gruboscProjektowa: 4,
      gruboscWbudowywania: 7,
      figury: [{ ...dz2.figury[0], dlugosc: 40, szerokosc: 3.5 }],
    };
    const p: Plan = { ...plan, dzialki: [a, b] };
    const seg = rozdzielMetryNaDzialki(p, [], sesje, 30, 25, () => 2.45);
    assert.equal(seg[0].tonaz, 8.58);
    assert.notEqual(seg[0].tonaz, 10.29);
    assert.equal(seg[1].tonaz, 16.42);
  });

  it('dzialkiDoAutoZamkniecia – po wypełnieniu działki', () => {
    const wpisy = [wpis('dz1', 80)];
    const seg = rozdzielMetryNaDzialki(plan, wpisy, sesje, 20, 25);
    const doZamk = dzialkiDoAutoZamkniecia(plan, wpisy, sesje, seg);
    assert.ok(doZamk.includes('dz1'));
  });

  it('obliczBilansLivePlanu – sumuje cały plan', () => {
    const wpisy = [
      { ...wpis('dz1', 50, 20), numerAuta: 1 },
      { ...wpis('dz2', 25, 12), numerAuta: 2 },
    ];
    const bilans = obliczBilansLivePlanu(plan, wpisy, () => 2.4);
    assert.equal(bilans.liczbaAut, 2);
    assert.equal(bilans.lacznyTonaz, 32);
    assert.equal(bilans.laczneMetry, 75);
    assert.ok(bilans.zakrytaPowierzchnia > 0);
    assert.ok(bilans.pozostalaPowierzchnia > 0);
    assert.equal(bilans.lacznaDlugoscPlanu, 150);
    assert.equal(bilans.pozostaloMetrow, 75);
  });

  it('sumaMetrowDzialki', () => {
    const wpisy = [wpis('dz1', 30), wpis('dz1', 20)];
    assert.equal(sumaMetrowDzialki(wpisy, 'dz1'), 50);
  });

  it('nastepnyNumerAuta po usunięciu wszystkich', () => {
    assert.equal(nastepnyNumerAuta([]), 1);
    const dwa = [wpis('dz1', 10), { ...wpis('dz2', 5), numerAuta: 2 }];
    assert.equal(nastepnyNumerAuta(dwa), 3);
    const poUsun = przenumerujAutaPlanu(dwa.filter((w) => w.numerAuta !== 2), 'p1');
    assert.equal(liczUnikalnychAut(poUsun.filter((w) => w.planId === 'p1')), 1);
    assert.equal(nastepnyNumerAuta(poUsun.filter((w) => w.planId === 'p1')), 2);
  });

  it('przenumerujAutaPlanu – bez luk', () => {
    const wpisy = [
      { ...wpis('dz1', 10), numerAuta: 5 },
      { ...wpis('dz1', 20), numerAuta: 8 },
    ];
    const out = przenumerujAutaPlanu(wpisy, 'p1');
    const planW = out.filter((w) => w.planId === 'p1');
    assert.deepEqual(planW.map((w) => w.numerAuta), [1, 2]);
  });

  it('ulozenieAutLive – skrócenie wcześniejszego auta przesuwa kolejne', () => {
    let n = 0;
    const id = () => `u-${n++}`;
    const pelne = [
      { numerAuta: 1, tonaz: 25, metry: 80, godzinaWybudowania: '08:00', createdAt: '1' },
      { numerAuta: 2, tonaz: 25, metry: 40, godzinaWybudowania: '08:10', createdAt: '2' },
    ];
    const przed = ulozenieAutLive(plan, pelne, [], () => 2.45, id);
    const drugiePrzed = przed.filter((w) => w.numerAuta === 2);
    assert.equal(drugiePrzed.length, 2);
    assert.equal(drugiePrzed[0].dzialkaId, 'dz1');
    assert.equal(drugiePrzed[0].przejechaneMetry, 20);

    const po = ulozenieAutLive(plan, [
      { ...pelne[0], metry: 50 },
      pelne[1],
    ], [], () => 2.45, id);
    const drugie = po.filter((w) => w.numerAuta === 2);
    assert.equal(drugie.length, 1);
    assert.equal(drugie[0].dzialkaId, 'dz1');
    assert.equal(drugie[0].przejechaneMetry, 40);
    assert.equal(drugie[0].numerAuta, 2);
  });

  it('ulozenieAutLive – ręczne zamknięcie zajętego obszaru pomija je dla kolejnego auta', () => {
    let n = 0;
    const out = ulozenieAutLive(plan, [
      { numerAuta: 1, tonaz: 10, metry: 30, godzinaWybudowania: '08:00', createdAt: '1' },
      { numerAuta: 2, tonaz: 25, metry: 20, godzinaWybudowania: '08:10', createdAt: '2' },
    ], ['dz1'], () => 2.45, () => `z-${n++}`, ['dz1']);
    assert.equal(out.find((w) => w.numerAuta === 1)?.dzialkaId, 'dz1');
    assert.equal(out.find((w) => w.numerAuta === 2)?.dzialkaId, 'dz2');
  });

  it('ulozenieAutLive – puste ręczne zamknięcie nie ściąga auta z powrotem', () => {
    let n = 0;
    const out = ulozenieAutLive(plan, [
      { numerAuta: 1, tonaz: 25, metry: 20, godzinaWybudowania: '08:00', createdAt: '1' },
    ], ['dz1'], () => 2.45, () => `p-${n++}`, []);
    assert.equal(out[0].dzialkaId, 'dz2');
    assert.equal(out[0].numerAuta, 1);
  });

  it('sesjePoUlozeniu – pełny obszar zostaje, niepełne automatyczne zamknięcie wraca', () => {
    const naStówce = ulozenieAutLive(plan, [
      { numerAuta: 1, tonaz: 25, metry: 100, godzinaWybudowania: '08:00', createdAt: '1' },
    ], [], () => 2.45, () => 's1');
    const zostaje = sesjePoUlozeniu(plan, naStówce, [], [
      { planId: 'p1', dzialkaId: 'dz1', zakonczona: true },
    ]);
    assert.ok(zostaje.some((s) => s.dzialkaId === 'dz1' && s.zakonczona));

    const krotkie = ulozenieAutLive(plan, [
      { numerAuta: 1, tonaz: 10, metry: 30, godzinaWybudowania: '08:00', createdAt: '1' },
    ], [], () => 2.45, () => 's2');
    const wraca = sesjePoUlozeniu(plan, krotkie, [], [
      { planId: 'p1', dzialkaId: 'dz1', zakonczona: true },
    ]);
    assert.equal(wraca.filter((s) => s.planId === 'p1').length, 0);

    const reczne = sesjePoUlozeniu(plan, krotkie, ['dz1'], [
      { planId: 'p1', dzialkaId: 'dz1', zakonczona: true },
    ]);
    assert.ok(reczne.some((s) => s.dzialkaId === 'dz1' && s.zakonczona));
  });

  it('grupujAutaLive – jeden numer mimo dwóch obszarów', () => {
    const wpisy = [
      { ...wpis('dz1', 10, 8.58), numerAuta: 1, id: 'a' },
      { ...wpis('dz2', 20, 16.42), numerAuta: 1, id: 'b' },
      { ...wpis('dz2', 15, 12), numerAuta: 2, id: 'c' },
    ];
    const auta = grupujAutaLive(plan, wpisy);
    assert.equal(auta.length, 2);
    assert.equal(auta[0].tonaz, 25);
    assert.equal(auta[0].metry, 30);
    assert.equal(auta[1].numerAuta, 2);
  });

  it('zamknieciaReczneDzialek – tylko niepełne sesje', () => {
    const wpisy = [wpis('dz1', 30)];
    const ids = zamknieciaReczneDzialek(plan, wpisy, [
      { planId: 'p1', dzialkaId: 'dz1', zakonczona: true },
      { planId: 'p1', dzialkaId: 'dz2', zakonczona: true },
    ]);
    assert.deepEqual(ids.sort(), ['dz1', 'dz2']);
    const pelne = zamknieciaReczneDzialek(plan, [wpis('dz1', 100)], [
      { planId: 'p1', dzialkaId: 'dz1', zakonczona: true },
    ]);
    assert.deepEqual(pelne, []);
  });
});
