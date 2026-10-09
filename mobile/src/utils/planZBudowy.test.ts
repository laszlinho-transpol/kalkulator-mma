import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ArkuszPzt, KonstrukcjaObszaru, KrawedznikObmiaru, ObszarObmiaru, ProjektBudowy, WarstwaKonstrukcji } from '../types';
import { parsujXfdfTekst } from './xfdfParser';
import { arkuszZWynikuXfdf, dlugoscArkuszaM, nowaWarstwa, pustyProjektBudowy, zastosujKilometrazArkuszy } from './projektBudowy';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  komentarzPlanuBudowy,
  odcinkiKonstrukcjiDlaWarstwy,
  odsadzkiBezKrawedznika,
  odsadzkiWpisaneWPlanie,
  parsujOdsadzkeCm,
  plasterkiSzerokosciOdcinka,
  policzOdcinkiPlanu,
  stronaKrawedznika,
  tytulPlanuBudowy,
  obszarySzkicuPlanu,
  pozycjaSzkicuPoMetrach,
  uzupelnijProfilObmiaruDzialek,
  zbudujPlanZBudowy,
  zbudujPlanZZakladek,
} from './planZBudowy';
import { obliczLacznaDlugosc, obliczTabeleAutPlanu } from './calculations';
import { pikietazPoMetrach, zakresOdcinkaKm } from './chainage';
import { segmentyKonstrukcji } from './projektBudowy';

function warstwa(nazwa: string, kategoria: WarstwaKonstrukcji['kategoria'], cm: number): WarstwaKonstrukcji {
  return nowaWarstwa({ nazwa, kategoria, kolejnosc: 1, gruboscCm: cm, odsadzkaCm: 0 });
}

