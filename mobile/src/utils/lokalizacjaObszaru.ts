// Lokalizacja obszaru na trasie: odcinek wzdłuż czarnej osi albo własny
// kilometraż niebieskiej linii (0+000 na końcu dalszym, styk z czarną = koniec).

import type { ArkuszPzt, KonstrukcjaObszaru, ObszarObmiaru, OsBocznaPzt, ProjektBudowy, Punkt2D, WyjatekKonstrukcji } from '../types';
import { round2 } from './calculations';
import { powierzchniaWielokata } from './obmiarGeometry';
import { punktWWielokacie } from '../liniowka/liniowka';
import { formatujKmM, normalizujKolorHex, zsynchronizujLegendeProjektu } from './projektBudowy';
import { nazwaAutomatycznaObszaru } from './xfdfParser';
import {
  dlugoscPolilinii,
  osMZorientowana,
  punktNaOsi,
  stacjaNaOsi,
  stacjeLokalneNaOsiM,
  stronaWzgledemOsi,
  stycznyNaOsi,
  wycinekWielokataPoOsi,
} from './osPzt';

const PROG_STYKU_M = 12;
const PROG_PROSTOPADLE = 0.5;

export interface LancuchOsiBocznej {
  dlugoscM: number;
  /** Stacja na zapisanej polilinii, bliżej czarnej osi. */
  stacjaStyku: number;
  /** Stacja końca dalszego od czarnej osi. */
  stacjaDalsza: number;
  dystansStykuM: number;
  /** Kilometraż trasy głównej w styku. */
  kmTrasyM: number | null;
  prostopadla: boolean;
}

export interface LokalizacjaObszaru {
  rodzaj: 'os' | 'boczna';
  kmTrasyOdM: number;
  kmTrasyDoM: number;
  kmBocznaOdM?: number;
  kmBocznaDoM?: number;
  osBocznaId?: string;
  tekst: string;
}

export interface OdcinekObszaru {
  id: string;
  obszarId: string;
  kmOdM: number;
  kmDoM: number;
  wyjatekId?: string;
  numer: string;
  nazwa: string;
  wierzcholkiPdf: Punkt2D[];
  powierzchniaM2: number;
}

