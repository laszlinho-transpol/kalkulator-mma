import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obliczWysokosciFigur,
  obliczWysokoscSzkicu,
  SKETCH_SVG_W,
} from './sketchLayout';
import type { Figura } from '../types';

const prostokat = (dlugosc: number): Figura => ({
  id: `p-${dlugosc}`,
  typ: 'prostokat',
  szerokosc: 3.5,
  dlugosc,
});

describe('sketchLayout', () => {
  it('tryb standard – najdłuższa figura ma MAX_H, krótsze proporcjonalnie', () => {
    const figury = [prostokat(410), prostokat(20)];
    const h = obliczWysokosciFigur(figury, 'standard');
    assert.equal(h[0], 110);
    assert.ok(h[1] >= 26);
    assert.ok(h[1] < h[0]);
  });

  it('tryb live – wysokość rośnie wg metrów (długi odcinek czytelny po scrollu)', () => {
    const figury = [prostokat(410), prostokat(20)];
    const h = obliczWysokosciFigur(figury, 'live');
    assert.ok(h[0] > 400, `oczekiwano >400px, jest ${h[0]}`);
    assert.ok(h[1] >= 26);
    assert.ok(h[0] > h[1] * 10);
  });

  it('obliczWysokoscSzkicu sumuje wysokości figur + padding', () => {
    const figury = [prostokat(100)];
    const h = obliczWysokosciFigur(figury, 'live');
    const total = obliczWysokoscSzkicu(figury, 'live');
    assert.equal(total, h[0] + 12 + 12);
  });

  it('szerokość SVG jest stała we wszystkich trybach', () => {
    assert.equal(SKETCH_SVG_W, 44 + 80 + 58);
  });
});
