import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DzialkaRobocza, Plan } from '../types';
import {
  brakiZaawansowanego,
  dniTygodnia,
  dokumentHarmonogramu,
  etykietaTygodnia,
  mieszankiBudowy,
  mieszankiWpisu,
  numerTygodnia,
  poczatekTygodnia,
  pozycjeHarmonogramu,
} from './harmonogram';

const mieszanki = [
  { id: 'm1', rodzaj: 'AC 11 S', ciezarObjetosciowy: 2.4, nrRecepty: 'R/1' },
  { id: 'm2', rodzaj: 'AC 16 W', ciezarObjetosciowy: 2.5 },
];
const budowy = [{ id: 'b1', kodBudowy: 'B12', nazwaInwestycji: 'Obwodnica' }];

const dzialka = (id: string, zakladkaId?: string): DzialkaRobocza => ({
  id,
  nazwa: `Działka ${id}`,
  mieszankaId: 'm1',
  grubosc: 4,
  kilometrazPoczatkowyKm: 1,
  kilometrazPoczatkowyM: 0,
  kierunekUkladania: 'rosnacy',
  figury: [],
  profilSzerokosci: [{ dlugoscM: 100, szerokoscM: 5, powierzchniaM2: 500 }],
  zakladkaId,
});

const plan = (p: Partial<Plan>): Plan => ({
  id: 'p1',
  dataWbudowywania: '2026-10-20',
  iloscDzialek: 1,
  dzialki: [dzialka('d1')],
  tonazAuta: 24,
  rzuty: [],
  status: 'aktywny',
  createdAt: '',
  updatedAt: '',
  ...p,
});

describe('harmonogram – tygodnie', () => {
  it('numer TK wg ISO 8601', () => {
    assert.deepEqual(numerTygodnia('2026-10-18'), { tk: 42, rok: 2026 });
    assert.deepEqual(numerTygodnia('2026-01-01'), { tk: 1, rok: 2026 });
    assert.deepEqual(numerTygodnia('2027-01-01'), { tk: 53, rok: 2026 });
    assert.deepEqual(numerTygodnia('2024-12-30'), { tk: 1, rok: 2025 });
  });

  it('tydzień od poniedziałku do niedzieli', () => {
    assert.equal(poczatekTygodnia('2026-10-18'), '2026-10-12');
    assert.equal(poczatekTygodnia('2026-10-19'), '2026-10-19');
    assert.deepEqual(dniTygodnia('2026-10-14').at(-1), '2026-10-18');
    assert.equal(etykietaTygodnia('2026-10-14'), 'TK 42 · 12.10–18.10.2026');
  });
});

describe('harmonogram – pozycje', () => {
  it('wpis prosty i plan z budowy w jednej liście, posortowane po dniu', () => {
    const p = pozycjeHarmonogramu({
      wpisy: [{ id: 'w1', data: '2026-10-21', budowaId: 'b1', mieszankaId: 'm2', ilosc: 120, createdAt: '', updatedAt: '' }],
      plany: [plan({
        zrodlo: 'budowa',
        budowaId: 'b1',
        dzialki: [dzialka('d1', 'z1'), dzialka('d2', 'z1')],
        zakladkiBudowy: [{
          id: 'z1', legendaId: 'l', obszarNazwa: 'Jezdnia', warstwaNazwa: 'Ścieralna', kilometrazOdM: 1000, kilometrazDoM: 1200,
          odsadzkaLewaCm: 0, odsadzkaPrawaCm: 0, mieszankaId: 'm1', grubosciCm: [4],
        }],
      })],
      budowy,
      mieszanki,
    });
    assert.equal(p.length, 2);
    assert.equal(p[0].rodzaj, 'plan');
    assert.equal(p[0].budowa, 'B12 · Obwodnica');
    assert.equal(p[0].obszar, 'Jezdnia');
    assert.equal(p[0].warstwa, 'Ścieralna');
    assert.equal(p[0].recepta, 'AC 11 S · R/1');
    assert.equal(p[0].powierzchniaM2, 1000);
    assert.equal(p[0].tony, 96);
    assert.equal(p[0].auta, 4);
    assert.deepEqual([p[1].rodzaj, p[1].tony, p[1].recepta, p[1].auta], ['prosty', 120, 'AC 16 W', undefined]);
  });

  it('jeden plan prosty z kilkoma mieszankami: wiersz na mieszankę, stary zapis z jedną mieszanką', () => {
    const wpis = {
      id: 'w1', data: '2026-10-21', budowaId: 'b1', createdAt: '', updatedAt: '',
      mieszanki: [{ mieszankaId: 'm2', ilosc: 300 }, { mieszankaId: 'm1', ilosc: 120 }],
    };
    assert.deepEqual(mieszankiWpisu({ mieszankaId: 'm1', ilosc: 50 }), [{ mieszankaId: 'm1', ilosc: 50 }]);
    assert.deepEqual(mieszankiWpisu({}), []);
    const p = pozycjeHarmonogramu({ wpisy: [wpis], plany: [], budowy, mieszanki });
    assert.deepEqual(p.map((x) => [x.wpisId, x.recepta, x.tony]), [['w1', 'AC 16 W', 300], ['w1', 'AC 11 S · R/1', 120]]);
    assert.notEqual(p[0].klucz, p[1].klucz);
    const d = dokumentHarmonogramu({ pozycje: p, od: '2026-10-19', doDnia: '2026-10-25', kolumny: ['recepta', 'tony'] });
    const t = d.sekcje[0].bloki[0];
    assert.ok(t.typ === 'tabela');
    assert.equal(t.wiersze.length, 2);
    assert.equal(t.suma?.[2], '420,00 t');
  });

  it('plan z figur: pozycja na każdą działkę', () => {
    const p = pozycjeHarmonogramu({ wpisy: [], plany: [plan({ dzialki: [dzialka('a'), dzialka('b')] })], budowy, mieszanki });
    assert.deepEqual(p.map((x) => [x.obszar, x.tony, x.auta]), [['Działka a', 48, 2], ['Działka b', 48, 2]]);
    assert.equal(p[0].budowa, 'Bez budowy');
  });
});

