import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsujXfdfTekst } from './xfdfParser';
import { metryNaPunktPdf } from './obmiarGeometry';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  dlugoscOsiPdf1500M,
  ocenaOdstempuPodzialkiM,
  pdfDoSvgPodgladu,
  pomiarWzdlozOsiPdf,
  svgDoPdfPodgladu,
  czoloObmiaruPdf,
  napisZakresuWzdluzOsi,
  szerokoscPoprzecznaPdf,
} from './osPzt';

describe('pomiar osi PDF 1:500', () => {
  it('pdf ↔ svg podglądu wraca do tego samego punktu', () => {
    const m = { w: 400, h: 200, cx: 120, cy: 80, skalaFit: 2 };
    const p = { x: 133.5, y: 44.25 };
    const s = pdfDoSvgPodgladu(p, m);
    const back = svgDoPdfPodgladu(s, m);
    assert.ok(Math.abs(back.x - p.x) < 1e-9);
    assert.ok(Math.abs(back.y - p.y) < 1e-9);
  });

  it('100 m wzdłuż osi przy 1:500, bez k', () => {
    const k = metryNaPunktPdf(DOMYSLNA_SKALA_PZT);
    const dPdf = 100 / k;
    const os = [{ x: 10, y: 5 }, { x: 10 + dPdf * 3, y: 5 }];
    const a = { x: 10 + dPdf, y: 40 };
    const b = { x: 10 + dPdf * 2, y: -20 };
    const w = pomiarWzdlozOsiPdf({
      osPdf: os,
      a,
      b,
      kmPzt: { odM: 115608, doM: 116031 },
      kmXfdf: { odM: 115594, doM: 116016 },
    });
    assert.ok(w);
    assert.ok(Math.abs(w.metry1500 - 100) < 0.05, `metry ${w.metry1500}`);
    const ocena = ocenaOdstempuPodzialkiM(w.metry1500);
    assert.equal(ocena.krokM, 100);
    assert.equal(ocena.zgadzaSie, true);
    assert.match(ocena.tekst, /100 m/);
  });

  it('Ark_2_22: kreska XFDF = 422,07 m = 1:500, bez k', () => {
    const xml = readFileSync(join(process.cwd(), 'src/utils/fixtures/dk25_ark_2_22.xfdf'), 'utf8');
    const parsed = parsujXfdfTekst(xml, 'Ark_2_22.xfdf');
    const os = parsed.osTrasy?.wierzcholki ?? [];
    assert.ok(os.length >= 50);
    const m1500 = dlugoscOsiPdf1500M(os);
    assert.ok(Math.abs(m1500 - 422.07) < 0.02, `1:500 ${m1500}`);
    assert.ok(Math.abs((parsed.osTrasy?.dlugoscEtykietaM ?? 0) - 422.07) < 0.01);
    const a = os[0];
    const b = os[os.length - 1];
    const w = pomiarWzdlozOsiPdf({
      osPdf: os,
      a,
      b,
      kmPzt: { odM: 115608, doM: 116031 },
      kmXfdf: { odM: 115593.93, doM: 116016 },
    });
    assert.ok(w);
    assert.ok(Math.abs(w.metry1500 - 422.07) < 0.02);
    assert.ok(w.kmPztA != null && Math.abs(w.kmPztA - 115608) < 0.5);
    assert.ok(w.kmPztB != null && Math.abs(w.kmPztB - 116031) < 0.5);
    assert.ok(w.kmXfdfB != null && Math.abs(w.kmXfdfB - 116016) < 0.5);
    const ocena = ocenaOdstempuPodzialkiM(w.metry1500);
    assert.equal(ocena.zgadzaSie, false);
    assert.match(ocena.tekst, /projektow/i);
  });

  it('szerokość poprzeczna na osi = szerokość prostokąta, nie długość', () => {
    const os = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
    const obszar = { wierzcholkiPdf: [{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 20 }] };
    const w = szerokoscPoprzecznaPdf([obszar], os, 200);
    assert.ok(Math.abs(w - 20) < 0.2, `szer ${w}`);
  });
});