function stacjeWierzcholkow(pts: Punkt2D[]): number[] {
  const s = [0];
  for (let i = 1; i < pts.length; i++) {
    s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return s;
}

function kmTrasyZeStacji(arkusz: ArkuszPzt, stacjaM: number): number | null {
  const os = arkusz.osTrasy?.wierzcholkiM;
  if (!os || os.length < 2) return null;
  const dl = dlugoscPolilinii(os);
  const span = arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM;
  if (dl < 1e-6) return arkusz.kilometrazPoczatkowyM;
  return arkusz.kilometrazPoczatkowyM + (stacjaM / dl) * span;
}

function dystansDoOsi(os: Punkt2D[], p: Punkt2D): { d: number; stacja: number } {
  const stacja = stacjaNaOsi(os, p);
  const foot = punktNaOsi(os, stacja);
  if (!foot) return { d: Infinity, stacja };
  return { d: Math.hypot(p.x - foot.x, p.y - foot.y), stacja };
}

/** Układ niebieskiej linii: 0 po stronie dalszej, koniec przy czarnej osi. */
export function lancuchOsiBocznej(os: OsBocznaPzt, arkusz: ArkuszPzt): LancuchOsiBocznej | null {
  const linia = os.wierzcholkiM;
  const glowna = arkusz.osTrasy?.wierzcholkiM;
  if (linia.length < 2) return null;
  const stacje = stacjeWierzcholkow(linia);
  const dlugoscM = stacje[stacje.length - 1] ?? os.dlugoscM;
  let stacjaStyku = 0;
  let dystansStykuM = Infinity;
  let punktStyku = linia[0];
  if (glowna && glowna.length >= 2) {
    for (let i = 0; i < linia.length; i++) {
      const odl = dystansDoOsi(glowna, linia[i]);
      if (odl.d < dystansStykuM) {
        dystansStykuM = odl.d;
        stacjaStyku = stacje[i];
        punktStyku = linia[i];
      }
    }
  } else {
    dystansStykuM = Infinity;
  }
  const odPoczatku = stacjaStyku;
  const odKonca = Math.abs(dlugoscM - stacjaStyku);
  const stacjaDalsza = odKonca >= odPoczatku ? dlugoscM : 0;
  let prostopadla = false;
  let kmTrasyM: number | null = null;
  if (glowna && glowna.length >= 2 && dystansStykuM <= PROG_STYKU_M) {
    const tb = stycznyNaOsi(linia, stacjaStyku);
    const sg = stacjaNaOsi(glowna, punktStyku);
    const tg = stycznyNaOsi(glowna, sg);
    if (tb && tg) {
      prostopadla = Math.abs(tb.dx * tg.dx + tb.dy * tg.dy) <= PROG_PROSTOPADLE;
    }
    kmTrasyM = kmTrasyZeStacji(arkusz, sg);
  }
  return { dlugoscM, stacjaStyku, stacjaDalsza, dystansStykuM, kmTrasyM, prostopadla };
}

/** Kilometraż na niebieskiej linii. Rośnie od pikiety w stronę czarnej osi. */
export function kmNaOsiBocznej(os: OsBocznaPzt, lancuch: LancuchOsiBocznej, stacjaZapisana: number): number {
  const stacje = stacjeWierzcholkow(os.wierzcholkiM);
  const pikieta = os.pikietaWezla;
  const indeks = pikieta && pikieta.indeks >= 0 && pikieta.indeks < stacje.length ? pikieta.indeks : -1;
  const sAnchor = indeks >= 0 ? stacje[indeks] : lancuch.stacjaDalsza;
  const kmAnchor = indeks >= 0 && pikieta ? pikieta.kmM : 0;
  const znak = Math.sign(lancuch.stacjaStyku - sAnchor) || 1;
  return kmAnchor + (stacjaZapisana - sAnchor) * znak;
}

/** Kilometraż węzła niebieskiej linii (do ręcznej pikiety). */
export function kmWezlaOsiBocznej(os: OsBocznaPzt, arkusz: ArkuszPzt, indeks: number): number | null {
  const lancuch = lancuchOsiBocznej(os, arkusz);
  if (!lancuch) return null;
  const stacje = stacjeWierzcholkow(os.wierzcholkiM);
  if (indeks < 0 || indeks >= stacje.length) return null;
  return kmNaOsiBocznej(os, lancuch, stacje[indeks]);
}

function zakresNaCzarnej(obszar: ObszarObmiaru, arkusz: ArkuszPzt): { odM: number; doM: number; rozpietoscM: number } | null {
  const os = arkusz.osTrasy?.wierzcholkiM;
  if (!os || os.length < 2 || obszar.wierzcholkiM.length < 2) return null;
  const st = obszar.wierzcholkiM.map((p) => stacjaNaOsi(os, p));
  const s0 = Math.min(...st);
  const s1 = Math.max(...st);
  const km0 = kmTrasyZeStacji(arkusz, s0);
  const km1 = kmTrasyZeStacji(arkusz, s1);
  if (km0 == null || km1 == null) return null;
  return { odM: Math.min(km0, km1), doM: Math.max(km0, km1), rozpietoscM: Math.abs(s1 - s0) };
}

function odcinekBocznyWObszarze(os: OsBocznaPzt, obszar: ObszarObmiaru): { sMin: number; sMax: number; dlugoscM: number } | null {
  const linia = os.wierzcholkiM;
  const poly = obszar.wierzcholkiM;
  if (linia.length < 2 || poly.length < 3) return null;
  const stacje = stacjeWierzcholkow(linia);
  let sMin = Infinity;
  let sMax = -Infinity;
  let dlugoscM = 0;
  for (let i = 0; i < linia.length - 1; i++) {
    const a = linia[i];
    const b = linia[i + 1];
    const sa = stacje[i];
    const sb = stacje[i + 1];
    const wewnatrzA = punktWWielokacie(a, poly);
    const wewnatrzB = punktWWielokacie(b, poly);
    const srodek = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const wewnatrzS = punktWWielokacie(srodek, poly);
    if (!wewnatrzA && !wewnatrzB && !wewnatrzS) continue;
    const od = wewnatrzA || wewnatrzS ? sa : (sa + sb) / 2;
    const doS = wewnatrzB || wewnatrzS ? sb : (sa + sb) / 2;
    sMin = Math.min(sMin, od, doS);
    sMax = Math.max(sMax, od, doS);
    dlugoscM += Math.abs(doS - od);
  }
  if (!Number.isFinite(sMin) || sMax - sMin < 1) return null;
  return { sMin, sMax, dlugoscM };
}

function tekstZakresu(odM: number, doM: number): string {
  if (Math.abs(doM - odM) < 0.5) return formatujKmM(odM);
  return `${formatujKmM(Math.min(odM, doM))} – ${formatujKmM(Math.max(odM, doM))}`;
}

function centroid(pts: Punkt2D[]): Punkt2D {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  const n = Math.max(pts.length, 1);
  return { x: x / n, y: y / n };
}

/** Oś główna ustawiona tak, że idziemy w stronę rosnącego kilometrażu. */
function osWKierunkuKm(arkusz: ArkuszPzt): Punkt2D[] | undefined {
  const os = arkusz.osTrasy?.wierzcholkiM;
  if (!os || os.length < 2) return undefined;
  const zorient = osMZorientowana(arkusz);
  const baza = zorient.length >= 2 ? zorient : os;
  if (arkusz.kilometrazKoncowyM < arkusz.kilometrazPoczatkowyM) return [...baza].reverse();
  return baza;
}

/** Niebieska linia w kierunku rosnącego jej kilometrażu (także po ręcznej pikiecie). */
function liniaRosnacegoKm(os: OsBocznaPzt, lancuch: LancuchOsiBocznej): Punkt2D[] {
  const linia = os.wierzcholkiM;
  const kmPoczatek = kmNaOsiBocznej(os, lancuch, 0);
  const kmKoniec = kmNaOsiBocznej(os, lancuch, lancuch.dlugoscM);
  if (kmKoniec + 1e-6 < kmPoczatek) return [...linia].reverse();
  return linia;
}

/**
 * Lewa / prawa względem osi, patrząc w kierunku rosnącego kilometrażu.
 * Obszar wzdłuż niebieskiej linii (wjazd, ścieżka, droga boczna) bierze stronę z tej linii.
 */
export function stronaObszaruGeometryczna(
  obszar: ObszarObmiaru,
  arkusz: ArkuszPzt,
): 'lewa' | 'prawa' | undefined {
  if (obszar.wierzcholkiM.length < 1) return undefined;
  const srodek = centroid(obszar.wierzcholkiM);
  const lok = lokalizacjaObszaru(obszar, arkusz);
  if (lok?.rodzaj === 'boczna' && lok.osBocznaId) {
    const os = arkusz.osieBoczne?.find((o) => o.id === lok.osBocznaId);
    const lancuch = os ? lancuchOsiBocznej(os, arkusz) : null;
    if (os && lancuch && os.wierzcholkiM.length >= 2) {
      return stronaWzgledemOsi(srodek, liniaRosnacegoKm(os, lancuch));
    }
  }
  const glowna = osWKierunkuKm(arkusz);
  if (!glowna) return undefined;
  return stronaWzgledemOsi(srodek, glowna);
}

const NAZWA_AUTO = /^(Obszar \d+|Trasa [LP]|Droga boczna|Wjazd|Ścieżka rowerowa)$/;
const NAZWA_STRONY_LEGENDY = /^Trasa główna \(strona (lewa|prawa)\)$/;

/**
 * Ustawia stronę z geometrii na już wgranym projekcie.
 * Podmienia tylko nazwy automatyczne i domyślny tytuł legendy „strona lewa/prawa”.
 */
export function uzupelnijStronyObszarow(projekt: ProjektBudowy): ProjektBudowy {
  const licznik = new Map<string, { lewa: number; prawa: number }>();
  let arkuszeZmienione = false;
  const arkusze = projekt.arkusze.map((arkusz) => {
    let zmieniono = false;
    const obszary = arkusz.obszary.map((o) => {
      const geo = stronaObszaruGeometryczna(o, arkusz);
      const strona = geo ?? o.stronaTrasy;
      if (strona) {
        const klucz = normalizujKolorHex(o.kolorWypelnienia);
        const slot = licznik.get(klucz) ?? { lewa: 0, prawa: 0 };
        slot[strona] += 1;
        licznik.set(klucz, slot);
      }
      const nazwa = NAZWA_AUTO.test(o.nazwa)
        ? nazwaAutomatycznaObszaru(o.kolorWypelnienia, o.kolejnosc, strona)
        : o.nazwa;
      if (nazwa === o.nazwa && strona === o.stronaTrasy) return o;
      zmieniono = true;
      return { ...o, nazwa, stronaTrasy: strona };
    });
    if (!zmieniono) return arkusz;
    arkuszeZmienione = true;
    return { ...arkusz, obszary };
  });

  let legendaZmieniona = false;
  const legenda = projekt.legenda.map((w) => {
    if (w.typ !== 'obszar' || !NAZWA_STRONY_LEGENDY.test(w.nazwa)) return w;
    const stat = licznik.get(normalizujKolorHex(w.kolor));
    if (!stat || stat.lewa === stat.prawa) return w;
    const wieksza = stat.lewa > stat.prawa ? 'lewa' : 'prawa';
    const nazwa = `Trasa główna (strona ${wieksza})`;
    if (nazwa === w.nazwa) return w;
    legendaZmieniona = true;
    return { ...w, nazwa };
  });

  if (!arkuszeZmienione && !legendaZmieniona) return projekt;
  return {
    ...projekt,
    arkusze: arkuszeZmienione ? arkusze : projekt.arkusze,
    legenda: legendaZmieniona ? legenda : projekt.legenda,
  };
}

/** Legenda, konstrukcje i strony obszarów. Ten sam obiekt, gdy nic się nie zmieniło. */
export function przygotujProjekt(projekt: ProjektBudowy): ProjektBudowy {
  return uzupelnijStronyObszarow(zsynchronizujLegendeProjektu(projekt));
}

export function lokalizacjaObszaru(obszar: ObszarObmiaru, arkusz: ArkuszPzt): LokalizacjaObszaru | null {
  const czarna = zakresNaCzarnej(obszar, arkusz);
  let najlepsza: { os: OsBocznaPzt; lancuch: LancuchOsiBocznej; odcinek: { sMin: number; sMax: number; dlugoscM: number } } | null = null;
  for (const os of arkusz.osieBoczne ?? []) {
    const lancuch = lancuchOsiBocznej(os, arkusz);
    if (!lancuch?.prostopadla || lancuch.kmTrasyM == null) continue;
    const odcinek = odcinekBocznyWObszarze(os, obszar);
    if (!odcinek) continue;
    if (!najlepsza || odcinek.dlugoscM > najlepsza.odcinek.dlugoscM) najlepsza = { os, lancuch, odcinek };
  }
  const bocznaDluzsza = najlepsza && (!czarna || najlepsza.odcinek.dlugoscM > czarna.rozpietoscM * 1.15);
  if (bocznaDluzsza && najlepsza) {
    const od = kmNaOsiBocznej(najlepsza.os, najlepsza.lancuch, najlepsza.odcinek.sMin);
    const dos = kmNaOsiBocznej(najlepsza.os, najlepsza.lancuch, najlepsza.odcinek.sMax);
    const km = najlepsza.lancuch.kmTrasyM ?? 0;
    return {
      rodzaj: 'boczna',
      kmTrasyOdM: km,
      kmTrasyDoM: km,
      kmBocznaOdM: Math.min(od, dos),
      kmBocznaDoM: Math.max(od, dos),
      osBocznaId: najlepsza.os.id,
      tekst: `na trasie ${formatujKmM(km)} · ${tekstZakresu(od, dos)}`,
    };
  }
  if (!czarna) return null;
  return {
    rodzaj: 'os',
    kmTrasyOdM: czarna.odM,
    kmTrasyDoM: czarna.doM,
    tekst: tekstZakresu(czarna.odM, czarna.doM),
  };
}

export function podzialkaOsiBocznej(
  os: OsBocznaPzt,
  arkusz: ArkuszPzt,
  krokM: number,
): { kmM: number; etykieta: string; stacjaM: number }[] {
  const lancuch = lancuchOsiBocznej(os, arkusz);
  if (!lancuch || krokM < 1) return [];
  const km0 = kmNaOsiBocznej(os, lancuch, 0);
  const km1 = kmNaOsiBocznej(os, lancuch, lancuch.dlugoscM);
  const lo = Math.min(km0, km1);
  const hi = Math.max(km0, km1);
  const krok = Math.max(1, Math.round(krokM));
  const out: { kmM: number; etykieta: string; stacjaM: number }[] = [];
  const first = Math.ceil(lo / krok - 1e-9) * krok;
  const znak = Math.sign(km1 - km0) || 1;
  for (let km = first; km <= hi + 1e-6; km += krok) {
    const stacja = znak > 0
      ? (km - km0)
      : (km0 - km);
    out.push({ kmM: km, etykieta: formatujKmM(Math.max(0, km)), stacjaM: stacja });
  }
  return out;
}

function numerWyjatku(konstrukcja: KonstrukcjaObszaru, wyjatek: WyjatekKonstrukcji): number {
  if (wyjatek.numer && wyjatek.numer > 0) return wyjatek.numer;
  const i = konstrukcja.wyjatki.findIndex((w) => w.id === wyjatek.id);
  return i >= 0 ? i + 1 : 1;
}

function nazwaOdcinka(
  obszar: ObszarObmiaru,
  odM: number,
  doM: number,
  wyjatek?: WyjatekKonstrukcji,
): string {
  const zapis = (obszar.nazwyOdcinkow ?? []).find((n) => (
    Math.abs(n.kmOdM - odM) < 1.5 && Math.abs(n.kmDoM - doM) < 1.5
  ));
  if (zapis?.nazwa.trim()) return zapis.nazwa.trim();
  const opis = wyjatek?.opis?.replace(/\s*\(\d+\+\d{3}\s*-\s*\d+\+\d{3}\)\s*$/u, '').trim();
  if (opis) return opis;
  return obszar.nazwaDodatkowa?.trim() || obszar.nazwa;
}

function wycinakPdf(obszar: ObszarObmiaru, arkusz: ArkuszPzt, odM: number, doM: number): Punkt2D[] | null {
  const osPdf = arkusz.osTrasy?.wierzcholkiPdf;
  if (!osPdf || osPdf.length < 2) return null;
  const { s0, s1, dlOs } = stacjeLokalneNaOsiM(arkusz, odM, doM);
  const dlPdf = dlugoscPolilinii(osPdf);
  if (!(s1 > s0 + 0.05) || s1 - s0 >= dlOs - 0.2) return obszar.wierzcholkiPdf;
  const clip = wycinekWielokataPoOsi(obszar.wierzcholkiPdf, osPdf, (s0 / dlOs) * dlPdf, (s1 / dlOs) * dlPdf);
  return clip.length >= 3 ? clip : null;
}

function powierzchniaOdcinkaM2(obszar: ObszarObmiaru, arkusz: ArkuszPzt, odM: number, doM: number, caly: boolean): number {
  if (caly) return obszar.powierzchniaM2;
  const os = arkusz.osTrasy?.wierzcholkiM;
  if (!os || os.length < 2) return obszar.powierzchniaM2;
  const { s0, s1 } = stacjeLokalneNaOsiM(arkusz, odM, doM);
  const clip = wycinekWielokataPoOsi(obszar.wierzcholkiM, os, s0, s1);
  if (clip.length < 3) return 0;
  return round2(Math.abs(powierzchniaWielokata(clip)));
}

/** Odcinki obszaru. Zmiana konstrukcji tnie obrys na osobno wybieralne kawałki. */
export function odcinkiObszaru(
  obszar: ObszarObmiaru,
  arkusz: ArkuszPzt,
  konstrukcja: KonstrukcjaObszaru | undefined,
): OdcinekObszaru[] {
  const lok = lokalizacjaObszaru(obszar, arkusz);
  const odCale = lok?.kmTrasyOdM ?? arkusz.kilometrazPoczatkowyM;
  const doCale = lok?.kmTrasyDoM ?? arkusz.kilometrazKoncowyM;
  const numerBazy = String(konstrukcja?.numer ?? '');
  const caly = (odM: number, doM: number, wyjatek?: WyjatekKonstrukcji): OdcinekObszaru => ({
    id: `${obszar.id}|${round2(odM)}|${round2(doM)}`,
    obszarId: obszar.id,
    kmOdM: odM,
    kmDoM: doM,
    wyjatekId: wyjatek?.id,
    numer: wyjatek && konstrukcja ? `${numerBazy}.${numerWyjatku(konstrukcja, wyjatek)}` : numerBazy,
    nazwa: nazwaOdcinka(obszar, odM, doM, wyjatek),
    wierzcholkiPdf: obszar.wierzcholkiPdf,
    powierzchniaM2: obszar.powierzchniaM2,
  });
  const rozpietosc = Math.abs(doCale - odCale);
  if (!konstrukcja || lok?.rodzaj === 'boczna' || rozpietosc < 8) {
    return [caly(odCale, doCale)];
  }
  const wyjatki = konstrukcja.wyjatki
    .filter((w) => !w.obszarIds?.length || w.obszarIds.includes(obszar.id))
    .map((w) => ({ w, od: Math.max(odCale, Math.min(w.kmOdM, w.kmDoM)), do: Math.min(doCale, Math.max(w.kmOdM, w.kmDoM)) }))
    .filter((x) => x.do > x.od + 0.4)
    .sort((a, b) => a.od - b.od);
  if (wyjatki.length === 0) return [caly(odCale, doCale)];
  const kawalki: { od: number; do: number; wyjatek?: WyjatekKonstrukcji }[] = [];
  let kursor = odCale;
  for (const x of wyjatki) {
    if (x.od > kursor + 0.4) kawalki.push({ od: kursor, do: x.od });
    kawalki.push({ od: Math.max(kursor, x.od), do: x.do, wyjatek: x.w });
    kursor = Math.max(kursor, x.do);
  }
  if (doCale > kursor + 0.4) kawalki.push({ od: kursor, do: doCale });
  const out: OdcinekObszaru[] = [];
  for (const k of kawalki) {
    const pdf = wycinakPdf(obszar, arkusz, k.od, k.do);
    if (!pdf) continue;
    out.push({
      id: `${obszar.id}|${round2(k.od)}|${round2(k.do)}`,
      obszarId: obszar.id,
      kmOdM: k.od,
      kmDoM: k.do,
      wyjatekId: k.wyjatek?.id,
      numer: k.wyjatek ? `${numerBazy}.${numerWyjatku(konstrukcja, k.wyjatek)}` : numerBazy,
      nazwa: nazwaOdcinka(obszar, k.od, k.do, k.wyjatek),
      wierzcholkiPdf: pdf,
      powierzchniaM2: powierzchniaOdcinkaM2(obszar, arkusz, k.od, k.do, false),
    });
  }
  return out.length > 0 ? out : [caly(odCale, doCale)];
}

export function nastepnyNumerWyjatku(konstrukcja: KonstrukcjaObszaru): number {
  return konstrukcja.wyjatki.reduce((m, w) => Math.max(m, w.numer ?? 0), 0) + 1;
}

export function zapiszPikieteWezla(
  projekt: ProjektBudowy,
  arkuszId: string,
  osId: string,
  indeks: number,
  kmM: number,
): ProjektBudowy {
  return {
    ...projekt,
    arkusze: projekt.arkusze.map((a) => (a.id !== arkuszId ? a : {
      ...a,
      osieBoczne: a.osieBoczne?.map((os) => (os.id === osId ? { ...os, pikietaWezla: { indeks, kmM } } : os)),
    })),
  };
}

export function zapiszNazweOdcinka(
  projekt: ProjektBudowy,
  obszarId: string,
  kmOdM: number,
  kmDoM: number,
  nazwa: string,
): ProjektBudowy {
  return {
    ...projekt,
    arkusze: projekt.arkusze.map((a) => ({
      ...a,
      obszary: a.obszary.map((o) => {
        if (o.id !== obszarId) return o;
        const reszta = (o.nazwyOdcinkow ?? []).filter((n) => Math.abs(n.kmOdM - kmOdM) >= 1.5 || Math.abs(n.kmDoM - kmDoM) >= 1.5);
        return { ...o, nazwyOdcinkow: [...reszta, { kmOdM, kmDoM, nazwa }] };
      }),
    })),
  };
}
