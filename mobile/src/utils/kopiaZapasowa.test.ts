import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMAT_KOPII, nazwaPlikuKopii, odczytajKopie, planPrzywracania, podsumujKopie, utworzKopie,
} from './kopiaZapasowa';

const WPISY: Array<[string, string | null]> = [
  ['@mma:budowy', JSON.stringify([{ id: 'b1' }, { id: 'b2' }])],
  ['@mma:mieszanki', JSON.stringify([{ id: 'm1' }])],
  ['@mma:pracownicy_raporty', '[]'],
  ['@mma:settings', JSON.stringify({ tonazDomyslny: 25.5 })],
  ['@mma:onboardingComplete', 'true'],
  ['@mma:pusty', null],
  ['obcy-klucz', 'x'],
];

describe('kopia zapasowa', () => {
  it('zbiera tylko dane aplikacji i odtwarza je bez zmian', () => {
    const kopia = utworzKopie(WPISY, '1.8.31', new Date('2026-10-15T20:00:00Z'));
    assert.equal(kopia.format, FORMAT_KOPII);
    assert.deepEqual(Object.keys(kopia.dane).sort(), [
      '@mma:budowy', '@mma:mieszanki', '@mma:onboardingComplete', '@mma:pracownicy_raporty', '@mma:settings',
    ]);
    const odczyt = odczytajKopie(JSON.stringify(kopia));
    assert.ok(odczyt.sukces);
    if (odczyt.sukces) assert.deepEqual(odczyt.kopia.dane, kopia.dane);
  });

  it('odrzuca obce, puste i nowsze pliki', () => {
    assert.equal(odczytajKopie('nie json').sukces, false);
    assert.equal(odczytajKopie(JSON.stringify({ plan: {} })).sukces, false);
    assert.equal(odczytajKopie(JSON.stringify({ format: FORMAT_KOPII, wersjaFormatu: 1, dane: {} })).sukces, false);
    assert.equal(odczytajKopie(JSON.stringify({ format: FORMAT_KOPII, wersjaFormatu: 99, dane: { '@mma:x': '1' } })).sukces, false);
  });

  it('podsumowanie pokazuje niepuste listy', () => {
    const kopia = utworzKopie(WPISY, '1.8.31');
    assert.deepEqual(podsumujKopie(kopia.dane), [
      { etykieta: 'Budowy', liczba: 2 },
      { etykieta: 'Mieszanki', liczba: 1 },
    ]);
  });

  it('przywracanie usuwa dane spoza kopii i nie rusza obcych kluczy', () => {
    const kopia = utworzKopie([['@mma:budowy', '[]']], '1.8.31');
    const plan = planPrzywracania(['@mma:budowy', '@mma:plany', 'inny'], kopia);
    assert.deepEqual(plan.usun, ['@mma:plany']);
    assert.deepEqual(plan.zapisz, [['@mma:budowy', '[]']]);
  });

  it('nazwa pliku zawiera datę i godzinę', () => {
    assert.equal(nazwaPlikuKopii(new Date(2026, 9, 5, 7, 3)), 'kalkulator-mma-kopia-2026-10-05-0703.json');
  });
});
