import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sumaPoszerzen,
  konfiguracjaStolu,
  obliczWskaznikRozkladarki,
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
    assert.match(zaSzeroko.blad, /6\.50/);

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
