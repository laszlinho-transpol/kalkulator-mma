import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { odczytajUkryte, przelaczUkryta } from './zasady';

describe('zasada działania – schowane okienka', () => {
  it('przełącza tylko wskazaną stronę', () => {
    let u = przelaczUkryta([], 'geodezja/spadki');
    assert.deepEqual(u, ['geodezja/spadki']);
    u = przelaczUkryta(u, 'geodezja/luki');
    assert.deepEqual(u, ['geodezja/spadki', 'geodezja/luki']);
    u = przelaczUkryta(u, 'geodezja/spadki');
    assert.deepEqual(u, ['geodezja/luki']);
  });

  it('odczyt z pamięci odporny na złe dane', () => {
    assert.deepEqual(odczytajUkryte(null), []);
    assert.deepEqual(odczytajUkryte('nie json'), []);
    assert.deepEqual(odczytajUkryte('{"a":1}'), []);
    assert.deepEqual(odczytajUkryte('["a", 2, "a", "b"]'), ['a', 'b']);
  });
});
