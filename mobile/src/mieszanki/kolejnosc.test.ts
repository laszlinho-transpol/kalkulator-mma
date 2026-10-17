import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  grupujMieszanki, kategoriaRuchuMieszanki, posortujMieszanki, uziarnienieMieszanki, warstwaMieszanki,
} from './kolejnosc';

describe('kolejność mieszanek', () => {
  it('rozpoznaje rodzaj warstwy', () => {
    assert.equal(warstwaMieszanki('AC22P'), 'podbudowa');
    assert.equal(warstwaMieszanki('AC 16 W 50/70 KR3-4'), 'wiazaca');
    assert.equal(warstwaMieszanki('AC16WMS'), 'wiazaca');
    assert.equal(warstwaMieszanki('AC WMS 16'), 'wiazaca');
    assert.equal(warstwaMieszanki('AC11S PMB 45/80-55'), 'scieralna');
    assert.equal(warstwaMieszanki('SMA8'), 'scieralna');
    assert.equal(warstwaMieszanki('BBTM8'), 'scieralna');
    assert.equal(warstwaMieszanki('Beton'), 'inna');
  });

  it('czyta uziarnienie i KR', () => {
    assert.equal(uziarnienieMieszanki('AC32P'), 31.5);
    assert.equal(uziarnienieMieszanki('AC31,5P'), 31.5);
    assert.equal(uziarnienieMieszanki('AC11S 50/70'), 11);
    assert.equal(uziarnienieMieszanki('AC16W KR5-7'), 16);
    assert.equal(kategoriaRuchuMieszanki({ rodzaj: 'AC16W KR3-4' }), 4);
    assert.equal(kategoriaRuchuMieszanki({ rodzaj: 'AC16W', kategoriaRuchu: 'KR5-7' }), 7);
    assert.equal(kategoriaRuchuMieszanki({ rodzaj: 'AC16W', nrRecepty: '12/2025 KR1-2' }), 2);
    assert.equal(kategoriaRuchuMieszanki({ rodzaj: 'AC16W' }), undefined);
  });

  it('sortuje: warstwa od dołu, uziarnienie malejąco, KR malejąco', () => {
    const lista = [
      { rodzaj: 'SMA8' }, { rodzaj: 'AC11S' }, { rodzaj: 'AC16W', kategoriaRuchu: 'KR1-2' },
      { rodzaj: 'AC22W' }, { rodzaj: 'AC16W', kategoriaRuchu: 'KR5-7' }, { rodzaj: 'AC32P' }, { rodzaj: 'AC22P' },
      { rodzaj: 'SMA11' }, { rodzaj: 'AC5S' },
    ];
    assert.deepEqual(
      posortujMieszanki(lista).map((m) => `${m.rodzaj}${m.kategoriaRuchu ? ` ${m.kategoriaRuchu}` : ''}`),
      ['AC32P', 'AC22P', 'AC22W', 'AC16W KR5-7', 'AC16W KR1-2', 'AC11S', 'SMA11', 'SMA8', 'AC5S'],
    );
  });

  it('grupuje po warstwie i uziarnieniu', () => {
    const grupy = grupujMieszanki([{ rodzaj: 'SMA8' }, { rodzaj: 'AC16W' }, { rodzaj: 'AC16W KR3-4' }, { rodzaj: 'AC22W' }, { rodzaj: 'AC11S' }]);
    assert.deepEqual(grupy.map((g) => g.tytul), ['Wiążące', 'Ścieralne']);
    assert.deepEqual(grupy[0].grupy.map((g) => [g.uziarnienie, g.elementy.length]), [[22, 1], [16, 2]]);
    assert.deepEqual(grupy[1].grupy.map((g) => g.uziarnienie), [11, 8]);
  });
});
