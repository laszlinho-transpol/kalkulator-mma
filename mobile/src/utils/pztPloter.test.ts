import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArkuszPzt, ObszarObmiaru } from '../types';
import { CALY_PZT_ID, scalPztDoArkusza, stykLewyPrawy, transformDwochPunktow, transformStyku, transformTyczeniaWstecz, zastosujTransform } from './pztPloter';
import { dlugoscPolilinii } from './osPzt';
import { parsujXfdfTekst } from './xfdfParser';
import { arkuszZWynikuXfdf, dlugoscArkuszaM, zastosujKilometrazArkuszy } from './projektBudowy';

function obszar(id: string, w: { x: number; y: number }[]): ObszarObmiaru {
  return {
    id,
    nazwa: id,
    kolejnosc: 1,
    wierzcholkiPdf: w,
    wierzcholkiM: w,
    powierzchniaM2: 100,
    obwodM: 40,
    zrodloNazwa: `${id}.xfdf`,
    createdAt: '',
  };
}

function arkusz(
  id: string,
  os: { x: number; y: number }[],
  km0: number,
  km1: number,
  poly: { x: number; y: number }[],
): ArkuszPzt {
  return {
    id,
    nazwa: id,
    zrodloNazwa: `${id}.xfdf`,
    kolejnosc: 1,
    kontynuacjaPoprzedniego: id !== 'a1',
    kilometrazPoczatkowyM: km0,
    kilometrazKoncowyM: km1,
    obszary: [obszar(`${id}-o`, poly)],
    osTrasy: {
      wierzcholkiPdf: os,
      wierzcholkiM: os,
      dlugoscM: km1 - km0,
      dlugoscEtykietaM: km1 - km0 > 80 ? km1 - km0 : undefined,
    },
  };
}

