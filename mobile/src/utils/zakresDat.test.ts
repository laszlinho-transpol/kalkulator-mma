import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dzienWZakresie, dzienZIso, dzisIso, parsujZakresDat, wyborDnia } from './zakresDat';

describe('parsujZakresDat', () => {
  it('puste pole nie ogranicza listy', () => {
    assert.deepEqual(parsujZakresDat('  '), { ok: true, pusty: true });
  });

  it('jedna data polska i ISO', () => {
    assert.deepEqual(parsujZakresDat('5.10.2026'), { ok: true, pusty: false, od: '2026-10-05', do: '2026-10-05' });
    assert.deepEqual(parsujZakresDat('2026-10-05'), { ok: true, pusty: false, od: '2026-10-05', do: '2026-10-05' });
  });

  it('zakres od–do, także odwrócony', () => {
    assert.deepEqual(parsujZakresDat('01.10.2026–10.10.2026'), { ok: true, pusty: false, od: '2026-10-01', do: '2026-10-10' });
    assert.deepEqual(parsujZakresDat('10.10.2026 do 01.10.2026'), { ok: true, pusty: false, od: '2026-10-01', do: '2026-10-10' });
    assert.deepEqual(parsujZakresDat('2026-10-01 do 2026-10-03'), { ok: true, pusty: false, od: '2026-10-01', do: '2026-10-03' });
    assert.deepEqual(parsujZakresDat('2026-10-01 - 2026-10-03'), { ok: true, pusty: false, od: '2026-10-01', do: '2026-10-03' });
  });

  it('nieczytelny tekst', () => {
    assert.deepEqual(parsujZakresDat('październik'), { ok: false });
  });

  it('kalendarz: pierwszy dzień, potem zakres', () => {
    const raz = wyborDnia('gotowy', '2026-10-01', '2026-10-07');
    assert.deepEqual(raz, { faza: 'poczatek', od: '2026-10-07', do: '2026-10-07' });
    const dwa = wyborDnia(raz.faza, raz.od, '2026-10-10');
    assert.deepEqual(dwa, { faza: 'gotowy', od: '2026-10-07', do: '2026-10-10' });
    const wstecz = wyborDnia('poczatek', '2026-10-10', '2026-10-02');
    assert.deepEqual(wstecz, { faza: 'gotowy', od: '2026-10-02', do: '2026-10-10' });
    const odNowa = wyborDnia('gotowy', '2026-10-02', '2026-10-05');
    assert.deepEqual(odNowa, { faza: 'poczatek', od: '2026-10-05', do: '2026-10-05' });
  });

  it('dzisiejsza data jest dniem lokalnym', () => {
    assert.equal(dzisIso(new Date(2026, 9, 7, 23, 30)), '2026-10-07');
  });

  it('dzień planu wpada w zakres', () => {
    assert.equal(dzienZIso('2026-10-05T06:00:00.000Z'), '2026-10-05');
    assert.equal(dzienWZakresie('2026-10-05', '2026-10-01', '2026-10-10'), true);
    assert.equal(dzienWZakresie('2026-10-11', '2026-10-01', '2026-10-10'), false);
  });
});
