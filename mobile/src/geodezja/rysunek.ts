// Rysunek szkicu i przekroju jako lista prymitywów w pikselach ekranu – ten sam opis rysuje ekran
// (react-native-svg) i plik SVG/PDF do udostępnienia.

import { fm, naEkran, odl, punktKrzywej, zeZnakiem, type Pkt, type Widok } from './geometria';
import {
  analizaLinii, celeDlaPunktu, geometriaLinii, horyzontInstrumentu, liniaWidoczna, polaWyliczone, pozycjaPunktu,
  punktWidoczny, sciezkaLinii, warstwySzkicu, wysokoscPunktu, type SzkicGeodezyjny,
} from './szkic';
import {
  geometriaWarstw, gruboscLawy, kluczZera, maZaglebienie, modulKostki, obrysElementu, oporElementu, przeliczPomiar, szerokoscPrzekroju,
  ulozPrzekroj, zaglebienieElementu, type Komenda, type PrzekrojPoprzeczny, type UlozonyElement, type WypelnienieWarstwy,
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
        t: 'tekst', x: m.x - gora.x * 21, y: m.y - gora.y * 21, tekst: `cel ${fm(l.cel.spadek, 2)}% ${strzalka(kat, z, ku)}`,
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
  /** Odczyty łaty (w nawiasie) przy trójkątach. */
  pomiar?: boolean;
  /** Także rzędne przy trójkątach (eksport – na ekranie są w liście pod rysunkiem). */
  rzedne?: boolean;
  /** Sam rysunek elementów – bez trójkątów, wymiarów i numerów (podgląd w katalogu). */
  bezOpisow?: boolean;
  /** Rozmiar kartki [px] – wzory wypełnień tylko w widocznej części. */
  obszar?: { szer: number; wys: number };
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

// ------------------------------------------------------------
// Wypełnienia warstw (wzór przycięty do wielokąta wypukłego, siatka zaczepiona w początku świata)
// ------------------------------------------------------------

export const WYPELNIENIA: { id: WypelnienieWarstwy; nazwa: string }[] = [
  { id: 'asfalt', nazwa: 'Asfalt ciemny' },
  { id: 'asfalt_jasny', nazwa: 'Asfalt jasny' },
  { id: 'kruszywo', nazwa: 'Kruszywo' },
  { id: 'kropki', nazwa: 'Kropki' },
  { id: 'kreski', nazwa: 'Kreski' },
  { id: 'ukosne', nazwa: 'Ukośne /' },
  { id: 'ukosne_odwrotne', nazwa: 'Ukośne \\' },
  { id: 'kratka', nazwa: 'Kratka' },
  { id: 'kratka_ukosna', nazwa: 'Kratka ukośna' },
  { id: 'beton', nazwa: 'Beton' },
  { id: 'grunt', nazwa: 'Grunt' },
  { id: 'biale', nazwa: 'Białe' },
];

const TLO_WYPELNIENIA: Record<WypelnienieWarstwy, string> = {
  asfalt: '#3F4652',
  asfalt_jasny: '#6B7280',
  kruszywo: '#EDE6D6',
  kropki: '#F3F0E6',
  kreski: '#F3F0E6',
  ukosne: '#F3F0E6',
  ukosne_odwrotne: '#F3F0E6',
  kratka: '#F3F0E6',
  kratka_ukosna: '#F3F0E6',
  beton: '#C9CBCF',
  grunt: '#E5D3B3',
  biale: '#FFFFFF',
};

/** Ciemne tło – opis warstwy białym tekstem. */
export const ciemneWypelnienie = (w: WypelnienieWarstwy) => w === 'asfalt' || w === 'asfalt_jasny';

export function tloWypelnienia(w: WypelnienieWarstwy): string {
  return TLO_WYPELNIENIA[w];
}

const krzyz = (a: Pkt, b: Pkt) => a.x * b.y - a.y * b.x;

function wPolygonie(wiel: Pkt[], p: Pkt): boolean {
  let znak = 0;
  for (let i = 0; i < wiel.length; i++) {
    const a = wiel[i];
    const b = wiel[(i + 1) % wiel.length];
    const c = krzyz({ x: b.x - a.x, y: b.y - a.y }, { x: p.x - a.x, y: p.y - a.y });
    if (Math.abs(c) < 1e-9) continue;
    const s = c > 0 ? 1 : -1;
    if (znak === 0) znak = s;
    else if (s !== znak) return false;
  }
  return true;
}

interface Prostokat { x0: number; y0: number; x1: number; y1: number }

function ramkaWielokata(wiel: Pkt[], obszar?: Prostokat): Prostokat | null {
  let r: Prostokat = {
    x0: Math.min(...wiel.map((p) => p.x)), y0: Math.min(...wiel.map((p) => p.y)),
    x1: Math.max(...wiel.map((p) => p.x)), y1: Math.max(...wiel.map((p) => p.y)),
  };
  if (obszar) r = { x0: Math.max(r.x0, obszar.x0), y0: Math.max(r.y0, obszar.y0), x1: Math.min(r.x1, obszar.x1), y1: Math.min(r.y1, obszar.y1) };
  return r.x1 > r.x0 && r.y1 > r.y0 ? r : null;
}

/** Rodzina równoległych linii co `krok` px pod kątem `kat` (stopnie ekranu), przycięta do wielokąta wypukłego. */
function linieWzoru(wiel: Pkt[], kat: number, krok: number, kotwica: Pkt, ramka: Prostokat): string {
  const r = (kat * Math.PI) / 180;
  const d = { x: Math.cos(r), y: Math.sin(r) };
  const nrm = { x: -d.y, y: d.x };
  const rzut = (p: Pkt) => (p.x - kotwica.x) * nrm.x + (p.y - kotwica.y) * nrm.y;
  const rogi = [{ x: ramka.x0, y: ramka.y0 }, { x: ramka.x1, y: ramka.y0 }, { x: ramka.x1, y: ramka.y1 }, { x: ramka.x0, y: ramka.y1 }];
  const cMin = Math.max(Math.min(...wiel.map(rzut)), Math.min(...rogi.map(rzut)));
  const cMax = Math.min(Math.max(...wiel.map(rzut)), Math.max(...rogi.map(rzut)));
  if (!(cMax > cMin) || (cMax - cMin) / krok > 4000) return '';
  let wynik = '';
  for (let j = Math.ceil(cMin / krok); j * krok <= cMax; j++) {
    const q = { x: kotwica.x + nrm.x * j * krok, y: kotwica.y + nrm.y * j * krok };
    let tMin = Infinity;
    let tMax = -Infinity;
    for (let i = 0; i < wiel.length; i++) {
      const a = wiel[i];
      const ab = { x: wiel[(i + 1) % wiel.length].x - a.x, y: wiel[(i + 1) % wiel.length].y - a.y };
      const mian = krzyz(d, ab);
      if (Math.abs(mian) < 1e-9) continue;
      const aq = { x: a.x - q.x, y: a.y - q.y };
      const s = krzyz(aq, d) / mian;
      if (s < -1e-6 || s > 1 + 1e-6) continue;
      const t = krzyz(aq, ab) / mian;
      tMin = Math.min(tMin, t);
      tMax = Math.max(tMax, t);
    }
    if (tMax - tMin < 0.5) continue;
    const f = (t: number) => `${Math.round((q.x + d.x * t) * 10) / 10} ${Math.round((q.y + d.y * t) * 10) / 10}`;
    wynik += `M${f(tMin)}L${f(tMax)}`;
  }
  return wynik;
}

/** Kropki na siatce (co drugi rząd przesunięty); `rozrzut` > 0 – nieregularne ziarna kruszywa. */
function kropkiWzoru(wiel: Pkt[], krok: number, kotwica: Pkt, ramka: Prostokat, rozrzut = 0): { male: string; duze: string } {
  let male = '';
  let duze = '';
  if (((ramka.x1 - ramka.x0) * (ramka.y1 - ramka.y0)) / (krok * krok) > 20000) return { male, duze };
  const j0 = Math.floor((ramka.y0 - kotwica.y) / krok) - 1;
  const j1 = Math.ceil((ramka.y1 - kotwica.y) / krok) + 1;
  for (let j = j0; j <= j1; j++) {
    const przes = j % 2 ? krok / 2 : 0;
    const i0 = Math.floor((ramka.x0 - kotwica.x - przes) / krok) - 1;
    const i1 = Math.ceil((ramka.x1 - kotwica.x - przes) / krok) + 1;
    for (let i = i0; i <= i1; i++) {
      const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
      const los = h - Math.floor(h);
      const p = {
        x: kotwica.x + i * krok + przes + (rozrzut ? (los - 0.5) * krok * rozrzut : 0),
        y: kotwica.y + j * krok + (rozrzut ? (((los * 7) % 1) - 0.5) * krok * rozrzut : 0),
      };
      if (p.x < ramka.x0 || p.x > ramka.x1 || p.y < ramka.y0 || p.y > ramka.y1 || !wPolygonie(wiel, p)) continue;
      const seg = `M${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}h0.01`;
      if (rozrzut && los > 0.6) duze += seg;
      else male += seg;
    }
  }
  return { male, duze };
}

export interface OpcjeWypelnienia {
  /** Obrys wielokąta. */
  kolor?: string;
  grubosc?: number;
  /** Zaczepienie wzoru (początek świata) – wzór nie „pływa” przy przesuwaniu widoku. */
  kotwica?: Pkt;
  /** Widoczna część kartki – wzór tylko tam (duże przybliżenia). */
  obszar?: { szer: number; wys: number };
}

/** Wielokąt wypukły (px ekranu) z tłem, wzorem i obrysem. */
export function wypelnionyWielokat(wiel: Pkt[], wyp: WypelnienieWarstwy, o: OpcjeWypelnienia = {}): Prymityw[] {
  const d = `M${wiel.map((p) => `${p.x} ${p.y}`).join('L')}Z`;
  const wynik: Prymityw[] = [{ t: 'sciezka', d, wypelnienie: TLO_WYPELNIENIA[wyp] }];
  const kotwica = o.kotwica ?? { x: 0, y: 0 };
  const ramka = ramkaWielokata(wiel, o.obszar ? { x0: -20, y0: -20, x1: o.obszar.szer + 20, y1: o.obszar.wys + 20 } : undefined);
  if (ramka) {
    const linie = (katy: number[], krok: number, kolor: string, kreska?: string, grubosc = 0.7) => {
      const s = katy.map((k) => linieWzoru(wiel, k, krok, kotwica, ramka)).join('');
      if (s) wynik.push({ t: 'sciezka', d: s, kolor, grubosc, kreska });
    };
    const kropki = (krok: number, kolor: string, r: number, rozrzut = 0) => {
      const k = kropkiWzoru(wiel, krok, kotwica, ramka, rozrzut);
      if (k.male) wynik.push({ t: 'sciezka', d: k.male, kolor, grubosc: r });
      if (k.duze) wynik.push({ t: 'sciezka', d: k.duze, kolor, grubosc: r * 1.8 });
    };
    switch (wyp) {
      case 'kruszywo': kropki(7, '#8B7E66', 1.3, 0.8); break;
      case 'kropki': kropki(6, PAPIER.olowek, 1.6); break;
      case 'kreski': linie([0], 6, PAPIER.olowek, '5 4'); break;
      case 'ukosne': linie([-45], 6, PAPIER.olowek); break;
      case 'ukosne_odwrotne': linie([45], 6, PAPIER.olowek); break;
      case 'kratka': linie([0, 90], 7, PAPIER.olowek, undefined, 0.6); break;
      case 'kratka_ukosna': linie([45, -45], 7, PAPIER.olowek, undefined, 0.6); break;
      case 'beton': kropki(8, PAPIER.betonCiemny, 1.4, 0.7); linie([-45], 14, PAPIER.betonCiemny, '3 9', 0.7); break;
      case 'grunt': linie([0], 7, '#9A7B4F', '3 5', 0.9); break;
      default: break;
    }
  }
  wynik.push({ t: 'sciezka', d, kolor: o.kolor ?? PAPIER.olowek, grubosc: o.grubosc ?? 0.8 });
  return wynik;
}

/** Próbka wypełnienia (wybór w kreatorze). */
export function probkaWypelnienia(wyp: WypelnienieWarstwy, szer: number, wys: number): Prymityw[] {
  return wypelnionyWielokat([{ x: 0.5, y: 0.5 }, { x: szer - 0.5, y: 0.5 }, { x: szer - 0.5, y: wys - 0.5 }, { x: 0.5, y: wys - 0.5 }], wyp, { kolor: PAPIER.tusz });
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
  let minX = Infinity;
  let maxX = -Infinity;
  for (const e of u) {
    minH = Math.min(minH, spodElementu(e));
    maxH = Math.max(maxH, e.hL, e.hP);
    const gw = geometriaWarstw(e.element);
    const opor = oporElementu(e.element);
    const wysL = Math.max(0, ...gw.map((g) => Math.max(g.lGora, g.lDol)), opor?.strona === 'l' ? opor.szer : 0);
    const wysP = Math.max(0, ...gw.map((g) => Math.max(g.pGora, g.pDol)), opor?.strona === 'p' ? opor.szer : 0);
    minX = Math.min(minX, e.rx0 - Math.max(wysL, e.lawaL));
    maxX = Math.max(maxX, e.rx1 + Math.max(wysP, e.lawaP));
  }
  return { minX: minX / 100, maxX: maxX / 100, minY: -maxH / 100, maxY: -minH / 100 };
}

/** Najniższy punkt elementu z podbudową i ławą [cm]. */
function spodElementu(u: UlozonyElement): number {
  const e = u.element;
  return Math.min(u.hL, u.hP) - e.wys - (e.typ === 'pas' ? e.podbudowa ?? 0 : gruboscLawy(e));
}

/** Miejsce z lewej strony rysunku na łańcuch wymiarów wysokości [px]. */
export const LEWY_PRZEKROJU = 44;

/** Odstęp linii wymiarowej od najwyższego punktu [px]: mieści pionowy opis „+12 (1230)” nad trójkątem. */
const ODSUNIECIE_WYMIAROW = 105;
const ODSUNIECIE_WYMIAROW_Z_RZEDNYMI = 175;
/** Miejsce nad rysunkiem na opisy i wymiary – to samo w kreatorze i w pomiarze, więc skala się nie zmienia. */
export const GORA_PRZEKROJU = ODSUNIECIE_WYMIAROW + 45;

/** Widok mieszczący przekrój w ramce; `gora` px nad rysunkiem zostaje na trójkąty, opisy i wymiary. */
export function widokPrzekroju(p: PrzekrojPoprzeczny, szer: number, wys: number, gora = GORA_PRZEKROJU, margines = 24, lewy = LEWY_PRZEKROJU): Widok {
  const z = zakresPrzekroju(p);
  if (!z) return { s: 100, tx: szer / 2, ty: wys / 2 };
  const dostepna = szer - 2 * margines - lewy;
  const s = Math.max(5, Math.min(dostepna / Math.max(z.maxX - z.minX, 0.05), (wys - gora - 30) / Math.max(z.maxY - z.minY, 0.05), 2500));
  const tx = margines + lewy + (dostepna - (z.maxX - z.minX) * s) / 2 - z.minX * s;
  return { s, tx, ty: gora - z.minY * s };
}

export function rysunekPrzekroju(p: PrzekrojPoprzeczny, w: Widok, o: OpcjePrzekroju = {}): Prymityw[] {
  const wynik: Prymityw[] = [];
  const ulozone = ulozPrzekroj(p);
  if (ulozone.length === 0) return wynik;
  const E = (xcm: number, hcm: number) => naEkran(w, swiatPrzekroju(xcm, hcm));
  const px = w.s / 100;
  const kotwica = { x: w.tx, y: w.ty };
  const pomiar = przeliczPomiar(p);
  const zero = kluczZera(p);

  const elementy: Prymityw[] = [];
  const opisy: Prymityw[] = [];
  let najwyzej = Infinity;

  // Najpierw pasy (warstwy jezdni pod sąsiadami), potem elementy blokowe z ławami – ława leży na podbudowie.
  for (const u of [...ulozone].sort((a, b) => (a.element.typ === b.element.typ ? a.indeks - b.indeks : a.element.typ === 'pas' ? -1 : 1))) {
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
      const warstwy = geometriaWarstw(e);
      const dolna = warstwy[warstwy.length - 1];
      const lDol = dolna ? dolna.lDol : 0;
      const pDol = dolna ? dolna.pDol : 0;
      const ld = E(u.rx0 - lDol, hAt(u.rx0 - lDol) - e.wys);
      const pd = E(u.rx1 + pDol, hAt(u.rx1 + pDol) - e.wys);
      if (e.podbudowa) {
        const wysPb = e.podbudowa * px;
        elementy.push(...wypelnionyWielokat(
          [ld, pd, { x: pd.x, y: pd.y + wysPb }, { x: ld.x, y: ld.y + wysPb }], 'kruszywo', { kotwica, obszar: o.obszar },
        ));
      }
      if (warstwy.length) {
        const xOpisu = u.rx0 + rw * (u.skrocony ? 0.75 : 0.5);
        warstwy.forEach((g) => {
          const gr = g.warstwa.grubosc;
          const a = E(u.rx0 - g.lGora, hAt(u.rx0 - g.lGora) - g.gora);
          const b = E(u.rx1 + g.pGora, hAt(u.rx1 + g.pGora) - g.gora);
          const c = E(u.rx1 + g.pDol, hAt(u.rx1 + g.pDol) - g.gora - gr);
          const d = E(u.rx0 - g.lDol, hAt(u.rx0 - g.lDol) - g.gora - gr);
          elementy.push(...wypelnionyWielokat([a, b, c, d], g.wypelnienie, { kolor: obrys, grubosc, kotwica, obszar: o.obszar }));
          const wysPx = gr * px;
          if (g.warstwa.nazwa && wysPx >= 8) {
            const s = E(xOpisu, hAt(xOpisu) - g.gora - gr / 2);
            const ciemne = ciemneWypelnienie(g.wypelnienie);
            opisy.push({
              t: 'tekst', x: s.x, y: s.y + Math.min(10, wysPx - 2) * 0.35, tekst: `${g.warstwa.nazwa} ${fm(gr, gr % 1 ? 1 : 0)} cm`,
              kolor: ciemne ? '#FFFFFF' : PAPIER.tusz, rozmiar: Math.min(10, wysPx - 2), pogrubiony: true, kotwica: 'middle',
              obrot: katNapisu(lg, pg), halo: !ciemne,
            });
          }
        });
      } else {
        const wyp = e.ksztalt === 'kostka_kamienna' ? PAPIER.kamien : PAPIER.kostka;
        elementy.push({ t: 'sciezka', d: `M${lg.x} ${lg.y}L${pg.x} ${pg.y}L${pd.x} ${pd.y}L${ld.x} ${ld.y}Z`, wypelnienie: wyp, kolor: obrys, grubosc });
      }
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
      const f = (uu: number, vv: number) => E(u.rx0 + (e.odwroc ? 1 - uu : uu) * rw, u.hL - vv * e.wys);
      if (e.lawa) {
        const l = E(u.rx0 - u.lawaL, u.hL - e.wys);
        const pr = E(u.rx1 + u.lawaP, u.hL - e.wys);
        const wysL = gruboscLawy(e) * px;
        elementy.push(...wypelnionyWielokat(
          [l, pr, { x: pr.x, y: pr.y + wysL }, { x: l.x, y: l.y + wysL }], 'beton', { kotwica, obszar: o.obszar },
        ));
      }
      const opor = oporElementu(e);
      if (opor) {
        // Opór: trapez na ławie przy boku elementu, u góry połowa szerokości podstawy.
        const zn = opor.strona === 'l' ? -1 : 1;
        const x = opor.strona === 'l' ? u.rx0 : u.rx1;
        const dol = u.hL - e.wys;
        const gora = u.hL - Math.min(Math.max(0, opor.odGory), e.wys);
        elementy.push(...wypelnionyWielokat(
          [E(x, dol), E(x + zn * opor.szer, dol), E(x + (zn * opor.szer) / 2, gora), E(x, gora)],
          'beton', { kotwica, obszar: o.obszar },
        ));
      }
      elementy.push({ t: 'sciezka', d: sciezkaKomend(obrysElementu(e), f), wypelnienie: PAPIER.beton, kolor: obrys, grubosc });
      if (maZaglebienie(e)) {
        // Wymiar zagłębienia obok trójkąta łaty: linia pomocnicza od dna i pionowy wymiar od krawędzi do dna.
        const z = zaglebienieElementu(e);
        const dno = f(0.5, z / e.wys);
        const g = f(0.86, 0);
        const d = f(0.86, z / e.wys);
        const k = 3;
        opisy.push({ t: 'sciezka', d: `M${dno.x} ${dno.y}H${d.x}`, kolor: PAPIER.spadek, grubosc: 0.8, kreska: '3 2' });
        opisy.push({
          t: 'sciezka',
          d: `M${g.x} ${g.y}V${d.y}M${g.x - k} ${g.y + k}L${g.x + k} ${g.y - k}M${d.x - k} ${d.y + k}L${d.x + k} ${d.y - k}`,
          kolor: PAPIER.spadek, grubosc: 1,
        });
        opisy.push({ t: 'tekst', x: g.x, y: d.y + 12, tekst: `${fm(z, z % 1 ? 1 : 0)} cm`, kolor: PAPIER.spadek, rozmiar: 10, pogrubiony: true, kotwica: 'middle', halo: true });
      }
    }

    const srodekX = E((u.rx0 + u.rx1) / 2, 0).x;
    const dolY = E(0, spodElementu(u)).y;
    opisy.push({ t: 'tekst', x: srodekX, y: dolY + 14, tekst: String(u.indeks + 1), kolor: PAPIER.olowek, rozmiar: 11, pogrubiony: true, kotwica: 'middle' });
  }
  if (o.bezOpisow) return elementy;
  wynik.push(...elementy, ...opisy);

  // Trójkąty miejsc przyłożenia łaty + opisy pionowe nad nimi (rozsunięte, gdy punkty są blisko – z odnośnikiem).
  const ODSTEP_OPISOW = 15;
  const znaczniki = ulozone.flatMap((u) => u.punkty.map((pp) => {
    const rx = u.rx0 + ((pp.x - u.x0) / Math.max(u.x1 - u.x0, 1e-9)) * (u.rx1 - u.rx0);
    return { pp, g: E(rx, pp.h), lx: E(rx, pp.h).x };
  }));
  for (let i = 1; i < znaczniki.length; i++) {
    znaczniki[i].lx = Math.max(znaczniki[i].lx, znaczniki[i - 1].lx + ODSTEP_OPISOW);
  }
  for (let i = znaczniki.length - 2; i >= 0; i--) {
    const przesuniecie = znaczniki[i].lx - znaczniki[i].g.x;
    const nastepny = znaczniki[i + 1].lx - ODSTEP_OPISOW;
    if (przesuniecie > 0) znaczniki[i].lx = Math.max(znaczniki[i].g.x, Math.min(znaczniki[i].lx, nastepny));
  }
  for (const { pp, g, lx } of znaczniki) {
    const r = pomiar.find((q) => q.klucz === pp.klucz);
    const zazn = o.zaznaczonyPunkt === pp.klucz;
    const kolor = r?.wpisany ? PAPIER.cel : zazn ? PAPIER.zaznaczenie : PAPIER.tusz;
    const t = 7;
    const szczyt = g.y - 1 - t * 1.3;
    wynik.push({ t: 'sciezka', d: `M${g.x} ${g.y - 1}L${g.x - t * 0.75} ${szczyt}L${g.x + t * 0.75} ${szczyt}Z`, wypelnienie: kolor, kolor });
    const podstawa = szczyt - (Math.abs(lx - g.x) > 1 ? 16 : 4);
    if (Math.abs(lx - g.x) > 1) wynik.push({ t: 'sciezka', d: `M${g.x} ${szczyt}L${lx} ${podstawa + 2}`, kolor, grubosc: 0.8 });
    const czesci = [pp.klucz === zero ? '0' : zeZnakiem(r?.wzgledem0 ?? 0, 0)];
    if (o.pomiar && r?.odczyt != null) czesci.push(`(${r.odczyt})`);
    if (o.pomiar && o.rzedne && r?.rzedna != null) czesci.push(`H ${fm(r.rzedna, 3)}`);
    wynik.push({
      t: 'tekst', x: lx + 4, y: podstawa, tekst: czesci.join('  '), kolor: r?.wpisany ? PAPIER.cel : PAPIER.tusz,
      rozmiar: 11, pogrubiony: true, obrot: -90, halo: true,
    });
  }

  // Wymiary nad rysunkiem: szerokości elementów i całkowita.
  const yWym = najwyzej - (o.pomiar && o.rzedne ? ODSUNIECIE_WYMIAROW_Z_RZEDNYMI : ODSUNIECIE_WYMIAROW);
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
  wynik.push(...wymiaryWysokosci(p, ulozone, znaczniki.map((z) => ({ h: z.pp.h, x: z.g.x })), E));
  return wynik;
}

