import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bazowaNazwaPliku,
  dopasujNazwePdfDoArkusza,
  dopasujPdfDoArkuszy,
  kluczArkuszaZNazwy,
  listaWgranychPdf,
  odtworzTlaZIdb,
  przypnijWgranyPdfDoArkusza,
  usunWgranyPdf,
  ustawBuforTla,
  wyczyscBuforyTla,
  zapiszBuforPliku,
  type BuforTlaPdf,
} from './tloPdfPamiec';

describe('tloPdfPamiec', () => {
  it('normalizuje nazwę z ścieżki XFDF href', () => {
    assert.equal(
      bazowaNazwaPliku('file:D:\\PZT\\DK25M_kowarsko_Ark_2_1.pdf'),
      'dk25m kowarsko ark 2 1',
    );
    assert.equal(bazowaNazwaPliku('Ark. 2_1.xfdf'), 'ark 2 1');
  });

  it('dopasowuje PDF do arkusza po href', () => {
    const a = {
      id: '1',
      nazwa: 'Ark. 2_1',
      zrodloNazwa: 'DK25M_kowarsko_Ark_2_1.xfdf',
      zrodloPdfHref: 'DK25M_kowarsko_Ark_2_1.pdf',
    };
    assert.equal(dopasujNazwePdfDoArkusza(a, 'DK25M_kowarsko_Ark_2_1.pdf'), true);
    assert.equal(dopasujNazwePdfDoArkusza(a, 'Ark_2_1.pdf'), true);
    assert.equal(dopasujNazwePdfDoArkusza(a, 'inny.pdf'), false);
    assert.equal(kluczArkuszaZNazwy('Ark. 2_1.xfdf'), '2 1');
    assert.equal(kluczArkuszaZNazwy('DK25M_kowarsko_Ark_2_1.pdf'), '2 1');
    assert.equal(
      dopasujNazwePdfDoArkusza(
        { nazwa: 'Ark. 2_1', zrodloNazwa: 'Ark. 2_1.xfdf' },
        'PZT_DK25_Arkusz_2_1.pdf',
      ),
      true,
    );
  });

  it('przypisuje wiele PDF do wielu arkuszy po nazwie', () => {
    const arkusze = [
      { id: 'a', nazwa: 'a', zrodloNazwa: 'Ark_2_1.xfdf', zrodloPdfHref: 'Ark_2_1.pdf' },
      { id: 'b', nazwa: 'b', zrodloNazwa: 'Ark_2_2.xfdf', zrodloPdfHref: 'Ark_2_2.pdf' },
    ];
    const map = dopasujPdfDoArkuszy(arkusze, ['Ark_2_2.pdf', 'Ark_2_1.pdf']);
    assert.equal(map.get('a'), 'Ark_2_1.pdf');
    assert.equal(map.get('b'), 'Ark_2_2.pdf');
  });

  it('przy jednym PDF i jednym arkuszu przypisuje mimo innej nazwy', () => {
    const map = dopasujPdfDoArkuszy(
      [{ id: 'a', nazwa: 'x', zrodloNazwa: 'x.xfdf' }],
      ['plan.pdf'],
    );
    assert.equal(map.get('a'), 'plan.pdf');
  });

  it('lista PDF: zapamiętuje oba pliki, usuwa zbędny i odłącza od arkusza', () => {
    wyczyscBuforyTla();
    const a: BuforTlaPdf = { data: new Uint8Array([1]), nazwa: 'Ark_2_1.pdf', pageW: 10, pageH: 10, strona: 1 };
    const b: BuforTlaPdf = { data: new Uint8Array([2]), nazwa: 'zly.pdf', pageW: 10, pageH: 10, strona: 1 };
    zapiszBuforPliku(a);
    zapiszBuforPliku(b);
    ustawBuforTla('ark1', b);
    const lista = listaWgranychPdf();
    assert.equal(lista.length, 2);
    assert.ok(lista.some((x) => x.nazwa === 'zly.pdf' && x.arkuszIds.includes('ark1')));
    const przypiety = przypnijWgranyPdfDoArkusza('ark1', 'Ark_2_1.pdf');
    assert.equal(przypiety?.nazwa, 'Ark_2_1.pdf');
    const ids = usunWgranyPdf('zly.pdf');
    assert.deepEqual(ids, []);
    assert.equal(listaWgranychPdf().length, 1);
    assert.equal(listaWgranychPdf()[0].nazwa, 'Ark_2_1.pdf');
    wyczyscBuforyTla();
  });

  it('odtworzTlaZIdb bez IndexedDB nic nie psuje', async () => {
    const n = await odtworzTlaZIdb();
    assert.equal(n, 0);
  });
});
