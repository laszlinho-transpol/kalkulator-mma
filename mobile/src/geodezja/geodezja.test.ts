import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { czynnikLuku, fm, liczbaZTekstu, odl, zoomWokol } from './geometria';
import {
  analizaLinii, celeDlaPunktu, dodajPunkt, dodajPunktPosredni, edytujLinie, geometriaLinii, horyzontInstrumentu,
  nowySzkicGeodezyjny, odlegloscPosredniegoOd, polacz, pozycjaPunktu, przesunPunkt, punktWidoczny, przelaczWarstwe,
  usunPunkt, ustawDlugoscLinii, warstwySzkicu, wygnijLinie, wysokoscPunktu, type SzkicGeodezyjny,
} from './szkic';
import {
  KATALOG_ELEMENTOW, dodajElement, domyslnyOpor, edytujElement, geometriaWarstw, kopiaPrzekroju, normalizujPrzekroj, nowaWarstwa,
  nowyPrzekroj, przeliczPomiar, przesunElement, przesunWarstwe, punktyPomiarowe, szerokoscPrzekroju, ulozPrzekroj, usunElement,
  wypelnienieWarstwy, zWarstwami, zaglebienieElementu, type ElementPrzekroju,
} from './przekroj';
import {
  PAPIER, probkaWypelnienia, rysunekPrzekroju, rysunekSzkicu, svgPrzekroju, svgSzkicu, widokPrzekroju, wypelnionyWielokat, zakresPrzekroju,
} from './rysunek';
import { dodajSzczegolBudowy, usunSzczegolBudowy, zapiszSzczegolBudowy } from './szczegolyBudowy';
import { pustyProjektBudowy } from '../utils/projektBudowy';
import { wierzcholekLuku } from './luk';

const T = new Date('2026-10-20T10:00:00Z');
const blisko = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

function dwaPunkty(): { s: SzkicGeodezyjny; a: string; b: string; l: string } {
  let s = nowySzkicGeodezyjny('Test', T, 'sz');
  const r1 = dodajPunkt(s, { x: 0, y: 0 }, { odczyt: 1230, warstwa: 'Lewa krawędź' }, 'p1');
  const r2 = dodajPunkt(r1.szkic, { x: 3, y: 4 }, { odczyt: 1300, warstwa: 'Lewa krawędź' }, 'p2');
  const { szkic, linia } = polacz(r2.szkic, 'p1', 'p2', 'l1');
  s = szkic;
  return { s, a: 'p1', b: 'p2', l: linia!.id };
}

describe('szkic geodezyjny – punkty', () => {
  it('numeruje punkty narastająco, nazwa domyślnie = numer, warstwy z pierwszego użycia', () => {
    const { s } = dwaPunkty();
    assert.deepEqual(s.punkty.map((p) => [p.nr, p.nazwa]), [[1, '1'], [2, '2']]);
    const r = dodajPunkt(s, { x: 1, y: 1 }, { nazwa: '  ', warstwa: ' Oś ' });
    assert.equal(r.punkt.nazwa, '3');
    assert.deepEqual(warstwySzkicu(r.szkic), ['Lewa krawędź', 'Oś']);
  });

  it('filtr warstw ukrywa punkty', () => {
    const { s } = dwaPunkty();
    const ukryty = przelaczWarstwe(s, 'Lewa krawędź');
    assert.equal(punktWidoczny(ukryty, ukryty.punkty[0]), false);
    assert.equal(punktWidoczny(przelaczWarstwe(ukryty, 'Lewa krawędź'), ukryty.punkty[0]), true);
  });

  it('odczyt przelicza się na rzędną z horyzontu instrumentu', () => {
    let { s } = dwaPunkty();
    assert.equal(horyzontInstrumentu(s), null);
    assert.equal(wysokoscPunktu(s, 'p2')?.uklad, 'odczyt');
    s = { ...s, punkty: s.punkty.map((p) => (p.id === 'p1' ? { ...p, rzedna: 100 } : p)) };
    blisko(horyzontInstrumentu(s)!, 101.23);
    blisko(wysokoscPunktu(s, 'p2')!.rzedna!, 99.93);
    const r = dodajPunkt(s, { x: 9, y: 9 }, { rzedna: 100.5 }, 'p3');
    assert.equal(wysokoscPunktu(r.szkic, 'p3')!.odczyt, 730);
  });

  it('usunięcie punktu usuwa jego linie i punkty pośrednie', () => {
    const { s } = dwaPunkty();
    const { szkic } = dodajPunktPosredni(s, 'p1', 'p2', 2);
    const po = usunPunkt(szkic, 'p2');
    assert.equal(po.linie.length, 0);
    assert.deepEqual(po.punkty.map((p) => p.id), ['p1']);
  });
});

