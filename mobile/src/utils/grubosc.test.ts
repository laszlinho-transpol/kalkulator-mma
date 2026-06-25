import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gruboscProjektowa,
  gruboscWbudowywania,
  tolerancjaProcent,
  formatujTolerancje,
} from './grubosc';
import type { DzialkaRobocza } from '../types';

const dzialkaBazowa: DzialkaRobocza = {
  id: 'd1',
  nazwa: 'Działka 1',
  mieszankaId: 'm1',
  grubosc: 4,
  kilometrazPoczatkowyKm: 0,
  kilometrazPoczatkowyM: 0,
  kierunekUkladania: 'rosnacy',
  figury: [],
};

describe('grubosc', () => {
  it('czyta nowe pola grubości', () => {
    const dz: DzialkaRobocza = {
      ...dzialkaBazowa,
      gruboscProjektowa: 5,
      gruboscWbudowywania: 4.5,
      tolerancja: 8,
    };
    assert.equal(gruboscProjektowa(dz), 5);
    assert.equal(gruboscWbudowywania(dz), 4.5);
    assert.equal(tolerancjaProcent(dz), 8);
    assert.equal(formatujTolerancje(dz), '±8%');
  });

  it('wsteczna kompatybilność ze starym polem grubosc', () => {
    assert.equal(gruboscProjektowa(dzialkaBazowa), 4);
    assert.equal(gruboscWbudowywania(dzialkaBazowa), 4);
    assert.equal(tolerancjaProcent(dzialkaBazowa), 10);
  });
});
