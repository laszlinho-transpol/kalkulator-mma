import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { budowaWToku, grupyBudow, opisStatusu, statusBudowy } from './statusBudowy';

describe('status budowy', () => {
  it('brak statusu = aktywna, stara „archiwalna” = zakończona', () => {
    assert.equal(statusBudowy({}), 'aktywna');
    assert.equal(statusBudowy({ status: 'archiwalna' }), 'zakonczona');
  });

  it('gwarancja bez daty trwa, z datą po jej upływie przechodzi do zakończonych', () => {
    assert.equal(statusBudowy({ status: 'gwarancja' }, '2030-01-01'), 'gwarancja');
    assert.equal(statusBudowy({ status: 'gwarancja', gwarancjaDo: '2026-10-18' }, '2026-10-18'), 'gwarancja');
    assert.equal(statusBudowy({ status: 'gwarancja', gwarancjaDo: '2026-10-18' }, '2026-10-19'), 'zakonczona');
    assert.equal(opisStatusu({ status: 'gwarancja', gwarancjaDo: '2026-10-18' }, '2026-10-01'), 'Gwarancja do 18.10.2026');
    assert.equal(opisStatusu({ status: 'gwarancja', gwarancjaDo: '2026-10-18' }, '2026-11-01'), 'Zakończona (gwarancja do 18.10.2026)');
  });

  it('w toku = aktywna albo gwarancja; grupy w kolejności statusów', () => {
    assert.equal(budowaWToku({ status: 'gwarancja' }), true);
    assert.equal(budowaWToku({ status: 'zakonczona' }), false);
    const g = grupyBudow([
      { kodBudowy: 'B130', status: 'zakonczona' },
      { kodBudowy: 'B12', status: 'gwarancja', gwarancjaDo: '2026-01-01' },
      { kodBudowy: 'B9' },
      { kodBudowy: 'B10', status: 'gwarancja' },
    ], '2026-10-18');
    assert.deepEqual(g.map((x) => [x.status, x.budowy.map((b) => b.kodBudowy)]), [
      ['aktywna', ['B9']],
      ['gwarancja', ['B10']],
      ['zakonczona', ['B12', 'B130']],
    ]);
  });
});
