import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Plan, WpisLive, SesjaDzialkiLive, DzialkaRobocza } from '../types';
import {
  rozdzielMetryNaDzialki,
  znajdzAktywnaDzialke,
  obliczBilansLivePlanu,
  dzialkiDoAutoZamkniecia,
  sumaMetrowDzialki,
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
    assert.ok(Math.abs(seg[0].tonaz + seg[1].tonaz - 25) < 0.1);
  });

  it('dzialkiDoAutoZamkniecia – po wypełnieniu działki', () => {
    const wpisy = [wpis('dz1', 80)];
    const seg = rozdzielMetryNaDzialki(plan, wpisy, sesje, 20, 25);
    const doZamk = dzialkiDoAutoZamkniecia(plan, wpisy, sesje, seg);
    assert.ok(doZamk.includes('dz1'));
  });

  it('obliczBilansLivePlanu – sumuje cały plan', () => {
    const wpisy = [wpis('dz1', 50, 20), wpis('dz2', 25, 12)];
    const bilans = obliczBilansLivePlanu(plan, wpisy, () => 2.4);
    assert.equal(bilans.liczbaAut, 2);
    assert.equal(bilans.lacznyTonaz, 32);
    assert.equal(bilans.laczneMetry, 75);
    assert.ok(bilans.zakrytaPowierzchnia > 0);
    assert.ok(bilans.pozostalaPowierzchnia > 0);
  });

  it('sumaMetrowDzialki', () => {
    const wpisy = [wpis('dz1', 30), wpis('dz1', 20)];
    assert.equal(sumaMetrowDzialki(wpisy, 'dz1'), 50);
  });
});