describe('harmonogram – budowa', () => {
  const projekt = (obszary: number, warstwy: number) => ({
    projekt: {
      arkusze: [{ obszary: Array.from({ length: obszary }, () => ({})) }],
      konstrukcje: [{
        warstwy: Array.from({ length: warstwy }, (_, i) => ({ mieszankaIds: [`m${i + 1}`] })),
        wyjatki: [{ warstwy: [{ mieszankaIds: ['m9', 'm1'] }] }],
      }],
    },
  }) as never;

  it('zatwierdzone mieszanki z konstrukcji i zmian konstrukcji', () => {
    assert.deepEqual(mieszankiBudowy(projekt(1, 2)), ['m1', 'm2', 'm9']);
    assert.deepEqual(mieszankiBudowy(undefined), []);
  });

  it('opcja zaawansowana wymaga obszarów XFDF i konstrukcji', () => {
    assert.deepEqual(brakiZaawansowanego(projekt(1, 1)), []);
    assert.deepEqual(brakiZaawansowanego(projekt(0, 0)), ['PZT z obszarami z plików XFDF', 'konstrukcje z warstwami']);
  });
});

describe('harmonogram – PDF', () => {
  const pozycje = pozycjeHarmonogramu({
    wpisy: [
      { id: 'w1', data: '2026-10-16', budowaId: 'b1', mieszankaId: 'm1', ilosc: 100, createdAt: '', updatedAt: '' },
      { id: 'w2', data: '2026-10-19', budowaId: 'b1', mieszankaId: 'm2', ilosc: 50.5, createdAt: '', updatedAt: '' },
      { id: 'w3', data: '2026-11-30', budowaId: 'b1', mieszankaId: 'm2', ilosc: 10, createdAt: '', updatedAt: '' },
    ],
    plany: [],
    budowy,
    mieszanki,
  });

  it('sekcja na tydzień, wybrane kolumny i suma', () => {
    const d = dokumentHarmonogramu({ pozycje, od: '2026-10-12', doDnia: '2026-10-25', kolumny: ['tony', 'recepta'] });
    assert.equal(d.podtytul, '12.10.2026 – 25.10.2026');
    assert.deepEqual(d.sekcje.map((s) => s.tytul), ['TK 42 · 12.10–18.10.2026', 'TK 43 · 19.10–25.10.2026']);
    const t = d.sekcje[0].bloki[0];
    assert.ok(t.typ === 'tabela');
    assert.deepEqual(t.naglowki, ['Data', 'Recepta', 'Ilość ton']);
    assert.deepEqual(t.liczbowe, [2]);
    assert.equal(t.wiersze[0][1], 'AC 11 S · R/1');
    assert.equal(t.suma?.[0], 'Razem');
  });

  it('bez kolumn liczbowych nie ma sumy, pusty zakres daje informację', () => {
    const d = dokumentHarmonogramu({ pozycje, od: '2026-10-12', doDnia: '2026-10-18', kolumny: ['budowa'] });
    const t = d.sekcje[0].bloki[0];
    assert.ok(t.typ === 'tabela' && t.suma === undefined);
    assert.equal(dokumentHarmonogramu({ pozycje, od: '2027-01-01', doDnia: '2027-01-31', kolumny: ['tony'] }).sekcje[0].tytul, 'Brak pozycji');
  });
});
