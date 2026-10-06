import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dzienWZakresie, dzienZIso, parsujZakresDat } from './zakresDat';

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

  it('dzień planu wpada w zakres', () => {
    assert.equal(dzienZIso('2026-10-05T06:00:00.000Z'), '2026-10-05');
    assert.equal(dzienWZakresie('2026-10-05', '2026-10-01', '2026-10-10'), true);
    assert.equal(dzienWZakresie('2026-10-11', '2026-10-01', '2026-10-10'), false);
  });
});