describe('szkic geodezyjny – linie, spadki, cel', () => {
  it('spadek z odczytów: 1230 i 1300 mm na 5 m = 1,4% w stronę punktu 2', () => {
    const { s } = dwaPunkty();
    const an = analizaLinii(s, s.linie[0])!;
    blisko(an.dlugosc, 5);
    blisko(an.spadek!, 1.4);
    assert.equal(an.wDol, 'b');
  });

  it('cel 2% z 1 do 2: odczyt 1330 mm, różnica −30 mm', () => {
    const { s, l } = dwaPunkty();
    const z = edytujLinie(s, l, { cel: { spadek: 2, od: 'a' } });
    const [c] = celeDlaPunktu(z, 'p2');
    assert.equal(c.odczyt, 1330);
    blisko(c.roznica!, -0.03);
    assert.equal(celeDlaPunktu(z, 'p1').length, 0);
    const odwrotny = edytujLinie(s, l, { cel: { spadek: 2, od: 'b' } });
    assert.equal(celeDlaPunktu(odwrotny, 'p1')[0].odczyt, 1400);
  });

  it('cel 2% z 1 do 2, ale zostaje punkt 2: ustawiany jest punkt 1 (1200 mm, +30 mm)', () => {
    const { s, l } = dwaPunkty();
    const z = edytujLinie(s, l, { cel: { spadek: 2, od: 'a', kotwica: 'b' } });
    assert.equal(celeDlaPunktu(z, 'p2').length, 0);
    const [c] = celeDlaPunktu(z, 'p1');
    assert.equal(c.odczyt, 1200);
    blisko(c.roznica!, 0.03);
    const { szkic, punkt } = dodajPunktPosredni(z, 'p1', 'p2', 2);
    assert.equal(celeDlaPunktu(szkic, punkt!.id)[0].odczyt, 1240);
  });

  it('ustawienie długości przesuwa punkt 2 wzdłuż linii (proporcje szkicu)', () => {
    const { s, l } = dwaPunkty();
    const z = ustawDlugoscLinii(s, l, 10);
    const p2 = pozycjaPunktu(z, 'p2')!;
    blisko(p2.x, 6);
    blisko(p2.y, 8);
    blisko(analizaLinii(z, z.linie[0])!.spadek!, 0.7);
  });

  it('przesuwanie z blokadą trzyma zadaną odległość, kierunek wybiera palec', () => {
    const { s, l } = dwaPunkty();
    const z = przesunPunkt(s, 'p2', { x: 0, y: -2 }, { liniaId: l, dlugosc: 10 });
    const p2 = pozycjaPunktu(z, 'p2')!;
    blisko(p2.x, 0);
    blisko(p2.y, -10);
    const wolny = przesunPunkt(s, 'p2', { x: 1, y: 1 });
    blisko(odl(pozycjaPunktu(wolny, 'p1')!, pozycjaPunktu(wolny, 'p2')!), Math.SQRT2);
  });

  it('wygięcie linii w łuk wydłuża ją; długość ustawiona na łuku jest dokładna', () => {
    const { s, l } = dwaPunkty();
    const g = geometriaLinii(s, s.linie[0])!;
    const z = wygnijLinie(s, l, { x: g.m.x + 0.8 * 2, y: g.m.y - 0.6 * 2 });
    const lz = z.linie[0];
    assert.ok(Math.abs(lz.wygiecie) > 0.3);
    const gz = geometriaLinii(z, lz)!;
    assert.ok(gz.dlugosc > 5.5);
    blisko(gz.dlugosc / odl(gz.a, gz.b), czynnikLuku(lz.wygiecie), 1e-9);
    const d = ustawDlugoscLinii(z, l, 12);
    blisko(geometriaLinii(d, d.linie[0])!.dlugosc, 12, 1e-6);
  });

  it('punkt pośredni: 3 m od punktu 1, rzędna z interpolacji, cel z linii', () => {
    const { s, l } = dwaPunkty();
    const zCelem = edytujLinie(s, l, { cel: { spadek: 2, od: 'a' } });
    const { szkic, punkt } = dodajPunktPosredni(zCelem, 'p1', 'p2', 3);
    assert.ok(punkt);
    assert.equal(punkt!.warstwa, 'Lewa krawędź');
    const poz = pozycjaPunktu(szkic, punkt!.id)!;
    blisko(poz.x, 1.8);
    blisko(poz.y, 2.4);
    const h = wysokoscPunktu(szkic, punkt!.id)!;
    assert.equal(h.odczyt, 1272);
    assert.equal(h.wyliczona, true);
    const [c] = celeDlaPunktu(szkic, punkt!.id);
    assert.equal(c.odczyt, 1290);
    assert.equal(c.roznica, undefined);
    const wlasny = { ...szkic, punkty: szkic.punkty.map((p) => (p.id === punkt!.id ? { ...p, cel: { spadek: 1, od: 'a' as const } } : p)) };
    assert.equal(celeDlaPunktu(wlasny, punkt!.id)[0].odczyt, 1260);
  });

  it('punkt pośredni od drugiego końca liczy odległość od wskazanego punktu i śledzi linię', () => {
    const { s } = dwaPunkty();
    const { szkic, punkt } = dodajPunktPosredni(s, 'p2', 'p1', 1);
    blisko(odlegloscPosredniegoOd(szkic, punkt!.id, 'p2')!, 1);
    const przesuniety = przesunPunkt(szkic, 'p2', { x: 6, y: 8 });
    blisko(odl(pozycjaPunktu(przesuniety, punkt!.id)!, { x: 0, y: 0 }), 4);
    const posuwany = przesunPunkt(szkic, punkt!.id, { x: 0.6, y: 0.8 });
    blisko(odlegloscPosredniegoOd(posuwany, punkt!.id, 'p1')!, 1, 1e-3);
  });
});

