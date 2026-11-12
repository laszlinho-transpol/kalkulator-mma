import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sumaPoszerzen,
  trojkat345,
  konfiguracjaStolu,
  obliczWskaznikRozkladarki,
  porownajGrubosc,
  wynikAutaMetry,
  bilansAutMetry,
  rozwiazMetryOdcinka,
} from './kalkulatoryMasiarza';

describe('konfiguracja stołu', () => {
  it('sumuje tylko dodatnie poszerzenia', () => {
    assert.equal(sumaPoszerzen([0.75, 0.75]), 1.5);
    assert.equal(sumaPoszerzen([0.75, 0, -1]), 0.75);
    assert.equal(sumaPoszerzen([]), 0);
  });

  it('liczy min/max: podstawa/max stołu + suma poszerzeń L i P', () => {
    const k = konfiguracjaStolu(2.5, 5, [0.75], [0.75]);
    assert.equal(k.stolPodstawowy, 2.5);
    assert.equal(k.szerMin, 4);
    assert.equal(k.szerMax, 6.5);
    assert.equal(k.poszL, 0.75);
    assert.equal(k.poszP, 0.75);
  });

  it('dodaje kolejne poszerzenie P2 tylko z jednej strony', () => {
    const k = konfiguracjaStolu(2.5, 5, [0.75, 0.5], [0.75]);
    assert.equal(k.szerMin, 4.5);
    assert.equal(k.szerMax, 7);
  });
});

describe('obliczWskaznikRozkladarki', () => {
  const baza = {
    wPodstawa: 2.5,
    wMaxStolu: 5,
    poszerzeniaL: [0.75],
    poszerzeniaP: [0.75],
    wDocelowa: 6,
    strona: 'lewa' as const,
    lLinka: 0.5,
  };

  it('dla przykładu ze schematu zwraca 3.5 / 2.25 / 0.5 m', () => {
    const wynik = obliczWskaznikRozkladarki(baza);
    assert.equal(wynik.ok, true);
    if (!wynik.ok) return;
    assert.equal(wynik.wynik.odOsiM, 3.5);
    assert.equal(wynik.wynik.odGasiennicyM, 2.25);
    assert.equal(wynik.wynik.odPlozyM, 0.5);
    assert.equal(wynik.wynik.odOsiCm, 350);
    assert.equal(wynik.wynik.odGasiennicyCm, 225);
    assert.equal(wynik.wynik.odPlozyCm, 50);
    assert.equal(wynik.wynik.sumaSzerokosciM, 6);
    assert.equal(wynik.wynik.strona, 'Lewa');
  });

  it('prawa strona przy osiowym układaniu ma te same wymiary', () => {
    const wynik = obliczWskaznikRozkladarki({ ...baza, strona: 'prawa' });
    assert.equal(wynik.ok, true);
    if (!wynik.ok) return;
    assert.equal(wynik.wynik.odOsiM, 3.5);
    assert.equal(wynik.wynik.strona, 'Prawa');
  });

  it('odrzuca szerokość poza zakresem stołu', () => {
    const zaSzeroko = obliczWskaznikRozkladarki({ ...baza, wDocelowa: 7 });
    assert.equal(zaSzeroko.ok, false);
    if (zaSzeroko.ok) return;
    assert.match(zaSzeroko.blad, /6,50/);

    const zaWasko = obliczWskaznikRozkladarki({ ...baza, wDocelowa: 3 });
    assert.equal(zaWasko.ok, false);
  });

  it('odrzuca max stołu mniejszy od podstawy', () => {
    const wynik = obliczWskaznikRozkladarki({ ...baza, wMaxStolu: 2 });
    assert.equal(wynik.ok, false);
  });

  it('przyjmuje szerokość na krawędzi zakresu', () => {
    const min = obliczWskaznikRozkladarki({ ...baza, wDocelowa: 4 });
    const max = obliczWskaznikRozkladarki({ ...baza, wDocelowa: 6.5 });
    assert.equal(min.ok, true);
    assert.equal(max.ok, true);
  });
});

describe('trojkat345', () => {
  it('liczy pozostałe boki z dowolnego boku', () => {
    assert.deepEqual(trojkat345(6, 'a'), { mnoznik: 2, bokA: 6, bokB: 8, przeciwprostokatna: 10 });
    assert.deepEqual(trojkat345(10, 'b'), { mnoznik: 2.5, bokA: 7.5, bokB: 10, przeciwprostokatna: 12.5 });
    assert.deepEqual(trojkat345(15, 'c'), { mnoznik: 3, bokA: 9, bokB: 12, przeciwprostokatna: 15 });
  });
  it('przy zerze lub braku wartości wraca do 3-4-5 m', () => {
    assert.deepEqual(trojkat345(0, 'c'), { mnoznik: 1, bokA: 3, bokB: 4, przeciwprostokatna: 5 });
  });
});

