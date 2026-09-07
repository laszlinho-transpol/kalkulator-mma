import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  nastepnyPresetZoom, PRESETY_ZOOM_PROC, punktSvgZEkranu, skalaZProcentu,
  translacjaPrzyZoomie, translacjaPrzyObrocie,
} from './obmiarMapa';
import {
  bokiFigury, formatujKilometraz, idxWezlowOdcinkaKm, kierunekKilometrazu, kilometrazKoncaZOsi, lancuchBoku,
  odlegloscMiedzyWezlami, odleglosciWezlowOdStartu, parsujKilometraz, podlancuch,
} from './obmiarFigura';
import { infoAutaWz, metryZTonnObszaru } from './obmiarLive';
import type { ObszarObmiaru } from '../types';

describe('obmiarMapa', () => {
  it('zoom w ognisku zostawia punkt pod palcami', () => {
    const t = translacjaPrzyZoomie({
      skala0: 1, skala1: 2, tx0: 0, ty0: 0, f0x: 40, f0y: 10, f1x: 40, f1y: 10,
    });
    // punkt świata pod (40,10): 40. Po x2 ma zostać pod (40,10) → t = f - 2*(f - 0) = -40
    assert.equal(t.tx, -40);
    assert.equal(t.ty, -10);
  });

  it('przesuniecie ogniska (pinch+pan) idzie z palcami', () => {
    const t = translacjaPrzyZoomie({
      skala0: 1, skala1: 1, tx0: 0, ty0: 0, f0x: 0, f0y: 0, f1x: 20, f1y: -8,
    });
    assert.equal(t.tx, 20);
    assert.equal(t.ty, -8);
  });

  it('obrot 90° wokół ogniska', () => {
    const t = translacjaPrzyObrocie({
      tx0: 10, ty0: 0, dRot: Math.PI / 2, fx: 0, fy: 0,
    });
    assert.ok(Math.abs(t.tx - 0) < 1e-9);
    assert.ok(Math.abs(t.ty - 10) < 1e-9);
  });

  it('presety zoom jak PDF-XChange', () => {
    assert.equal(PRESETY_ZOOM_PROC[0], 10);
    assert.equal(PRESETY_ZOOM_PROC[PRESETY_ZOOM_PROC.length - 1], 6400);
    assert.equal(skalaZProcentu(400), 4);
    assert.equal(nastepnyPresetZoom(1, 1), 2);
    assert.equal(nastepnyPresetZoom(2, -1), 1);
    assert.equal(nastepnyPresetZoom(64, 1), 64);
    assert.equal(nastepnyPresetZoom(0.1, -1), 0.1);
  });

  it('odwrotnosc transformacji przy identity', () => {
    const p = punktSvgZEkranu({
      ekranX: 40, ekranY: 20, szer: 200, wys: 100, tx: 0, ty: 0, rot: 0, skala: 1,
    });
    assert.equal(p.x, 40);
    assert.equal(p.y, 20);
  });

  it('odwrotnosc zoomu 2x w srodku', () => {
    const p = punktSvgZEkranu({
      ekranX: 120, ekranY: 50, szer: 200, wys: 100, tx: 0, ty: 0, rot: 0, skala: 2,
    });
    assert.ok(Math.abs(p.x - 110) < 1e-9);
    assert.ok(Math.abs(p.y - 50) < 1e-9);
  });
});

