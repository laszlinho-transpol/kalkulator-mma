import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rodzajDnia } from './styl';

test('rodzajDnia rozpoznaje soboty, niedziele i święta', () => {
  assert.equal(rodzajDnia('2026-10-16'), 'roboczy');
  assert.equal(rodzajDnia('2026-10-17'), 'sobota');
  assert.equal(rodzajDnia('2026-10-18'), 'niedziela');
  assert.equal(rodzajDnia('2026-11-11'), 'swieto');
});

test('rodzajDnia dla pełnego znacznika ISO bierze dzień lokalny', () => {
  const sobotaLokalnie = new Date(2026, 9, 17, 0, 0, 0).toISOString();
  assert.equal(rodzajDnia(sobotaLokalnie), 'sobota');
});
