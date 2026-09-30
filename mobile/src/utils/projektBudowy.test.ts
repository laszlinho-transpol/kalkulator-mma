import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DOMYSLNA_SKALA_PZT } from '../types';
import type { ArkuszPzt, Mieszanka, ObszarObmiaru, ProjektBudowy } from '../types';
import { parsujXfdfTekst } from './xfdfParser';
import {
  DOMYSLNY_KM_START_PZT,
  GESTOSC_KLSM_DOMYSLNA,
  GESTOSC_MMA_DOMYSLNA,
  arkuszZWynikuXfdf,
  czyLegendaUzupelniona,
  dodajArkuszeDoProjektu,
  domyslneWarstwyKonstrukcji,
  formatujKmM,
  gestoscWarstwy,
  kluczLegendy,
  normalizujKolorHex,
  obliczPrzedmiar,
  powierzchniaWarstwyZOdsadzka,
  pustyProjektBudowy,
  scalWiersze,
  sugerowanaNazwaLegendy,
  sumyMieszanek,
  tonyZPowierzchni,
  zastosujKilometrazArkuszy,
  zbierzLegendeZArkuszy,
} from './projektBudowy';

function prostokat(id: string, kolor: string, dlugoscM: number, szerM: number, nazwa: string): ObszarObmiaru {
  return {
    id,
    nazwa,
    kolejnosc: 1,
    wierzcholkiPdf: [
      { x: 0, y: szerM },
      { x: 0, y: 0 },
      { x: dlugoscM, y: 0 },
      { x: dlugoscM, y: szerM },
    ],
    wierzcholkiM: [
      { x: 0, y: szerM },
      { x: 0, y: 0 },
      { x: dlugoscM, y: 0 },
      { x: dlugoscM, y: szerM },
    ],
    powierzchniaM2: dlugoscM * szerM,
    obwodM: 2 * (dlugoscM + szerM),
    zrodloNazwa: 'test.xfdf',
    kolorWypelnienia: kolor,
    stronaTrasy: kolor === '#FFEE58' ? 'lewa' : kolor === '#FFC0CB' ? 'prawa' : undefined,
    bazaStart: { idxLewy: 0, idxPrawy: 1 },
    bazaKoniec: { idxLewy: 3, idxPrawy: 2 },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('projektBudowy', () => {
  it('normalizuje kolor i sugeruje nazwy L/P/krawężnik', () => {
    assert.equal(normalizujKolorHex('#ffee58'), '#FFEE58');
    assert.equal(normalizujKolorHex('#F00'), '#FF0000');
    assert.equal(sugerowanaNazwaLegendy('obszar', '#FFEE58'), 'Trasa główna (strona lewa)');
    assert.equal(sugerowanaNazwaLegendy('obszar', '#FFC0CB'), 'Trasa główna (strona prawa)');
    assert.equal(sugerowanaNazwaLegendy('linia', '#FF0000'), 'krawężnik (brak odsadzek)');
    assert.equal(kluczLegendy('obszar', '#ffee58'), 'obszar|#FFEE58');
  });

  it('ciągnie kilometraż arkuszy od 106+840', () => {
    const a1: ArkuszPzt = {
      id: 'a1',
      nazwa: 'ark1',
      zrodloNazwa: '1.xfdf',
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 0,
      obszary: [prostokat('l1', '#FFEE58', 400, 5, 'L'), prostokat('p1', '#FFC0CB', 400, 4, 'P')],
    };
    const a2: ArkuszPzt = {
      id: 'a2',
      nazwa: 'ark2',
      zrodloNazwa: '2.xfdf',
      kolejnosc: 2,
      kontynuacjaPoprzedniego: true,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 0,
      obszary: [prostokat('l2', '#FFEE58', 430, 5, 'L')],
    };
    const [s1, s2] = zastosujKilometrazArkuszy([a1, a2], DOMYSLNY_KM_START_PZT);
    assert.equal(s1.kilometrazPoczatkowyM, 106840);
    assert.equal(s1.kilometrazKoncowyM, 106840 + 400);
    assert.equal(formatujKmM(s1.kilometrazPoczatkowyM), '106+840');
    assert.equal(s2.kilometrazPoczatkowyM, s1.kilometrazKoncowyM);
    assert.equal(s2.kilometrazKoncowyM, 106840 + 400 + 430);
    assert.equal(s1.obszary[0].kilometrazStartKm, 106);
    assert.equal(s1.obszary[0].kilometrazStartM, 840);
  });

  it('zbiera legendę z obszarów i czerwonych linii, zachowując nazwy', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polygon interior-color="#FFC0CB"><vertices>0,20;0,0;100,0;100,20</vertices></polygon>
<polyline color="#FF0000" subject="Obwód"><vertices>0,40;100,40</vertices></polyline>
</xfdf>`;
    const arkusz = arkuszZWynikuXfdf(parsujXfdfTekst(xfdf, 'ark_2_1.xfdf'), {
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      skala: DOMYSLNA_SKALA_PZT,
    });
    const legenda = zbierzLegendeZArkuszy([arkusz]);
    const nazwy = legenda.map((w) => w.nazwa);
    assert.ok(nazwy.includes('Trasa główna (strona lewa)'));
    assert.ok(nazwy.includes('Trasa główna (strona prawa)'));
    assert.ok(nazwy.includes('krawężnik (brak odsadzek)'));
    assert.equal(czyLegendaUzupelniona(legenda), true);

    const druga = zbierzLegendeZArkuszy([arkusz], [
      { ...legenda[0], nazwa: 'Trasa L – ręcznie' },
    ]);
    const reczna = druga.find((w) => w.klucz === legenda[0].klucz);
    assert.equal(reczna?.nazwa, 'Trasa L – ręcznie');
  });

  it('dodaje kolejne XFDF jako kontynuację kilometrażu', () => {
    const xfdf = (n: string) => `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,28;0,0;2268,0;2268,28</vertices></polygon>
</xfdf>`;
    let projekt = pustyProjektBudowy(DOMYSLNY_KM_START_PZT);
    projekt = dodajArkuszeDoProjektu(projekt, [
      parsujXfdfTekst(xfdf('1'), 'DK25_2_1.xfdf'),
      parsujXfdfTekst(xfdf('2'), 'DK25_2_2.xfdf'),
    ]);
    assert.equal(projekt.arkusze.length, 2);
    assert.equal(projekt.arkusze[0].kontynuacjaPoprzedniego, false);
    assert.equal(projekt.arkusze[1].kontynuacjaPoprzedniego, true);
    assert.ok(projekt.arkusze[1].kilometrazPoczatkowyM > projekt.arkusze[0].kilometrazPoczatkowyM);
    assert.equal(projekt.arkusze[1].kilometrazPoczatkowyM, projekt.arkusze[0].kilometrazKoncowyM);
  });

  it('przedmiar: m² + t z odsadzką i scaleniem L+P', () => {
    const warstwy = domyslneWarstwyKonstrukcji();
    const l = prostokat('l', '#FFEE58', 400, 5, 'L');
    l.kilometrazStartKm = 106;
    l.kilometrazStartM = 840;
    l.kilometrazKoniecKm = 107;
    l.kilometrazKoniecM = 240;
    const p = prostokat('p', '#FFC0CB', 400, 4, 'P');
    p.kilometrazStartKm = 106;
    p.kilometrazStartM = 840;
    p.kilometrazKoniecKm = 107;
    p.kilometrazKoniecM = 240;

    const projekt: ProjektBudowy = {
      kilometrazPoczatkowyM: DOMYSLNY_KM_START_PZT,
      skala: DOMYSLNA_SKALA_PZT,
      arkusze: [{
        id: 'a1', nazwa: 'a1', zrodloNazwa: 'a1.xfdf', kolejnosc: 1,
        kontynuacjaPoprzedniego: false,
        kilometrazPoczatkowyM: 106840, kilometrazKoncowyM: 107240,
        obszary: [l, p],
      }],
      legenda: [
        { id: 'legL', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna (strona lewa)' },
        { id: 'legP', kolor: '#FFC0CB', typ: 'obszar', klucz: 'obszar|#FFC0CB', nazwa: 'Trasa główna (strona prawa)' },
      ],
      konstrukcje: [
        { legendaId: 'legL', warstwy, wyjatki: [] },
        { legendaId: 'legP', warstwy: warstwy.map((w) => ({ ...w, id: w.id + 'p' })), wyjatki: [] },
      ],
      scaloneWiersze: [],
    };

    const wiersze = obliczPrzedmiar(projekt);
    assert.equal(wiersze.length, 2);
    const lewy = wiersze.find((w) => w.id === 'legL')!;
    const sma = lewy.warstwy.find((w) => w.kategoria === 'sma')!;
    const wiaz = lewy.warstwy.find((w) => w.kategoria === 'wiazaca')!;
    const klsm = lewy.warstwy.find((w) => w.kategoria === 'klsm')!;

    assert.equal(sma.powierzchniaM2, 2000);
    assert.equal(sma.tony, tonyZPowierzchni(2000, 4, GESTOSC_MMA_DOMYSLNA));
    const powWiaz = powierzchniaWarstwyZOdsadzka(2000, 400, 7);
    assert.equal(wiaz.powierzchniaM2, powWiaz);
    assert.equal(wiaz.tony, tonyZPowierzchni(powWiaz, 6, GESTOSC_MMA_DOMYSLNA));
    const powKlsm = powierzchniaWarstwyZOdsadzka(2000, 400, 25);
    assert.equal(klsm.powierzchniaM2, powKlsm);
    assert.equal(klsm.tony, tonyZPowierzchni(powKlsm, 20, GESTOSC_KLSM_DOMYSLNA));

    const scalony = obliczPrzedmiar(scalWiersze(projekt, ['legL', 'legP'], 'Trasa główna'));
    assert.equal(scalony.length, 1);
    assert.equal(scalony[0].nazwa, 'Trasa główna');
    assert.equal(scalony[0].powierzchniaObrysuM2, 3600);
    const smaS = scalony[0].warstwy.find((w) => w.kategoria === 'sma')!;
    assert.equal(smaS.powierzchniaM2, 3600);
  });

  it('sumuje tę samą mieszankę przy różnych grubościach', () => {
    const mix: Mieszanka = {
      id: 'm1', rodzaj: 'SMA8', ciezarObjetosciowy: 2.5,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const warstwa = (grubosc: number, mixId: string) => [{
      id: 'w' + grubosc, kolejnosc: 1, nazwa: 'SMA8', rodzajOpis: 'KR 3-7',
      gruboscCm: grubosc, odsadzkaCm: 0, kategoria: 'sma' as const, mieszankaIds: [mixId],
    }];
    const a = prostokat('a', '#FFEE58', 100, 10, 'trasa');
    const b = prostokat('b', '#00FF00', 50, 4, 'wjazd');
    const projekt: ProjektBudowy = {
      kilometrazPoczatkowyM: 0,
      skala: DOMYSLNA_SKALA_PZT,
      arkusze: [{
        id: 'x', nazwa: 'x', zrodloNazwa: 'x.xfdf', kolejnosc: 1,
        kontynuacjaPoprzedniego: false, kilometrazPoczatkowyM: 0, kilometrazKoncowyM: 100,
        obszary: [a, b],
      }],
      legenda: [
        { id: 't', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa' },
        { id: 'w', kolor: '#00FF00', typ: 'obszar', klucz: 'obszar|#00FF00', nazwa: 'Wjazd' },
      ],
      konstrukcje: [
        { legendaId: 't', warstwy: warstwa(8, 'm1'), wyjatki: [] },
        { legendaId: 'w', warstwy: warstwa(4, 'm1'), wyjatki: [] },
      ],
      scaloneWiersze: [],
    };
    const wiersze = obliczPrzedmiar(projekt, [mix]);
    const sumy = sumyMieszanek(wiersze, [mix]);
    assert.equal(sumy.length, 1);
    assert.equal(sumy[0].mieszankaId, 'm1');
    assert.equal(sumy[0].powierzchniaM2, 1000 + 200);
    assert.equal(sumy[0].tony, tonyZPowierzchni(1000, 8, 2.5) + tonyZPowierzchni(200, 4, 2.5));
    assert.equal(sumy[0].gruboscWazonaCm, 7.33);
  });

  it('gęstość: recepta / MMA 2.45 / KŁSM 2.0', () => {
    assert.equal(gestoscWarstwy({
      id: '1', kolejnosc: 1, nazwa: 'SMA', rodzajOpis: '', gruboscCm: 4, odsadzkaCm: 0,
      kategoria: 'sma', mieszankaIds: ['m1'],
    }, [{ id: 'm1', ciezarObjetosciowy: 2.511 }]), 2.511);
    assert.equal(gestoscWarstwy({
      id: '2', kolejnosc: 4, nazwa: 'KŁSM', rodzajOpis: '', gruboscCm: 20, odsadzkaCm: 0,
      kategoria: 'klsm', mieszankaIds: [],
    }, []), GESTOSC_KLSM_DOMYSLNA);
    assert.equal(gestoscWarstwy({
      id: '3', kolejnosc: 2, nazwa: 'Wiążąca', rodzajOpis: '', gruboscCm: 6, odsadzkaCm: 0,
      kategoria: 'wiazaca', mieszankaIds: [],
    }, []), GESTOSC_MMA_DOMYSLNA);
  });
});
