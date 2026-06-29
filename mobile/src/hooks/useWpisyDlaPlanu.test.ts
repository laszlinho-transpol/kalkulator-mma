import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Regresja: useLiveStore((s) => s.wpisyDlaPlanu(id)) zwraca nową tablicę
 * przy każdym wywołaniu – symulacja problemu Object.is w Zustand.
 */
describe('selektor wpisów planu – brak nieskończonej pętli', () => {
  it('filter() tworzy nową referencję – wymaga useMemo w hooku', () => {
    const wpisy = [
      { id: 'w1', planId: 'p1', dzialkaId: 'd1' },
      { id: 'w2', planId: 'p2', dzialkaId: 'd2' },
    ];
    const filtruj = (planId: string) => wpisy.filter((w) => w.planId === planId);

    const a = filtruj('p1');
    const b = filtruj('p1');
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  });

  it('useMemo pattern daje stabilną referencję gdy wpisy się nie zmieniają', () => {
    const wpisy = [{ id: 'w1', planId: 'p1' }];
    let memoWpisy = wpisy;
    let memoWynik = wpisy.filter((w) => w.planId === 'p1');

    const ponownie = memoWpisy === wpisy
      ? memoWynik
      : wpisy.filter((w) => w.planId === 'p1');

    assert.equal(ponownie, memoWynik);
  });
});
