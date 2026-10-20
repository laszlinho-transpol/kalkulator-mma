// Rysunek szkicu i przekroju jako lista prymitywów w pikselach ekranu – ten sam opis rysuje ekran
// (react-native-svg) i plik SVG/PDF do udostępnienia.

import { fm, naEkran, odl, zeZnakiem, type Pkt, type Widok } from './geometria';
import {
  analizaLinii, celeDlaPunktu, geometriaLinii, horyzontInstrumentu, liniaWidoczna, polaWyliczone, pozycjaPunktu,
  punktWidoczny, sciezkaLinii, warstwySzkicu, wysokoscPunktu, type SzkicGeodezyjny,
} from './szkic';
import {
  KSZTALTY, kluczZera, modulKostki, przeliczPomiar, szerokoscPrzekroju, ulozPrzekroj, type Komenda,
  type PrzekrojPoprzeczny, type UlozonyElement,
} from './przekroj';

export type Prymityw =
  | { t: 'sciezka'; d: string; kolor?: string; grubosc?: number; wypelnienie?: string; kreska?: string; krycie?: number }
  | { t: 'kolo'; x: number; y: number; r: number; wypelnienie: string; kolor?: string; grubosc?: number; kreska?: string }
  | {
    t: 'tekst';
    x: number;
    y: number;
    tekst: string;
    kolor: string;
    rozmiar: number;
    pogrubiony?: boolean;
    kursywa?: boolean;
    kotwica?: 'start' | 'middle' | 'end';
    obrot?: number;
    /** Obwódka w kolorze kartki – czytelny napis na liniach siatki. */
    halo?: boolean;
  };

/** Kartka szkicownika – rysunek „jak na papierze” (w obu motywach). */
export const PAPIER = {
  tlo: '#FBF9F1',
  siatka: '#D6E4F0',
  siatkaMocna: '#A9C6DE',
  tusz: '#1F2A44',
  olowek: '#5B6475',
  wyliczony: '#7A808C',
  cel: '#15803D',
  zaznaczenie: '#E8A020',
  spadek: '#1D4ED8',
  beton: '#C9CBCF',
  betonCiemny: '#9CA3AF',
  asfalt: '#3F4652',
  kostka: '#D9D2C3',
  kamien: '#BDB6A8',
  podbudowa: '#EDE6D6',
} as const;

const KOLORY_WARSTW = ['#C2410C', '#1D4ED8', '#7C3AED', '#0F766E', '#B91C1C', '#A16207', '#BE185D', '#0369A1'];

export function kolorWarstwy(s: SzkicGeodezyjny, warstwa: string | undefined): string {
  const i = warstwa ? warstwySzkicu(s).indexOf(warstwa.trim()) : -1;
  return i < 0 ? PAPIER.olowek : KOLORY_WARSTW[i % KOLORY_WARSTW.length];
}

// ------------------------------------------------------------
// Siatka kartki
// ------------------------------------------------------------

export function siatka(w: Widok, szer: number, wys: number, bok: number): Prymityw[] {
  if (!(bok > 0)) return [];
  let krok = bok;
  while (krok * w.s < 8) krok *= 5;
  const x0 = Math.floor(-w.tx / w.s / krok) * krok;
  const x1 = (szer - w.tx) / w.s;
  const y0 = Math.floor(-w.ty / w.s / krok) * krok;
  const y1 = (wys - w.ty) / w.s;
  let cienka = '';
  let mocna = '';
  const co5 = (v: number) => Math.abs(Math.round(v / krok) % 5) === 0;
  for (let x = x0; x <= x1; x += krok) {
    const sx = Math.round(x * w.s + w.tx) + 0.5;
    const seg = `M${sx} 0V${wys}`;
    if (co5(x)) mocna += seg;
    else cienka += seg;
  }
  for (let y = y0; y <= y1; y += krok) {
    const sy = Math.round(y * w.s + w.ty) + 0.5;
    const seg = `M0 ${sy}H${szer}`;
    if (co5(y)) mocna += seg;
    else cienka += seg;
  }
  const wynik: Prymityw[] = [];
  if (cienka) wynik.push({ t: 'sciezka', d: cienka, kolor: PAPIER.siatka, grubosc: 1 });
  if (mocna) wynik.push({ t: 'sciezka', d: mocna, kolor: PAPIER.siatkaMocna, grubosc: 1 });
  return wynik;
}

