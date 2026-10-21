import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { klawiszLiczby } from './klawiszLiczby';

describe('klawiatura liczbowa', () => {
  it('pierwszy klawisz zastępuje wartość, kolejne dopisują', () => {
    let v = klawiszLiczby('1300', '1', true);
    assert.equal(v, '1');
    for (const k of ['2', '4', '5']) v = klawiszLiczby(v, k, false);
    assert.equal(v, '1245');
  });

  it('przecinek tylko raz, z zerem na początku', () => {
    assert.equal(klawiszLiczby('', ',', false), '0,');
    assert.equal(klawiszLiczby('2', ',', false), '2,');
    assert.equal(klawiszLiczby('2,5', ',', false), '2,5');
    assert.equal(klawiszLiczby('-', ',', false), '-0,');
  });

  it('cofnij, wyczyść i zmiana znaku', () => {
    assert.equal(klawiszLiczby('2,50', '⌫', false), '2,5');
    assert.equal(klawiszLiczby('2,50', '⌫', true), '');
    assert.equal(klawiszLiczby('2,5', 'C', false), '');
    assert.equal(klawiszLiczby('2,5', '±', true), '-2,5');
    assert.equal(klawiszLiczby('-2,5', '±', false), '2,5');
    assert.equal(klawiszLiczby('0', '7', false), '7');
  });
});
