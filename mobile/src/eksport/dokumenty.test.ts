import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dane, escapeHtml, htmlDokumentu, tekst, type BlokPdf, type DokumentPdf } from './dokumentPdf';
import { dokumentMiesiacaPracownika, dokumentPracownika } from './dokumenty';
import type { Pracownik, RaportPracownika } from '../budzet/typy';

const stawki = { stawka8h: 30, nadgodzina: 40, zus: 1.4 };
const pracownik: Pracownik = {
  id: 'p', nazwisko: 'Nowak', imie: 'Jan', grupaId: 'g1', stawki, createdAt: '', updatedAt: '',
};
const praca = (id: string, data: string, wynagrodzenie: number): RaportPracownika => ({
  id, pracownikId: 'p', data, budowaId: 'b1', godziny: 10, godzinyPodstawowe: 8, nadgodziny: 2,
  stawki, wynagrodzenie, kwota: wynagrodzenie * 1.4, createdAt: `${data}T10:00:00Z`,
});
const wolne = (id: string, data: string, rodzaj: NonNullable<RaportPracownika['rodzaj']>): RaportPracownika => ({
  id, pracownikId: 'p', data, rodzaj, budowaId: '', grupaId: 'g1', godziny: 0, godzinyPodstawowe: 0, nadgodziny: 0,
  stawki, wynagrodzenie: 0, kwota: 0, createdAt: `${data}T10:00:00Z`,
});

const tabele = (d: DokumentPdf) => d.sekcje.flatMap((s) => s.bloki).filter((b): b is Extract<BlokPdf, { typ: 'tabela' }> => b.typ === 'tabela');
const wartosci = (d: DokumentPdf) => d.sekcje.flatMap((s) => s.bloki).flatMap((b) => (b.typ === 'dane' ? b.pozycje : []));

describe('dokument PDF', () => {
  it('escapuje znaki HTML w treści', () => {
    assert.equal(escapeHtml('<b>"A&B"</b>'), '&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
    const html = htmlDokumentu({ tytul: 'T <x>', sekcje: [{ tytul: 'S', bloki: [tekst('a<b')] }] }, new Date(2026, 9, 17));
    assert.ok(html.includes('T &lt;x&gt;'));
    assert.ok(html.includes('<p>a&lt;b</p>'));
    assert.ok(!html.includes('<x>'));
  });

  it('pomija puste pozycje danych i linie tekstu', () => {
    const d = dane([{ etykieta: 'A', wartosc: '1' }, false, undefined, { etykieta: 'B', wartosc: '2' }]);
    assert.equal(d.typ === 'dane' && d.pozycje.length, 2);
    const t = tekst('x', '', undefined, false, 'y');
    assert.deepEqual(t.typ === 'tekst' && t.linie, ['x', 'y']);
  });

  it('tabela: kolumny liczbowe wyrównane do prawej, wiersz sumy, pusta tabela', () => {
    const html = htmlDokumentu({
      tytul: 'T',
      sekcje: [
        { tytul: 'A', bloki: [{ typ: 'tabela', naglowki: ['Nazwa', 'Kwota'], liczbowe: [1], wiersze: [['x', '10 zł']], suma: ['Razem', '10 zł'] }] },
        { tytul: 'B', bloki: [{ typ: 'tabela', naglowki: ['Nazwa'], wiersze: [] }] },
      ],
    });
    assert.ok(html.includes('<td class="l">10 zł</td>'));
    assert.ok(html.includes('<tr class="suma">'));
    assert.ok(html.includes('Brak pozycji.'));
  });
});

describe('dokumenty stron', () => {
  const raporty = [
    praca('r1', '2026-10-05', 300),
    praca('r2', '2026-10-06', 320),
    wolne('r3', '2026-10-07', 'UB'),
    praca('x', '2026-09-30', 999),
    { ...praca('obcy', '2026-10-05', 500), pracownikId: 'inny' },
  ];

  it('miesiąc pracownika: tylko jego raporty z miesiąca, UB z kwotą 0 zł', () => {
    const d = dokumentMiesiacaPracownika({
      pracownik, miesiac: '2026-10', raporty, budowy: [{ id: 'b1', kodBudowy: 'B-1', nazwaInwestycji: 'Droga' }], grupy: [],
    });
    assert.match(d.tytul, /Nowak/);
    const lista = tabele(d).find((t) => t.naglowki.includes('Data'));
    assert.ok(lista);
    assert.equal(lista.wiersze.length, 3);
    assert.ok(lista.wiersze.some((w) => w.some((k) => k.includes('B-1'))));
    assert.equal(d.podtytul, 'Podsumowanie miesiąca · 3 raporty');
    const ub = lista.wiersze.find((w) => w[0] === '07.10.2026');
    assert.ok(ub, 'wiersz UB');
    assert.deepEqual(ub.slice(-2).map((k) => k.replace(/\s|\u00A0/g, '')), ['0,00zł', '0,00zł']);
    const pozycje = wartosci(d);
    assert.equal(pozycje.find((p) => p.etykieta === 'Urlop bezpłatny UB')?.wartosc, '1 dzień');
    assert.equal(pozycje.find((p) => p.etykieta === 'Wypłata pracownika')?.wartosc.replace(/\s|\u00A0/g, ''), '620,00zł');
  });

  it('karta pracownika: tabela miesięcy bez cudzych raportów', () => {
    const d = dokumentPracownika({ pracownik, grupy: [{ id: 'g1', nazwa: 'Brygada A', createdAt: '', updatedAt: '' } as never], raporty });
    assert.equal(d.podtytul?.includes('Brygada A') || wartosci(d).some((p) => p.wartosc === 'Brygada A'), true);
    const miesiace = tabele(d).find((t) => t.naglowki.includes('Miesiąc'));
    assert.ok(miesiace);
    assert.equal(miesiace.wiersze.length, 2);
    assert.ok(!JSON.stringify(d).includes('500'));
  });
});