// ------------------------------------------------------------
// Szkic geodezyjny – rzut z góry
// ------------------------------------------------------------

export interface OpcjeRysunkuSzkicu {
  szer: number;
  wys: number;
  zaznaczonyPunkt?: string | null;
  zaznaczonaLinia?: string | null;
  /** Punkty wybrane w trybie analizy (łączenie / punkty pośrednie). */
  wybrane?: string[];
  /** Uchwyty wyginania w środku linii. */
  uchwyty?: boolean;
  /** Linie przyciągania długości (podczas przeciągania z blokadą). */
  okregBlokady?: { srodek: Pkt; r: number } | null;
}

/** Kąt napisu wzdłuż odcinka – zawsze czytelny (nie do góry nogami). */
function katNapisu(a: Pkt, b: Pkt): number {
  let kat = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  if (kat > 90) kat -= 180;
  if (kat <= -90) kat += 180;
  return kat;
}

function strzalka(kat: number, z: Pkt, ku: Pkt): string {
  const r = (kat * Math.PI) / 180;
  return (ku.x - z.x) * Math.cos(r) + (ku.y - z.y) * Math.sin(r) >= 0 ? '→' : '←';
}

export function rysunekSzkicu(s: SzkicGeodezyjny, w: Widok, o: OpcjeRysunkuSzkicu): Prymityw[] {
  const wynik: Prymityw[] = [];
  if (s.siatka) wynik.push(...siatka(w, o.szer, o.wys, s.bokSiatki));
  const E = (p: Pkt) => naEkran(w, p);

  if (o.okregBlokady) {
    const c = E(o.okregBlokady.srodek);
    wynik.push({ t: 'kolo', x: c.x, y: c.y, r: o.okregBlokady.r * w.s, wypelnienie: 'none', kolor: PAPIER.zaznaczenie, grubosc: 1.2, kreska: '6 5' });
  }

  for (const l of s.linie) {
    if (!liniaWidoczna(s, l)) continue;
    const g = geometriaLinii(s, l);
    if (!g) continue;
    const zazn = o.zaznaczonaLinia === l.id;
    if (zazn) wynik.push({ t: 'sciezka', d: sciezkaLinii(g, E), kolor: PAPIER.zaznaczenie, grubosc: 7, krycie: 0.45 });
    wynik.push({ t: 'sciezka', d: sciezkaLinii(g, E), kolor: PAPIER.tusz, grubosc: 1.8 });

    const a = E(g.a);
    const b = E(g.b);
    const m = E(g.m);
    const kat = katNapisu(a, b);
    const r = (kat * Math.PI) / 180;
    const gora = { x: Math.sin(r), y: -Math.cos(r) };
    const an = analizaLinii(s, l);
    let napis = `${fm(an?.dlugosc ?? g.dlugosc, 2)} m`;
    if (an?.spadek != null && an.wDol) {
      const [z, ku] = an.wDol === 'b' ? [a, b] : [b, a];
      napis += `  ${fm(an.spadek, 2)}% ${strzalka(kat, z, ku)}`;
    }
    wynik.push({
      t: 'tekst', x: m.x + gora.x * 7, y: m.y + gora.y * 7, tekst: napis, kolor: PAPIER.tusz, rozmiar: 12,
      pogrubiony: true, kotwica: 'middle', obrot: kat, halo: true,
    });
    if (l.cel) {
      const [z, ku] = l.cel.od === 'a' ? [a, b] : [b, a];
      wynik.push({
        t: 'tekst', x: m.x - gora.x * 17, y: m.y - gora.y * 17, tekst: `cel ${fm(l.cel.spadek, 2)}% ${strzalka(kat, z, ku)}`,
        kolor: PAPIER.cel, rozmiar: 12, pogrubiony: true, kotwica: 'middle', obrot: kat, halo: true,
      });
    }
    if (o.uchwyty && odl(a, b) > 28) {
      wynik.push({ t: 'kolo', x: m.x, y: m.y, r: 5.5, wypelnienie: PAPIER.tlo, kolor: PAPIER.olowek, grubosc: 1.2, kreska: '2 2' });
    }
  }

  for (const p of [...s.punkty].sort((a, b) => a.nr - b.nr)) {
    if (!punktWidoczny(s, p)) continue;
    const poz = pozycjaPunktu(s, p.id);
    if (!poz) continue;
    const e = E(poz);
    const kolor = kolorWarstwy(s, p.warstwa);
    const zazn = o.zaznaczonyPunkt === p.id || o.wybrane?.includes(p.id);
    if (zazn) wynik.push({ t: 'kolo', x: e.x, y: e.y, r: 12, wypelnienie: `${PAPIER.zaznaczenie}55`, kolor: PAPIER.zaznaczenie, grubosc: 2 });
    if (p.naLinii) {
      wynik.push({ t: 'kolo', x: e.x, y: e.y, r: 4.5, wypelnienie: PAPIER.tlo, kolor, grubosc: 2.2 });
    } else {
      wynik.push({ t: 'kolo', x: e.x, y: e.y, r: 5, wypelnienie: kolor, kolor: PAPIER.tusz, grubosc: 1 });
    }
    if (o.wybrane?.includes(p.id) && o.wybrane.length > 1) {
      wynik.push({ t: 'tekst', x: e.x, y: e.y + 4, tekst: String(o.wybrane.indexOf(p.id) + 1), kolor: PAPIER.tusz, rozmiar: 10, pogrubiony: true, kotwica: 'middle' });
    }
    wynik.push({ t: 'tekst', x: e.x + 8, y: e.y - 8, tekst: p.nazwa, kolor, rozmiar: 13, pogrubiony: true, halo: true });

    let y = e.y + 14;
    const h = wysokoscPunktu(s, p.id);
    const wyl = polaWyliczone(s, p.id);
    if (h?.odczyt != null) {
      wynik.push({ t: 'tekst', x: e.x + 8, y, tekst: `${h.odczyt} mm`, kolor: wyl.odczyt ? PAPIER.wyliczony : PAPIER.tusz, rozmiar: 11, kursywa: wyl.odczyt, halo: true });
      y += 13;
    }
    if (h?.rzedna != null) {
      wynik.push({ t: 'tekst', x: e.x + 8, y, tekst: `H ${fm(h.rzedna, 3)}`, kolor: wyl.rzedna ? PAPIER.wyliczony : PAPIER.tusz, rozmiar: 11, kursywa: wyl.rzedna, halo: true });
      y += 13;
    }
    for (const c of celeDlaPunktu(s, p.id).slice(0, 2)) {
      const czesci = [
        c.odczyt != null ? `${c.odczyt} mm` : null,
        c.rzedna != null ? `H ${fm(c.rzedna, 3)}` : null,
      ].filter(Boolean).join(' · ');
      wynik.push({ t: 'tekst', x: e.x + 8, y, tekst: `cel ${czesci}`, kolor: PAPIER.cel, rozmiar: 11, pogrubiony: true, halo: true });
      y += 13;
      if (c.roznica != null) {
        wynik.push({ t: 'tekst', x: e.x + 8, y, tekst: `Δh ${zeZnakiem(c.roznica * 1000, 0)} mm`, kolor: PAPIER.cel, rozmiar: 11, pogrubiony: true, halo: true });
        y += 13;
      }
    }
    if (p.komentarz) {
      wynik.push({ t: 'tekst', x: e.x + 8, y, tekst: p.komentarz, kolor: PAPIER.olowek, rozmiar: 11, kursywa: true, halo: true });
    }
  }
  return wynik;
}