const WARSTWA = { gruboscCm: 4, szerokoscM: 3.5, gestosc: 2.5 };
const auto = (tonaz: number, metry: number | null, warstwa = WARSTWA) => ({
  tonaz, metryWbudowane: metry, warstwa,
});

describe('metry z tony – kilka aut', () => {
  it('metry z założenia zostają, dopóki nie ma faktycznie wbudowanych metrów', () => {
    const wynik = wynikAutaMetry(auto(24.5, null));
    assert.equal(wynik.metryZalozenia, 70);
    assert.equal(wynik.powierzchniaM2, 245);
    assert.equal(wynik.uzyskanaCm, null);
    assert.equal(wynik.porownanie, null);
  });

  it('faktyczne metry dają grubość grubszą albo cieńszą niż założenie', () => {
    const grubsza = wynikAutaMetry(auto(24.5, 60));
    assert.ok(grubsza.porownanie);
    assert.equal(grubsza.porownanie?.ocena, 'grubsza');
    assert.ok((grubsza.uzyskanaCm ?? 0) > 4.2);

    const ciensza = wynikAutaMetry(auto(24.5, 80));
    assert.ok(Math.abs((ciensza.uzyskanaCm ?? 0) - 3.5) < 1e-9);
    assert.equal(ciensza.porownanie?.ocena, 'ciensza');
    assert.ok(Math.abs((ciensza.porownanie?.roznicaCm ?? 0) + 0.5) < 1e-9);
  });

  it('różnica do 0,2 cm nie dostaje strzałki, tak jak w LIVE', () => {
    assert.equal(porownajGrubosc(4.2, 4)?.ocena, 'rowna');
    assert.equal(porownajGrubosc(3.8, 4)?.ocena, 'rowna');
    assert.equal(porownajGrubosc(4.3, 4)?.ocena, 'grubsza');
    assert.equal(porownajGrubosc(3.7, 4)?.ocena, 'ciensza');
    assert.equal(porownajGrubosc(0, 4), null);
  });

  it('narastająco sumuje tonaż i metry, a średnią liczy z aut z wpisanymi metrami', () => {
    const bilans = bilansAutMetry([
      auto(24.5, 70),
      auto(24.5, 80),
      auto(10, null),
    ]);
    assert.equal(bilans.liczba, 3);
    assert.equal(bilans.tonaz, 59);
    assert.equal(bilans.metryWbudowane, 150);
    const metryTrzeciego = 10 / (4 / 100 * 3.5 * 2.5);
    assert.ok(Math.abs(bilans.metryZalozenia - (70 + 70 + metryTrzeciego)) < 1e-9);
    assert.equal(bilans.autaDoSredniej, 2);
    const oczekiwana = ((24.5 + 24.5) / (150 * 3.5 * 2.5)) * 100;
    assert.ok(bilans.uzyskanaCm != null);
    assert.ok(Math.abs((bilans.uzyskanaCm ?? 0) - oczekiwana) < 1e-9);
    assert.equal(bilans.porownanie?.ocena, 'ciensza');
  });

  it('średnia waży powierzchnią, gdy auta mają różne szerokości', () => {
    const bilans = bilansAutMetry([
      auto(10, 10, { gruboscCm: 4, szerokoscM: 2, gestosc: 2.5 }),
      auto(10, 10, { gruboscCm: 4, szerokoscM: 4, gestosc: 2.5 }),
    ]);
    assert.ok(Math.abs((bilans.uzyskanaCm ?? 0) - (800 / 60)) < 1e-9);
    assert.equal(bilans.porownanie?.ocena, 'grubsza');
  });

  it('od początku odcinka odejmuje metry poprzednich aut', () => {
    const [pierwsze, drugie, zaKrotkie] = rozwiazMetryOdcinka([
      { tryb: 'zAuta', wpisane: 70 },
      { tryb: 'odPoczatku', wpisane: 150 },
      { tryb: 'odPoczatku', wpisane: 100 },
    ]);
    assert.equal(pierwsze.zAuta, 70);
    assert.equal(pierwsze.odPoczatku, 70);
    assert.equal(drugie.zAuta, 80);
    assert.equal(drugie.odPoczatku, 150);
    assert.equal(drugie.przedPoprzednim, false);
    assert.equal(zaKrotkie.zAuta, null);
    assert.equal(zaKrotkie.przedPoprzednim, true);
  });
});
