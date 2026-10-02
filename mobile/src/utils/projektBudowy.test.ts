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
  powierzchniaWarstwyZOdsadzkami,
  pustyProjektBudowy,
  przesunArkusz,
  scalWiersze,
  sugerowanaNazwaLegendy,
  sumyMieszanek,
  tonyZPowierzchni,
  usunArkusz,
  zastosujKilometrazArkuszy,
  zbierzLegendeZArkuszy,
  zmienNazweArkusza,
  zmienNazweScalonegoWiersza,
  rozlaczWiersz,
  dlugoscArkuszaM,
  etykietaZakladkiArkusza,
  kluczArkuszaPzt,
  komunikatPoImporcieXfdf,
  zsynchronizujLegendeProjektu,
  sumaOsiTrasyM,
  podsumowanieOsiTrasy,
  odsadzkiWarstwy,
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
    assert.equal(sugerowanaNazwaLegendy('os', '#000000'), 'oś trasy');
    assert.equal(sugerowanaNazwaLegendy('obszar', '#4CAF50'), '');
    assert.equal(kluczLegendy('obszar', '#ffee58'), 'obszar|#FFEE58');
    assert.equal(kluczLegendy('os', '#000000'), 'os|#000000');
  });

  it('domyślny kilometraż pustego projektu to 0+000', () => {
    assert.equal(pustyProjektBudowy().kilometrazPoczatkowyM, 0);
    assert.equal(formatujKmM(0), '0+000');
    assert.equal(DOMYSLNY_KM_START_PZT, 0);
  });

  it('ciągnie kilometraż arkuszy od zadanego startu (np. 106+840)', () => {
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
    const [s1, s2] = zastosujKilometrazArkuszy([a1, a2], 106840);
    assert.equal(s1.kilometrazPoczatkowyM, 106840);
    assert.equal(s1.kilometrazKoncowyM, 106840 + 400);
    assert.equal(formatujKmM(s1.kilometrazPoczatkowyM), '106+840');
    assert.equal(s2.kilometrazPoczatkowyM, s1.kilometrazKoncowyM);
    assert.equal(s2.kilometrazKoncowyM, 106840 + 400 + 430);
    assert.equal(s1.obszary[0].kilometrazStartKm, 106);
    assert.equal(s1.obszary[0].kilometrazStartM, 840);
  });

  it('kilometraż arkusza to średnia osi L/P, nie max (dłuższa jezdnia / wyspy)', () => {
    const a1: ArkuszPzt = {
      id: 'a1',
      nazwa: 'ark1',
      zrodloNazwa: '1.xfdf',
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 0,
      obszary: [prostokat('l1', '#FFEE58', 400, 5, 'L'), prostokat('p1', '#FFC0CB', 430, 4, 'P')],
    };
    assert.equal(dlugoscArkuszaM(a1), 415);
    const [s1] = zastosujKilometrazArkuszy([a1], 106850);
    assert.equal(s1.kilometrazKoncowyM, 106850 + 415);
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

  it('legenda dopisuje oś i nowy kolor obszaru z kolejnego XFDF', () => {
    const xfdfOs = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>0,20;100,20</vertices>
</polyline>
</xfdf>`;
    let projekt = dodajArkuszeDoProjektu(pustyProjektBudowy(0), [
      parsujXfdfTekst(xfdfOs, 'inwestycja_Ark_2_1.xfdf'),
    ]);
    assert.ok(projekt.legenda.some((w) => w.typ === 'os' && w.nazwa === 'oś trasy'));
    assert.equal(dlugoscArkuszaM(projekt.arkusze[0]), 435.68);
    assert.ok(projekt.arkusze[0].osTrasy?.dlugoscEtykietaM);

    const xfdfZjazd = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#4CAF50"><vertices>0,10;0,0;40,0;40,10</vertices></polygon>
</xfdf>`;
    projekt = dodajArkuszeDoProjektu(projekt, [parsujXfdfTekst(xfdfZjazd, 'inwestycja_Ark_2_2.xfdf')]);
    const zjazd = projekt.legenda.find((w) => w.klucz === 'obszar|#4CAF50');
    assert.ok(zjazd);
    assert.equal(zjazd?.nazwa, '');
    assert.equal(projekt.konstrukcje.filter((k) => k.legendaId === zjazd?.id).length, 0);

    const zNazwa = {
      ...projekt,
      legenda: projekt.legenda.map((w) => w.id === zjazd!.id ? { ...w, nazwa: 'zjazd' } : w),
    };
    const zsync = zsynchronizujLegendeProjektu(zNazwa);
    assert.ok(zsync.konstrukcje.some((k) => k.legendaId === zjazd!.id));
  });

  it('zsynchronizujLegendeProjektu dopisuje oś do już wgranego projektu', () => {
    const projekt = pustyProjektBudowy(0);
    const zOsią: ProjektBudowy = {
      ...projekt,
      arkusze: [{
        id: 'a1',
        nazwa: 'a1',
        zrodloNazwa: 'a1.xfdf',
        kolejnosc: 1,
        kontynuacjaPoprzedniego: false,
        kilometrazPoczatkowyM: 0,
        kilometrazKoncowyM: 400,
        obszary: [prostokat('l1', '#FFEE58', 400, 5, 'L')],
        osTrasy: {
          wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
          wierzcholkiM: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
          dlugoscM: 400,
          kolor: '#000000',
        },
      }],
      legenda: [
        { id: 'legL', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna (strona lewa)' },
      ],
    };
    const next = zsynchronizujLegendeProjektu(zOsią);
    assert.ok(next.legenda.some((w) => w.typ === 'os' && w.klucz === 'os|#000000'));
    const drugi = zsynchronizujLegendeProjektu(next);
    assert.equal(drugi, next);
  });

  it('etykieta zakładki bierze numer arkusza, bez nazwy konkretnej inwestycji', () => {
    assert.equal(etykietaZakladkiArkusza('DK25M_kowarsko_Ark_2_1.xfdf'), 'Ark. 2_1');
    assert.equal(etykietaZakladkiArkusza('S5_Poznan_Arkusz_3_12.pdf'), 'Ark. 3_12');
    assert.equal(etykietaZakladkiArkusza('Ark_2_10.xfdf'), 'Ark. 2_10');
  });

  it('pikietaż sumuje etykiety osi, nie geometrię skali (kreska nie skraca)', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>0,20;100,20</vertices>
</polyline>
</xfdf>`;
    let projekt = pustyProjektBudowy(106850);
    projekt = dodajArkuszeDoProjektu(projekt, [
      parsujXfdfTekst(xfdf, 'a1.xfdf'),
      parsujXfdfTekst(xfdf, 'a2.xfdf'),
    ]);
    assert.ok(Math.abs(projekt.arkusze[0].kilometrazKoncowyM - (106850 + 435.68)) < 0.02);
    assert.ok(Math.abs(projekt.arkusze[1].kilometrazKoncowyM - (106850 + 435.68 * 2)) < 0.02);
    const geom = projekt.arkusze[0].osTrasy?.wierzcholkiM;
    assert.ok(geom && geom.length >= 2);
    assert.ok(Math.abs(sumaOsiTrasyM(projekt) - 435.68 * 2) < 0.05);
  });

  it('106+850 + etykiety osi = koniec trasy; kreska 1:500 jest rozciągana do wymiaru', () => {
    const xfdfKrotka = (etykieta: string) => `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;80,20;80,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents>${etykieta}</contents>
<vertices>0,20;80,20</vertices>
</polyline>
</xfdf>`;
    const projekt = dodajArkuszeDoProjektu(pustyProjektBudowy(106850), [
      parsujXfdfTekst(xfdfKrotka('435,68 m'), 'a1.xfdf'),
      parsujXfdfTekst(xfdfKrotka('422,07 m'), 'a2.xfdf'),
    ]);
    const suma = 435.68 + 422.07;
    const os = podsumowanieOsiTrasy(projekt);
    assert.equal(os.nEtykiet, 2);
    assert.ok(Math.abs(os.etykietyM - suma) < 0.02);
    assert.ok(Math.abs(os.kmM - suma) < 0.02);
    assert.ok(Math.abs(os.geomM - suma) < 0.05, `geometria trasy ${os.geomM} ≠ ${suma}`);
    assert.ok(Math.abs(projekt.arkusze[1].kilometrazKoncowyM - (106850 + suma)) < 0.05);
    assert.equal(formatujKmM(106850 + 9181), '116+031');
  });

  it('kolejny arkusz z osią narysowaną od końca ma rosnący km wzdłuż X', () => {
    const xfdfLtr = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents>400 m</contents>
<vertices>0,20;100,20</vertices>
</polyline>
</xfdf>`;
    const xfdfRtl = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents>400 m</contents>
<vertices>100,20;0,20</vertices>
</polyline>
<line color="#000000" style="dash" start="50,20" end="50,180"><contents>113,89 m</contents></line>
</xfdf>`;
    const projekt = dodajArkuszeDoProjektu(pustyProjektBudowy(106850), [
      parsujXfdfTekst(xfdfLtr, 'a1.xfdf'),
      parsujXfdfTekst(xfdfRtl, 'a2.xfdf'),
    ]);
    const os2 = projekt.arkusze[1].osTrasy?.wierzcholkiPdf ?? [];
    assert.ok(os2.length >= 2);
    assert.ok(os2[0].x < os2[os2.length - 1].x);
    assert.ok(os2.every((p) => p.y < 80));
    assert.ok(projekt.arkusze[1].kilometrazKoncowyM > projekt.arkusze[1].kilometrazPoczatkowyM);
    assert.equal(projekt.arkusze[1].kilometrazPoczatkowyM, projekt.arkusze[0].kilometrazKoncowyM);
  });

  it('odsadzki warstwy: L i P, stary zapis tylko jedną krawędź', () => {
    assert.deepEqual(odsadzkiWarstwy({ odsadzkaCm: 7 }), { lewa: 7, prawa: 0 });
    assert.deepEqual(odsadzkiWarstwy({ odsadzkaCm: 7, odsadzkaLewaCm: 7, odsadzkaPrawaCm: 7 }), { lewa: 7, prawa: 7 });
    assert.ok(Math.abs(powierzchniaWarstwyZOdsadzkami(2000, 400, 7, 7) - (2000 + 400 * 0.14)) < 0.02);
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

  it('ponowne wgranie tego samego arkusza zastępuje geometrię i bierze wymiar osi', () => {
    const xfdfBez = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;80,20;80,40</vertices></polygon>
<polyline color="#000000" style="dash"><vertices>0,20;80,20</vertices></polyline>
</xfdf>`;
    const xfdfWymiar = (etykieta: string) => `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,40;0,20;80,20;80,40</vertices></polygon>
<polyline color="#000000" style="dash">
<contents>${etykieta}</contents>
<vertices>0,20;80,20</vertices>
</polyline>
</xfdf>`;
    let projekt = dodajArkuszeDoProjektu(pustyProjektBudowy(106850), [
      parsujXfdfTekst(xfdfBez, 'DK25_Ark_2_1.xfdf'),
      parsujXfdfTekst(xfdfBez, 'DK25_Ark_2_2.xfdf'),
    ]);
    assert.equal(projekt.arkusze.length, 2);
    const ids = projekt.arkusze.map((a) => a.id);
    projekt = {
      ...projekt,
      arkusze: projekt.arkusze.map((a, i) => ({
        ...a,
        nazwa: i === 0 ? 'Odcinek ręczny' : a.nazwa,
        osTrasy: a.osTrasy ? { ...a.osTrasy, dlugoscEtykietaM: undefined } : undefined,
      })),
    };
    const przeliczony = zastosujKilometrazArkuszy(projekt.arkusze, 106850);
    const staryKoniec = przeliczony[1].kilometrazKoncowyM;
    assert.ok(staryKoniec < 106850 + 800, `geometria bez etykiety ${staryKoniec}`);

    const wyniki = [
      parsujXfdfTekst(xfdfWymiar('435,68 m'), 'DK25_Ark_2_1.xfdf'),
      parsujXfdfTekst(xfdfWymiar('422,07 m'), 'DK25_Ark_2_2.xfdf'),
    ];
    const next = dodajArkuszeDoProjektu({ ...projekt, arkusze: przeliczony }, wyniki);
    assert.equal(next.arkusze.length, 2);
    assert.equal(next.arkusze[0].id, ids[0]);
    assert.equal(next.arkusze[1].id, ids[1]);
    const suma = 435.68 + 422.07;
    assert.ok(Math.abs(next.arkusze[1].kilometrazKoncowyM - (106850 + suma)) < 0.05);
    assert.equal(formatujKmM(next.arkusze[1].kilometrazKoncowyM), formatujKmM(106850 + suma));
    assert.notEqual(formatujKmM(next.arkusze[1].kilometrazKoncowyM), '116+016');
    const msg = komunikatPoImporcieXfdf({ ...projekt, arkusze: przeliczony }, next, wyniki.map((w) => w.zrodloNazwa));
    assert.match(msg, /Zastąpiono 2/);
    assert.match(msg, /857[,.]75/);
    assert.equal(kluczArkuszaPzt('Odcinek ręczny', 'DK25_Ark_2_1.xfdf'), 'ark. 2_1');
  });

  it('usuwa arkusz i przestawia kolejność z przeliczeniem km', () => {
    const xfdf = (n: string) => `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58"><vertices>0,28;0,0;2268,0;2268,28</vertices></polygon>
</xfdf>`;
    let projekt = dodajArkuszeDoProjektu(pustyProjektBudowy(0), [
      parsujXfdfTekst(xfdf('1'), 'a.xfdf'),
      parsujXfdfTekst(xfdf('2'), 'b.xfdf'),
      parsujXfdfTekst(xfdf('3'), 'c.xfdf'),
    ]);
    assert.equal(projekt.arkusze.length, 3);
    const ids = projekt.arkusze.map((a) => a.id);
    projekt = przesunArkusz(projekt, ids[2], -1);
    assert.equal(projekt.arkusze[1].zrodloNazwa, 'c.xfdf');
    assert.equal(projekt.arkusze[1].kilometrazPoczatkowyM, projekt.arkusze[0].kilometrazKoncowyM);
    projekt = usunArkusz(projekt, projekt.arkusze[0].id);
    assert.equal(projekt.arkusze.length, 2);
    assert.equal(projekt.arkusze[0].kontynuacjaPoprzedniego, false);
    projekt = zmienNazweArkusza(projekt, projekt.arkusze[0].id, 'Odcinek start');
    assert.equal(projekt.arkusze[0].nazwa, 'Odcinek start');
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
    const powWiaz = powierzchniaWarstwyZOdsadzkami(2000, 400, 7, 7);
    assert.equal(wiaz.powierzchniaM2, powWiaz);
    assert.equal(wiaz.tony, tonyZPowierzchni(powWiaz, 6, GESTOSC_MMA_DOMYSLNA));
    const powKlsm = powierzchniaWarstwyZOdsadzkami(2000, 400, 25, 25);
    assert.equal(klsm.powierzchniaM2, powKlsm);
    assert.equal(klsm.tony, tonyZPowierzchni(powKlsm, 20, GESTOSC_KLSM_DOMYSLNA));

    const zScaleniem = scalWiersze(projekt, ['legL', 'legP'], 'Trasa główna');
    const scalony = obliczPrzedmiar(zScaleniem);
    assert.equal(scalony.length, 1);
    assert.equal(scalony[0].nazwa, 'Trasa główna');
    assert.equal(scalony[0].powierzchniaObrysuM2, 3600);
    const smaS = scalony[0].warstwy.find((w) => w.kategoria === 'sma')!;
    assert.equal(smaS.powierzchniaM2, 3600);

    const poNazwie = obliczPrzedmiar(zmienNazweScalonegoWiersza(zScaleniem, scalony[0].id, 'Trasa L+P'));
    assert.equal(poNazwie[0].nazwa, 'Trasa L+P');
    const zpowrotem = obliczPrzedmiar(rozlaczWiersz(zScaleniem, scalony[0].id));
    assert.equal(zpowrotem.length, 2);
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
