import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { czynnikLuku, fm, liczbaZTekstu, odl, zoomWokol } from './geometria';
import {
  analizaLinii, celeDlaPunktu, dodajPunkt, dodajPunktPosredni, edytujLinie, geometriaLinii, horyzontInstrumentu,
  nowySzkicGeodezyjny, odlegloscPosredniegoOd, polacz, pozycjaPunktu, przesunPunkt, punktWidoczny, przelaczWarstwe,
  usunPunkt, ustawDlugoscLinii, warstwySzkicu, wygnijLinie, wysokoscPunktu, type SzkicGeodezyjny,
} from './szkic';
import {
  KATALOG_ELEMENTOW, dodajElement, edytujElement, geometriaWarstw, nowyPrzekroj, przeliczPomiar, przesunElement,
  punktyPomiarowe, szerokoscPrzekroju, ulozPrzekroj, usunElement, zWarstwami, zaglebienieElementu,
} from './przekroj';
import { rysunekPrzekroju, rysunekSzkicu, svgPrzekroju, svgSzkicu } from './rysunek';

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
    assert.ok(teksty.includes('5,00 m  1,40% →'), teksty.join(' | '));
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

  it('nawierzchnia bitumiczna: warstwy, szerokości i skos krawędzi', () => {
    let p = nowyPrzekroj('KR2', T, 'pr');
    p = dodajElement(p, KATALOG_ELEMENTOW.find((w) => w.id === 'asfalt')!);
    const e = p.elementy[0];
    assert.deepEqual(e.warstwy!.map((w) => [w.nazwa, w.grubosc]), [['Warstwa ścieralna', 4], ['Warstwa wiążąca', 5]]);
    assert.equal(e.wys, 9);
    const warstwy = [...e.warstwy!, { id: 'w3', nazwa: 'Podbudowa bitumiczna', grubosc: 8 }];
    p = edytujElement(p, e.id, { ...zWarstwami(warstwy), krawedzL: 1, krawedzP: 1 });
    const g = geometriaWarstw(p.elementy[0]);
    assert.equal(p.elementy[0].wys, 17);
    assert.deepEqual(g.map((x) => [x.gora, x.szerGora, x.szerDol]), [[0, 300, 308], [4, 308, 318], [9, 318, 334]]);
    p = edytujElement(p, e.id, { krawedzL: 0 });
    assert.deepEqual(geometriaWarstw(p.elementy[0]).map((x) => [x.lDol, x.pDol, x.szerDol]), [[0, 4, 304], [0, 9, 309], [0, 17, 317]]);
    p = edytujElement(p, e.id, { warstwy: warstwy.map((w, i) => (i === 1 ? { ...w, szer: 350 } : w)), krawedzP: 0 });
    assert.deepEqual(geometriaWarstw(p.elementy[0]).map((x) => x.szerGora), [300, 350, 350]);
    const teksty = rysunekPrzekroju(p, { s: 400, tx: 20, ty: 300 }, {}).filter((q) => q.t === 'tekst').map((q) => (q as { tekst: string }).tekst);
    assert.ok(teksty.includes('Warstwa ścieralna 4 cm'), teksty.join(' | '));
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
    assert.equal(u[2].lawaP, 5);
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
