import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, KonstrukcjaObszaru, ObszarObmiaru, OsBocznaPzt } from '../types';
import { domyslneWarstwyKonstrukcji, nowaKonstrukcja, pustyProjektBudowy } from './projektBudowy';
import { kluczPodswietlenia, kluczWidocznegoWyboru, kluczZapisuSasiedztwa, kmNaOsiBocznej, lancuchOsiBocznej, lokalizacjaObszaru, odcinkiObszaru, podzialListyKonstrukcji, przygotujProjekt, stronaObszaruGeometryczna, uzupelnijStronyObszarow } from './lokalizacjaObszaru';

function arkusz(obszary: ObszarObmiaru[], boczne: OsBocznaPzt[] = []): ArkuszPzt {
  return {
    id: 'a',
    nazwa: 'Ark. 1',
    zrodloNazwa: 'a.xfdf',
    kolejnosc: 1,
    kontynuacjaPoprzedniego: false,
    kilometrazPoczatkowyM: 1000,
    kilometrazKoncowyM: 1100,
    obszary,
    osTrasy: {
      wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      wierzcholkiM: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      dlugoscM: 100,
      kolor: '#000000',
    },
    osieBoczne: boczne,
  };
}

function prostokat(id: string, x0: number, x1: number, y0: number, y1: number): ObszarObmiaru {
  const w = [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
  return {
    id,
    nazwa: id,
    kolejnosc: 1,
    wierzcholkiPdf: w,
    wierzcholkiM: w,
    powierzchniaM2: Math.abs(x1 - x0) * Math.abs(y1 - y0),
    obwodM: 0,
    zrodloNazwa: 'a.xfdf',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('lokalizacja obszaru', () => {
  it('obszar wzdłuż czarnej osi dostaje odcinek od–do', () => {
    const obszar = prostokat('jezdnia', 20, 70, 0, 7);
    const lok = lokalizacjaObszaru(obszar, arkusz([obszar]));
    assert.equal(lok?.rodzaj, 'os');
    assert.equal(Math.round(lok?.kmTrasyOdM ?? 0), 1020);
    assert.equal(Math.round(lok?.kmTrasyDoM ?? 0), 1070);
    assert.match(lok?.tekst ?? '', /1\+020/);
    assert.match(lok?.tekst ?? '', /1\+070/);
  });

  it('niebieska prostopadła: 0+000 na końcu dalszym, styk jest końcem i lokalizacją na trasie', () => {
    const boczna: OsBocznaPzt = {
      id: 'nb',
      wierzcholkiPdf: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      wierzcholkiM: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      dlugoscM: 60,
      kolor: '#0000FF',
    };
    const obszar = prostokat('wjazd', 32, 48, -2, 62);
    const a = arkusz([obszar], [boczna]);
    const lancuch = lancuchOsiBocznej(boczna, a);
    assert.equal(lancuch?.prostopadla, true);
    assert.equal(Math.round(lancuch?.kmTrasyM ?? 0), 1040);
    assert.equal(Math.round(kmNaOsiBocznej(boczna, lancuch!, 0)), 60);
    assert.equal(Math.round(kmNaOsiBocznej(boczna, lancuch!, 60)), 0);
    const lok = lokalizacjaObszaru(obszar, a);
    assert.equal(lok?.rodzaj, 'boczna');
    assert.equal(Math.round(lok?.kmTrasyOdM ?? 0), 1040);
    assert.equal(Math.round(lok?.kmBocznaOdM ?? -1), 0);
    assert.equal(Math.round(lok?.kmBocznaDoM ?? 0), 60);
    const reczna: OsBocznaPzt = { ...boczna, pikietaWezla: { indeks: 1, kmM: 10 } };
    const lancuchR = lancuchOsiBocznej(reczna, a);
    assert.equal(Math.round(kmNaOsiBocznej(reczna, lancuchR!, 60)), 10);
    assert.equal(Math.round(kmNaOsiBocznej(reczna, lancuchR!, 0)), 70);
  });

  it('zmiana konstrukcji dzieli obszar na trzy odcinki 1, 1.1 i 1', () => {
    const obszar = prostokat('jezdnia', 0, 100, 0, 10);
    const a = arkusz([obszar]);
    const baza = nowaKonstrukcja('leg', 1);
    const konstrukcja: KonstrukcjaObszaru = {
      ...baza,
      warstwy: domyslneWarstwyKonstrukcji(),
      wyjatki: [{
        id: 'w1',
        numer: 1,
        kmOdM: 1050,
        kmDoM: 1060,
        warstwy: domyslneWarstwyKonstrukcji(),
      }],
    };
    const odcinki = odcinkiObszaru(obszar, a, konstrukcja);
    assert.equal(odcinki.length, 3);
    assert.deepEqual(odcinki.map((o) => o.numer), ['1', '1.1', '1']);
    assert.equal(Math.round(odcinki[0].kmOdM), 1000);
    assert.equal(Math.round(odcinki[0].kmDoM), 1050);
    assert.equal(Math.round(odcinki[1].kmOdM), 1050);
    assert.equal(Math.round(odcinki[1].kmDoM), 1060);
    assert.ok(odcinki[1].powierzchniaM2 > 0);
    assert.ok(odcinki[1].powierzchniaM2 < obszar.powierzchniaM2);
    assert.ok(odcinki[1].wierzcholkiPdf.length >= 3);
  });

  it('lewa strona wjazdu jest po lewej od niebieskiej osi w kierunku rosnącego kilometrażu', () => {
    const boczna: OsBocznaPzt = {
      id: 'nb',
      wierzcholkiPdf: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      wierzcholkiM: [{ x: 40, y: 0 }, { x: 40, y: 60 }],
      dlugoscM: 60,
      kolor: '#0000FF',
    };
    const lewy = prostokat('lewy', 36, 50, 20, 40);
    const prawy = prostokat('prawy', 30, 44, 20, 40);
    assert.equal(stronaObszaruGeometryczna(lewy, arkusz([lewy], [boczna])), 'lewa');
    assert.equal(stronaObszaruGeometryczna(prawy, arkusz([prawy], [boczna])), 'prawa');
  });

  it('uzupełnia stronę z geometrii i nie rusza własnej nazwy', () => {
    const zly = prostokat('zly', 10, 40, 2, 8);
    zly.nazwa = 'Trasa P';
    zly.stronaTrasy = 'prawa';
    zly.kolorWypelnienia = '#FFEE58';
    const wlasny = prostokat('wlasny', 50, 80, 2, 8);
    wlasny.nazwa = 'Jezdnia południe';
    wlasny.stronaTrasy = 'prawa';
    wlasny.kolorWypelnienia = '#FFEE58';
    const projekt = uzupelnijStronyObszarow({
      ...pustyProjektBudowy(1000),
      arkusze: [arkusz([zly, wlasny])],
      legenda: [{
        id: 'leg',
        kolor: '#FFEE58',
        typ: 'obszar',
        klucz: 'obszar|#FFEE58',
        nazwa: 'Trasa główna (strona prawa)',
      }],
    });
    const po = projekt.arkusze[0].obszary;
    assert.equal(po[0].stronaTrasy, 'lewa');
    assert.equal(po[0].nazwa, 'Trasa L');
    assert.equal(po[1].nazwa, 'Jezdnia południe');
    assert.equal(po[1].stronaTrasy, 'lewa');
    assert.equal(projekt.legenda[0].nazwa, 'Trasa główna (strona lewa)');
    assert.equal(uzupelnijStronyObszarow(projekt), projekt);
  });

  it('nazwa wjazdu to kilometraż przecięcia niebieskiej linii z czarną osią', () => {
    const boczna: OsBocznaPzt = {
      id: 'nb',
      wierzcholkiPdf: [{ x: 30, y: 20 }, { x: 50, y: -10 }],
      wierzcholkiM: [{ x: 30, y: 20 }, { x: 50, y: -10 }],
      dlugoscM: 36,
      kolor: '#0000FF',
    };
    const wjazd = prostokat('wjazd', 28, 55, -12, 22);
    wjazd.nazwa = 'Wjazd';
    wjazd.kolorWypelnienia = '#009300';
    const wlasny = prostokat('wlasny', 28, 55, -12, 22);
    wlasny.nazwa = 'Zjazd do posesji';
    wlasny.kolorWypelnienia = '#009300';
    const po = uzupelnijStronyObszarow({
      ...pustyProjektBudowy(1000),
      arkusze: [arkusz([wjazd, wlasny], [boczna])],
    });
    assert.equal(po.arkusze[0].obszary[0].nazwa, 'Wjazd 1+043');
    assert.equal(po.arkusze[0].obszary[1].nazwa, 'Zjazd do posesji');
    assert.equal(uzupelnijStronyObszarow(po), po);
  });

  it('niezapisany obszar tej samej strony podświetla zapis sąsiada', () => {
    const zapisany = prostokat('zapis', 0, 20, 2, 8);
    zapisany.kolorWypelnienia = '#FFEE58';
    zapisany.stronaTrasy = 'lewa';
    zapisany.konstrukcjaId = 'k-lewa';
    const obok = prostokat('obok', 40, 70, 2, 8);
    obok.kolorWypelnienia = '#FFEE58';
    obok.stronaTrasy = 'lewa';
    const prawa = prostokat('prawa', 40, 70, -8, -2);
    prawa.kolorWypelnienia = '#FFEE58';
    prawa.stronaTrasy = 'prawa';
    prawa.konstrukcjaId = 'k-prawa';
    const a = arkusz([zapisany, obok, prawa]);
    const projekt = { ...pustyProjektBudowy(1000), arkusze: [a] };
    assert.equal(kluczZapisuSasiedztwa(projekt, obok, a), 'k-lewa');
    assert.equal(kluczZapisuSasiedztwa(projekt, zapisany, a), undefined);
  });

  it('zapis lewej konstrukcji zostaje na obszarze wychodzącym na prawą stronę osi', () => {
    const lewa = prostokat('lewa', 0, 40, 2, 8);
    lewa.nazwa = 'Trasa L';
    lewa.kolorWypelnienia = '#FFEE58';
    lewa.stronaTrasy = 'lewa';
    lewa.konstrukcjaId = 'k-lewa';
    const prawa = prostokat('prawa', 0, 40, -8, -2);
    prawa.nazwa = 'Trasa P';
    prawa.kolorWypelnienia = '#FFEE58';
    prawa.stronaTrasy = 'prawa';
    prawa.konstrukcjaId = 'k-lewa';
    const wjazd = prostokat('wjazd', 50, 70, -6, 6);
    wjazd.nazwa = 'Wjazd 1+060';
    wjazd.kolorWypelnienia = '#009300';
    wjazd.stronaTrasy = 'prawa';
    wjazd.konstrukcjaId = 'k-wjazd';
    const legenda = [
      { id: 'leg-l', kolor: '#FFEE58', typ: 'obszar' as const, klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna (strona lewa)' },
      { id: 'leg-p', kolor: '#FFC0CB', typ: 'obszar' as const, klucz: 'obszar|#FFC0CB', nazwa: 'Trasa główna (strona prawa)' },
      { id: 'leg-w', kolor: '#009300', typ: 'obszar' as const, klucz: 'obszar|#009300', nazwa: 'Zjazdy' },
    ];
    const konstrukcje: KonstrukcjaObszaru[] = [
      { ...nowaKonstrukcja('leg-l', 2), id: 'k-lewa', obszarIds: ['lewa', 'prawa'] },
      { ...nowaKonstrukcja('leg-p', 1), id: 'k-prawa', obszarIds: [] },
      { ...nowaKonstrukcja('leg-w', 5), id: 'k-wjazd', obszarIds: ['wjazd'] },
    ];
    const projekt = {
      ...pustyProjektBudowy(1000),
      legenda,
      konstrukcje,
      arkusze: [arkusz([lewa, prawa, wjazd])],
    };
    const a = projekt.arkusze[0];
    const swiezy = prostokat('swiezy', 0, 40, -8, -2);
    swiezy.nazwa = 'Trasa P';
    swiezy.kolorWypelnienia = '#FFEE58';
    swiezy.stronaTrasy = 'prawa';
    assert.equal(kluczPodswietlenia(projekt, prawa, a), 'k-lewa');
    assert.equal(kluczPodswietlenia(projekt, swiezy, a), 'k-prawa');
    assert.equal(kluczPodswietlenia(projekt, lewa, a), 'k-lewa');
    assert.equal(kluczPodswietlenia(projekt, wjazd, a), 'k-wjazd');
    const po = przygotujProjekt(projekt);
    assert.equal(po.arkusze[0].obszary.find((o) => o.id === 'prawa')?.konstrukcjaId, 'k-lewa');
    assert.equal(po.arkusze[0].obszary.find((o) => o.id === 'lewa')?.konstrukcjaId, 'k-lewa');
    assert.equal(po.arkusze[0].obszary.find((o) => o.id === 'wjazd')?.konstrukcjaId, 'k-wjazd');
    assert.equal(przygotujProjekt(po), po);
  });

  it('ponowne wejście podświetla zapisany numer, a nie wybór z poprzedniego obszaru', () => {
    const konstrukcje: KonstrukcjaObszaru[] = [
      { ...nowaKonstrukcja('leg-p', 1), id: 'k-prawa' },
      { ...nowaKonstrukcja('leg-s', 4), id: 'k-sciezka' },
    ];
    assert.equal(kluczWidocznegoWyboru('k-sciezka', 'k-prawa', { obszarId: 'poprzedni', klucz: 'k-prawa' }, 'sciezka'), 'k-sciezka');
    assert.equal(kluczWidocznegoWyboru('k-sciezka', 'k-prawa', { obszarId: 'sciezka', klucz: 'k-prawa' }, 'sciezka'), 'k-prawa');
    const podzial = podzialListyKonstrukcji(konstrukcje, 'k-sciezka');
    assert.equal(podzial.zapisana?.id, 'k-sciezka');
    assert.deepEqual(podzial.inne.map((k) => k.id), ['k-prawa']);
  });
});