// ------------------------------------------------------------
// Przekrój poprzeczny
// ------------------------------------------------------------

export interface OpcjePrzekroju {
  zaznaczonyElement?: string | null;
  zaznaczonyPunkt?: string | null;
  /** Odczyty i rzędne przy trójkątach. */
  pomiar?: boolean;
  /** Sam rysunek elementów – bez trójkątów, wymiarów i numerów (podgląd w katalogu). */
  bezOpisow?: boolean;
}

/** Świat przekroju w metrach: x = rysunkowe cm / 100, y = −h / 100 (wyżej = mniejsze y). */
export const swiatPrzekroju = (xcm: number, hcm: number): Pkt => ({ x: xcm / 100, y: -hcm / 100 });

function sciezkaKomend(komendy: Komenda[], f: (u: number, v: number) => Pkt): string {
  return komendy
    .map((k) => {
      if (k[0] === 'Z') return 'Z';
      if (k[0] === 'Q') {
        const c = f(k[1], k[2]);
        const p = f(k[3], k[4]);
        return `Q${c.x} ${c.y} ${p.x} ${p.y}`;
      }
      const p = f(k[1], k[2]);
      return `${k[0]}${p.x} ${p.y}`;
    })
    .join('');
}

/** Ukośne kreskowanie równoległoboku o pionowych bokach (warstwa pod pasem, ława). */
function kreskowanie(lg: Pkt, pg: Pkt, wysPx: number, krokPx = 7): string {
  let d = '';
  const szer = pg.x - lg.x;
  if (szer <= 0 || wysPx <= 0) return d;
  const nach = (pg.y - lg.y) / szer;
  for (let x = lg.x + krokPx / 2; x < pg.x; x += krokPx) {
    const x2 = Math.min(pg.x, x + wysPx * 0.6);
    const y1 = lg.y + (x - lg.x) * nach;
    const y2 = lg.y + (x2 - lg.x) * nach + wysPx;
    d += `M${x} ${y1}L${x2} ${y2}`;
  }
  return d;
}