describe('przekrój poprzeczny', () => {
  const wzor = (id: string) => KATALOG_ELEMENTOW.find((w) => w.id === id)!;

  function przekroj() {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, wzor('ob-6x20'));
    p = dodajElement(p, wzor('kb-8'));
    p = dodajElement(p, wzor('kr-15x30'));
    p = dodajElement(p, wzor('asfalt'));
    return p;
  }

  it('katalog zawiera wszystkie elementy z listy', () => {
    const nazwy = KATALOG_ELEMENTOW.map((w) => w.nazwa).join('|');
    for (const f of ['20×30', '15×30', 'najazdowy 20×22', 'najazdowy 15×22', 'trapezowy', 'Obrzeże 8×30', 'Obrzeże 6×20', 'Opornik 12×25', 'ściekowe', 'muldowe', 'betonowa 8', 'betonowa 6', '8/11', '15/17']) {
      assert.ok(nazwy.includes(f), f);
    }
  });

  it('układ od lewej do prawej: skoki, spadki, punkty pomiarowe', () => {
    const p = przekroj();
    const u = ulozPrzekroj(p);
    assert.deepEqual(u.map((e) => e.element.skok), [0, -2, 12, -12]);
    blisko(u[1].hP, -2 - 3);
    blisko(u[3].hL, u[2].hP - 12);
    blisko(u[3].hP, u[3].hL - 6);
    assert.equal(szerokoscPrzekroju(p), 6 + 150 + 15 + 300);
    assert.equal(u[3].skrocony, true);
    assert.equal(u.flatMap((e) => e.punkty).length, 6);
  });

  it('jeden odczyt przelicza odczyty i rzędne pozostałych punktów', () => {
    let p = przekroj();
    const kraw = p.elementy[2].id;
    p = { ...p, pomiar: { klucz: `${kraw}:s`, odczyt: 1500, rzedna: 120.5 } };
    const w = przeliczPomiar(p);
    const k = w.find((q) => q.klucz === `${kraw}:s`)!;
    assert.equal(k.odczyt, 1500);
    assert.equal(k.wpisany, true);
    const jezdniaL = w.find((q) => q.klucz === `${p.elementy[3].id}:l`)!;
    assert.equal(jezdniaL.odczyt, 1620);
    blisko(jezdniaL.rzedna!, 120.38);
    const os = w[w.length - 1];
    assert.equal(os.wzgledem0, 0);
    assert.equal(jezdniaL.wzgledem0, 6);
  });

  it('edycja, przestawianie i usuwanie elementów', () => {
    let p = przekroj();
    const id = p.elementy[1].id;
    p = edytujElement(p, id, { szer: 200, spadek: -2 });
    assert.ok(ulozPrzekroj(p)[1].hP > ulozPrzekroj(p)[1].hL);
    p = przesunElement(p, id, -1);
    assert.equal(p.elementy[0].id, id);
    p = { ...p, pomiar: { klucz: `${id}:l`, odczyt: 1000 } };
    p = usunElement(p, id);
    assert.equal(p.elementy.length, 3);
    assert.equal(p.pomiar, undefined);
  });
});