/** Łańcuch wymiarów wysokości z lewej strony: punkty pomiarowe i spód konstrukcji, różnice w cm. */
function wymiaryWysokosci(
  p: PrzekrojPoprzeczny,
  ulozone: UlozonyElement[],
  punkty: { h: number; x: number }[],
  E: (xcm: number, hcm: number) => Pkt,
): Prymityw[] {
  const z = zakresPrzekroju(p);
  if (!z || punkty.length === 0) return [];
  const spod = ulozone.reduce((m, u) => (spodElementu(u) < m.h ? { h: spodElementu(u), x: E(u.rx0, 0).x } : m), { h: Infinity, x: 0 });
  const poziomy: { h: number; x: number }[] = [];
  for (const q of [...punkty, spod].sort((a, b) => b.h - a.h)) {
    const ost = poziomy[poziomy.length - 1];
    if (ost && Math.abs(ost.h - q.h) < 0.5) ost.x = Math.min(ost.x, q.x);
    else poziomy.push({ ...q });
  }
  if (poziomy.length < 2) return [];
  const xl = E(z.minX * 100, 0).x - 22;
  const y = (h: number) => E(0, h).y;
  const wynik: Prymityw[] = [];
  let pomocnicze = '';
  let d = `M${xl} ${y(poziomy[0].h)}V${y(poziomy[poziomy.length - 1].h)}`;
  for (const q of poziomy) {
    const yy = y(q.h);
    if (q.x - 4 > xl + 4) pomocnicze += `M${xl + 4} ${yy}H${q.x - 4}`;
    d += `M${xl - 5} ${yy}H${xl + 5}M${xl - 3} ${yy + 3}L${xl + 3} ${yy - 3}`;
  }
  if (pomocnicze) wynik.push({ t: 'sciezka', d: pomocnicze, kolor: PAPIER.olowek, grubosc: 0.7, kreska: '2 3', krycie: 0.45 });
  wynik.push({ t: 'sciezka', d, kolor: PAPIER.tusz, grubosc: 0.9 });
  for (let i = 1; i < poziomy.length; i++) {
    const dh = poziomy[i - 1].h - poziomy[i].h;
    const tekst = fm(dh, dh % 1 ? 1 : 0);
    const y0 = y(poziomy[i - 1].h);
    const y1 = y(poziomy[i].h);
    if (y1 - y0 < tekst.length * 6 + 4) continue;
    wynik.push({ t: 'tekst', x: xl - 4, y: (y0 + y1) / 2, tekst, kolor: PAPIER.tusz, rozmiar: 10, pogrubiony: true, kotwica: 'middle', obrot: -90, halo: true });
  }
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
  const pts: Pkt[] = s.punkty.map((p) => pozycjaPunktu(s, p.id)).filter((p): p is Pkt => !!p);
  for (const l of s.linie) {
    const g = geometriaLinii(s, l);
    if (g) for (let i = 1; i < 16; i++) pts.push(punktKrzywej(g.a, g.c, g.b, i / 16));
  }
  const minX = Math.min(...pts.map((p) => p.x), 0);
  const maxX = Math.max(...pts.map((p) => p.x), 1);
  const minY = Math.min(...pts.map((p) => p.y), 0);
  const maxY = Math.max(...pts.map((p) => p.y), 1);
  const lewy = 70;
  const prawy = 180;
  const gora = 110;
  const dol = 110;
  const sk = Math.min((szer - lewy - prawy) / Math.max(maxX - minX, 0.5), 400);
  const wys = Math.max(360, Math.round((maxY - minY) * sk + gora + dol));
  const w: Widok = { s: sk, tx: lewy - minX * sk, ty: gora - minY * sk };
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
  const gora = 280;
  const sk = Math.min((szer - 60 - LEWY_PRZEKROJU) / Math.max(z.maxX - z.minX, 0.05), 2500);
  const wys = Math.round((z.maxY - z.minY) * sk + gora + 50);
  const w = widokPrzekroju(p, szer, wys, gora, 30);
  const prym = rysunekPrzekroju(p, w, { pomiar, rzedne: pomiar });
  return { svg: svgZPrymitywow(prym, szer, wys, { tytul: p.nazwa, podtytul: p.opis }), szer, wys };
}
