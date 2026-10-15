import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dniRoboczeMiesiaca,
  dostepneRozliczenia,
  kwotaRozliczenia,
  parsujLiczbePola,
  wczorajIso,
} from './rozliczenie';

describe('rozliczenie sprzętu', () => {
  it('październik 2026 ma 22 dni robocze', () => {
    assert.equal(dniRoboczeMiesiaca('2026-10-15'), 22);
  });

  it('koszt miesięczny dzieli się przez dni robocze i mnoży przez liczbę dni', () => {
    assert.equal(kwotaRozliczenia('miesieczny', 22300, 1, 22), 1013.64);
  });

  it('stawki dzienna, godzinowa i kilometrowa mnożą się przez ilość', () => {
    assert.equal(kwotaRozliczenia('dzienny', 350, 2, 22), 700);
    assert.equal(kwotaRozliczenia('godzinowy', 150, 4, 22), 600);
    assert.equal(kwotaRozliczenia('kilometr', 3.5, 10, 22), 35);
  });

  it('do raportu wchodzą tylko uzupełnione stawki', () => {
    assert.deepEqual(
      dostepneRozliczenia({ miesieczny: 22300, kilometr: 3.5 }),
      ['miesieczny', 'kilometr'],
    );
  });

  it('pole liczbowe przyjmuje przecinek i odrzuca jednostki', () => {
    assert.equal(parsujLiczbePola('3,5'), 3.5);
    assert.equal(parsujLiczbePola('22 300'), 22300);
    assert.equal(parsujLiczbePola('4 l/mth'), null);
  });

  it('wczoraj jest dniem kalendarzowym przed podaną datą', () => {
    assert.equal(wczorajIso(new Date(2026, 9, 15, 18, 0, 0)), '2026-10-14');
    assert.equal(wczorajIso(new Date(2026, 2, 1, 8, 0, 0)), '2026-02-28');
  });
});
