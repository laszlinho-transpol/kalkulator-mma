import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bazowaNazwaPliku,
  dopasujNazwePdfDoArkusza,
  dopasujPdfDoArkuszy,
  kluczArkuszaZNazwy,
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
});