describe('obmiarFigura', () => {
  const prostokat: ObszarObmiaru = {
    id: 'o',
    nazwa: 'T',
    kolejnosc: 1,
    wierzcholkiPdf: [],
    wierzcholkiM: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 5 },
      { x: 0, y: 5 },
    ],
    powierzchniaM2: 500,
    obwodM: 210,
    zrodloNazwa: 't',
    bazaStart: { idxLewy: 0, idxPrawy: 3, kilometrazKm: 1, kilometrazM: 500 },
    bazaKoniec: { idxLewy: 1, idxPrawy: 2, kilometrazKm: 1, kilometrazM: 600 },
    createdAt: '',
  };

  it('parsuje 1+500', () => {
    assert.deepEqual(parsujKilometraz('1+500'), { km: 1, m: 500 });
    assert.equal(formatujKilometraz(1, 500), '1+500');
  });

  it('boki L i P maja 100 m', () => {
    const b = bokiFigury(prostokat);
    assert.ok(b);
    assert.ok(Math.abs(b!.lewaDl - 100) < 0.01);
    assert.ok(Math.abs(b!.prawaDl - 100) < 0.01);
    assert.ok(Math.abs(b!.dlugoscUkladania - 100) < 0.01);
  });

  it('kilometraz rosnacy 1+500 → 1+600', () => {
    assert.equal(kierunekKilometrazu(prostokat), 'rosnacy');
  });

  it('wezly na koncu maja ~100 m od startu', () => {
    const d = odleglosciWezlowOdStartu(prostokat);
    assert.ok(Math.abs(d[1].odStartuM - 100) < 0.2);
    assert.equal(d[0].odStartuM, 0);
  });

  it('pomiar P1-P2 wzdłuż boku', () => {
    const d = odlegloscMiedzyWezlami(prostokat.wierzcholkiM, 0, 1);
    assert.equal(d.wzdluzM, 100);
    assert.equal(d.prostoM, 100);
  });

  it('lancuch boku nie idzie przez podstawe', () => {
    const l = lancuchBoku(4, 0, 3, 1);
    assert.deepEqual(l, [0, 1]);
  });

  it('auto koniec 1+500 rosnaco na 100 m → 1+600', () => {
    const k = kilometrazKoncaZOsi(1, 500, 100, 'rosnacy');
    assert.equal(k.km, 1);
    assert.equal(k.m, 600);
    const m = kilometrazKoncaZOsi(1, 500, 100, 'malejacy');
    assert.equal(m.km, 1);
    assert.equal(m.m, 400);
  });

  it('odsadzka po km na prawym boku 1+520–1+580', () => {
    const idx = idxWezlowOdcinkaKm(prostokat, 'prawa', 1520, 1580);
    assert.ok(idx);
    assert.ok(idx!.includes(3) || idx!.includes(2));
    const caly = podlancuch(bokiFigury(prostokat)!.prawa, idx![0], idx![idx!.length - 1]);
    assert.ok(caly.length >= 1);
  });
});

describe('infoAutaWz', () => {
  it('liczy powierzchnie i grubosc jak w planie', () => {
    const obszar: ObszarObmiaru = {
      id: 'o',
      nazwa: 'T',
      kolejnosc: 1,
      wierzcholkiPdf: [],
      wierzcholkiM: [
        { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 5 }, { x: 0, y: 5 },
      ],
      powierzchniaM2: 500,
      obwodM: 210,
      zrodloNazwa: 't',
      bazaStart: { idxLewy: 0, idxPrawy: 3, kilometrazKm: 1, kilometrazM: 500 },
      bazaKoniec: { idxLewy: 1, idxPrawy: 2, kilometrazKm: 1, kilometrazM: 600 },
      gruboscCm: 4,
      wpisyWz: [{ id: 'a1', numer: 1, tony: 12, przejechaneMetry: 50, createdAt: '' }],
      createdAt: '',
    };
    const info = infoAutaWz(obszar, obszar.wpisyWz![0], 2.4);
    assert.equal(info.metryTegoAuta, 50);
    assert.ok(Math.abs(info.powierzchniaM2 - 250) < 0.2);
    assert.ok(info.gruboscCm != null && info.gruboscCm > 0);
  });

  it('metry z tonażu przy 4 cm i ρ 2.4', () => {
    const obszar: ObszarObmiaru = {
      id: 'o',
      nazwa: 'T',
      kolejnosc: 1,
      wierzcholkiPdf: [],
      wierzcholkiM: [
        { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 5 }, { x: 0, y: 5 },
      ],
      powierzchniaM2: 500,
      obwodM: 210,
      zrodloNazwa: 't',
      bazaStart: { idxLewy: 0, idxPrawy: 3, kilometrazKm: 1, kilometrazM: 500 },
      bazaKoniec: { idxLewy: 1, idxPrawy: 2, kilometrazKm: 1, kilometrazM: 600 },
      gruboscCm: 4,
      createdAt: '',
    };
    const s = metryZTonnObszaru(obszar, 4.8, 2.4);
    assert.ok(s);
    // masaNaM = 5 * 0.04 * 2.4 = 0.48 Mg/m → 4.8 Mg = 10 m
    assert.ok(Math.abs(s!.metryAuta - 10) < 0.15);
    assert.ok(Math.abs(s!.metryOdStartu - 10) < 0.15);
  });
});
