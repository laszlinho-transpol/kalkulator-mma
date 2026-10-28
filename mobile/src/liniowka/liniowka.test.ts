import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, ElementSzkicu, ProjektBudowy, Punkt2D, WarstwaKonstrukcji } from '../types';
import type { RaportDzienny } from '../raportyBudowy/typy';
import { poleZamalowaniaPdf, wypelnijDoKrawedzi } from './rasterSzkicu';
import {
  dociagnijDoObszaru,
  dodajWarstweWlasna,
  dodajWezel,
  elementPodPunktem,
  elementZLamanej,
  kategoriaLiniowki,
  klipSzkicu,
  kluczWarstwyLiniowki,
  lukPrzezPunkt,
  obrysLamanej,
  pustaLamana,
  srodekKrawedzi,
  ustawLuk,
  usunOstatniWezel,
  obszaryWarstwy,
  powierzchnieSzkicu,
  posortujDoRysowania,
  przywrocKoloryDomyslne,
  segmentyLiniowki,
  stacjeZnakowInfo,
  szukajPoDacie,
  szukajPoKm,
  ustawKolorWarstwy,
  warstwyLiniowki,
  najmniejszyWielokatPodPunktem,
  obszarPodTapnieciem,
  wymazGumka,
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

  const zakres = { minX: -20, minY: -20, maxX: 40, maxY: 40 };
  const pas: Punkt2D[] = [{ x: -10, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }, { x: -10, y: 10 }];

  it('wiaderko wypełnia narysowany obrys jako plamę SVG', () => {
    const w = wypelnijDoKrawedzi({ elementy: [kwadrat], punkt: { x: 5, y: 5 }, kolor: '#0f0', krawedzie: [], zakres, liniaObszaruPdf: 0.1, maxBoku: 300 });
    const plama = w?.[1];
    assert.equal(plama?.plama, true);
    assert.equal(plama?.wypelnienie, '#0f0');
    const pole = poleZamalowaniaPdf([plama!]);
    // wnętrze kwadratu 10×10 bez połowy grubości kreski: ok. 9×9
    assert.ok(pole > 78 && pole < 100, `pole ${pole}`);
    assert.equal(wypelnijDoKrawedzi({ elementy: [kwadrat], punkt: { x: 25, y: 25 }, kolor: '#0f0', krawedzie: [], zakres, liniaObszaruPdf: 0.1 }), null);
  });

  it('wiaderko zatrzymuje się na liniach szkicu i krawędziach obszaru', () => {
    const kreska = (x: number): ElementSzkicu => ({ id: `k${x}`, kolor: '#f00', gruboscPdf: 0.4, punktyPdf: [{ x, y: -5 }, { x, y: 15 }] });
    const w = wypelnijDoKrawedzi({
      elementy: [kreska(0), kreska(20)], punkt: { x: 10, y: 5 }, kolor: '#00f', krawedzie: [pas], dozwolone: [pas], zakres, liniaObszaruPdf: 0.1, maxBoku: 400,
    });
    const plama = w!.find((e) => e.plama)!;
    const pole = poleZamalowaniaPdf([plama]);
    assert.ok(pole > 180 && pole < 225, `pole ${pole}`);
    assert.equal(wypelnijDoKrawedzi({
      elementy: [], punkt: { x: 10, y: 25 }, kolor: '#00f', krawedzie: [pas], dozwolone: [pas], zakres, liniaObszaruPdf: 0.1,
    }), null);
  });

  it('pole kreski przycięte do obszaru warstwy i przeliczone na m²', () => {
    const arkusz = {
      id: 'a1', nazwa: 'A', zrodloNazwa: '', kolejnosc: 1, kontynuacjaPoprzedniego: false, kilometrazPoczatkowyM: 0, kilometrazKoncowyM: 100,
      obszary: [{ id: 'o1', nazwa: 'Trasa P', kolejnosc: 1, wierzcholkiPdf: pas, wierzcholkiM: [], powierzchniaM2: 1600, obwodM: 0, zrodloNazwa: '', kolorWypelnienia: '#FFEE58' }],
    } as ArkuszPzt;
    const p = { ...projekt, arkusze: [arkusz] };
    const klip = obszaryWarstwy(p, arkusz, 'wiazaca');
    assert.deepEqual(klip?.map((o) => o.id), ['o1']);
    assert.equal(obszaryWarstwy(p, arkusz, 'wlasna|x'), null);
    const kreska: ElementSzkicu = { id: 'k', kolor: '#f00', gruboscPdf: 2, punktyPdf: [{ x: 0, y: -10 }, { x: 0, y: 20 }] };
    const { razemM2, powierzchnie } = powierzchnieSzkicu([kreska], arkusz, klip);
    // 2 × 10 jednostek PDF w obszarze, skala 1600 m² / 400 PDF² = 4 m²/PDF²
    assert.ok(Math.abs(razemM2 - 80) < 6, `m² ${razemM2}`);
    assert.equal(powierzchnie[0].obszarNazwa, 'Trasa P');
    const bezKlipu = powierzchnieSzkicu([kreska], arkusz, null);
    assert.ok(bezKlipu.razemM2 > razemM2 * 2.5);
  });

  it('element pod punktem: plama i kreska', () => {
    const plama: ElementSzkicu = { id: 'p', kolor: '#0f0', gruboscPdf: 0, plama: true, wypelnienie: '#0f0', punktyPdf: pas };
    assert.equal(elementPodPunktem([kwadrat, plama], { x: 20, y: 5 }, 0.5)?.id, 'p');
    assert.equal(elementPodPunktem([kwadrat], { x: 10.2, y: 5 }, 0.5)?.id, 'e1');
    assert.equal(elementPodPunktem([kwadrat], { x: 50, y: 50 }, 0.5), undefined);
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

describe('liniówka – warstwy z konstrukcji', () => {
  it('ścieralna: SMA, AC8S, AC11S; wiążąca: AC11W, AC16W każde KR; MCE osobno', () => {
    assert.equal(kategoriaLiniowki('inna', 'AC8S'), 'sma');
    assert.equal(kategoriaLiniowki('inna', 'AC 11 S'), 'sma');
    assert.equal(kategoriaLiniowki('sma', 'SMA 11'), 'sma');
    assert.equal(kategoriaLiniowki('inna', 'AC11W'), 'wiazaca');
    assert.equal(kategoriaLiniowki('podbudowa', 'AC16W KR1-2'), 'wiazaca');
    assert.equal(kategoriaLiniowki('wiazaca', 'AC16W KR 3-4'), 'wiazaca');
    assert.equal(kategoriaLiniowki('podbudowa', 'AC22P'), 'podbudowa');
    assert.equal(kategoriaLiniowki('podbudowa', 'MCE'), 'inna');
    assert.equal(kluczWarstwyLiniowki('klsm', 'MCE'), 'inna|mce');
    assert.equal(kategoriaLiniowki('inna', 'KŁSM 0/31,5'), 'klsm');
  });

  it('wyciąga każdą warstwę użytą w konstrukcjach i wyjątkach, ze składem', () => {
    const p: ProjektBudowy = {
      ...projekt,
      konstrukcje: [
        { legendaId: 'L1', warstwy: [warstwa(1, 'SMA 11', 'sma'), warstwa(2, 'AC16W KR3-4', 'wiazaca'), warstwa(3, 'MCE', 'podbudowa')], wyjatki: [] },
        {
          legendaId: 'L2',
          warstwy: [warstwa(1, 'AC11S', 'inna'), warstwa(2, 'AC16W KR1-2', 'podbudowa')],
          wyjatki: [{ id: 'x', kmOdM: 0, kmDoM: 10, warstwy: [warstwa(1, 'AC8S', 'sma'), warstwa(2, 'AC11W', 'wiazaca')] }],
        },
      ],
    };
    const w = warstwyLiniowki(p, [], { wszystkieGlowne: true });
    const k = Object.fromEntries(w.map((x) => [x.klucz, x]));
    assert.deepEqual(Object.keys(k).sort(), ['inna|mce', 'sma', 'wiazaca']);
    assert.deepEqual(k.sma.sklad, ['AC11S', 'AC8S', 'SMA 11']);
    assert.deepEqual(k.wiazaca.sklad, ['AC11W', 'AC16W KR1-2', 'AC16W KR3-4']);
    assert.equal(k['inna|mce'].nazwa, 'MCE');
    const pusty = warstwyLiniowki({ ...projekt, konstrukcje: [] }, [], { wszystkieGlowne: true });
    assert.equal(pusty.length, 4);
  });
});

describe('liniówka – obszar szkicu i linia łamana', () => {
  const kw: Punkt2D[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

  it('węzeł poza obszarem zatrzymuje się na granicy', () => {
    assert.deepEqual(dociagnijDoObszaru({ x: 5, y: 5 }, [kw]), { x: 5, y: 5 });
    assert.deepEqual(dociagnijDoObszaru({ x: 15, y: 5 }, [kw]), { x: 10, y: 5 });
    assert.deepEqual(dociagnijDoObszaru({ x: 5, y: -3 }, [kw]), { x: 5, y: 0 });
    assert.deepEqual(dociagnijDoObszaru({ x: 50, y: 50 }, null), { x: 50, y: 50 });
  });

  it('łuk przechodzi przez przeciągnięty środek krawędzi', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = lukPrzezPunkt(a, b, { x: 5, y: 4 })!;
    const m = srodekKrawedzi(a, b, c);
    assert.ok(Math.abs(m.x - 5) < 1e-9 && Math.abs(m.y - 4) < 1e-9);
    assert.equal(lukPrzezPunkt(a, b, { x: 5, y: 0.1 }, 0.5), null);
  });

  it('zamknięta łamana z łukiem daje wypełniony obszar z zapisanymi węzłami', () => {
    let l = pustaLamana();
    for (const p of [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]) l = dodajWezel(l, p);
    const prosty = elementZLamanej(l, '#f00')!;
    assert.equal(prosty.wypelnienie, '#f00');
    assert.equal(prosty.lamana?.wezly.length, 4);
    assert.equal(poleZamalowaniaPdf([prosty]) > 90, true);
    const wypukly = ustawLuk(l, 0, lukPrzezPunkt(l.wezly[0], l.wezly[1], { x: 5, y: -4 }));
    const obrys = obrysLamanej(wypukly);
    assert.ok(obrys.length > 20);
    assert.ok(Math.min(...obrys.map((p) => p.y)) < -3.5);
    assert.ok(poleZamalowaniaPdf([elementZLamanej(wypukly, '#f00')!]) > poleZamalowaniaPdf([prosty]) + 15);
    assert.equal(elementZLamanej(usunOstatniWezel(usunOstatniWezel(l)), '#f00'), null);
  });

  it('gumka usuwa całe wypełnienie, szkic widać tylko w wybranym obszarze', () => {
    const el = elementZLamanej([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }].reduce(dodajWezel, pustaLamana()), '#f00')!;
    assert.deepEqual(wymazGumka([el], { x: 7, y: 2 }, 0.5), []);
    assert.deepEqual(wymazGumka([el], { x: 50, y: 50 }, 0.5), [el]);
    const arkusz = {
      id: 'a1', nazwa: 'A', zrodloNazwa: '', kolejnosc: 1, kontynuacjaPoprzedniego: false, kilometrazPoczatkowyM: 0, kilometrazKoncowyM: 100,
      obszary: [
        { id: 'o1', nazwa: 'Trasa P', kolejnosc: 1, wierzcholkiPdf: kw, wierzcholkiM: [], powierzchniaM2: 100, obwodM: 0, zrodloNazwa: '', kolorWypelnienia: '#FFEE58' },
        { id: 'o2', nazwa: 'Trasa P2', kolejnosc: 2, wierzcholkiPdf: kw, wierzcholkiM: [], powierzchniaM2: 100, obwodM: 0, zrodloNazwa: '', kolorWypelnienia: '#FFEE58' },
      ],
    } as ArkuszPzt;
    assert.deepEqual(klipSzkicu(projekt, arkusz, { warstwaKlucz: 'sma', obszarId: 'o2' })?.map((o) => o.id), ['o2']);
    assert.deepEqual(klipSzkicu(projekt, arkusz, { warstwaKlucz: 'sma' })?.map((o) => o.id), ['o1', 'o2']);
  });

  it('stuknięcie w nakładające się obszary wybiera najmniejszy', () => {
    const duzy = { id: 'd', wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] };
    const maly = { id: 'm', wierzcholkiPdf: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }] };
    assert.equal(najmniejszyWielokatPodPunktem([duzy, maly], { x: 50, y: 50 })?.id, 'm');
    assert.equal(najmniejszyWielokatPodPunktem([maly, duzy], { x: 50, y: 50 })?.id, 'm');
    assert.equal(najmniejszyWielokatPodPunktem([duzy, maly], { x: 10, y: 10 })?.id, 'd');
  });

  it('niezapisany kawałek tej samej barwy otwiera zapisany obszar, inna barwa zostaje', () => {
    const duzy = {
      id: 'd', kolor: '#FFEE58', zapisany: true,
      wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    };
    const kawalek = {
      id: 'k', kolor: '#FFEE58', zapisany: false,
      wierzcholkiPdf: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }],
    };
    const wjazd = {
      id: 'w', kolor: '#009300', zapisany: false,
      wierzcholkiPdf: [{ x: 70, y: 70 }, { x: 90, y: 70 }, { x: 90, y: 90 }, { x: 70, y: 90 }],
    };
    assert.equal(obszarPodTapnieciem([duzy, kawalek], { x: 50, y: 50 })?.id, 'd');
    assert.equal(obszarPodTapnieciem([duzy, kawalek], { x: 10, y: 10 })?.id, 'd');
    assert.equal(obszarPodTapnieciem([duzy, wjazd], { x: 80, y: 80 })?.id, 'w');
  });
});
