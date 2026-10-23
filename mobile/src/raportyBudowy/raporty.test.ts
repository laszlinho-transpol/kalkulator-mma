import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  etykietaMiesiaca, gruboscZMasy, kwotaPrzerzutu, kwotaRozliczeniaTransportu, kwotaSamochodow, kwotaTransportu, linkTrasy,
  materialyRaportu, wzorRozliczeniaTransportu,
  miesiaceRaportow, podsumowanieDnia, przerobRaportu, raportyMiesiaca, robociznaDnia, statystykiRaportow, sumaPrzerobu,
  warstwyBudowy,
} from './raporty';
import { nowaWarstwa } from '../utils/projektBudowy';
import type { RaportDzienny, PozycjaRaportu } from './typy';
import type { RaportPracownika, RaportSprzetu } from '../budzet/typy';

const raport = (data: string, zmiany: Partial<RaportDzienny> = {}): RaportDzienny => ({
  id: data,
  budowaId: 'b1',
  data,
  pozycje: [],
  cenyMaterialu: {},
  materialyDodatkowe: [],
  przerzuty: [],
  samochody: [],
  zatwierdzonePracownicy: [],
  zatwierdzonySprzet: [],
  createdAt: `${data}T10:00:00.000Z`,
  updatedAt: `${data}T10:00:00.000Z`,
  ...zmiany,
});

const pozycja = (zmiany: Partial<PozycjaRaportu>): PozycjaRaportu => ({
  id: 'p',
  warstwaKlucz: 'sma8|4',
  warstwaNazwa: 'SMA8',
  kategoria: 'sma',
  gruboscProjCm: 4,
  gestoscTm3: 2.5,
  ilosc: 0,
  odcinki: [],
  ...zmiany,
});

const odcinek = (powierzchniaM2: number, kmOdM = 0, kmDoM = 100) => ({
  id: String(powierzchniaM2), legendaId: 'l', nazwa: 'trasa', kmOdM, kmDoM, powierzchniaM2,
});