describe('pztPloter', () => {
  it('transformStyku składa początek osi 2 w koniec osi 1 z tym samym kierunkiem', () => {
    const T = transformStyku(
      { x: 10, y: 4 },
      { x: 0, y: 1 },
      { x: 100, y: 0 },
      { x: 1, y: 0 },
    );
    const p = zastosujTransform(T, { x: 10, y: 4 });
    assert.ok(Math.abs(p.x - 100) < 1e-9);
    assert.ok(Math.abs(p.y) < 1e-9);
    const v = zastosujTransform(T, { x: 10, y: 5 });
    assert.ok(Math.abs(v.x - 101) < 1e-6);
    assert.ok(Math.abs(v.y) < 1e-6);
  });

  it('tyczenie wstecz: pierwsze L/P arkusza 2 = ostatnie L/P arkusza 1, bez załamania 90°', () => {
    const lewa1: ObszarObmiaru = {
      ...obszar('L1', [{ x: 0, y: 8 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 8 }]),
      stronaTrasy: 'lewa',
    };
    const prawa1: ObszarObmiaru = {
      ...obszar('P1', [{ x: 0, y: 0 }, { x: 0, y: -8 }, { x: 100, y: -8 }, { x: 100, y: 0 }]),
      stronaTrasy: 'prawa',
    };
    const lewa2: ObszarObmiaru = {
      ...obszar('L2', [{ x: 20, y: 18 }, { x: 20, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 18 }]),
      stronaTrasy: 'lewa',
    };
    const prawa2: ObszarObmiaru = {
      ...obszar('P2', [{ x: 20, y: 10 }, { x: 20, y: 2 }, { x: 70, y: 2 }, { x: 70, y: 10 }]),
      stronaTrasy: 'prawa',
    };
    const a1: ArkuszPzt = {
      ...arkusz('a1', [{ x: 0, y: 0 }, { x: 100, y: 0 }], 0, 100, lewa1.wierzcholkiM),
      obszary: [lewa1, prawa1],
    };
    const a2: ArkuszPzt = {
      ...arkusz('a2', [{ x: 20, y: 10 }, { x: 70, y: 10 }], 100, 150, lewa2.wierzcholkiM),
      obszary: [lewa2, prawa2],
    };
    const s1 = stykLewyPrawy(a1, 'koniec');
    const s2 = stykLewyPrawy(a2, 'start');
    assert.ok(s1 && s2, 'poprzeczka L–P na czole/końcu');
    const T = transformTyczeniaWstecz(s2!.lewy, s2!.prawy, s1!.lewy, s1!.prawy);
    const l = zastosujTransform(T, s2!.lewy);
    const p = zastosujTransform(T, s2!.prawy);
    assert.ok(Math.abs(l.x - s1!.lewy.x) < 0.08 && Math.abs(l.y - s1!.lewy.y) < 0.08);
    assert.ok(Math.abs(p.x - s1!.prawy.x) < 0.08 && Math.abs(p.y - s1!.prawy.y) < 0.08);
    const caly = scalPztDoArkusza([a1, a2])!;
    const l2 = caly.obszary.find((o) => o.id.includes('L2'))!;
    const p2 = caly.obszary.find((o) => o.id.includes('P2'))!;
    const blisko = (pts: { x: number; y: number }[], cel: { x: number; y: number }) =>
      pts.some((pt) => Math.hypot(pt.x - cel.x, pt.y - cel.y) < 0.15);
    assert.ok(blisko(l2.wierzcholkiM, { x: 100, y: 8 }), 'węzeł L2 ma stykać się z końcem L1');
    assert.ok(blisko(p2.wierzcholkiM, { x: 100, y: -8 }), 'węzeł P2 ma stykać się z końcem P1');
    const os = caly.osTrasy!.wierzcholkiM;
    const koniec = os[os.length - 1];
    assert.ok(koniec.x > 145, `trasa nie jest ciągła, koniec x=${koniec.x} y=${koniec.y}`);
    assert.ok(Math.abs(koniec.y) < 12, `załamanie 90°, koniec x=${koniec.x} y=${koniec.y}`);
  });

  it('zła baza wzdłuż jezdni nie obraca arkusza o 90° – węzły L i P się stykają', () => {
    const lewa1: ObszarObmiaru = {
      ...obszar('L1', [{ x: 0, y: 8 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 8 }]),
      stronaTrasy: 'lewa',
      bazaStart: { idxLewy: 0, idxPrawy: 1 },
      bazaKoniec: { idxLewy: 3, idxPrawy: 2 },
    };
    const prawa1: ObszarObmiaru = {
      ...obszar('P1', [{ x: 0, y: 0 }, { x: 0, y: -8 }, { x: 100, y: -8 }, { x: 100, y: 0 }]),
      stronaTrasy: 'prawa',
      bazaStart: { idxLewy: 0, idxPrawy: 1 },
      bazaKoniec: { idxLewy: 3, idxPrawy: 2 },
    };
    const lewa2: ObszarObmiaru = {
      ...obszar('L2', [{ x: 20, y: 18 }, { x: 20, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 18 }]),
      stronaTrasy: 'lewa',
      // para wzdłuż krawędzi żółtego (nie poprzeczka) – tak Helmert dawał T
      bazaStart: { idxLewy: 0, idxPrawy: 3 },
      bazaKoniec: { idxLewy: 1, idxPrawy: 2 },
    };
    const prawa2: ObszarObmiaru = {
      ...obszar('P2', [{ x: 20, y: 10 }, { x: 20, y: 2 }, { x: 70, y: 2 }, { x: 70, y: 10 }]),
      stronaTrasy: 'prawa',
      bazaStart: { idxLewy: 0, idxPrawy: 3 },
      bazaKoniec: { idxLewy: 1, idxPrawy: 2 },
    };
    const a1: ArkuszPzt = {
      ...arkusz('a1', [{ x: 0, y: 0 }, { x: 100, y: 0 }], 0, 100, lewa1.wierzcholkiM),
      obszary: [lewa1, prawa1],
    };
    const a2: ArkuszPzt = {
      ...arkusz('a2', [{ x: 20, y: 10 }, { x: 70, y: 10 }], 100, 150, lewa2.wierzcholkiM),
      obszary: [lewa2, prawa2],
    };

    const helmert = transformDwochPunktow(
      { x: 20, y: 18 }, { x: 70, y: 18 },
      { x: 100, y: 8 }, { x: 100, y: -8 },
    );
    const helmertKoniec = zastosujTransform(helmert, { x: 70, y: 10 });
    assert.ok(
      Math.abs(helmertKoniec.y) > 30 || helmertKoniec.x < 120,
      'warunek testu: Helmert na wzdłużnej parze musi łamać trasę',
    );

    const caly = scalPztDoArkusza([a1, a2])!;
    const l1 = caly.obszary.find((o) => o.id.includes('L1'))!;
    const p1 = caly.obszary.find((o) => o.id.includes('P1'))!;
    const l2 = caly.obszary.find((o) => o.id.includes('L2'))!;
    const p2 = caly.obszary.find((o) => o.id.includes('P2'))!;
    const wezelL1 = l1.wierzcholkiM.find((pt) => Math.abs(pt.x - 100) < 0.2 && Math.abs(pt.y - 8) < 0.2);
    const wezelP1 = p1.wierzcholkiM.find((pt) => Math.abs(pt.x - 100) < 0.2 && Math.abs(pt.y + 8) < 0.2);
    assert.ok(wezelL1 && wezelP1);
    const blisko = (pts: { x: number; y: number }[], cel: { x: number; y: number }) =>
      pts.some((pt) => Math.hypot(pt.x - cel.x, pt.y - cel.y) < 0.15);
    assert.ok(blisko(l2.wierzcholkiM, wezelL1!), 'żółty: ostatni L1 = pierwszy L2');
    assert.ok(blisko(p2.wierzcholkiM, wezelP1!), 'różowy: ostatni P1 = pierwszy P2');
    const os = caly.osTrasy!.wierzcholkiM;
    const koniec = os[os.length - 1];
    assert.ok(koniec.x > 145, `trasa nie jest ciągła, koniec x=${koniec.x} y=${koniec.y}`);
    assert.ok(Math.abs(koniec.y) < 12, `załamanie 90°, koniec x=${koniec.x} y=${koniec.y}`);
  });

  it('scalPztDoArkusza: drugi arkusz z innym początkiem XFDF dokleja się wzdłuż trasy', () => {
    const a1 = arkusz(
      'a1',
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      0,
      100,
      [{ x: 0, y: 5 }, { x: 0, y: -5 }, { x: 100, y: -5 }, { x: 100, y: 5 }],
    );
    const a2 = arkusz(
      'a2',
      [{ x: 40, y: 12 }, { x: 90, y: 12 }],
      100,
      150,
      [{ x: 40, y: 17 }, { x: 40, y: 7 }, { x: 90, y: 7 }, { x: 90, y: 17 }],
    );
    const caly = scalPztDoArkusza([a1, a2]);
    assert.ok(caly);
    assert.equal(caly!.id, CALY_PZT_ID);
    const os = caly!.osTrasy!.wierzcholkiM;
    assert.ok(os.length >= 3);
    assert.ok(Math.abs(os[0].x) < 1e-6 && Math.abs(os[0].y) < 1e-6);
    const koniec = os[os.length - 1];
    assert.ok(koniec.x > 145, `koniec x=${koniec.x}`);
    assert.ok(Math.abs(koniec.y) < 12, `załamanie, koniec y=${koniec.y}`);
    assert.equal(caly!.obszary.length, 2);
    assert.equal(caly!.kilometrazPoczatkowyM, 0);
    assert.equal(caly!.kilometrazKoncowyM, 150);
  });

  it('nie zawraca trasy, gdy ostatni odcinek poprzedniej osi to hak wstecz', () => {
    const a1 = arkusz(
      'a1',
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 98, y: 0.2 }],
      0,
      100,
      [{ x: 0, y: 5 }, { x: 0, y: -5 }, { x: 100, y: -5 }, { x: 100, y: 5 }],
    );
    const a2 = arkusz(
      'a2',
      [{ x: 0, y: 0 }, { x: 50, y: 0 }],
      100,
      150,
      [{ x: 0, y: 5 }, { x: 0, y: -5 }, { x: 50, y: -5 }, { x: 50, y: 5 }],
    );
    const caly = scalPztDoArkusza([a1, a2]);
    const os = caly!.osTrasy!.wierzcholkiM;
    const koniec = os[os.length - 1];
    assert.ok(koniec.x > 140, `ploter zawrócił, koniec x=${koniec.x} y=${koniec.y}`);
    assert.ok(Math.abs(koniec.y) < 8, `koniec y=${koniec.y}`);
  });

  it('ploter ma długość z etykiet XFDF, nie z krótszej kreski 1:500', () => {
    const a1 = arkusz(
      'a1',
      [{ x: 0, y: 0 }, { x: 390, y: 0 }],
      0,
      400,
      [{ x: 0, y: 4 }, { x: 0, y: -4 }, { x: 390, y: -4 }, { x: 390, y: 4 }],
    );
    a1.osTrasy = { ...a1.osTrasy!, dlugoscEtykietaM: 400, dlugoscM: 400 };
    const a2 = arkusz(
      'a2',
      [{ x: 0, y: 0 }, { x: 410, y: 0 }],
      400,
      822.07,
      [{ x: 0, y: 4 }, { x: 0, y: -4 }, { x: 410, y: -4 }, { x: 410, y: 4 }],
    );
    a2.osTrasy = { ...a2.osTrasy!, dlugoscEtykietaM: 422.07, dlugoscM: 422.07 };
    const caly = scalPztDoArkusza([a1, a2]);
    const os = caly!.osTrasy!.wierzcholkiM;
    const koniec = os[os.length - 1];
    assert.ok(Math.abs(koniec.x - 822.07) < 0.2, `trasa ${koniec.x} m, oczekiwane 822.07`);
    assert.ok(Math.abs(dlugoscPolilinii(os) - 822.07) < 0.2);
  });

  it('Ark_2_22 (ostatni PZT) idzie L→P, 422,07 m, i na ploterze nie zawraca', () => {
    const xml = readFileSync(join(process.cwd(), 'src/utils/fixtures/dk25_ark_2_22.xfdf'), 'utf8');
    const w = parsujXfdfTekst(xml, 'DK25M_kowarsko_2_22.xfdf');
    const osPdf = w.osTrasy?.wierzcholki ?? [];
    assert.ok(osPdf.length >= 50, `oś ma ${osPdf.length} pkt`);
    assert.ok(osPdf[0].x < osPdf[osPdf.length - 1].x, 'oś arkusza 2_22 powinna iść L→P');
    assert.ok(Math.abs((w.osTrasy?.dlugoscEtykietaM ?? 0) - 422.07) < 0.01);

    const a21 = arkusz(
      'a1',
      [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 396, y: 0.4 }],
      0,
      400,
      [{ x: 0, y: 8 }, { x: 0, y: -8 }, { x: 400, y: -8 }, { x: 400, y: 8 }],
    );
    const a22 = arkuszZWynikuXfdf(w, { kolejnosc: 22, kontynuacjaPoprzedniego: true });
    const [s21, s22] = zastosujKilometrazArkuszy([a21, a22], 0);
    assert.equal(dlugoscArkuszaM(s22), 422.07);
    assert.equal(s22.kilometrazPoczatkowyM, s21.kilometrazKoncowyM);
    assert.ok(Math.abs(s22.kilometrazKoncowyM - s21.kilometrazKoncowyM - 422.07) < 0.05);

    const caly = scalPztDoArkusza([s21, s22]);
    const os = caly!.osTrasy!.wierzcholkiM;
    const koniec = os[os.length - 1];
    assert.ok(koniec.x > 750, `ostatni arkusz zawrócił, koniec x=${koniec.x} y=${koniec.y}`);
    assert.ok(Math.abs(koniec.y) < 80, `koniec y=${koniec.y} – trasa nie powinna iść wstecz`);
    assert.equal(caly!.kilometrazPoczatkowyM, s21.kilometrazPoczatkowyM);
    assert.equal(caly!.kilometrazKoncowyM, s22.kilometrazKoncowyM);
  });
});
