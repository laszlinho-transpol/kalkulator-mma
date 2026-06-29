import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gruboscProjektowa,
  gruboscWbudowywania,
  tolerancjaProcent,
  formatujTolerancje,
  kolorUzyskanejGrubosci,
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

  it('koloruje uzyskaną grubość wg specyfikacji', () => {
    const dz: DzialkaRobocza = {
      ...dzialkaBazowa,
      gruboscProjektowa: 10,
      gruboscWbudowywania: 9.6,
      tolerancja: 10,
    };
    assert.equal(kolorUzyskanejGrubosci(9.6, dz), 'zielony');
    assert.equal(kolorUzyskanejGrubosci(9.5, dz), 'zielony');
    assert.equal(kolorUzyskanejGrubosci(9.9, dz), 'pomaranczowy');
    assert.equal(kolorUzyskanejGrubosci(8.5, dz), 'czerwony');
  });
});