describe('raporty dzienne budowy', () => {
  it('miesiące tylko z raportami, od najnowszego, i statystyki', () => {
    const lista = [raport('2025-04-02'), raport('2025-06-10'), raport('2025-04-20'), raport('2024-12-31')];
    assert.deepEqual(miesiaceRaportow(lista), [
      { klucz: '2025-06', etykieta: 'Czerwiec 2025', liczba: 1 },
      { klucz: '2025-04', etykieta: 'Kwiecień 2025', liczba: 2 },
      { klucz: '2024-12', etykieta: 'Grudzień 2024', liczba: 1 },
    ]);
    assert.deepEqual(raportyMiesiaca(lista, '2025-04').map((r) => r.data), ['2025-04-20', '2025-04-02']);
    assert.deepEqual(statystykiRaportow(lista), { liczba: 4, od: '2024-12-31', do: '2025-06-10' });
    assert.deepEqual(statystykiRaportow([]), { liczba: 0 });
    assert.equal(etykietaMiesiaca('2025-04'), 'Kwiecień 2025');
  });

  it('warstwy z konstrukcji i zmian konstrukcji z odcinkami', () => {
    const sma = nowaWarstwa({ nazwa: 'SMA8', kolejnosc: 1, gruboscCm: 4, kategoria: 'sma', mieszankaIds: ['m1'] });
    const klsm = nowaWarstwa({ nazwa: 'KŁSM', kolejnosc: 4, gruboscCm: 20, kategoria: 'klsm' });
    const opcje = warstwyBudowy({
      legenda: [
        { id: 'L', kolor: '#f00', typ: 'obszar', klucz: 'a', nazwa: 'trasa główna strona lewa' },
        { id: 'P', kolor: '#0f0', typ: 'obszar', klucz: 'b', nazwa: 'trasa główna strona prawa' },
      ],
      konstrukcje: [
        { legendaId: 'L', warstwy: [klsm, sma], wyjatki: [] },
        {
          legendaId: 'P',
          warstwy: [{ ...sma, mieszankaIds: ['m2'] }],
          wyjatki: [{ id: 'w1', opis: 'zatoka', kmOdM: 2000, kmDoM: 1500, warstwy: [{ ...sma, mieszankaIds: [] }] }],
        },
      ],
    });
    assert.deepEqual(opcje.map((o) => o.nazwa), ['SMA8', 'KŁSM']);
    assert.deepEqual(opcje[0].mieszankaIds, ['m1', 'm2']);
    assert.deepEqual(opcje[0].odcinki, [
      { legendaId: 'L', nazwa: 'trasa główna strona lewa' },
      { legendaId: 'P', nazwa: 'trasa główna strona prawa' },
      { legendaId: 'P', wyjatekId: 'w1', nazwa: 'trasa główna strona prawa · zatoka', kmOdM: 1500, kmDoM: 2000 },
    ]);
  });

  it('przerób osobno dla każdej recepty i wychodząca grubość', () => {
    assert.equal(gruboscZMasy(100, 1000, 2.5), 4);
    assert.equal(gruboscZMasy(0, 1000, 2.5), undefined);
    const r = raport('2025-04-02', {
      pozycje: [
        pozycja({ id: '1', mieszankaId: 'm1', ilosc: 60, odcinki: [odcinek(400), odcinek(200, 100, 150)] }),
        pozycja({ id: '2', mieszankaId: 'm1', ilosc: 40, odcinki: [odcinek(400)] }),
        pozycja({ id: '3', mieszankaId: 'm2', ilosc: 50, odcinki: [odcinek(500)] }),
      ],
    });
    const wiersze = przerobRaportu(r);
    assert.equal(wiersze.length, 2);
    assert.deepEqual(
      { ilosc: wiersze[0].ilosc, m2: wiersze[0].powierzchniaM2, dl: wiersze[0].dlugoscM, odc: wiersze[0].liczbaOdcinkow, g: wiersze[0].gruboscCm },
      { ilosc: 100, m2: 1000, dl: 250, odc: 3, g: 4 },
    );
    assert.equal(wiersze[1].gruboscCm, 4);
    assert.deepEqual(sumaPrzerobu(wiersze), { ilosc: 150, powierzchniaM2: 1500 });
  });

  it('materiał: cena z recepty na dzień, zmieniona w raporcie i materiał dodatkowy', () => {
    const r = raport('2025-04-02', {
      pozycje: [
        pozycja({ id: '1', mieszankaId: 'm1', mieszankaNazwa: 'SMA8 · 1/25', ilosc: 10 }),
        pozycja({ id: '2', mieszankaId: 'm2', warstwaNazwa: 'Wiążąca', ilosc: 5 }),
        pozycja({ id: '3', mieszankaId: 'm1', ilosc: 2.5 }),
      ],
      cenyMaterialu: { m2: 250 },
      materialyDodatkowe: [{ id: 'd', nazwa: 'Emulsja', ilosc: 200, jednostka: 'kg', cena: 3.5 }],
    });
    const mieszanki = [
      { id: 'm1', cena: 300, historiaCen: [{ id: 'h', od: '2025-04-01', do: '2025-04-30', stawki: { cena: 320 } }] },
      { id: 'm2', cena: 280 },
    ];
    const wiersze = materialyRaportu(r, mieszanki);
    assert.deepEqual(wiersze.map((w) => [w.nazwa, w.ilosc, w.cena, w.zmieniona, w.kwota]), [
      ['SMA8 · 1/25', 12.5, 320, false, 4000],
      ['Wiążąca', 5, 250, true, 1250],
      ['Emulsja', 200, 3.5, false, 700],
    ]);
  });

  it('transport: rozliczenia łączone w jednym wpisie, godzinowa i stary zapis', () => {
    assert.equal(kwotaRozliczeniaTransportu({ rodzaj: 'km', stawka: 5, km: 30 }, 4), 600);
    assert.equal(kwotaRozliczeniaTransportu({ rodzaj: 'kurs', stawka: 350 }, 6), 2100);
    assert.equal(kwotaRozliczeniaTransportu({ rodzaj: 'tkm', stawka: 0.5, tony: 200, km: 25 }, 8), 2500);
    assert.equal(kwotaRozliczeniaTransportu({ rodzaj: 'godz', stawka: 180, godziny: 3.5 }, 8), 630);
    assert.equal(kwotaPrzerzutu({ rozliczenia: [{ rodzaj: 'km', stawka: 12, km: 45 }, { rodzaj: 'godz', stawka: 150, godziny: 2 }] }), 840);
    assert.equal(kwotaPrzerzutu({ stawka: 12, km: 45 } as never), 540);
    assert.equal(kwotaSamochodow({
      kursy: 6, rozliczenia: [{ rodzaj: 'kurs', stawka: 350 }, { rodzaj: 'godz', stawka: 120, godziny: 1.5 }],
    }), 2280);
    assert.equal(kwotaSamochodow({ kursy: 4, rozliczenie: 'km', stawka: 5, km: 30 } as never), 600);
    assert.equal(wzorRozliczeniaTransportu({ rodzaj: 'godz', stawka: 180, godziny: 3.5 }), '180 zł/h × 3,5 h = 630,00 zł');
    const r = raport('2025-04-02', {
      przerzuty: [{ id: 'p', firma: 'X', rozliczenia: [{ rodzaj: 'km', stawka: 12, km: 45 }], trasa: 'A - B', ladunek: 'rozściełacz' }],
      samochody: [{ id: 's', typ: 'wanna', kursy: 6, rozliczenia: [{ rodzaj: 'kurs', stawka: 350 }] }],
    });
    assert.equal(kwotaTransportu(r), 2640);
  });

  it('link trasy Google Maps', () => {
    assert.equal(
      linkTrasy('Inowrocław - Mąkowarsko'),
      'https://www.google.com/maps/dir/?api=1&origin=Inowroc%C5%82aw&destination=M%C4%85kowarsko',
    );
    assert.equal(
      linkTrasy('A – B – C'),
      'https://www.google.com/maps/dir/?api=1&origin=A&destination=C&waypoints=B',
    );
    assert.equal(linkTrasy('  '), undefined);
  });

  it('robocizna: raporty z dnia i budowy, kwota tylko zatwierdzonych', () => {
    const rp = (id: string, data: string, budowaId: string, kwota: number) => ({ id, data, budowaId, kwota } as RaportPracownika);
    const rs = (id: string, data: string, budowaId: string, kwota: number) => ({ id, data, budowaId, kwota } as RaportSprzetu);
    const r = raport('2025-04-02', { zatwierdzonePracownicy: ['a'], zatwierdzonySprzet: ['x', 'y'] });
    const wynik = robociznaDnia(
      r,
      [rp('a', '2025-04-02', 'b1', 400), rp('b', '2025-04-02', 'b1', 300), rp('c', '2025-04-02', 'b2', 999), rp('d', '2025-04-03', 'b1', 999)],
      [rs('x', '2025-04-02', 'b1', 1200), rs('z', '2025-04-01', 'b1', 999)],
    );
    assert.deepEqual(wynik.pracownicy.map((p) => p.id), ['a', 'b']);
    assert.deepEqual(wynik.sprzet.map((p) => p.id), ['x']);
    assert.equal(wynik.kwotaPracownikow, 400);
    assert.equal(wynik.kwotaSprzetu, 1200);
    const dzien = podsumowanieDnia(
      { ...r, samochody: [{ id: 's', typ: 'oska', kursy: 2, rozliczenia: [{ rodzaj: 'kurs', stawka: 100 }] }] },
      [],
      [rp('a', '2025-04-02', 'b1', 400)],
      [rs('x', '2025-04-02', 'b1', 1200)],
    );
    assert.deepEqual(dzien, { material: 0, transport: 200, robocizna: 1600, razem: 1800 });
  });
});