describe('rysunek i SVG', () => {
  it('szkic rysuje odległość, spadek ze strzałką i zielony cel', () => {
    const { s, l } = dwaPunkty();
    const z = edytujLinie(s, l, { cel: { spadek: 2, od: 'a' } });
    const pr = rysunekSzkicu(z, { s: 40, tx: 100, ty: 100 }, { szer: 400, wys: 400 });
    const teksty = pr.filter((p) => p.t === 'tekst').map((p) => (p as { tekst: string }).tekst);
    assert.ok(teksty.includes('5,00 m'), teksty.join(' | '));
    assert.ok(teksty.includes('(1,40% →)'), teksty.join(' | '));
    assert.ok(teksty.includes('cel 2,00% →'));
    assert.ok(teksty.includes('cel 1330 mm'));
    assert.ok(teksty.includes('Δh -30 mm'));
    const { svg } = svgSzkicu(z);
    assert.ok(svg.startsWith('<svg') && svg.includes('cel 1330 mm'));
  });

  it('przekrój: trójkąty, wymiary, eksport SVG', () => {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    const pr = rysunekPrzekroju(p, { s: 100, tx: 20, ty: 300 }, { pomiar: true });
    const teksty = pr.filter((q) => q.t === 'tekst').map((q) => (q as { tekst: string }).tekst);
    assert.ok(teksty.includes('3,20 m'));
    assert.ok(teksty.includes('3,00'));
    assert.ok(svgPrzekroju(p).svg.includes('<path'));
    assert.equal(fm(-0.0001, 2), '0,00');
  });

  it('pomiar: odczyt łaty w nawiasie, rzędna tylko w eksporcie', () => {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    p = { ...p, pomiar: { klucz: `${p.elementy[0].id}:s`, odczyt: 1500, rzedna: 120.4 } };
    const teksty = rysunekPrzekroju(p, { s: 100, tx: 20, ty: 300 }, { pomiar: true })
      .filter((q) => q.t === 'tekst').map((q) => (q as { tekst: string }).tekst);
    assert.ok(teksty.includes('+18  (1500)'), teksty.join(' | '));
    assert.ok(teksty.includes('0  (1680)'));
    assert.ok(!teksty.some((t) => t.includes('H 120')));
    assert.ok(svgPrzekroju(p).svg.includes('H 120,400'));
  });

  it('jezdnia – konstrukcja: podbudowa jako warstwa, odsadzki, skosy, strony i kolejność', () => {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    const e = p.elementy[0];
    assert.equal(e.nazwa, 'Jezdnia – konstrukcja');
    assert.deepEqual(e.warstwy!.map((w) => [w.nazwa, w.grubosc, w.wypelnienie]), [
      ['Warstwa ścieralna', 4, 'asfalt'], ['Warstwa wiążąca', 5, 'asfalt_jasny'], ['Podbudowa', 20, 'kruszywo'],
    ]);
    assert.equal(e.wys, 29);
    assert.equal(e.podbudowa, undefined);
    const skos = e.warstwy!.map((w, i) => ({ ...w, skos: 1, odsadzka: i === 2 ? 5 : undefined }));
    p = edytujElement(p, e.id, zWarstwami(skos));
    assert.deepEqual(geometriaWarstw(p.elementy[0]).map((x) => [x.gora, x.szerGora, x.szerDol]), [[0, 300, 308], [4, 308, 318], [9, 328, 368]]);
    p = edytujElement(p, e.id, { strony: 'prawa' });
    assert.deepEqual(geometriaWarstw(p.elementy[0]).map((x) => [x.lDol, x.pDol, x.szerDol]), [[0, 4, 304], [0, 9, 309], [0, 34, 334]]);
    p = edytujElement(p, e.id, { strony: 'brak' });
    assert.deepEqual(geometriaWarstw(p.elementy[0]).map((x) => x.szerDol), [300, 300, 300]);
    const odwrocone = przesunWarstwe(p.elementy[0].warstwy!, skos[2].id, -1);
    assert.deepEqual(odwrocone.map((w) => w.nazwa), ['Warstwa ścieralna', 'Podbudowa', 'Warstwa wiążąca']);
    assert.equal(przesunWarstwe(odwrocone, skos[0].id, -1), odwrocone);
    const nowa = nowaWarstwa(skos, 'n');
    assert.equal(nowa.nazwa, 'Podbudowa zasadnicza');
    assert.equal(wypelnienieWarstwy({ id: 'x', nazwa: 'Warstwa mrozoochronna', grubosc: 20 }, 3), 'grunt');
    const teksty = rysunekPrzekroju(p, { s: 400, tx: 20, ty: 300 }, {}).filter((q) => q.t === 'tekst');
    const scieralna = teksty.find((q) => (q as { tekst: string }).tekst === 'Warstwa ścieralna 4 cm') as { kolor: string } | undefined;
    const podbudowa = teksty.find((q) => (q as { tekst: string }).tekst === 'Podbudowa 20 cm') as { kolor: string } | undefined;
    assert.equal(scieralna?.kolor, '#FFFFFF');
    assert.equal(podbudowa?.kolor, PAPIER.tusz);
  });

  it('zapis 1.8.52 (podbudowa, skos krawędzi, szerokość warstwy) jest ujednolicany', () => {
    const stary: ElementPrzekroju = {
      id: 'j', wzor: 'asfalt', nazwa: 'Jezdnia – nawierzchnia bitumiczna', ksztalt: 'asfalt', typ: 'pas', szer: 300, wys: 9, skok: 0,
      spadek: 2, podbudowa: 20, krawedzL: 1, krawedzP: 0,
      warstwy: [{ id: 'a', nazwa: 'Warstwa ścieralna', grubosc: 4, szer: 320 }, { id: 'b', nazwa: 'Warstwa wiążąca', grubosc: 5 }],
    };
    const p = normalizujPrzekroj({ ...nowyPrzekroj('S', T, 's'), elementy: [stary] });
    const e = p.elementy[0];
    assert.equal(e.nazwa, 'Jezdnia – konstrukcja');
    assert.equal(e.wys, 29);
    assert.equal(e.podbudowa, undefined);
    assert.equal(e.strony, 'lewa');
    assert.equal(e.krawedzL, undefined);
    assert.deepEqual(e.warstwy!.map((w) => [w.nazwa, w.grubosc, w.skos ?? 0, w.szer]), [
      ['Warstwa ścieralna', 4, 1, undefined], ['Warstwa wiążąca', 5, 1, undefined], ['Podbudowa', 20, 0, undefined],
    ]);
    assert.equal(normalizujPrzekroj(p), p);
    assert.equal(ulozPrzekroj({ ...nowyPrzekroj('S', T, 's'), elementy: [stary] })[0].element.wys, 29);
  });

  it('wzory wypełnień przycięte do warstwy, kropki w środku', () => {
    const wiel = [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 130, y: 60 }, { x: -10, y: 60 }];
    const wewnatrz = (x: number, y: number) => y >= 9.8 && y <= 60.2 && x >= -10.2 + ((60 - y) / 50) * 20 - 0.2 && x <= 130.2 - ((60 - y) / 50) * 20 + 0.2;
    const punkty = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    for (const wyp of ['ukosne', 'ukosne_odwrotne', 'kratka', 'kratka_ukosna', 'kreski', 'kropki', 'kruszywo', 'beton', 'grunt'] as const) {
      const pr = wypelnionyWielokat(wiel, wyp, { kotwica: { x: 3, y: 7 } });
      const wzor = pr.slice(1, -1).filter((q) => q.t === 'sciezka') as { d: string }[];
      assert.ok(wzor.length > 0, wyp);
      for (const q of wzor) for (const [x, y] of punkty(q.d)) assert.ok(wewnatrz(x, y), `${wyp}: ${x} ${y}`);
    }
    const kratka = wypelnionyWielokat(wiel, 'kratka');
    assert.ok((kratka[1] as { d: string }).d.split('M').length > 20);
    assert.equal(wypelnionyWielokat(wiel, 'asfalt').length, 2);
    const daleko = wypelnionyWielokat(wiel, 'kropki', { obszar: { szer: 20, wys: 20 } });
    for (const [x, y] of punkty((daleko[1] as { d: string }).d)) assert.ok(x <= 40 && y <= 40);
    assert.equal(probkaWypelnienia('kratka', 30, 20).length, 3);
  });

  it('ława: grubość, szerokość i opór z wysokością od góry', () => {
    let p = nowyPrzekroj('K', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    const id = p.elementy[0].id;
    const dol = () => zakresPrzekroju(p)!.maxY;
    blisko(dol(), 0.45);
    p = edytujElement(p, id, { lawaGrubosc: 25 });
    blisko(dol(), 0.55);
    p = edytujElement(p, id, { lawaSzer: 40 });
    let u = ulozPrzekroj(p)[0];
    assert.deepEqual([u.lawaL, u.lawaP], [10, 10]);
    p = edytujElement(p, id, { opor: { strona: 'l', szer: 12, odGory: 10 } });
    u = ulozPrzekroj(p)[0];
    assert.deepEqual([u.lawaL, u.lawaP], [16, 4]);
    blisko(zakresPrzekroju(p)!.minX, -0.16);
    const opor = rysunekPrzekroju(p, { s: 100, tx: 100, ty: 100 }, { bezOpisow: true });
    const bez = rysunekPrzekroju(edytujElement(p, id, { lawa: false }), { s: 100, tx: 100, ty: 100 }, { bezOpisow: true });
    assert.ok(opor.length > bez.length + 3);
    assert.ok(opor.some((q) => q.t === 'sciezka' && q.d === 'M100 130L88 130L94 110L100 110Z'), JSON.stringify(opor.slice(0, 12)));
    assert.equal(domyslnyOpor({ wys: 30, odwroc: true }).strona, 'p');
  });

  it('wymiary wysokości z lewej: punkty łaty i spód konstrukcji', () => {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    const w = widokPrzekroju(p, 800, 600);
    const pr = rysunekPrzekroju(p, w, {});
    const pionowe = pr.filter((q) => q.t === 'tekst' && q.obrot === -90 && q.rozmiar === 10).map((q) => (q as { tekst: string; x: number }));
    assert.deepEqual(pionowe.map((q) => q.tekst), ['12', '6', '29']);
    const lewaKrawedz = zakresPrzekroju(p)!.minX * w.s + w.tx;
    assert.ok(pionowe.every((q) => q.x < lewaKrawedz - 15 && q.x > 0), `${pionowe.map((q) => q.x)} ${lewaKrawedz}`);
  });

  it('korytko: zagłębienie wymiarowane i zmienne, łata w dnie', () => {
    let p = nowyPrzekroj('K', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'ko-sciekowe')!);
    assert.equal(zaglebienieElementu(p.elementy[0]), 3);
    assert.equal(punktyPomiarowe(p)[0].h, -3);
    p = edytujElement(p, p.elementy[0].id, { zaglebienie: 5 });
    assert.equal(punktyPomiarowe(p)[0].h, -5);
    const teksty = rysunekPrzekroju(p, { s: 400, tx: 20, ty: 300 }, {}).filter((q) => q.t === 'tekst').map((q) => (q as { tekst: string }).tekst);
    assert.ok(teksty.includes('5 cm'), teksty.join(' | '));
  });

  it('ława nie wchodzi pod sąsiedni element', () => {
    let p = nowyPrzekroj('K', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'kb-8')!);
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    p = dodajElement(p, KATALOG_ELEMENTOW[0]);
    const u = ulozPrzekroj(p);
    assert.equal(u[1].lawaL, 0);
    assert.equal(u[1].lawaP, 0);
    assert.equal(u[2].lawaL, 0);
    assert.equal(u[2].lawaP, 0);
    p = edytujElement(p, p.elementy[2].id, { lawaSzer: 30 });
    const u2 = ulozPrzekroj(p)[2];
    assert.deepEqual([u2.lawaL, u2.lawaP], [0, 10]);
  });

  it('szczegół budowy to niezależna kopia szablonu', () => {
    let szablon = nowyPrzekroj('KR2', T, 'sz');
    szablon = dodajElement(szablon, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    szablon = { ...szablon, opis: 'Jezdnia główna', pomiar: { klucz: `${szablon.elementy[0].id}:l`, odczyt: 1200 }, archiwum: true };
    let projekt = dodajSzczegolBudowy(pustyProjektBudowy(), szablon, T);
    const s = projekt.szczegoly![0];
    assert.notEqual(s.id, szablon.id);
    assert.equal(s.szablonId, szablon.id);
    assert.equal(s.opis, 'Jezdnia główna');
    assert.equal(s.pomiar, undefined);
    assert.equal(s.archiwum, undefined);
    projekt = zapiszSzczegolBudowy(projekt, edytujElement(s, s.elementy[0].id, { szer: 500 }), T);
    assert.equal(projekt.szczegoly![0].elementy[0].szer, 500);
    assert.equal(szablon.elementy[0].szer, 300);
    projekt = dodajSzczegolBudowy(projekt, undefined, T);
    assert.equal(projekt.szczegoly![1].nazwa, 'Szczegół 2');
    assert.equal(usunSzczegolBudowy(projekt, s.id).szczegoly!.length, 1);
    assert.notEqual(kopiaPrzekroju(szablon, T).elementy[0], szablon.elementy[0]);
  });

  it('liczba ujemna z minusem typograficznym', () => {
    assert.equal(liczbaZTekstu('−12,5'), -12.5);
    assert.equal(liczbaZTekstu('-'), undefined);
  });

  it('zoom wokół punktu trzyma punkt pod kursorem', () => {
    const w = zoomWokol({ s: 10, tx: 5, ty: 5 }, 40, { x: 100, y: 50 });
    blisko((100 - w.tx) / w.s, (100 - 5) / 10);
  });
});

describe('wierzchołek łuku', () => {
  it('X = R − √(R² − (c/2)²): c 20 m, R 100 m → 0,501 m', () => {
    const w = wierzcholekLuku(20, 100)!;
    blisko(w.x, 0.50126, 1e-4);
    blisko(w.polowa, 10);
    blisko(w.dlugoscLuku, 20.0335, 1e-4);
    blisko(w.kat, 11.4783, 1e-4);
  });

  it('półokrąg i cięciwa dłuższa niż średnica', () => {
    blisko(wierzcholekLuku(30, 15)!.x, 15);
    assert.equal(wierzcholekLuku(31, 15), null);
    assert.equal(wierzcholekLuku(0, 15), null);
  });
});