function prostokatLewy(dl: number, szer: number, krawedzniki?: KrawedznikObmiaru[]): ObszarObmiaru {
  return {
    id: 'l',
    nazwa: 'Trasa L',
    kolejnosc: 1,
    wierzcholkiPdf: [{ x: 0, y: szer }, { x: 0, y: 0 }, { x: dl, y: 0 }, { x: dl, y: szer }],
    wierzcholkiM: [{ x: 0, y: szer }, { x: 0, y: 0 }, { x: dl, y: 0 }, { x: dl, y: szer }],
    powierzchniaM2: dl * szer,
    obwodM: 2 * (dl + szer),
    zrodloNazwa: 'test.xfdf',
    kolorWypelnienia: '#FFEE58',
    stronaTrasy: 'lewa',
    krawedzniki,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function krawedznikZewn(dl: number, y: number): KrawedznikObmiaru {
  return {
    id: 'kr-zewn',
    wierzcholkiPdf: [{ x: 0, y }, { x: dl, y }],
    wierzcholkiM: [{ x: 0, y }, { x: dl, y }],
    dlugoscM: dl,
    odlegloscOdKrawedziM: 0,
    polozenie: 'zewnetrzna',
    kolor: '#FF0000',
  };
}

function projektLewy(obszar: ObszarObmiaru, warstwy: WarstwaKonstrukcji[]): ProjektBudowy {
  return {
    ...pustyProjektBudowy(106850),
    arkusze: zastosujKilometrazArkuszy([{
      id: 'a1',
      nazwa: 'ark',
      zrodloNazwa: 'a.xfdf',
      kolejnosc: 1,
      kontynuacjaPoprzedniego: false,
      kilometrazPoczatkowyM: 0,
      kilometrazKoncowyM: 0,
      obszary: [obszar],
      osTrasy: {
        wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
        wierzcholkiM: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
        dlugoscM: 9200,
      },
    } as ArkuszPzt], 106850),
    legenda: [{ id: 'legL', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna strona lewa' }],
    konstrukcje: [{ legendaId: 'legL', warstwy, wyjatki: [] }],
  };
}

describe('planZBudowy / oś XFDF', () => {
  it('przerywana czarna linia to oś, nie krawężnik, a pikietaż bierze etykietę 435,68 m', () => {
    const xfdf = `<?xml version="1.0"?><xfdf>
<polygon interior-color="#FFEE58" subject="Obszar"><vertices>0,40;0,20;100,20;100,40</vertices></polygon>
<polyline color="#FF0000" subject="Obwód"><vertices>0,40;100,40</vertices></polyline>
<polyline color="#000000" style="dash" dashes="8,4,4,4" subject="Obwód">
<contents-richtext><body xmlns="http://www.w3.org/1999/xhtml"><p><span>435,68 m </span></p></body></contents-richtext>
<vertices>0,20;100,20</vertices>
</polyline>
</xfdf>`;
    const w = parsujXfdfTekst(xfdf, 'ark_2_1.xfdf');
    assert.ok(w.osTrasy);
    assert.equal(w.osTrasy?.style, 'dash');
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 435.68) < 0.01);
    const arkusz = arkuszZWynikuXfdf(w, { kolejnosc: 1, kontynuacjaPoprzedniego: false, skala: DOMYSLNA_SKALA_PZT });
    assert.equal(dlugoscArkuszaM(arkusz), 435.68);
    assert.ok(arkusz.osTrasy);
    const kr = arkusz.obszary[0].krawedzniki ?? [];
    assert.ok(kr.every((k) => (k.kolor || '').toUpperCase() !== '#000000'));
  });

  it('107+000–108+000 z wyjątkiem 107+500–107+600 dzieli wiążącą na 3 odcinki', () => {
    const sma = warstwa('SMA', 'scieralna', 4);
    const wiaz = warstwa('Wiążąca', 'wiazaca', 8);
    const podb = warstwa('Podbudowa', 'podbudowa', 10);
    const wiazW = { ...wiaz, id: 'ww', gruboscCm: 5 };
    const podbW = { ...podb, id: 'pw', gruboscCm: 7 };
    const k: KonstrukcjaObszaru = {
      legendaId: 'legL',
      warstwy: [sma, wiaz, podb],
      wyjatki: [{
        id: 'w1',
        kmOdM: 107500,
        kmDoM: 107600,
        warstwy: [sma, wiazW, podbW],
      }],
    };
    const seg = segmentyKonstrukcji(k, 107000, 108000);
    assert.equal(seg.length, 3);
    assert.equal(seg[0].od, 107000);
    assert.equal(seg[0].do, 107500);
    assert.equal(seg[1].od, 107500);
    assert.equal(seg[1].do, 107600);
    assert.equal(seg[2].od, 107600);
    assert.equal(seg[2].do, 108000);
    assert.equal(seg[0].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 8);
    assert.equal(seg[1].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 5);
    assert.equal(seg[2].warstwy.find((w) => w.kategoria === 'wiazaca')?.gruboscCm, 8);

    const projekt: ProjektBudowy = {
      ...pustyProjektBudowy(106850),
      arkusze: zastosujKilometrazArkuszy([{
        id: 'a1',
        nazwa: 'ark',
        zrodloNazwa: 'a.xfdf',
        kolejnosc: 1,
        kontynuacjaPoprzedniego: false,
        kilometrazPoczatkowyM: 0,
        kilometrazKoncowyM: 0,
        obszary: [prostokatLewy(9200, 7)],
        osTrasy: {
          wierzcholkiPdf: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
          wierzcholkiM: [{ x: 0, y: 0 }, { x: 9200, y: 0 }],
          dlugoscM: 9200,
        },
      } as ArkuszPzt], 106850),
      legenda: [{ id: 'legL', kolor: '#FFEE58', typ: 'obszar', klucz: 'obszar|#FFEE58', nazwa: 'Trasa główna strona lewa' }],
      konstrukcje: [k],
    };

    const odc = odcinkiKonstrukcjiDlaWarstwy(projekt, 'legL', 107000, 108000, 'Wiążąca', 'wiazaca');
    assert.equal(odc.length, 3);
    assert.deepEqual(odc.map((o) => o.gruboscProjektowaCm), [8, 5, 8]);

    const licz = policzOdcinkiPlanu(projekt, {
      legendaId: 'legL',
      odM: 107000,
      doM: 108000,
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    assert.equal(licz.length, 3);
    assert.ok(Math.abs(licz[0].powierzchniaM2 - 3500) < 2, `oczekiwano ~3500, jest ${licz[0].powierzchniaM2}`);
    assert.ok(Math.abs(licz[1].powierzchniaM2 - 700) < 2, `oczekiwano ~700, jest ${licz[1].powierzchniaM2}`);
    assert.ok(Math.abs(licz[2].powierzchniaM2 - 2800) < 2, `oczekiwano ~2800, jest ${licz[2].powierzchniaM2}`);
    assert.ok(licz[0].masaMg > licz[1].masaMg);

    const plan = zbudujPlanZBudowy(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-09-10T06:00:00.000Z',
      legendaId: 'legL',
      obszarNazwa: 'Trasa główna strona lewa',
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      kilometrazOdM: 107000,
      kilometrazDoM: 108000,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      mieszankaId: 'mix1',
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    assert.equal(plan.zrodlo, 'budowa');
    assert.equal(plan.dzialki.length, 3);
    assert.equal(tytulPlanuBudowy(plan), 'Wiążąca 10.09.2026');
    assert.equal(komentarzPlanuBudowy(plan), '107+000 - 108+000 Trasa główna strona lewa');
  });

  it('odsadzka planu: 0 = obrys, +15 poszerza, −10 zwęża; konstrukcja nie dolicza się', () => {
    assert.equal(parsujOdsadzkeCm('-10'), -10);
    assert.equal(parsujOdsadzkeCm('-'), 0);
    assert.equal(parsujOdsadzkeCm('0'), 0);
    assert.deepEqual(odsadzkiWpisaneWPlanie({ odsadzkaKorektaLewaCm: 0, odsadzkaKorektaPrawaCm: 0 }), { lewa: 0, prawa: 0 });
    assert.deepEqual(odsadzkiWpisaneWPlanie({ odsadzkaLewaCm: 15, odsadzkaPrawaCm: 0 }), { lewa: 15, prawa: 0 });

    const podb = nowaWarstwa({
      nazwa: 'Podbudowa',
      kategoria: 'podbudowa',
      kolejnosc: 1,
      gruboscCm: 10,
      odsadzkaCm: 15,
      odsadzkaLewaCm: 15,
      odsadzkaPrawaCm: 0,
    });
    const projekt = projektLewy(prostokatLewy(9200, 7), [podb]);
    const opts = {
      legendaId: 'legL',
      odM: 107000,
      doM: 108000,
      warstwaNazwa: 'Podbudowa',
      warstwaKategoria: 'podbudowa' as const,
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    };
    const obrys = 7000;
    const licz0 = policzOdcinkiPlanu(projekt, { ...opts, odsadzkaLewaCm: 0, odsadzkaPrawaCm: 0 });
    assert.equal(licz0.length, 1);
    assert.ok(Math.abs(licz0[0].powierzchniaM2 - obrys) < 2, `0 = sam obrys, jest ${licz0[0].powierzchniaM2}`);
    assert.equal(licz0[0].odsadzkaLewaCm, 0);

    const licz15 = policzOdcinkiPlanu(projekt, { ...opts, odsadzkaLewaCm: 15, odsadzkaPrawaCm: 0 });
    assert.ok(Math.abs(licz15[0].powierzchniaM2 - (obrys + 150)) < 2, `+15 bez krawężnika, jest ${licz15[0].powierzchniaM2}`);
    assert.equal(licz15[0].odsadzkaLewaCm, 15);

    const liczNeg = policzOdcinkiPlanu(projekt, { ...opts, odsadzkaLewaCm: -10, odsadzkaPrawaCm: 0 });
    assert.ok(Math.abs(liczNeg[0].powierzchniaM2 - (obrys - 100)) < 2, `−10 zwęża, jest ${liczNeg[0].powierzchniaM2}`);
    assert.equal(liczNeg[0].odsadzkaLewaCm, -10);
  });

  it('przy krawężniku nie poszerza, nawet jak w planie jest +15 cm', () => {
    assert.equal(stronaKrawedznika({ stronaTrasy: 'lewa' }, { polozenie: 'zewnetrzna' }), 'lewa');
    assert.equal(stronaKrawedznika({ stronaTrasy: 'prawa' }, { polozenie: 'zewnetrzna' }), 'prawa');
    const obszar = prostokatLewy(9200, 7, [krawedznikZewn(9200, 7)]);
    const os = [{ x: 0, y: 0 }, { x: 9200, y: 0 }];
    const ods = odsadzkiBezKrawedznika(obszar, os, 150, 1150, 15, 0);
    assert.ok(ods.lewa < 0.01, `krawężnik zeruje L, jest ${ods.lewa}`);
    assert.equal(ods.prawa, 0);

    const podb = nowaWarstwa({
      nazwa: 'Podbudowa',
      kategoria: 'podbudowa',
      kolejnosc: 1,
      gruboscCm: 10,
      odsadzkaCm: 15,
      odsadzkaLewaCm: 15,
      odsadzkaPrawaCm: 0,
    });
    const projekt = projektLewy(obszar, [podb]);
    const licz = policzOdcinkiPlanu(projekt, {
      legendaId: 'legL',
      odM: 107000,
      doM: 108000,
      warstwaNazwa: 'Podbudowa',
      warstwaKategoria: 'podbudowa',
      odsadzkaLewaCm: 15,
      odsadzkaPrawaCm: 0,
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    assert.ok(Math.abs(licz[0].powierzchniaM2 - 7000) < 2, `przy krawężniku sam obrys, jest ${licz[0].powierzchniaM2}`);
  });

  it('malejący 114+020 → 113+605: nazwa, start i pikietaż w dół', () => {
    assert.deepEqual(zakresOdcinkaKm(114020, 0, 45, 'malejacy'), { odM: 114020, doM: 113975 });
    assert.equal(pikietazPoMetrach(114020, 46.68, 'malejacy'), 113973.32);
    assert.equal(pikietazPoMetrach(114020, 46.68, 'rosnacy'), 114066.68);
    const wiaz = nowaWarstwa({ nazwa: 'Wiążąca', kategoria: 'wiazaca', kolejnosc: 1, gruboscCm: 8, odsadzkaCm: 0 });
    const projekt = projektLewy(prostokatLewy(9200, 7), [wiaz]);
    const plan = zbudujPlanZBudowy(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-10-03T06:00:00.000Z',
      legendaId: 'legL',
      obszarNazwa: 'Trasa główna strona lewa',
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      kilometrazOdM: 114020,
      kilometrazDoM: 113605,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      mieszankaId: 'mix1',
      gestoscTm3: 2.45,
      tonazAuta: 26,
    });
    assert.equal(plan.dzialki[0].kierunekUkladania, 'malejacy');
    assert.equal(plan.dzialki[0].nazwa, '114+020 – 113+605');
    assert.equal(plan.dzialki[0].kilometrazPoczatkowyKm, 114);
    assert.equal(plan.dzialki[0].kilometrazPoczatkowyM, 20);
    const profil = plan.dzialki[0].profilSzerokosci ?? [];
    assert.ok(profil.length >= 1);
    const sumaDl = profil.reduce((s, p) => s + p.dlugoscM, 0);
    const sumaPow = profil.reduce((s, p) => s + (p.powierzchniaM2 ?? 0), 0);
    assert.ok(Math.abs(sumaDl - 415) < 0.2, `długość profilu ${sumaDl}`);
    assert.ok(Math.abs(sumaPow - 415 * 7) < 8, `obmiar ${sumaPow}`);
    const plasterki = plasterkiSzerokosciOdcinka(projekt, {
      legendaId: 'legL',
      odM: 114020,
      doM: 113605,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      krokM: 10,
    });
    assert.ok(plasterki.length >= 1);
    assert.ok(plasterki.every((p) => p.szerokoscM > 6 && p.szerokoscM < 8));
    assert.ok(plasterki.every((p) => p.powierzchniaM2 > 0));
  });

  it('rozjazd 15 m na starcie: dokładne m², pierwsze 26 t krócej niż przy 7 m', () => {
    const wiaz = nowaWarstwa({ nazwa: 'Wiążąca', kategoria: 'wiazaca', kolejnosc: 1, gruboscCm: 4, odsadzkaCm: 0 });
    const obszar: ObszarObmiaru = {
      id: 'l',
      nazwa: 'Trasa L',
      kolejnosc: 1,
      wierzcholkiPdf: [
        { x: 0, y: 7 }, { x: 0, y: 0 }, { x: 7155, y: 0 }, { x: 7170, y: 0 },
        { x: 7170, y: 20 }, { x: 7155, y: 20 }, { x: 7155, y: 7 },
      ],
      wierzcholkiM: [
        { x: 0, y: 7 }, { x: 0, y: 0 }, { x: 7155, y: 0 }, { x: 7170, y: 0 },
        { x: 7170, y: 20 }, { x: 7155, y: 20 }, { x: 7155, y: 7 },
      ],
      powierzchniaM2: 7155 * 7 + 15 * 20,
      obwodM: 1,
      zrodloNazwa: 'test.xfdf',
      kolorWypelnienia: '#FFEE58',
      stronaTrasy: 'lewa',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const projekt = projektLewy(obszar, [wiaz]);
    const plasterki = plasterkiSzerokosciOdcinka(projekt, {
      legendaId: 'legL',
      odM: 114020,
      doM: 113605,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
    });
    assert.ok(plasterki.length >= 2, `oczekiwano osobnego rozjazdu, jest ${plasterki.length}`);
    assert.ok(plasterki[0].szerokoscM > 15, `start rozjazdu ~20 m, jest ${plasterki[0].szerokoscM}`);
    assert.ok(plasterki[plasterki.length - 1].szerokoscM < 9, `koniec ~7 m, jest ${plasterki[plasterki.length - 1].szerokoscM}`);

    const plan = zbudujPlanZBudowy(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-10-03T06:00:00.000Z',
      legendaId: 'legL',
      obszarNazwa: 'Trasa główna strona lewa',
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca',
      kilometrazOdM: 114020,
      kilometrazDoM: 113605,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      mieszankaId: 'mix1',
      gestoscTm3: 2.45,
      tonazAuta: 26,
    });
    const tab = obliczTabeleAutPlanu(plan.dzialki, plan.rzuty, 26, () => 2.45);
    assert.ok(tab.calosc[0].metry < 20, `26 t na rozjeździe krócej niż 20 m, jest ${tab.calosc[0].metry}`);
    const autoWatskie = tab.calosc.find((w) => w.metryNarastajaco - w.metry >= 15);
    assert.ok(autoWatskie && autoWatskie.metry > tab.calosc[0].metry + 5, `stała jezdnia dłuższa, jest ${autoWatskie?.metry}`);

    const bezM2 = {
      ...plan,
      dzialki: plan.dzialki.map((d) => ({
        ...d,
        profilSzerokosci: (d.profilSzerokosci ?? []).map((p) => ({
          dlugoscM: p.dlugoscM,
          szerokoscM: p.szerokoscM,
        })),
      })),
    };
    const uzupelnione = uzupelnijProfilObmiaruDzialek(projekt, bezM2);
    assert.ok((uzupelnione[0].profilSzerokosci?.[0].powierzchniaM2 ?? 0) > 0);
    const bezProfilu = { ...plan, dzialki: plan.dzialki.map((d) => ({ ...d, profilSzerokosci: undefined })) };
    const bezPrzeliczenia = uzupelnijProfilObmiaruDzialek(projekt, bezProfilu);
    assert.equal(bezPrzeliczenia[0].profilSzerokosci, undefined);
  });

  it('stała szerokość: jeden scalony plasterek', () => {
    const wiaz = nowaWarstwa({ nazwa: 'Wiążąca', kategoria: 'wiazaca', kolejnosc: 1, gruboscCm: 4, odsadzkaCm: 0 });
    const projekt = projektLewy(prostokatLewy(9200, 7), [wiaz]);
    const t0 = Date.now();
    const plasterki = plasterkiSzerokosciOdcinka(projekt, {
      legendaId: 'legL',
      odM: 114020,
      doM: 113605,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
    });
    const ms = Date.now() - t0;
    assert.equal(plasterki.length, 1);
    assert.ok(Math.abs(plasterki[0].dlugoscM - 415) < 0.2);
    assert.ok(ms < 400, `profil stałej jezdni za wolny: ${ms} ms`);
  });

  it('zakładki działek roboczych układają się po kolei i sumują auta', () => {
    const wiaz = warstwa('Wiążąca', 'wiazaca', 8);
    const sma = warstwa('SMA', 'sma', 4);
    const projekt = projektLewy(prostokatLewy(9200, 7), [sma, wiaz]);
    const wspolne = {
      legendaId: 'legL',
      obszarNazwa: 'Trasa główna strona lewa',
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      gestoscTm3: 2.45,
    };
    const z1 = {
      ...wspolne,
      id: 'z1',
      warstwaNazwa: 'Wiążąca',
      warstwaKategoria: 'wiazaca' as const,
      kilometrazOdM: 107000,
      kilometrazDoM: 107500,
      mieszankaId: 'mix-w',
      grubosciCm: [8],
    };
    const z2 = {
      ...wspolne,
      id: 'z2',
      warstwaNazwa: 'SMA',
      warstwaKategoria: 'sma' as const,
      kilometrazOdM: 107500,
      kilometrazDoM: 108000,
      mieszankaId: 'mix-s',
      grubosciCm: [4],
    };
    const rzuty = [{ id: 'r1', numerRzutu: 1, iloscSamochodow: 10 }, { id: 'r2', numerRzutu: 2, iloscSamochodow: 8 }];
    const plan = zbudujPlanZZakladek(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-10-07T06:00:00.000Z',
      tonazAuta: 25.5,
      rzuty,
      zakladki: [z1, z2],
    });
    assert.equal(plan.dzialki.length, 2);
    assert.equal(plan.iloscDzialek, 2);
    assert.equal(plan.dzialki[0].zakladkaId, 'z1');
    assert.equal(plan.dzialki[1].zakladkaId, 'z2');
    assert.equal(plan.dzialki[0].nazwa, '107+000 – 107+500');
    assert.equal(plan.dzialki[0].mieszankaId, 'mix-w');
    assert.equal(plan.dzialki[1].nazwa, '107+500 – 108+000');
    assert.equal(plan.dzialki[1].mieszankaId, 'mix-s');
    assert.equal(plan.warstwaNazwa, 'Wiążąca, SMA');
    assert.equal(plan.obszarNazwa, 'Trasa główna strona lewa');
    assert.deepEqual(plan.rzuty, rzuty);
    assert.equal(plan.zakladkiBudowy?.length, 2);
    assert.equal(plan.zakladkiBudowy?.[0].id, 'z1');
    assert.equal(plan.zakladkiBudowy?.[1].grubosciCm[0], 4);
    assert.equal(
      komentarzPlanuBudowy(plan),
      '107+000 - 107+500 Trasa główna strona lewa · 107+500 - 108+000 Trasa główna strona lewa',
    );
    assert.equal(tytulPlanuBudowy(plan), 'Wiążąca, SMA 07.10.2026');

    const odwrotnie = zbudujPlanZZakladek(projekt, {
      budowaId: 'b1',
      dataWbudowywania: '2026-10-07T06:00:00.000Z',
      tonazAuta: 25.5,
      zakladki: [z2, z1],
    });
    assert.equal(odwrotnie.dzialki[0].nazwa, '107+500 – 108+000');
    assert.equal(odwrotnie.dzialki[1].nazwa, '107+000 – 107+500');
    assert.equal(odwrotnie.dzialki[0].mieszankaId, 'mix-s');
    const auta = odwrotnie.rzuty.reduce((s, r) => s + r.iloscSamochodow, 0);
    assert.ok(auta > 1, `oczekiwano sumy aut z obu zakładek, jest ${auta}`);

    const obszary = obszarySzkicuPlanu(plan as any);
    assert.equal(obszary.length, 2);
    assert.equal(obszary[0].id, 'z1');
    assert.equal(obszary[1].id, 'z2');
    assert.deepEqual(obszary[0].dzialkaIds, [plan.dzialki[0].id]);
    assert.deepEqual(obszary[1].dzialkaIds, [plan.dzialki[1].id]);

    const dl = obliczLacznaDlugosc(plan.dzialki[0]);
    assert.ok(Math.abs(dl - 500) < 0.2, `długość pierwszej działki ${dl}`);
    const naStarcie = pozycjaSzkicuPoMetrach(plan as any, obszary, 0);
    assert.equal(naStarcie?.obszarId, 'z1');
    assert.equal(naStarcie?.dzialkaId, plan.dzialki[0].id);
    assert.ok(Math.abs((naStarcie?.stacjaM ?? 0) - 107000) < 0.2);
    const wSrodku = pozycjaSzkicuPoMetrach(plan as any, obszary, 250);
    assert.equal(wSrodku?.obszarId, 'z1');
    assert.ok(Math.abs((wSrodku?.stacjaM ?? 0) - 107250) < 0.2);
    const naGranicy = pozycjaSzkicuPoMetrach(plan as any, obszary, dl);
    assert.equal(naGranicy?.obszarId, 'z2');
    assert.equal(naGranicy?.dzialkaId, plan.dzialki[1].id);
    assert.ok(Math.abs((naGranicy?.stacjaM ?? 0) - 107500) < 0.2);

    const bezId = {
      ...plan,
      dzialki: plan.dzialki.map((d) => ({ ...d, zakladkaId: undefined })),
    };
    const fallback = obszarySzkicuPlanu(bezId as any);
    assert.equal(fallback[0].dzialkaIds[0], plan.dzialki[0].id);
    assert.equal(fallback[1].dzialkaIds[0], plan.dzialki[1].id);
  });
});
