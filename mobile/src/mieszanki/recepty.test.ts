import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cenaReceptyNaDzien, linieCeny, numerDnia, punktyHistoriiCeny, receptyWytworni } from './recepty';
import { oczyscNumer } from '../utils/kontaktyTelefonuFormat';
import type { Mieszanka } from '../types';

const recepta = (id: string, rodzaj: string, wytworniaId?: string): Mieszanka => ({
  id, rodzaj, wytworniaId, ciezarObjetosciowy: 2.4, createdAt: '', updatedAt: '',
});

describe('recepty wytwórni', () => {
  it('cena z okresu historii, a poza nim z karty', () => {
    const r = {
      cena: 300,
      historiaCen: [
        { id: 'a', od: '2026-01-01', do: '2026-03-31', stawki: { cena: 280 } },
        { id: 'b', od: '2026-04-01', do: '2026-12-31', stawki: { cena: 320.5 } },
      ],
    };
    assert.equal(cenaReceptyNaDzien(r, '2026-02-10'), 280);
    assert.equal(cenaReceptyNaDzien(r, '2026-10-15'), 320.5);
    assert.equal(cenaReceptyNaDzien(r, '2027-01-02'), 300);
    assert.equal(cenaReceptyNaDzien({}, '2026-10-15'), undefined);
  });

  it('opis ceny i lista recept wytwórni', () => {
    assert.deepEqual(linieCeny({ cena: 312.5 }), ['Cena: 312,50 zł / t']);
    assert.deepEqual(linieCeny({}), []);
    const lista = receptyWytworni([recepta('1', 'SMA11', 'w'), recepta('2', 'AC22P', 'w'), recepta('3', 'AC16W', 'x')], 'w');
    assert.deepEqual(lista.map((m) => m.rodzaj), ['AC22P', 'SMA11']);
  });

  it('punkty wykresu historii ceny w kolejności dat', () => {
    const punkty = punktyHistoriiCeny([
      { id: 'b', od: '2026-04-01', do: '2026-06-30', stawki: { cena: 320 } },
      { id: 'a', od: '2026-01-01', do: '2026-03-31', stawki: { cena: 280 } },
      { id: 'c', od: '2026-07-01', do: '2026-07-01', stawki: { cena: 330 } },
      { id: 'd', od: '2026-08-01', do: '2026-08-31', stawki: {} },
    ]);
    assert.deepEqual(punkty, [
      { iso: '2026-01-01', cena: 280, poczatek: true },
      { iso: '2026-03-31', cena: 280, poczatek: false },
      { iso: '2026-04-01', cena: 320, poczatek: true },
      { iso: '2026-06-30', cena: 320, poczatek: false },
      { iso: '2026-07-01', cena: 330, poczatek: true },
    ]);
    assert.equal(numerDnia('2026-01-02') - numerDnia('2026-01-01'), 1);
  });

  it('numer telefonu do schowka bez spacji i myślników', () => {
    assert.equal(oczyscNumer('+48 600-100 200'), '+48600100200');
    assert.equal(oczyscNumer('(52) 381 22 33'), '523812233');
  });
});
