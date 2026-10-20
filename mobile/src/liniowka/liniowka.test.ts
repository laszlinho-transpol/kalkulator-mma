import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ElementSzkicu, ProjektBudowy, WarstwaKonstrukcji } from '../types';
import type { RaportDzienny } from '../raportyBudowy/typy';
import {
  dodajWarstweWlasna,
  kluczWarstwyLiniowki,
  posortujDoRysowania,
  przywrocKoloryDomyslne,
  segmentyLiniowki,
  stacjeZnakowInfo,
  szukajPoDacie,
  szukajPoKm,
  ustawKolorWarstwy,
  warstwyLiniowki,
  wymazGumka,
  wypelnijWiadrem,
  zapiszWpisReczny,
} from './liniowka';

const warstwa = (kolejnosc: number, nazwa: string, kategoria: WarstwaKonstrukcji['kategoria']): WarstwaKonstrukcji => ({
  id: `w${kolejnosc}`, kolejnosc, nazwa, rodzajOpis: '', gruboscCm: 4, odsadzkaCm: 0, kategoria, mieszankaIds: [],
});

const projekt: ProjektBudowy = {
  kilometrazPoczatkowyM: 0,
  skala: { metrowNaJednostke: 1 } as unknown as ProjektBudowy['skala'],
  arkusze: [],
  legenda: [{ id: 'L1', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa P' }],
  konstrukcje: [{
    legendaId: 'L1',
    warstwy: [
      warstwa(1, 'SMA 11', 'sma'),
      warstwa(2, 'AC 16 W', 'wiazaca'),
      warstwa(3, 'AC 22 P', 'podbudowa'),
      warstwa(4, 'Skropienie', 'inna'),
      warstwa(5, 'KŁSM', 'klsm'),
    ],
    wyjatki: [],
  }],
  scaloneWiersze: [],
};

const raport = (id: string, data: string, pozycje: RaportDzienny['pozycje']): RaportDzienny => ({
  id, budowaId: 'b1', data, pozycje, cenyMaterialu: {}, materialyDodatkowe: [], przerzuty: [], samochody: [],
  zatwierdzonePracownicy: [], zatwierdzonySprzet: [], createdAt: data, updatedAt: data,
});

const pozycja = (id: string, nazwa: string, kategoria: WarstwaKonstrukcji['kategoria'], od: number, doM: number) => ({
  id, warstwaKlucz: nazwa, warstwaNazwa: nazwa, kategoria, gruboscProjCm: 4, mieszankaId: 'm1', mieszankaNazwa: 'R/1',
  gestoscTm3: 2.4, ilosc: 100, odcinki: [{ id: `o${id}`, legendaId: 'L1', nazwa: 'Trasa P', kmOdM: od, kmDoM: doM, powierzchniaM2: 500 }],
});

const raporty = [
  raport('r2', '2026-10-02', [pozycja('p2', 'SMA 11', 'sma', 106850, 107130)]),
  raport('r1', '2026-10-01', [pozycja('p1', 'AC 16 W', 'wiazaca', 106850, 107130), pozycja('p3', 'AC 22 P', 'podbudowa', 107000, 106500)]),
  { ...raport('rx', '2026-10-01', [pozycja('p9', 'AC 16 W', 'wiazaca', 0, 100)]), budowaId: 'inna' },
];

describe('liniówka – odcinki z raportów', () => {
  it('bierze tylko raporty tej budowy i zachowuje kierunek układania', () => {
    const seg = segmentyLiniowki(projekt, raporty, 'b1');
    assert.equal(seg.length, 3);
    const pod = seg.find((s) => s.kategoria === 'podbudowa')!;
    assert.equal(pod.kmOdM, 107000);
    assert.equal(pod.kmDoM, 106500);
    assert.equal(pod.raportId, 'r1');
  });

  it('rysuje od najniższej warstwy, ścieralna na wierzchu', () => {
    const seg = posortujDoRysowania(projekt, segmentyLiniowki(projekt, raporty, 'b1'));
    assert.deepEqual(seg.map((s) => s.kategoria), ['podbudowa', 'wiazaca', 'sma']);
  });

  it('ścieralna na wierzchu nawet przy innej kolejności w konstrukcji', () => {
    const p2: ProjektBudowy = {
      ...projekt,
      konstrukcje: [{ legendaId: 'L1', warstwy: [warstwa(3, 'SMA 11', 'sma'), warstwa(1, 'AC 16 W', 'wiazaca')], wyjatki: [] }],
    };
    const seg = posortujDoRysowania(p2, segmentyLiniowki(p2, raporty, 'b1'));
    assert.equal(seg[seg.length - 1].kategoria, 'sma');
  });

  it('dodaje wpisy ręczne z komentarzem', () => {
    const p = zapiszWpisReczny(projekt, {
      id: 'w1', data: '2026-10-03', komentarz: 'Firma X', powierzchnieM2: [321], createdAt: '', updatedAt: '',
      zakladki: [{ id: 'z1', legendaId: 'L1', obszarNazwa: 'Trasa P', warstwaNazwa: 'Skropienie', warstwaKategoria: 'inna', kilometrazOdM: 100, kilometrazDoM: 200, odsadzkaLewaCm: 0, odsadzkaPrawaCm: 0, mieszankaId: '', grubosciCm: [4] }],
    });
    const r = segmentyLiniowki(p, [], 'b1').find((s) => s.zrodlo === 'reczny')!;
    assert.equal(r.komentarz, 'Firma X');
    assert.equal(r.powierzchniaM2, 321);
    assert.equal(r.klucz, 'inna|skropienie');
  });
});

describe('liniówka – znaki i wyszukiwanie', () => {
  it('znak „i” co ok. 200 m, krótki odcinek ma jeden', () => {
    assert.deepEqual(stacjeZnakowInfo(0, 120), [60]);
    assert.deepEqual(stacjeZnakowInfo(400, 0), [100, 300]);
    assert.equal(stacjeZnakowInfo(106850, 107130).length, 1);
    assert.equal(stacjeZnakowInfo(0, 1000).length, 5);
  });

  it('szuka po kilometrażu i po dacie', () => {
    const seg = segmentyLiniowki(projekt, raporty, 'b1');
    assert.deepEqual(szukajPoKm(seg, 106900).map((s) => s.data), ['2026-10-01', '2026-10-01', '2026-10-02']);
    assert.deepEqual(szukajPoKm(seg, 107100).map((s) => s.kategoria), ['wiazaca', 'sma']);
    assert.equal(szukajPoDacie(seg, '2026-10-02').length, 1);
  });
});

describe('liniówka – kolory warstw', () => {
  it('domyślne kolory i krycie wg kategorii', () => {
    const w = warstwyLiniowki(projekt);
    const k = Object.fromEntries(w.map((x) => [x.klucz, x]));
    assert.equal(k.sma.krycie, 0.9);
    assert.equal(k.wiazaca.krycie, 0.7);
    assert.equal(k.podbudowa.krycie, 0.5);
    assert.equal(k.klsm.krycie, 0.3);
    assert.equal(k[kluczWarstwyLiniowki('inna', 'Skropienie')].krycie, 0.2);
    assert.equal(k.sma.kolor, '#16A34A');
  });

  it('zmiana koloru i powrót do domyślnych; własna warstwa zostaje', () => {
    let p = ustawKolorWarstwy(projekt, 'sma', { kolor: '#000000', krycie: 0.4 });
    const wl = dodajWarstweWlasna(p, 'Frezowanie', 'opis', '#123456');
    p = wl.projekt;
    assert.equal(warstwyLiniowki(p).find((x) => x.klucz === 'sma')!.kolor, '#000000');
    p = przywrocKoloryDomyslne(p);
    assert.equal(warstwyLiniowki(p).find((x) => x.klucz === 'sma')!.kolor, '#16A34A');
    const wlasna = warstwyLiniowki(p).find((x) => x.klucz === wl.klucz)!;
    assert.equal(wlasna.kolor, '#123456');
    assert.equal(wlasna.nazwa, 'Frezowanie');
  });
});

describe('liniówka – szkic', () => {
  const kwadrat: ElementSzkicu = {
    id: 'e1', kolor: '#f00', gruboscPdf: 1,
    punktyPdf: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0.5 }],
  };

  it('wiaderko wypełnia obrys zawierający punkt', () => {
    const w = wypelnijWiadrem([kwadrat], { x: 5, y: 5 }, '#0f0');
    assert.equal(w?.[0].wypelnienie, '#0f0');
    assert.equal(wypelnijWiadrem([kwadrat], { x: 50, y: 5 }, '#0f0'), null);
  });

  it('gumka dzieli kreskę i usuwa wymazany fragment', () => {
    const linia: ElementSzkicu = { id: 'e2', kolor: '#f00', gruboscPdf: 1, punktyPdf: [0, 1, 2, 3, 4, 5, 6].map((x) => ({ x, y: 0 })) };
    const po = wymazGumka([linia], { x: 3, y: 0 }, 0.6);
    assert.equal(po.length, 2);
    assert.deepEqual(po.map((e) => e.punktyPdf.length), [3, 3]);
    assert.deepEqual(wymazGumka([linia], { x: 3, y: 50 }, 0.6), [linia]);
  });

  it('gumka przecina długi odcinek bez punktów w promieniu', () => {
    const linia: ElementSzkicu = { id: 'e3', kolor: '#f00', gruboscPdf: 1, punktyPdf: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }] };
    const po = wymazGumka([linia], { x: 5, y: 0.2 }, 1);
    assert.deepEqual(po.map((e) => e.punktyPdf.length), [2]);
    assert.deepEqual(po[0].punktyPdf[0], { x: 10, y: 0 });
  });
});