export interface ZakresRysunku {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Zakres samego rysunku przekroju w świecie [m] (bez opisów). */
export function zakresPrzekroju(p: PrzekrojPoprzeczny): ZakresRysunku | null {
  const u = ulozPrzekroj(p);
  if (u.length === 0) return null;
  let minH = Infinity;
  let maxH = -Infinity;
  for (const e of u) {
    minH = Math.min(minH, Math.min(e.hL, e.hP) - e.element.wys - (e.element.podbudowa ?? 0) - (e.element.lawa ? 15 : 0));
    maxH = Math.max(maxH, e.hL, e.hP);
  }
  return { minX: u[0].rx0 / 100, maxX: u[u.length - 1].rx1 / 100, minY: -maxH / 100, maxY: -minH / 100 };
}

/** Widok mieszczący przekrój w ramce; `gora` px nad rysunkiem zostaje na trójkąty, opisy i wymiary. */
export function widokPrzekroju(p: PrzekrojPoprzeczny, szer: number, wys: number, gora = 160, margines = 24): Widok {
  const z = zakresPrzekroju(p);
  if (!z) return { s: 100, tx: szer / 2, ty: wys / 2 };
  const s = Math.max(5, Math.min((szer - 2 * margines) / Math.max(z.maxX - z.minX, 0.05), (wys - gora - 30) / Math.max(z.maxY - z.minY, 0.05), 2500));
  const tx = (szer - (z.maxX - z.minX) * s) / 2 - z.minX * s;
  return { s, tx, ty: gora - z.minY * s };
}

export function rysunekPrzekroju(p: PrzekrojPoprzeczny, w: Widok, o: OpcjePrzekroju = {}): Prymityw[] {
  const wynik: Prymityw[] = [];
  const ulozone = ulozPrzekroj(p);
  if (ulozone.length === 0) return wynik;
  const E = (xcm: number, hcm: number) => naEkran(w, swiatPrzekroju(xcm, hcm));
  const px = w.s / 100;
  const pomiar = przeliczPomiar(p);
  const zero = kluczZera(p);

  const elementy: Prymityw[] = [];
  const opisy: Prymityw[] = [];
  let najwyzej = Infinity;

  for (const u of ulozone) {
    const e = u.element;
    const rw = u.rx1 - u.rx0;
    const zazn = o.zaznaczonyElement === e.id;
    const obrys = zazn ? PAPIER.zaznaczenie : PAPIER.tusz;
    const grubosc = zazn ? 2.4 : 1.2;
    najwyzej = Math.min(najwyzej, E(u.rx0, u.hL).y, E(u.rx1, u.hP).y);

    if (e.typ === 'pas') {
      const hAt = (rx: number) => u.hL + ((u.hP - u.hL) * (rx - u.rx0)) / Math.max(rw, 1e-9);
      const lg = E(u.rx0, u.hL);
      const pg = E(u.rx1, u.hP);
      const ld = E(u.rx0, u.hL - e.wys);
      const pd = E(u.rx1, u.hP - e.wys);
      if (e.podbudowa) {
        const wysPb = e.podbudowa * px;
        const d = `M${ld.x} ${ld.y}L${pd.x} ${pd.y}L${pd.x} ${pd.y + wysPb}L${ld.x} ${ld.y + wysPb}Z`;
        elementy.push({ t: 'sciezka', d, wypelnienie: PAPIER.podbudowa, kolor: PAPIER.olowek, grubosc: 0.8 });
        elementy.push({ t: 'sciezka', d: kreskowanie(ld, pd, wysPb), kolor: PAPIER.betonCiemny, grubosc: 0.7 });
      }
      const wyp = e.ksztalt === 'asfalt' ? PAPIER.asfalt : e.ksztalt === 'kostka_kamienna' ? PAPIER.kamien : PAPIER.kostka;
      elementy.push({ t: 'sciezka', d: `M${lg.x} ${lg.y}L${pg.x} ${pg.y}L${pd.x} ${pd.y}L${ld.x} ${ld.y}Z`, wypelnienie: wyp, kolor: obrys, grubosc });
      const modul = modulKostki(e);
      if (modul) {
        let spoiny = '';
        for (let rx = u.rx0 + modul; rx < u.rx1 - 1; rx += modul) {
          const g = E(rx, hAt(rx));
          spoiny += `M${g.x} ${g.y}L${g.x} ${g.y + e.wys * px}`;
        }
        if (spoiny) elementy.push({ t: 'sciezka', d: spoiny, kolor: PAPIER.olowek, grubosc: 0.8 });
      }
      if (u.skrocony) {
        const sx = (u.rx0 + u.rx1) / 2;
        const g = E(sx, hAt(sx));
        const z = 6;
        const gora = g.y - 10;
        const dol = g.y + (e.wys + (e.podbudowa ?? 0)) * px + 10;
        elementy.push({ t: 'sciezka', d: `M${g.x - z} ${gora}H${g.x + z}V${dol}H${g.x - z}Z`, wypelnienie: PAPIER.tlo, kolor: 'none' });
        elementy.push({
          t: 'sciezka',
          d: `M${g.x - 3} ${gora}L${g.x - 3} ${(gora + dol) / 2 - 4}L${g.x - 7} ${(gora + dol) / 2}L${g.x + 1} ${(gora + dol) / 2 + 4}L${g.x - 3} ${dol}`
            + `M${g.x + 3} ${gora}L${g.x + 3} ${(gora + dol) / 2 - 4}L${g.x - 1} ${(gora + dol) / 2}L${g.x + 7} ${(gora + dol) / 2 + 4}L${g.x + 3} ${dol}`,
          kolor: PAPIER.olowek, grubosc: 1,
        });
      }
      if (e.spadek) {
        const sx = u.rx0 + rw * (u.skrocony ? 0.25 : 0.5);
        const g = E(sx, hAt(sx));
        const wPrawo = e.spadek > 0;
        const kat = katNapisu(lg, pg);
        opisy.push({
          t: 'tekst', x: g.x, y: g.y - 6, tekst: wPrawo ? `${fm(Math.abs(e.spadek), 1)}% →` : `← ${fm(Math.abs(e.spadek), 1)}%`,
          kolor: PAPIER.spadek, rozmiar: 11, pogrubiony: true, kotwica: 'middle', obrot: kat, halo: true,
        });
      }
    } else {
      const k = KSZTALTY[e.ksztalt];
      const f = (uu: number, vv: number) => E(u.rx0 + (e.odwroc ? 1 - uu : uu) * rw, u.hL - vv * e.wys);
      if (e.lawa) {
        const l = E(u.rx0 - 5, u.hL - e.wys);
        const pr = E(u.rx1 + 5, u.hL - e.wys);
        const wysL = 15 * px;
        elementy.push({ t: 'sciezka', d: `M${l.x} ${l.y}L${pr.x} ${pr.y}L${pr.x} ${pr.y + wysL}L${l.x} ${l.y + wysL}Z`, wypelnienie: PAPIER.beton, kolor: PAPIER.olowek, grubosc: 0.8 });
        elementy.push({ t: 'sciezka', d: kreskowanie(l, pr, wysL, 5), kolor: PAPIER.betonCiemny, grubosc: 0.7 });
      }
      elementy.push({ t: 'sciezka', d: sciezkaKomend(k.obrys, f), wypelnienie: PAPIER.beton, kolor: obrys, grubosc });
    }

    const srodekX = E((u.rx0 + u.rx1) / 2, 0).x;
    const dolY = E(0, Math.min(u.hL, u.hP) - e.wys - (e.podbudowa ?? 0) - (e.lawa ? 15 : 0)).y;
    opisy.push({ t: 'tekst', x: srodekX, y: dolY + 14, tekst: String(u.indeks + 1), kolor: PAPIER.olowek, rozmiar: 11, pogrubiony: true, kotwica: 'middle' });
  }
  if (o.bezOpisow) return elementy;
  wynik.push(...elementy, ...opisy);

  // Trójkąty miejsc przyłożenia łaty + opisy pionowe nad nimi.
  for (const u of ulozone) {
    for (const pp of u.punkty) {
      const r = pomiar.find((q) => q.klucz === pp.klucz);
      const rx = u.rx0 + ((pp.x - u.x0) / Math.max(u.x1 - u.x0, 1e-9)) * (u.rx1 - u.rx0);
      const g = E(rx, pp.h);
      const zazn = o.zaznaczonyPunkt === pp.klucz;
      const kolor = r?.wpisany ? PAPIER.cel : zazn ? PAPIER.zaznaczenie : PAPIER.tusz;
      const t = 7;
      wynik.push({ t: 'sciezka', d: `M${g.x} ${g.y - 1}L${g.x - t * 0.75} ${g.y - 1 - t * 1.3}L${g.x + t * 0.75} ${g.y - 1 - t * 1.3}Z`, wypelnienie: kolor, kolor });
      const czesci = [pp.klucz === zero ? '0' : zeZnakiem(r?.wzgledem0 ?? 0, 0)];
      if (o.pomiar && r?.odczyt != null) czesci.push(`${r.odczyt} mm`);
      if (o.pomiar && r?.rzedna != null) czesci.push(`H ${fm(r.rzedna, 3)}`);
      wynik.push({
        t: 'tekst', x: g.x + 4, y: g.y - 14, tekst: czesci.join('  '), kolor: r?.wpisany ? PAPIER.cel : PAPIER.tusz,
        rozmiar: 11, pogrubiony: true, obrot: -90, halo: true,
      });
    }
  }

  // Wymiary nad rysunkiem: szerokości elementów i całkowita.
  const yWym = najwyzej - 120;
  const kreska = (x: number, y: number) => `M${x} ${y - 5}L${x} ${y + 5}M${x - 3} ${y + 3}L${x + 3} ${y - 3}`;
  let dWym = `M${E(ulozone[0].rx0, 0).x} ${yWym}H${E(ulozone[ulozone.length - 1].rx1, 0).x}`;
  for (const u of ulozone) {
    const x0 = E(u.rx0, 0).x;
    const x1 = E(u.rx1, 0).x;
    dWym += kreska(x0, yWym) + kreska(x1, yWym);
    if (x1 - x0 > 16) {
      wynik.push({ t: 'tekst', x: (x0 + x1) / 2, y: yWym - 4, tekst: fm(u.element.szer / 100, 2), kolor: PAPIER.tusz, rozmiar: 10, kotwica: 'middle', halo: true });
    }
  }
  const yCal = yWym - 20;
  const xs = E(ulozone[0].rx0, 0).x;
  const xk = E(ulozone[ulozone.length - 1].rx1, 0).x;
  dWym += `M${xs} ${yCal}H${xk}${kreska(xs, yCal)}${kreska(xk, yCal)}`;
  wynik.push({ t: 'sciezka', d: dWym, kolor: PAPIER.tusz, grubosc: 0.9 });
  wynik.push({ t: 'tekst', x: (xs + xk) / 2, y: yCal - 4, tekst: `${fm(szerokoscPrzekroju(p) / 100, 2)} m`, kolor: PAPIER.tusz, rozmiar: 11, pogrubiony: true, kotwica: 'middle', halo: true });
  return wynik;
}

/** Trafienie w element przekroju (stuknięcie na rysunku). */
export function elementPodPunktem(p: PrzekrojPoprzeczny, swiat: Pkt): UlozonyElement | undefined {
  const xcm = swiat.x * 100;
  return ulozPrzekroj(p).find((u) => xcm >= u.rx0 && xcm <= u.rx1);
}

/** Najbliższy trójkąt pomiaru (w px ekranu). */
export function punktPomiaruPodEkranem(p: PrzekrojPoprzeczny, w: Widok, ekran: Pkt, promien = 26): string | undefined {
  let najlepszy: { k: string; d: number } | undefined;
  for (const u of ulozPrzekroj(p)) {
    for (const pp of u.punkty) {
      const rx = u.rx0 + ((pp.x - u.x0) / Math.max(u.x1 - u.x0, 1e-9)) * (u.rx1 - u.rx0);
      const g = naEkran(w, swiatPrzekroju(rx, pp.h));
      const d = odl({ x: g.x, y: g.y - 8 }, ekran);
      if (d < promien && (!najlepszy || d < najlepszy.d)) najlepszy = { k: pp.klucz, d };
    }
  }
  return najlepszy?.k;
}

// ------------------------------------------------------------
// Eksport SVG
// ------------------------------------------------------------

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => (Math.round(v * 100) / 100).toString();

export function svgZPrymitywow(prymitywy: Prymityw[], szer: number, wys: number, naglowek?: { tytul: string; podtytul?: string }): string {
  const czesci: string[] = [];
  czesci.push(`<rect x="0" y="0" width="${n(szer)}" height="${n(wys)}" fill="${PAPIER.tlo}"/>`);
  for (const p of prymitywy) {
    if (p.t === 'sciezka') {
      if (!p.d) continue;
      czesci.push(`<path d="${p.d}" fill="${p.wypelnienie ?? 'none'}" stroke="${p.kolor ?? 'none'}" stroke-width="${p.grubosc ?? 1}"${p.kreska ? ` stroke-dasharray="${p.kreska}"` : ''}${p.krycie != null ? ` opacity="${p.krycie}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`);
    } else if (p.t === 'kolo') {
      czesci.push(`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r)}" fill="${p.wypelnienie}" stroke="${p.kolor ?? 'none'}" stroke-width="${p.grubosc ?? 1}"${p.kreska ? ` stroke-dasharray="${p.kreska}"` : ''}/>`);
    } else {
      const obrot = p.obrot ? ` transform="rotate(${n(p.obrot)} ${n(p.x)} ${n(p.y)})"` : '';
      const styl = `font-family="Arial, Helvetica, sans-serif" font-size="${p.rozmiar}"${p.pogrubiony ? ' font-weight="700"' : ''}${p.kursywa ? ' font-style="italic"' : ''} text-anchor="${p.kotwica ?? 'start'}"`;
      if (p.halo) czesci.push(`<text x="${n(p.x)}" y="${n(p.y)}" ${styl} fill="none" stroke="${PAPIER.tlo}" stroke-width="3.5" stroke-linejoin="round"${obrot}>${esc(p.tekst)}</text>`);
      czesci.push(`<text x="${n(p.x)}" y="${n(p.y)}" ${styl} fill="${p.kolor}"${obrot}>${esc(p.tekst)}</text>`);
    }
  }
  if (naglowek) {
    czesci.push(`<text x="16" y="26" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${PAPIER.tusz}">${esc(naglowek.tytul)}</text>`);
    if (naglowek.podtytul) czesci.push(`<text x="16" y="46" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${PAPIER.olowek}">${esc(naglowek.podtytul)}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(szer)}" height="${n(wys)}" viewBox="0 0 ${n(szer)} ${n(wys)}">${czesci.join('')}</svg>`;
}

/** Podziałka: odcinek o długości „okrągłej” liczby metrów. */
function podzialka(w: Widok, x: number, y: number): Prymityw[] {
  const kroki = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const m = kroki.find((k) => k * w.s >= 60) ?? 100;
  const dl = m * w.s;
  return [
    { t: 'sciezka', d: `M${x} ${y}H${x + dl}M${x} ${y - 5}V${y + 5}M${x + dl} ${y - 5}V${y + 5}`, kolor: PAPIER.tusz, grubosc: 1.5 },
    { t: 'tekst', x: x + dl / 2, y: y - 7, tekst: `${fm(m, m < 1 ? 1 : 0)} m`, kolor: PAPIER.tusz, rozmiar: 11, kotwica: 'middle' },
  ];
}

export function svgSzkicu(s: SzkicGeodezyjny, szer = 1200): { svg: string; szer: number; wys: number } {
  const pts = s.punkty.map((p) => pozycjaPunktu(s, p.id)).filter((p): p is Pkt => !!p);
  const minX = Math.min(...pts.map((p) => p.x), 0);
  const maxX = Math.max(...pts.map((p) => p.x), 1);
  const minY = Math.min(...pts.map((p) => p.y), 0);
  const maxY = Math.max(...pts.map((p) => p.y), 1);
  const margines = 90;
  const sk = Math.min((szer - 2 * margines) / Math.max(maxX - minX, 0.5), 400);
  const wys = Math.max(360, Math.round((maxY - minY) * sk + 2 * margines + 40));
  const w: Widok = { s: sk, tx: margines - minX * sk, ty: margines + 40 - minY * sk };
  const prym = rysunekSzkicu(s, w, { szer, wys });
  prym.push(...podzialka(w, 16, wys - 18));
  const hi = horyzontInstrumentu(s);
  const pod = [
    s.opis,
    s.siatka ? `siatka ${fm(s.bokSiatki, s.bokSiatki < 1 ? 2 : 0)} m` : null,
    hi != null ? `horyzont instrumentu ${fm(hi, 3)} m` : null,
  ].filter(Boolean).join(' · ');
  return { svg: svgZPrymitywow(prym, szer, wys, { tytul: s.nazwa, podtytul: pod || undefined }), szer, wys };
}

export function svgPrzekroju(p: PrzekrojPoprzeczny, szer = 1200, pomiar = true): { svg: string; szer: number; wys: number } {
  const z = zakresPrzekroju(p);
  if (!z) return { svg: svgZPrymitywow([], szer, 200, { tytul: p.nazwa }), szer, wys: 200 };
  const gora = 230;
  const sk = Math.min((szer - 60) / Math.max(z.maxX - z.minX, 0.05), 2500);
  const wys = Math.round((z.maxY - z.minY) * sk + gora + 50);
  const w = widokPrzekroju(p, szer, wys, gora, 30);
  const prym = rysunekPrzekroju(p, w, { pomiar });
  return { svg: svgZPrymitywow(prym, szer, wys, { tytul: p.nazwa, podtytul: p.opis }), szer, wys };
}