describe('czoło obmiaru i napis START/KONIEC', () => {
  it('linia idzie od krawędzi do krawędzi, nie jest kreską na osi', () => {
    const os = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
    const obszar = { wierzcholkiPdf: [{ x: 0, y: 14 }, { x: 0, y: -6 }, { x: 400, y: -6 }, { x: 400, y: 14 }] };
    const cz = czoloObmiaruPdf([obszar], os, 200);
    assert.ok(cz);
    assert.ok(Math.abs(cz.a.x - 200) < 0.2 && Math.abs(cz.b.x - 200) < 0.2);
    const ys = [cz.a.y, cz.b.y].sort((a, b) => a - b);
    assert.ok(Math.abs(ys[0] - (-6)) < 0.2, `dół ${ys[0]}`);
    assert.ok(Math.abs(ys[1] - 14) < 0.2, `góra ${ys[1]}`);
    assert.ok(Math.abs(cz.srodek.y - 4) < 0.2);
  });

  it('dwa pasy: czoło od zewnętrznej lewej do zewnętrznej prawej', () => {
    const os = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
    const lewy = { wierzcholkiPdf: [{ x: 0, y: 18 }, { x: 0, y: 4 }, { x: 400, y: 4 }, { x: 400, y: 18 }] };
    const prawy = { wierzcholkiPdf: [{ x: 0, y: -4 }, { x: 0, y: -16 }, { x: 400, y: -16 }, { x: 400, y: -4 }] };
    const cz = czoloObmiaruPdf([lewy, prawy], os, 80);
    assert.ok(cz);
    const ys = [cz.a.y, cz.b.y].sort((a, b) => a - b);
    assert.ok(Math.abs(ys[0] - (-16)) < 0.2);
    assert.ok(Math.abs(ys[1] - 18) < 0.2);
  });

  const font = 12;
  const osPrawo = { mx: 100, my: 40, ux: 1, uy: 0, font };

  it('napis jest prostopadle do osi: START przed czołem, KONIEC za czołem', () => {
    const start = napisZakresuWzdluzOsi({ ...osPrawo, rola: 'start', kilometrazMaleje: true });
    const koniec = napisZakresuWzdluzOsi({ ...osPrawo, rola: 'koniec', kilometrazMaleje: true });
    assert.ok(start.x > osPrawo.mx + font * 0.5, `start ${start.x}`);
    assert.ok(koniec.x < osPrawo.mx - font * 0.5, `koniec ${koniec.x}`);
    assert.equal(start.y, osPrawo.my);
    assert.ok(Math.abs(Math.abs(start.rot) - 90) < 1e-6, `rot ${start.rot}`);
    assert.ok(Math.abs(Math.abs(koniec.rot) - 90) < 1e-6);
  });

  it('rosnący kilometraż: START pod prąd, KONIEC za czołem', () => {
    const start = napisZakresuWzdluzOsi({ ...osPrawo, rola: 'start', kilometrazMaleje: false });
    const koniec = napisZakresuWzdluzOsi({ ...osPrawo, rola: 'koniec', kilometrazMaleje: false });
    assert.ok(start.x < osPrawo.mx - font * 0.5);
    assert.ok(koniec.x > osPrawo.mx + font * 0.5);
    assert.ok(Math.abs(Math.abs(start.rot) - 90) < 1e-6);
  });

  it('oś w lewo: napis dalej prostopadle, bez obrotu do góry nogami', () => {
    const start = napisZakresuWzdluzOsi({
      mx: 10, my: 10, ux: -1, uy: 0, rola: 'start', kilometrazMaleje: true, font,
    });
    assert.ok(start.x < 10);
    assert.ok(Math.abs(Math.abs(start.rot) - 90) < 1e-6);
  });
});
