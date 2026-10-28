import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Svg, {
  Circle, ClipPath, Defs, G, Image as SvgImage, Line, Path, Polygon, Polyline, Rect, Text as SvgText,
} from 'react-native-svg';
import { InfoTooltip } from '../common/InfoTooltip';
import type { ArkuszPzt, ElementSzkicu, Punkt2D, TloArkuszaPzt } from '../../types';
import {
  dociagnijDoObszaru, dodajPunktKreski, dodajWezel, elementPodPunktem, krawedzieLamanej, lukPrzezPunkt, obrysLamanej,
  najmniejszyWielokatPodPunktem, przesunWezel, punktWWielokacie, srodekKrawedzi, stacjeZnakowInfo, ustawLuk, wymazGumka, type LamanaSzkicu,
} from '../../liniowka/liniowka';
import { wypelnijDoKrawedzi, zakresPunktow } from '../../liniowka/rasterSzkicu';
import { kluczLegendy } from '../../utils/projektBudowy';
import { podzialkaOsiBocznej } from '../../utils/lokalizacjaObszaru';
import { bboxWielokata } from '../../utils/obmiarGeometry';
import {
  czoloObmiaruPdf,
  dlugoscLamanejPdfM,
  dlugoscOsiPdf1500M,
  dlugoscPolilinii,
  kmPunktuNaOsiPdf,
  korytarzPodzialkiPdf,
  medianaSzerokosciObszarowPdf,
  napisZakresuWzdluzOsi,
  ocenaOdstempuPodzialkiM,
  osPdfZorientowana,
  pdfDoSvgPodgladu,
  pomiarWzdlozOsiPdf,
  punktNaOsi,
  obrotOpisuWzdluzKm,
  rozmiarPodzialkiOsi,
  stacjePodzialki,
  ukladKrotkiejPodzialki,
  stycznyNaOsi,
  svgDoPdfPodgladu,
  pasUkladaniaPdf,
  szerokoscPoprzecznaPdf,
  wycinekWielokataPoOsi,
} from '../../utils/osPzt';
import type { WynikPomiaruOsi } from '../../utils/osPzt';
import {
  nastepnyPresetZoom,
  ograniczenie,
  PRESETY_ZOOM_PROC,
  SKALA_MAX,
  SKALA_MIN,
  skalaZProcentu,
  translacjaPrzyZoomie,
  punktSvgZEkranu,
} from '../../utils/obmiarMapa';
import { formatujKmM } from '../../utils/projektBudowy';
import { buforTlaArkusza, listaWgranychPdf, odtworzTlaZIdb, podlaczBuforDoArkusza, przypnijWgranyPdfDoArkusza } from '../../utils/tloPdfPamiec';
import { PztTloPdfCanvas, type ObrazTlaPdf } from './PztTloPdfCanvas';
import { FILL_ULOZONE, katWektoraStopni, MaszynaObmiaru, wymiaryMaszyny } from '../sketch/MaszynyObmiaru';
import type { AppTheme } from '../../constants/theme';

function hostHtml(node: unknown): HTMLElement | null {
  if (Platform.OS !== 'web' || !node) return null;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return node;
  const anyNode = node as { getNode?: () => unknown; _nativeNode?: unknown };
  const inner = anyNode.getNode?.() ?? anyNode._nativeNode ?? null;
  if (typeof HTMLElement !== 'undefined' && inner instanceof HTMLElement) return inner;
  return null;
}

function hexDoRgba(hex: string | undefined, alpha: number): string {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return `rgba(232,160,32,${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function srodek(pts: Punkt2D[]): Punkt2D {
  if (pts.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

function idAutaPodPunktem(
  maszyny: Array<{ id: string; rodzaj: 'rozkladarka' | 'auto'; x: number; y: number; rotDeg: number; szerObszaru: number }>,
  x: number,
  y: number,
): string | null {
  let best: { id: string; d2: number } | null = null;
  for (const m of maszyny) {
    if (m.rodzaj !== 'auto') continue;
    const { szer, dl } = wymiaryMaszyny(m.szerObszaru, 'auto');
    const rad = (-m.rotDeg * Math.PI) / 180;
    const dx = x - m.x;
    const dy = y - m.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    if (Math.abs(lx) > dl / 2 || Math.abs(ly) > szer / 2) continue;
    const d2 = lx * lx + ly * ly;
    if (!best || d2 < best.d2) best = { id: m.id, d2 };
  }
  return best?.id ?? null;
}

function kmAlboPuste(v: number | null | undefined): string {
  return v == null ? '—' : formatujKmM(v);
}

function tekstPomiaruLamanej(
  metry: number,
  km: Array<number | null>,
  wzdluzOsi: WynikPomiaruOsi | null,
): string {
  const m = metry.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stacje = km.map((v, i) => `${i + 1} ${kmAlboPuste(v)}`).join(' · ');
  const ocena = wzdluzOsi ? ` ${ocenaOdstempuPodzialkiM(wzdluzOsi.metry1500).tekst}` : '';
  return `Łamana ${m} m · ${stacje}.${ocena}`;
}

function tekstOsi1500(os1500M: number, xfdfM: number | undefined, dlM: number): string {
  const a = os1500M.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const xfdf = (xfdfM && xfdfM > 1 ? xfdfM : dlM).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Oś 1:500 = ${a} m · XFDF = ${xfdf} m.`;
}

interface LiveAutoPzt {
  id: string;
  stacjaM: number;
  numer: number;
}

/** Ułożony odcinek na liniówce – kolejność tablicy = kolejność zakrywania (ostatni na wierzchu). */
export interface OdcinekLiniowkiPodgladu {
  id: string;
  /** Klucz legendy obszaru, np. "obszar|#FFEE58". */
  kluczObszaru: string;
  kmOdM: number;
  kmDoM: number;
  kolor: string;
  krycie: number;
  reczny?: boolean;
  /** Klucz warstwy – strzałki dnia leżą tuż nad swoją warstwą. */
  warstwa?: string;
}

export interface SzkicPodgladu {
  id: string;
  elementy: ElementSzkicu[];
  krycie: number;
  /** Ile odcinków liniówki leży pod szkicem. Brak = na wierzchu. */
  poIndeksie?: number;
  /** Obszary warstwy (PDF) – szkic widać tylko w nich. Brak = cały arkusz. */
  klip?: Punkt2D[][] | null;
}

export interface LiniowkaPodgladu {
  odcinki: OdcinekLiniowkiPodgladu[];
  szkice?: SzkicPodgladu[];
  podswietlonyId?: string;
  onPressOdcinek?: (id: string) => void;
  podswietlonySzkicId?: string;
  onPressSzkic?: (id: string) => void;
}

export type NarzedzieSzkicu = 'pioro' | 'wiadro' | 'gumka' | 'lamana';

export interface RysowaniePodgladu {
  narzedzie: NarzedzieSzkicu;
  kolor: string;
  /** Grubość na ekranie przy obecnym przybliżeniu – zapisywana w jednostkach PDF. 0 = linia obszaru. */
  gruboscPx: number;
  elementy: ElementSzkicu[];
  onZmien: (elementy: ElementSzkicu[]) => void;
  /** Obszary warstwy (PDF): pióro i wiaderko działają tylko w nich. Brak = cały arkusz. */
  klip?: Punkt2D[][] | null;
  onWiadroBezGranic?: () => void;
  /** Linia łamana w budowie (narzędzie „lamana”). */
  lamana?: LamanaSzkicu;
  onLamana?: (l: LamanaSzkicu) => void;
  /** Wybór obszaru: stuknięcie zwraca punkt PDF, nic się nie rysuje; `klip` = obszary do wyboru. */
  onWskazObszar?: (p: Punkt2D) => void;
}

type ChwytLamanej = { typ: 'wezel'; i: number } | { typ: 'luk'; i: number } | { typ: 'widok' };

const PROMIEN_GUMKI_PX = 12;
const CHWYT_WEZLA_PX = 16;
const LINIA_OBSZARU_PX = 1.25;
const LED_HALO = '#FDE047';
const LED_RDZEN = '#FFFBEB';

function sciezkaSvg(pts: Punkt2D[], zamknij: boolean): string {
  if (pts.length === 0) return '';
  const [p0, ...reszta] = pts;
  return `M${p0.x.toFixed(2)},${p0.y.toFixed(2)}${reszta.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('')}${zamknij ? 'Z' : ''}`;
}

function idKlipu(id: string): string {
  return `klip-${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

interface WymiarStrzalki {
  dl: number;
  pol: number;
  odstep: number;
}

/** Strzałka w jednostkach rysunku – rośnie i maleje razem z planem. */
function strzalka(mx: number, my: number, ux: number, uy: number, { dl, pol, odstep }: WymiarStrzalki): string {
  const bx = mx + ux * odstep;
  const by = my + uy * odstep;
  const tx = bx + ux * dl;
  const ty = by + uy * dl;
  const nx = -uy;
  const ny = ux;
  return `${tx},${ty} ${bx + nx * pol},${by + ny * pol} ${bx - nx * pol},${by - ny * pol}`;
}

interface Props {
  arkusz: ArkuszPzt;
  theme: AppTheme;
  wysokosc?: number;
  blokadaPodgladu?: boolean;
  onBlokadaPodgladu?: (v: boolean) => void;
  onDotykZmiana?: (aktywny: boolean) => void;
  onTloZmiana?: (patch: Partial<TloArkuszaPzt>) => void;
  liveStacjaM?: number;
  liveAuta?: LiveAutoPzt[];
  onPressAuto?: (id: string) => void;
  /** Co ile metrów kreska pikiety na osi (0 = wyłącz). */
  podzialkaM?: number;
  /** Start zakresu planu (zielona kreska). */
  zakresStartM?: number;
  /** Koniec zakresu planu (czerwona kreska). */
  zakresKoniecM?: number;
  /** Stuknięcie w podgląd zwraca punkt PDF (wybór kilometrażu na mapie). */
  onWskazPdf?: (p: Punkt2D) => void;
  /** Poszerzone warstwy (odsadzki) rysowane pod obrysem ścieralnej. */
  odsadzki?: { id: string; wierzcholkiPdf: Punkt2D[]; kolor: string; krycie: number }[];
  /** Obszary podświetlone przy przypisywaniu do konstrukcji. */
  zaznaczoneIds?: string[];
  /** Obszar podświetlony po stuknięciu (karta powierzchni i konstrukcji). */
  podswietlonyObszarId?: string;
  onPressObszar?: (obszarId: string) => void;
  /** Kawałki obszaru po zmianie konstrukcji – osobno stukalne. */
  wycinki?: { id: string; obszarId: string; wierzcholkiPdf: Punkt2D[] }[];
  podswietlonyWycinekId?: string;
  onPressWycinek?: (id: string) => void;
  /** Węzły niebieskich linii do ręcznego pikietażu. */
  pokazWezlyOsi?: boolean;
  onPressWezelOsi?: (osId: string, indeks: number) => void;
  liniowka?: LiniowkaPodgladu;
  /** Tryb szkicu: jeden palec rysuje, dwa przybliżają. */
  rysowanie?: RysowaniePodgladu;
}

export function PztArkuszPodglad({
  arkusz,
  theme,
  wysokosc = 360,
  blokadaPodgladu = false,
  onBlokadaPodgladu,
  onDotykZmiana,
  onTloZmiana,
  liveStacjaM,
  liveAuta,
  onPressAuto,
  podzialkaM = 50,
  zakresStartM,
  zakresKoniecM,
  onWskazPdf,
  odsadzki,
  zaznaczoneIds,
  podswietlonyObszarId,
  onPressObszar,
  wycinki,
  podswietlonyWycinekId,
  onPressWycinek,
  pokazWezlyOsi = false,
  onPressWezelOsi,
  liniowka,
  rysowanie,
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });
  const [skalaPct, setSkalaPct] = useState(100);
  const [xform, setXform] = useState({ s: 1, tx: 0, ty: 0 });
  const [bladTla, setBladTla] = useState<string | null>(null);
  const [tloObraz, setTloObraz] = useState<ObrazTlaPdf | null>(null);
  const [zmierz, setZmierz] = useState(false);
  const [punktyPomiaru, setPunktyPomiaru] = useState<Punkt2D[]>([]);
  const punktyPomiaruRef = useRef<Punkt2D[]>([]);
  punktyPomiaruRef.current = punktyPomiaru;
  const chwytPomiaru = useRef<number | null>(null);
  const onObrazTla = useCallback((o: ObrazTlaPdf | null) => setTloObraz(o), []);
  const onBladTla = useCallback((m: string | null) => setBladTla(m), []);
  const [tickTla, setTickTla] = useState(0);

  useEffect(() => {
    const tlo = arkusz.tlo;
    if (!tlo || tlo.widoczne === false) return undefined;
    if (buforTlaArkusza(arkusz.id) ?? (tlo.nazwa ? podlaczBuforDoArkusza(arkusz.id, tlo.nazwa) : undefined)) {
      return undefined;
    }
    let zyje = true;
    void odtworzTlaZIdb().then(() => {
      if (!zyje) return;
      if (tlo.nazwa) podlaczBuforDoArkusza(arkusz.id, tlo.nazwa);
      if (!buforTlaArkusza(arkusz.id)) {
        const lista = listaWgranychPdf();
        if (lista.length === 1) przypnijWgranyPdfDoArkusza(arkusz.id, lista[0].nazwa);
      }
      setTickTla((n) => n + 1);
    });
    return () => { zyje = false; };
  }, [arkusz.id, arkusz.tlo?.nazwa, arkusz.tlo?.widoczne]);
  const TAP_MAX = 12;

  const bazaSkali = useRef(1);
  const bazaX = useRef(0);
  const bazaY = useRef(0);
  const pinchStart = useRef({ s: 1, tx: 0, ty: 0, f0x: 0, f0y: 0 });
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const klipRef = useRef<View>(null);
  const odpinWheel = useRef<(() => void) | null>(null);
  const rozmiarRef = useRef({ w: 320, h: wysokosc });
  rozmiarRef.current = rozmiar;
  const PAN_CZYNNIK = 0.55;

  const geometria = useMemo(() => {
    const pts = arkusz.obszary.flatMap((o) => [
      ...o.wierzcholkiPdf,
      ...(o.krawedzniki ?? []).flatMap((k) => k.wierzcholkiPdf),
    ]);
    if (arkusz.osTrasy?.wierzcholkiPdf?.length) pts.push(...arkusz.osTrasy.wierzcholkiPdf);
    for (const os of arkusz.osieBoczne ?? []) pts.push(...os.wierzcholkiPdf);
    for (const o of odsadzki ?? []) pts.push(...o.wierzcholkiPdf);
    return bboxWielokata(pts);
  }, [arkusz, odsadzki]);

  const mapa = useMemo(() => {
    if (arkusz.obszary.length === 0 || geometria.szer <= 0) return null;
    const pad = 28;
    const skalaFit = Math.min(
      (rozmiar.w - pad * 2) / Math.max(geometria.szer, 0.01),
      (rozmiar.h - pad * 2) / Math.max(geometria.wys, 0.01),
    );
    const cx = (geometria.minX + geometria.maxX) / 2;
    const cy = (geometria.minY + geometria.maxY) / 2;
    const toSvg = (p: Punkt2D) => ({
      x: rozmiar.w / 2 + (p.x - cx) * skalaFit,
      y: rozmiar.h / 2 - (p.y - cy) * skalaFit,
    });
    const obszary = arkusz.obszary.map((o) => {
      const svgPts = o.wierzcholkiPdf.map(toSvg);
      const c = srodek(svgPts);
      return {
        id: o.id,
        nazwa: o.nazwa,
        fill: hexDoRgba(o.kolorWypelnienia, arkusz.tlo?.widoczne === false ? 0.42 : (arkusz.tlo ? 0.12 : 0.42)),
        stroke: o.kolorWypelnienia || '#E8A020',
        punkty: svgPts.map((p) => `${p.x},${p.y}`).join(' '),
        cx: c.x,
        cy: c.y,
        krawedzniki: (o.krawedzniki ?? []).map((k) => ({
          id: k.id,
          punkty: k.wierzcholkiPdf.map(toSvg).map((p) => `${p.x},${p.y}`).join(' '),
          kolor: k.kolor || '#FF0000',
          odOsi: k.polozenie === 'odOsi',
        })),
        zaznaczony: zaznaczoneIds?.includes(o.id) ?? false,
      };
    });
    const odsadzkiSvg = (odsadzki ?? []).map((o) => ({
      id: o.id,
      punkty: o.wierzcholkiPdf.map(toSvg).map((p) => `${p.x},${p.y}`).join(' '),
      kolor: o.kolor,
      krycie: o.krycie,
    }));
    const osieBoczne = (arkusz.osieBoczne ?? []).map((os) => ({
      id: os.id,
      punkty: os.wierzcholkiPdf.map(toSvg).map((p) => `${p.x},${p.y}`).join(' '),
    }));
    const osPdf = osPdfZorientowana(arkusz);
    const osPts = osPdf.map(toSvg);
    const osPunkty = osPts.map((p) => `${p.x},${p.y}`).join(' ');
    const dlM = Math.max(0.01, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM);
    const stacjaNaSvg = (stacjaM: number): (Punkt2D & { ux: number; uy: number }) | null => {
      if (!osPdf || osPdf.length < 2) return null;
      const sM = stacjaM - arkusz.kilometrazPoczatkowyM;
      if (sM < -1 || sM > dlM + 1) return null;
      const sPdf = (sM / dlM) * dlugoscPolilinii(osPdf);
      const t = stycznyNaOsi(osPdf, sPdf);
      if (!t) return null;
      const p = toSvg(t.punkt);
      const sdx = t.dx * skalaFit;
      const sdy = -t.dy * skalaFit;
      const sl = Math.hypot(sdx, sdy) || 1;
      return { x: p.x, y: p.y, ux: sdx / sl, uy: sdy / sl };
    };
    const dlPdf = osPdf && osPdf.length >= 2 ? dlugoscPolilinii(osPdf) : 0;
    const krok = podzialkaM ?? 0;
    const szerPdf = medianaSzerokosciObszarowPdf(arkusz.obszary);
    const kreskaNaStacji = (kmM: number, odM: number, span: number, skalaKreski: number) => {
      if (!osPdf || osPdf.length < 2) return null;
      const sPdf = ((kmM - odM) / span) * dlPdf;
      const lokalna = szerokoscPoprzecznaPdf(arkusz.obszary, osPdf, sPdf);
      const kor = korytarzPodzialkiPdf(arkusz.obszary, osPdf, sPdf);
      const szerLok = kor ? Math.max(4, kor.maxU - kor.minU) : (lokalna > 2 ? lokalna : szerPdf);
      const podz = rozmiarPodzialkiOsi(szerLok);
      const tSt = stycznyNaOsi(osPdf, sPdf);
      if (!tSt) return null;
      const plen = Math.hypot(tSt.dx, tSt.dy) || 1;
      const nx = kor?.nx ?? (-tSt.dy / plen);
      const ny = kor?.ny ?? (tSt.dx / plen);
      const punkt = kor?.punkt ?? tSt.punkt;
      const inset = 0.45;
      let u1 = kor ? kor.minU + inset : -podz.halfPdf * skalaKreski;
      let u2 = kor ? kor.maxU - inset : podz.halfPdf * skalaKreski;
      if (u2 - u1 < 3) {
        u1 = kor ? kor.minU : u1;
        u2 = kor ? kor.maxU : u2;
      }
      const etykieta = formatujKmM(kmM);
      let fontPdf = podz.fontPdf * (skalaKreski < 1 ? 0.92 : 1);
      const wiekszaStrona = Math.max(u2 - 0.35, -(u1 + 0.35), 2);
      while (fontPdf * 1.15 > wiekszaStrona && fontPdf > 2.1) fontPdf *= 0.92;
      const uklad = ukladKrotkiejPodzialki(u1, u2, fontPdf);
      const p1 = toSvg({ x: punkt.x + nx * uklad.uKreskaA, y: punkt.y + ny * uklad.uKreskaA });
      const p2 = toSvg({ x: punkt.x + nx * uklad.uKreskaB, y: punkt.y + ny * uklad.uKreskaB });
      const tp = toSvg({ x: punkt.x + nx * uklad.uTekst, y: punkt.y + ny * uklad.uTekst });
      const mid = toSvg(punkt);
      const sdx = tSt.dx * skalaFit;
      const sdy = -tSt.dy * skalaFit;
      const sl = Math.hypot(sdx, sdy) || 1;
      const ux = sdx / sl;
      const uy = sdy / sl;
      const rot = obrotOpisuWzdluzKm(ux, uy);
      return {
        kmM,
        etykieta,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        tx: tp.x,
        ty: tp.y,
        rot,
        mx: mid.x,
        my: mid.y,
        ux,
        uy,
        fontSvg: fontPdf * skalaFit,
        rMarkerSvg: Math.max(2.2, Math.min(4.2, fontPdf * skalaFit * 0.72)),
      };
    };
    const kreski = (odM: number, doM: number, skalaKreski: number) => {
      if (krok < 1 || !osPdf || osPdf.length < 2) return [];
      const span = Math.max(0.01, doM - odM);
      return stacjePodzialki(odM, doM, krok)
        .map((kmM) => kreskaNaStacji(kmM, odM, span, skalaKreski))
        .filter((x): x is NonNullable<typeof x> => !!x);
    };
    const odKm = arkusz.kilometrazPoczatkowyM;
    const doKm = arkusz.kilometrazKoncowyM;
    const spanKm = Math.max(0.01, doKm - odKm);
    const podzialki = kreski(odKm, doKm, 1);
    const naArkuszu = (km?: number) => km != null && km >= odKm - 0.6 && km <= doKm + 0.6;
    const zakresKreski: Array<NonNullable<ReturnType<typeof kreskaNaStacji>> & { kolor: string; rola: 'start' | 'koniec' }> = [];
    const zCzolem = (k: NonNullable<ReturnType<typeof kreskaNaStacji>>, kmM: number) => {
      if (!osPdf || osPdf.length < 2) return k;
      const sPdf = ((kmM - odKm) / spanKm) * dlPdf;
      const cz = czoloObmiaruPdf(arkusz.obszary, osPdf, sPdf);
      if (!cz) return k;
      const a = toSvg(cz.a);
      const b = toSvg(cz.b);
      const s = toSvg(cz.srodek);
      return { ...k, x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx: s.x, my: s.y };
    };
    const kStart = naArkuszu(zakresStartM) ? kreskaNaStacji(zakresStartM!, odKm, spanKm, 1.05) : null;
    const kKoniec = naArkuszu(zakresKoniecM) ? kreskaNaStacji(zakresKoniecM!, odKm, spanKm, 1.05) : null;
    if (kStart) zakresKreski.push({ ...zCzolem(kStart, zakresStartM!), kolor: '#16A34A', rola: 'start' });
    if (kKoniec) zakresKreski.push({ ...zCzolem(kKoniec, zakresKoniecM!), kolor: '#DC2626', rola: 'koniec' });
    const kmRosnie = zakresStartM == null || zakresKoniecM == null || zakresKoniecM >= zakresStartM;
    const maszynaNaStacji = (stacjaM: number) => {
      if (!osPdf || osPdf.length < 2 || dlPdf <= 0) return null;
      const margines = 12;
      if (stacjaM < odKm - margines || stacjaM > doKm + margines) return null;
      const stacja = Math.max(odKm, Math.min(doKm, stacjaM));
      const p = stacjaNaSvg(stacja);
      if (!p) return null;
      const sPdf = ((stacja - odKm) / spanKm) * dlPdf;
      const pas = pasUkladaniaPdf(arkusz.obszary, osPdf, sPdf);
      let x = p.x;
      let y = p.y;
      let szerObszaru = Math.max(szerPdf, 0.5) * skalaFit;
      if (pas && pas.szer > 0.4) {
        const s = toSvg(pas.srodek);
        x = s.x;
        y = s.y;
        szerObszaru = pas.szer * skalaFit;
      }
      const znak = kmRosnie ? 1 : -1;
      return { x, y, rotDeg: katWektoraStopni(p.ux * znak, p.uy * znak), szerObszaru };
    };
    const maszyny: Array<{
      id: string;
      rodzaj: 'rozkladarka' | 'auto';
      x: number;
      y: number;
      rotDeg: number;
      szerObszaru: number;
      numer?: number;
    }> = [];
    for (const a of liveAuta ?? []) {
      const m = maszynaNaStacji(a.stacjaM);
      if (m) maszyny.push({ id: a.id, rodzaj: 'auto', numer: a.numer, ...m });
    }
    if (liveStacjaM != null) {
      const m = maszynaNaStacji(liveStacjaM);
      if (m) maszyny.push({ id: 'rozkladarka', rodzaj: 'rozkladarka', ...m });
    }
    const rozkladarka = maszyny.find((m) => m.rodzaj === 'rozkladarka');
    if (rozkladarka) {
      for (const auto of maszyny) {
        if (auto.rodzaj !== 'auto') continue;
        if (Math.hypot(auto.x - rozkladarka.x, auto.y - rozkladarka.y) > auto.szerObszaru * 0.45) continue;
        const rad = (auto.rotDeg * Math.PI) / 180;
        const cofnij = (wymiaryMaszyny(rozkladarka.szerObszaru, 'rozkladarka').dl + wymiaryMaszyny(auto.szerObszaru, 'auto').dl) * 0.55;
        auto.x -= Math.cos(rad) * cofnij;
        auto.y -= Math.sin(rad) * cofnij;
      }
    }
    const ulozone: string[] = [];
    if (liveStacjaM != null && zakresStartM != null && osPdf && osPdf.length >= 2 && dlPdf > 0) {
      const clampS = (km: number) => {
        const s = ((km - odKm) / spanKm) * dlPdf;
        return Math.max(0, Math.min(dlPdf, s));
      };
      const sA = clampS(zakresStartM);
      const sB = clampS(liveStacjaM);
      if (Math.abs(sB - sA) > 0.4) {
        for (const o of arkusz.obszary) {
          const clip = wycinekWielokataPoOsi(o.wierzcholkiPdf, osPdf, sA, sB);
          if (clip.length < 3) continue;
          ulozone.push(clip.map((pt) => {
            const s = toSvg(pt);
            return `${s.x},${s.y}`;
          }).join(' '));
        }
      }
    }
    const mapaSvg = { w: rozmiar.w, h: rozmiar.h, cx, cy, skalaFit };
    const os1500M = osPdf && osPdf.length >= 2 ? dlugoscOsiPdf1500M(osPdf) : 0;
    const xfdfM = arkusz.osTrasy?.dlugoscEtykietaM;
    return {
      obszary,
      odsadzkiSvg,
      osieBoczne,
      skalaFit,
      cx,
      cy,
      osPdf,
      osPunkty,
      mapaSvg,
      os1500M,
      xfdfM,
      dlM,
      maszyny,
      ulozone,
      podzialki,
      zakresKreski,
      rMarkerSvg: podzialki[0]?.rMarkerSvg ?? Math.max(2.2, Math.min(4.5, 3.2 * skalaFit)),
    };
  }, [arkusz, geometria, rozmiar.w, rozmiar.h, liveStacjaM, liveAuta, podzialkaM, zakresStartM, zakresKoniecM, odsadzki, zaznaczoneIds]);

  const podzialkiBoczne = useMemo(() => {
    if (!mapa) return [];
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const out: {
      key: string; etykieta: string; x1: number; y1: number; x2: number; y2: number;
      tx: number; ty: number; rot: number; fontSvg: number;
    }[] = [];
    const krok = podzialkaM ?? 0;
    for (const os of arkusz.osieBoczne ?? []) {
      const pdf = os.wierzcholkiPdf;
      if (pdf.length < 2) continue;
      const dlPdf = dlugoscPolilinii(pdf);
      const dlM = os.wierzcholkiM.length >= 2 ? dlugoscPolilinii(os.wierzcholkiM) : os.dlugoscM;
      if (dlPdf < 1 || dlM < 1) continue;
      for (const st of podzialkaOsiBocznej(os, arkusz, krok)) {
        const sPdf = Math.max(0, Math.min(dlPdf, (st.stacjaM / dlM) * dlPdf));
        const t = stycznyNaOsi(pdf, sPdf);
        if (!t) continue;
        const half = Math.min(10, Math.max(3.2, 2.4 / Math.max(dlM / dlPdf, 0.05)));
        const fontPdf = Math.min(5.2, Math.max(3.1, half * 0.5));
        const uklad = ukladKrotkiejPodzialki(-half, half, fontPdf);
        const nx = -t.dy;
        const ny = t.dx;
        const p1 = toSvg({ x: t.punkt.x + nx * uklad.uKreskaA, y: t.punkt.y + ny * uklad.uKreskaA });
        const p2 = toSvg({ x: t.punkt.x + nx * uklad.uKreskaB, y: t.punkt.y + ny * uklad.uKreskaB });
        const tp = toSvg({ x: t.punkt.x + nx * uklad.uTekst, y: t.punkt.y + ny * uklad.uTekst });
        const sdx = t.dx * mapa.skalaFit;
        const sdy = -t.dy * mapa.skalaFit;
        const sl = Math.hypot(sdx, sdy) || 1;
        out.push({
          key: `${os.id}-${st.kmM}`,
          etykieta: st.etykieta,
          x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
          tx: tp.x, ty: tp.y,
          rot: obrotOpisuWzdluzKm(sdx / sl, sdy / sl),
          fontSvg: fontPdf * mapa.skalaFit,
        });
      }
    }
    return out;
  }, [arkusz, mapa, podzialkaM]);

  const wezlyOsi = useMemo(() => {
    if (!mapa || !pokazWezlyOsi) return [];
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const out: { osId: string; indeks: number; x: number; y: number }[] = [];
    for (const os of arkusz.osieBoczne ?? []) {
      os.wierzcholkiPdf.forEach((p, indeks) => {
        const s = toSvg(p);
        out.push({ osId: os.id, indeks, x: s.x, y: s.y });
      });
    }
    return out;
  }, [arkusz.osieBoczne, mapa, pokazWezlyOsi]);

  const wycinkiSvg = useMemo(() => {
    if (!mapa || !wycinki?.length) return [];
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    return wycinki.map((w) => ({
      id: w.id,
      punkty: w.wierzcholkiPdf.map(toSvg).map((p) => `${p.x},${p.y}`).join(' '),
    }));
  }, [mapa, wycinki]);

  const odcinkiLiniowki = liniowka?.odcinki;
  const liniowkaSvg = useMemo(() => {
    const osPdf = mapa?.osPdf;
    if (!mapa || !odcinkiLiniowki?.length || !osPdf || osPdf.length < 2) return [];
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const odKm = arkusz.kilometrazPoczatkowyM;
    const doKm = arkusz.kilometrazKoncowyM;
    const spanKm = Math.max(0.01, doKm - odKm);
    const dlPdf = dlugoscPolilinii(osPdf);
    const sZKm = (km: number) => Math.max(0, Math.min(dlPdf, ((km - odKm) / spanKm) * dlPdf));
    const naArkuszu = (km: number) => km >= odKm - 0.6 && km <= doKm + 0.6;
    const out: Array<OdcinekLiniowkiPodgladu & {
      idx: number;
      wielokaty: Array<{ pts: Punkt2D[]; punkty: string }>;
      kreski: Array<{
        rola: 'start' | 'koniec'; x1: number; y1: number; x2: number; y2: number; mx: number; my: number; ux: number; uy: number;
        wymiar: WymiarStrzalki;
      }>;
      znaki: Array<Punkt2D & { r: number }>;
    }> = [];
    for (const [idx, o] of odcinkiLiniowki.entries()) {
      const lo = Math.min(o.kmOdM, o.kmDoM);
      const hi = Math.max(o.kmOdM, o.kmDoM);
      if (hi < odKm - 0.05 || lo > doKm + 0.05) continue;
      const obszary = arkusz.obszary.filter((ob) => kluczLegendy('obszar', ob.kolorWypelnienia) === o.kluczObszaru);
      if (obszary.length === 0) continue;
      const sA = sZKm(o.kmOdM);
      const sB = sZKm(o.kmDoM);
      if (Math.abs(sB - sA) < 0.05) continue;
      const wielokaty = obszary
        .map((ob) => wycinekWielokataPoOsi(ob.wierzcholkiPdf, osPdf, sA, sB))
        .filter((c) => c.length >= 3)
        .map((c) => {
          const pts = c.map(toSvg);
          return { pts, punkty: pts.map((p) => `${p.x},${p.y}`).join(' ') };
        });
      if (wielokaty.length === 0) continue;
      const rosnie = o.kmDoM >= o.kmOdM;
      const dlOdcinkaSvg = Math.abs(sB - sA) * mapa.skalaFit;
      const szerPasaSvg = Math.max(0.5, medianaSzerokosciObszarowPdf(obszary)) * mapa.skalaFit;
      const kreski: (typeof out)[number]['kreski'] = [];
      for (const [rola, km] of [['start', o.kmOdM], ['koniec', o.kmDoM]] as const) {
        if (!naArkuszu(km)) continue;
        const s0 = sZKm(km);
        const wGlab = Math.sign(rola === 'start' ? sB - sA : sA - sB);
        // Na krawędzi arkusza prostopadła mija obrys obszaru – czoło szukamy odrobinę w głąb odcinka.
        let s = s0;
        let cz = czoloObmiaruPdf(obszary, osPdf, s);
        for (const f of [0.005, 0.01, 0.02, 0.04, 0.08]) {
          if (cz) break;
          s = s0 + wGlab * f * Math.abs(sB - sA);
          cz = czoloObmiaruPdf(obszary, osPdf, s);
        }
        const t = stycznyNaOsi(osPdf, s);
        if (!cz || !t) continue;
        const a = toSvg(cz.a);
        const b = toSvg(cz.b);
        const m = toSvg(cz.srodek);
        const l = Math.hypot(t.dx, t.dy) || 1;
        const kier = (rosnie ? 1 : -1) * (rola === 'start' ? 1 : -1);
        const szer = Math.hypot(b.x - a.x, b.y - a.y) || szerPasaSvg;
        const dl = Math.min(szer * 0.75, dlOdcinkaSvg * 0.3);
        kreski.push({
          rola, x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx: m.x, my: m.y, ux: (t.dx / l) * kier, uy: (-t.dy / l) * kier,
          wymiar: { dl, pol: Math.min(szer * 0.32, dl * 0.55), odstep: dl * 0.12 },
        });
      }
      const znaki = stacjeZnakowInfo(o.kmOdM, o.kmDoM)
        .filter((km) => km >= odKm && km <= doKm)
        .map((km) => {
          const s = sZKm(km);
          const pas = pasUkladaniaPdf(obszary, osPdf, s);
          const p = pas?.srodek ?? punktNaOsi(osPdf, s);
          if (!p) return null;
          const szer = pas && pas.szer > 0.4 ? pas.szer * mapa.skalaFit : szerPasaSvg;
          return { ...toSvg(p), r: Math.min(szer * 0.3, dlOdcinkaSvg * 0.2) };
        })
        .filter((p): p is Punkt2D & { r: number } => !!p);
      out.push({ ...o, idx, wielokaty, kreski, znaki });
    }
    return out;
  }, [mapa, odcinkiLiniowki, arkusz]);

  const [kreska, setKreska] = useState<Punkt2D[]>([]);
  const kreskaRef = useRef<Punkt2D[]>([]);
  const rysowanieRef = useRef(rysowanie);
  rysowanieRef.current = rysowanie;
  const elementyRef = useRef<ElementSzkicu[]>(rysowanie?.elementy ?? []);
  elementyRef.current = rysowanie?.elementy ?? [];
  const liniowkaSvgRef = useRef(liniowkaSvg);
  liniowkaSvgRef.current = liniowkaSvg;
  const onPressOdcinekRef = useRef(liniowka?.onPressOdcinek);
  onPressOdcinekRef.current = liniowka?.onPressOdcinek;
  const ostatniPanMs = useRef(0);

  const szkiceSvg = useMemo(() => {
    if (!mapa) return [];
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const lista: SzkicPodgladu[] = [
      ...(liniowka?.szkice ?? []),
      ...(rysowanie ? [{ id: 'rysowany', krycie: 0.5, elementy: rysowanie.elementy, klip: rysowanie.klip }] : []),
    ];
    return lista.map((sz) => ({
      id: sz.id,
      krycie: sz.krycie,
      poIndeksie: sz.poIndeksie ?? Infinity,
      klip: sz.klip?.map((poly) => poly.map(toSvg).map((p) => `${p.x},${p.y}`).join(' ')),
      elementy: sz.elementy.map((e) => ({
        id: e.id,
        d: [e.punktyPdf, ...(e.otwory ?? [])].map((r) => sciezkaSvg(r.map(toSvg), !!e.wypelnienie)).join(''),
        kolor: e.kolor,
        szer: e.gruboscPdf > 0 ? Math.max(0.05, e.gruboscPdf * mapa.skalaFit) : 0,
        wypelnienie: e.wypelnienie,
        plama: !!e.plama,
      })),
    }));
  }, [mapa, liniowka?.szkice, rysowanie]);
  const szkiceRef = useRef(liniowka?.szkice);
  szkiceRef.current = liniowka?.szkice;
  const onPressSzkicRef = useRef(liniowka?.onPressSzkic);
  onPressSzkicRef.current = liniowka?.onPressSzkic;
  const arkuszRef = useRef(arkusz);
  arkuszRef.current = arkusz;

  const mapaRef = useRef(mapa);
  mapaRef.current = mapa;
  const zmierzRef = useRef(zmierz);
  zmierzRef.current = zmierz;
  const wskazRef = useRef(onWskazPdf);
  wskazRef.current = onWskazPdf;
  const onPressObszarRef = useRef(onPressObszar);
  onPressObszarRef.current = onPressObszar;
  const onPressWycinekRef = useRef(onPressWycinek);
  onPressWycinekRef.current = onPressWycinek;
  const onPressWezelRef = useRef(onPressWezelOsi);
  onPressWezelRef.current = onPressWezelOsi;
  const pokazWezlyRef = useRef(pokazWezlyOsi);
  pokazWezlyRef.current = pokazWezlyOsi;
  const wycinkiRef = useRef(wycinki);
  wycinkiRef.current = wycinki;
  const onPressAutoRef = useRef(onPressAuto);
  onPressAutoRef.current = onPressAuto;
  const lastTapMs = useRef(0);

  const pdfZEkranu = (ekranX: number, ekranY: number): Punkt2D | null => {
    const m = mapaRef.current;
    if (!m?.mapaSvg) return null;
    const svg = punktSvgZEkranu({
      ekranX,
      ekranY,
      szer: rozmiarRef.current.w,
      wys: rozmiarRef.current.h,
      tx: bazaX.current,
      ty: bazaY.current,
      rot: 0,
      skala: bazaSkali.current,
    });
    return svgDoPdfPodgladu(svg, m.mapaSvg);
  };

  const tapRef = useRef<(x: number, y: number) => void>(() => undefined);
  const pdfNaEkranPx = () => (mapaRef.current?.skalaFit ?? 1) * bazaSkali.current;

  const zmienElementy = (elementy: ElementSzkicu[]) => {
    elementyRef.current = elementy;
    rysowanieRef.current?.onZmien(elementy);
  };

  const gumkaW = (ekranX: number, ekranY: number) => {
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!pdf) return;
    const po = wymazGumka(elementyRef.current, pdf, PROMIEN_GUMKI_PX / pdfNaEkranPx());
    if (po !== elementyRef.current && (po.length !== elementyRef.current.length || po.some((e, i) => e !== elementyRef.current[i]))) {
      zmienElementy(po);
    }
  };

  const chwytRef = useRef<ChwytLamanej | null>(null);
  const zLamana = (r: RysowaniePodgladu | undefined) => !!r && (r.narzedzie === 'lamana' || !!r.onWskazObszar);

  const chwytLamanej = (ekranX: number, ekranY: number): ChwytLamanej => {
    const r = rysowanieRef.current;
    const pdf = pdfZEkranu(ekranX, ekranY);
    const l = r?.lamana;
    if (!pdf || !l || r?.onWskazObszar) return { typ: 'widok' };
    let best: ChwytLamanej = { typ: 'widok' };
    let bestD = CHWYT_WEZLA_PX / pdfNaEkranPx();
    l.wezly.forEach((w, i) => {
      const d = Math.hypot(w.x - pdf.x, w.y - pdf.y);
      if (d <= bestD) {
        best = { typ: 'wezel', i };
        bestD = d;
      }
    });
    if (best.typ !== 'widok') return best;
    for (const k of krawedzieLamanej(l)) {
      const m = srodekKrawedzi(k.a, k.b, k.c);
      const d = Math.hypot(m.x - pdf.x, m.y - pdf.y);
      if (d <= bestD) {
        best = { typ: 'luk', i: k.i };
        bestD = d;
      }
    }
    return best;
  };

  const przeciagnijLamana = (ekranX: number, ekranY: number, c: ChwytLamanej) => {
    const r = rysowanieRef.current;
    const l = r?.lamana;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!r || !l || !pdf || !r.onLamana) return;
    if (c.typ === 'wezel') {
      r.onLamana(przesunWezel(l, c.i, dociagnijDoObszaru(pdf, r.klip)));
    } else if (c.typ === 'luk') {
      const k = krawedzieLamanej(l).find((x) => x.i === c.i);
      if (k) r.onLamana(ustawLuk(l, c.i, lukPrzezPunkt(k.a, k.b, pdf, 3 / pdfNaEkranPx())));
    }
  };

  const lamanaTap = (ekranX: number, ekranY: number) => {
    const r = rysowanieRef.current;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!r || !pdf || !r.onLamana) return;
    const l = r.lamana ?? { wezly: [], luki: [] };
    if (l.wezly.length === 0) {
      const tol = 6 / pdfNaEkranPx();
      const gotowa = [...elementyRef.current].reverse().find((e) => e.lamana && elementPodPunktem([e], pdf, tol));
      if (gotowa?.lamana) {
        zmienElementy(elementyRef.current.filter((e) => e !== gotowa));
        r.onLamana({ wezly: gotowa.lamana.wezly, luki: gotowa.lamana.luki });
        return;
      }
    }
    r.onLamana(dodajWezel(l, dociagnijDoObszaru(pdf, r.klip)));
  };

  const rysujPunkt = (ekranX: number, ekranY: number) => {
    const r = rysowanieRef.current;
    if (!r || r.onWskazObszar) return;
    if (r.narzedzie === 'gumka') {
      gumkaW(ekranX, ekranY);
      return;
    }
    if (r.narzedzie !== 'pioro') return;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!pdf) return;
    const next = dodajPunktKreski(kreskaRef.current, pdf, 1 / pdfNaEkranPx());
    if (next !== kreskaRef.current) {
      kreskaRef.current = next;
      setKreska(next);
    }
  };

  const wiadroW = (ekranX: number, ekranY: number) => {
    const r = rysowanieRef.current;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!r || !pdf) return;
    const { w, h } = rozmiarRef.current;
    const rogi = [pdfZEkranu(0, 0), pdfZEkranu(w, h), pdfZEkranu(0, h), pdfZEkranu(w, 0)].filter((p): p is Punkt2D => !!p);
    const widok = zakresPunktow(rogi);
    if (!widok) return;
    const dx = widok.maxX - widok.minX;
    const dy = widok.maxY - widok.minY;
    const po = wypelnijDoKrawedzi({
      elementy: elementyRef.current,
      punkt: pdf,
      kolor: r.kolor,
      krawedzie: arkuszRef.current.obszary.map((o) => o.wierzcholkiPdf),
      dozwolone: r.klip,
      zakres: { minX: widok.minX - dx, minY: widok.minY - dy, maxX: widok.maxX + dx, maxY: widok.maxY + dy },
      liniaObszaruPdf: LINIA_OBSZARU_PX / pdfNaEkranPx(),
    });
    if (po) zmienElementy(po);
    else r.onWiadroBezGranic?.();
  };

  const zakonczKreske = () => {
    const r = rysowanieRef.current;
    const pts = kreskaRef.current;
    kreskaRef.current = [];
    setKreska([]);
    if (!r || r.narzedzie !== 'pioro' || pts.length < 2) return;
    zmienElementy([
      ...elementyRef.current,
      {
        id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        punktyPdf: pts,
        kolor: r.kolor,
        gruboscPdf: r.gruboscPx > 0 ? r.gruboscPx / pdfNaEkranPx() : 0,
      },
    ]);
  };

  const obsluzTapMapy = (ekranX: number, ekranY: number) => {
    if (zmierzRef.current) {
      dodajPunktPomiaru(ekranX, ekranY);
      return;
    }
    const pdfTap0 = pdfZEkranu(ekranX, ekranY);
    const cbWezel = onPressWezelRef.current;
    if (cbWezel && pokazWezlyRef.current && pdfTap0) {
      const zasieg = 16 / Math.max(pdfNaEkranPx(), 0.05);
      let best: { osId: string; indeks: number; d: number } | null = null;
      for (const os of arkuszRef.current.osieBoczne ?? []) {
        for (let indeks = 0; indeks < os.wierzcholkiPdf.length; indeks++) {
          const p = os.wierzcholkiPdf[indeks];
          const d = Math.hypot(p.x - pdfTap0.x, p.y - pdfTap0.y);
          if (d <= zasieg && (!best || d < best.d)) best = { osId: os.id, indeks, d };
        }
      }
      if (best) {
        cbWezel(best.osId, best.indeks);
        return;
      }
    }
    const cbWycinek = onPressWycinekRef.current;
    const listaWycinkow = wycinkiRef.current;
    if (cbWycinek && pdfTap0 && listaWycinkow?.length) {
      const traf = najmniejszyWielokatPodPunktem(listaWycinkow, pdfTap0);
      if (traf) {
        cbWycinek(traf.id);
        return;
      }
    }
    const r = rysowanieRef.current;
    if (r) {
      if (r.onWskazObszar) {
        const pdf = pdfZEkranu(ekranX, ekranY);
        if (pdf) r.onWskazObszar(pdf);
        return;
      }
      if (r.narzedzie === 'gumka') gumkaW(ekranX, ekranY);
      if (r.narzedzie === 'wiadro') wiadroW(ekranX, ekranY);
      if (r.narzedzie === 'lamana') lamanaTap(ekranX, ekranY);
      return;
    }
    const lin = liniowkaSvgRef.current;
    const cbOdcinek = onPressOdcinekRef.current;
    const svg = punktSvgZEkranu({
      ekranX,
      ekranY,
      szer: rozmiarRef.current.w,
      wys: rozmiarRef.current.h,
      tx: bazaX.current,
      ty: bazaY.current,
      rot: 0,
      skala: bazaSkali.current,
    });
    const odGory = [...lin].reverse();
    if (cbOdcinek) {
      const zapas = 8 / bazaSkali.current;
      const zeZnakiem = odGory.find((o) => o.znaki.some((z) => Math.hypot(z.x - svg.x, z.y - svg.y) <= Math.max(z.r, zapas)));
      if (zeZnakiem) {
        cbOdcinek(zeZnakiem.id);
        return;
      }
    }
    const cbSzkic = onPressSzkicRef.current;
    const pdfTap = cbSzkic ? pdfZEkranu(ekranX, ekranY) : null;
    if (cbSzkic && pdfTap) {
      const tol = 6 / pdfNaEkranPx();
      const trafionySzkic = [...(szkiceRef.current ?? [])].reverse().find((sz) => (
        (!sz.klip || sz.klip.some((poly) => punktWWielokacie(pdfTap, poly)))
        && !!elementPodPunktem(sz.elementy, pdfTap, tol)
      ));
      if (trafionySzkic) {
        cbSzkic(trafionySzkic.id);
        return;
      }
    }
    if (cbOdcinek) {
      const trafiony = odGory.find((o) => o.wielokaty.some((w) => punktWWielokacie(svg, w.pts)));
      if (trafiony) {
        cbOdcinek(trafiony.id);
        return;
      }
    }
    const cbObszar = onPressObszarRef.current;
    if (cbObszar) {
      const pdfObszar = pdfZEkranu(ekranX, ekranY);
      if (pdfObszar) {
        const trafObszar = najmniejszyWielokatPodPunktem(arkuszRef.current.obszary, pdfObszar);
        if (trafObszar) {
          cbObszar(trafObszar.id);
          return;
        }
      }
    }
    const m = mapaRef.current;
    if (m?.maszyny && onPressAutoRef.current) {
      const svg = punktSvgZEkranu({
        ekranX,
        ekranY,
        szer: rozmiarRef.current.w,
        wys: rozmiarRef.current.h,
        tx: bazaX.current,
        ty: bazaY.current,
        rot: 0,
        skala: bazaSkali.current,
      });
      const id = idAutaPodPunktem(m.maszyny, svg.x, svg.y);
      if (id) {
        onPressAutoRef.current(id);
        return;
      }
    }
    wskazNaMapie(ekranX, ekranY);
  };

  tapRef.current = obsluzTapMapy;

  const indeksWezlaPomiaru = (ekranX: number, ekranY: number): number | null => {
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!pdf) return null;
    const zasieg = 18 / Math.max(pdfNaEkranPx(), 0.05);
    let best = -1;
    let bestD = zasieg;
    punktyPomiaruRef.current.forEach((p, i) => {
      const d = Math.hypot(p.x - pdf.x, p.y - pdf.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best >= 0 ? best : null;
  };

  const dodajPunktPomiaru = (ekranX: number, ekranY: number) => {
    if (!zmierzRef.current) return;
    if (indeksWezlaPomiaru(ekranX, ekranY) != null) return;
    const now = Date.now();
    if (now - lastTapMs.current < 280) return;
    lastTapMs.current = now;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (pdf) setPunktyPomiaru((prev) => [...prev, pdf]);
  };

  const przesunWezelPomiaru = (ekranX: number, ekranY: number, indeks: number) => {
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (!pdf) return;
    setPunktyPomiaru((prev) => prev.map((p, i) => (i === indeks ? pdf : p)));
  };

  const wskazNaMapie = (ekranX: number, ekranY: number) => {
    const cb = wskazRef.current;
    if (!cb || zmierzRef.current) return;
    const now = Date.now();
    if (now - lastTapMs.current < 280) return;
    lastTapMs.current = now;
    const pdf = pdfZEkranu(ekranX, ekranY);
    if (pdf) cb(pdf);
  };

  const wynikPomiaru = useMemo(() => {
    if (punktyPomiaru.length < 2) return null;
    const metry = dlugoscLamanejPdfM(punktyPomiaru);
    const km = mapa?.osPdf && mapa.osPdf.length >= 2
      ? punktyPomiaru.map((p) => kmPunktuNaOsiPdf(
        mapa.osPdf,
        p,
        { odM: arkusz.kilometrazPoczatkowyM, doM: arkusz.kilometrazKoncowyM },
      ))
      : punktyPomiaru.map(() => null);
    const wzdluzOsi = punktyPomiaru.length === 2 && mapa?.osPdf
      ? pomiarWzdlozOsiPdf({
        osPdf: mapa.osPdf,
        a: punktyPomiaru[0],
        b: punktyPomiaru[1],
        kmPzt: { odM: arkusz.kilometrazPoczatkowyM, doM: arkusz.kilometrazKoncowyM },
        kmXfdf: { odM: arkusz.kilometrazPoczatkowyM, doM: arkusz.kilometrazKoncowyM },
      })
      : null;
    return { metry, km, wzdluzOsi };
  }, [mapa, punktyPomiaru, arkusz.kilometrazPoczatkowyM, arkusz.kilometrazKoncowyM]);

  const rysunekPomiaru = useMemo(() => {
    if (!mapa || punktyPomiaru.length === 0) return null;
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    return {
      punkty: punktyPomiaru.map(toSvg),
    };
  }, [mapa, punktyPomiaru]);

  const clampTrans = (x: number, y: number, s = bazaSkali.current) => {
    const { w, h } = rozmiarRef.current;
    const max = Math.max(w, h) * Math.max(s, 1) * 3;
    return { x: ograniczenie(x, -max, max), y: ograniczenie(y, -max, max) };
  };

  const ustawWidok = (s: number, tx: number, ty: number) => {
    setXform({ s, tx, ty });
    setSkalaPct(Math.round(s * 100));
  };

  const ustawSkaleWokolPunktu = (s1raw: number, f0x: number, f0y: number) => {
    const s0 = bazaSkali.current;
    const s1 = ograniczenie(s1raw, SKALA_MIN, SKALA_MAX);
    const t0 = translacjaPrzyZoomie({
      skala0: s0,
      skala1: s1,
      tx0: bazaX.current,
      ty0: bazaY.current,
      f0x,
      f0y,
      f1x: f0x,
      f1y: f0y,
    });
    const t = clampTrans(t0.tx, t0.ty, s1);
    bazaSkali.current = s1;
    bazaX.current = t.x;
    bazaY.current = t.y;
    ustawWidok(s1, t.x, t.y);
  };

  const ustawSkaleWokolSrodka = (s1raw: number) => ustawSkaleWokolPunktu(s1raw, 0, 0);
  const zoomFnRef = useRef(ustawSkaleWokolPunktu);
  zoomFnRef.current = ustawSkaleWokolPunktu;

  const resetWidoku = () => {
    bazaSkali.current = 1;
    bazaX.current = 0;
    bazaY.current = 0;
    ustawWidok(1, 0, 0);
    onDotykZmiana?.(false);
  };

  useEffect(() => {
    resetWidoku();
    setTloObraz(null);
    setBladTla(null);
    setPunktyPomiaru([]);
    setZmierz(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arkusz.id]);

  const podlaczWheel = useCallback((node: View | null) => {
    klipRef.current = node;
    odpinWheel.current?.();
    odpinWheel.current = null;
    const el = hostHtml(node);
    if (!el || typeof el.addEventListener !== 'function') return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const { w, h } = rozmiarRef.current;
      const f0x = e.clientX - rect.left - w / 2;
      const f0y = e.clientY - rect.top - h / 2;
      const dir: -1 | 1 = e.deltaY > 0 ? -1 : 1;
      zoomFnRef.current(nastepnyPresetZoom(bazaSkali.current, dir), f0x, f0y);
    };
    el.addEventListener('wheel', handler, { passive: false });
    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (zmierzRef.current) {
        if (Date.now() - ostatniPanMs.current < 350) return;
        dodajPunktPomiaru(x, y);
        return;
      }
      if (Date.now() - ostatniPanMs.current < 350) return;
      tapRef.current(x, y);
    };
    el.addEventListener('click', onClick);
    odpinWheel.current = () => {
      el.removeEventListener('wheel', handler);
      el.removeEventListener('click', onClick);
    };
  }, []);
  useEffect(() => () => odpinWheel.current?.(), []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w <= 0 || h <= 0) return;
    const cur = rozmiarRef.current;
    if (w === cur.w && h === cur.h) return;
    setRozmiar({ w, h });
  };

  const ognisko = (e: { focalX?: number; focalY?: number; x?: number; y?: number }) => ({
    x: (e.focalX ?? e.x ?? rozmiar.w / 2) - rozmiar.w / 2,
    y: (e.focalY ?? e.y ?? rozmiar.h / 2) - rozmiar.h / 2,
  });

  const onPinch = (e: any) => {
    const ev = e.nativeEvent;
    const s1 = ograniczenie(pinchStart.current.s * ev.scale, SKALA_MIN, SKALA_MAX);
    const f1 = ognisko(ev);
    const t0 = translacjaPrzyZoomie({
      skala0: pinchStart.current.s,
      skala1: s1,
      tx0: pinchStart.current.tx,
      ty0: pinchStart.current.ty,
      f0x: pinchStart.current.f0x,
      f0y: pinchStart.current.f0y,
      f1x: f1.x,
      f1y: f1.y,
    });
    const t = clampTrans(t0.tx, t0.ty, s1);
    ustawWidok(s1, t.x, t.y);
  };

  const onPinchState = (e: any) => {
    const st = e.nativeEvent.state;
    if (st === State.ACTIVE) onDotykZmiana?.(true);
    if (st === State.BEGAN) {
      const f = ognisko(e.nativeEvent);
      pinchStart.current = {
        s: bazaSkali.current,
        tx: bazaX.current,
        ty: bazaY.current,
        f0x: f.x,
        f0y: f.y,
      };
    }
    if (e.nativeEvent.oldState === State.ACTIVE) {
      bazaSkali.current = ograniczenie(
        pinchStart.current.s * e.nativeEvent.scale,
        SKALA_MIN,
        SKALA_MAX,
      );
      const f1 = ognisko(e.nativeEvent);
      const t0 = translacjaPrzyZoomie({
        skala0: pinchStart.current.s,
        skala1: bazaSkali.current,
        tx0: pinchStart.current.tx,
        ty0: pinchStart.current.ty,
        f0x: pinchStart.current.f0x,
        f0y: pinchStart.current.f0y,
        f1x: f1.x,
        f1y: f1.y,
      });
      const t = clampTrans(t0.tx, t0.ty, bazaSkali.current);
      bazaX.current = t.x;
      bazaY.current = t.y;
      ustawWidok(bazaSkali.current, t.x, t.y);
      onDotykZmiana?.(false);
    }
    if (st === State.FAILED || st === State.CANCELLED || st === State.END) onDotykZmiana?.(false);
  };

  const onPan = (e: any) => {
    if (e.nativeEvent.numberOfPointers > 1) return;
    if (zmierzRef.current && chwytPomiaru.current != null) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      if (x != null && y != null) przesunWezelPomiaru(x, y, chwytPomiaru.current);
      return;
    }
    if (rysowanieRef.current) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      const c = chwytRef.current;
      if (zLamana(rysowanieRef.current) && c) {
        if (c.typ === 'widok') {
          const t = clampTrans(
            bazaX.current + e.nativeEvent.translationX * PAN_CZYNNIK,
            bazaY.current + e.nativeEvent.translationY * PAN_CZYNNIK,
          );
          ustawWidok(bazaSkali.current, t.x, t.y);
        } else if (x != null && y != null) {
          przeciagnijLamana(x, y, c);
        }
        return;
      }
      if (x != null && y != null) rysujPunkt(x, y);
      return;
    }
    const t = clampTrans(
      bazaX.current + e.nativeEvent.translationX * PAN_CZYNNIK,
      bazaY.current + e.nativeEvent.translationY * PAN_CZYNNIK,
    );
    ustawWidok(bazaSkali.current, t.x, t.y);
  };

  const onPanState = (e: any) => {
    const st = e.nativeEvent.state;
    const dx = e.nativeEvent.translationX ?? 0;
    const dy = e.nativeEvent.translationY ?? 0;
    const tap = Math.hypot(dx, dy) < TAP_MAX;
    if (zmierzRef.current && !rysowanieRef.current) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      if (st === State.BEGAN && x != null && y != null) {
        chwytPomiaru.current = indeksWezlaPomiaru(x, y);
      }
      if ((st === State.END || st === State.FAILED || st === State.CANCELLED) && chwytPomiaru.current != null) {
        chwytPomiaru.current = null;
        ostatniPanMs.current = Date.now();
        onDotykZmiana?.(false);
        return;
      }
    }
    if (st === State.ACTIVE) onDotykZmiana?.(true);
    if (rysowanieRef.current) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      if (st === State.BEGAN) {
        kreskaRef.current = [];
        chwytRef.current = zLamana(rysowanieRef.current) && x != null && y != null ? chwytLamanej(x, y) : null;
        // Gumka dopiero przy ruchu: usunięcie ścieżki pod kursorem w pointerdown psuje przechwycenie wskaźnika na webie.
        if (x != null && y != null && rysowanieRef.current.narzedzie === 'pioro') rysujPunkt(x, y);
      }
      if (st === State.FAILED || st === State.CANCELLED || st === State.END) {
        const c = chwytRef.current;
        chwytRef.current = null;
        if (c?.typ === 'widok' && !tap && e.nativeEvent.oldState === State.ACTIVE) {
          const t = clampTrans(bazaX.current + dx * PAN_CZYNNIK, bazaY.current + dy * PAN_CZYNNIK);
          bazaX.current = t.x;
          bazaY.current = t.y;
          ustawWidok(bazaSkali.current, t.x, t.y);
        }
        if (tap && kreskaRef.current.length < 2 && (!c || c.typ === 'widok')) {
          kreskaRef.current = [];
          if (x != null && y != null) obsluzTapMapy(x, y);
        }
        zakonczKreske();
        ostatniPanMs.current = Date.now();
        onDotykZmiana?.(false);
      }
      return;
    }
    if (e.nativeEvent.oldState === State.ACTIVE && !tap) ostatniPanMs.current = Date.now();
    if (e.nativeEvent.oldState !== State.ACTIVE) {
      if (st === State.FAILED || st === State.CANCELLED || st === State.END) {
        if (tap) {
          const x = e.nativeEvent.x as number | undefined;
          const y = e.nativeEvent.y as number | undefined;
          if (x != null && y != null) obsluzTapMapy(x, y);
        }
        onDotykZmiana?.(false);
      }
      return;
    }
    if (tap) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      if (x != null && y != null) obsluzTapMapy(x, y);
      if (zmierzRef.current || wskazRef.current) {
        onDotykZmiana?.(false);
        return;
      }
    }
    if (e.nativeEvent.numberOfPointers > 1) {
      onDotykZmiana?.(false);
      return;
    }
    const t = clampTrans(
      bazaX.current + e.nativeEvent.translationX * PAN_CZYNNIK,
      bazaY.current + e.nativeEvent.translationY * PAN_CZYNNIK,
    );
    bazaX.current = t.x;
    bazaY.current = t.y;
    ustawWidok(bazaSkali.current, t.x, t.y);
    onDotykZmiana?.(false);
  };

  if (arkusz.obszary.length === 0 || !mapa) {
    return (
      <View style={[styl.ramka, { height: wysokosc, borderColor: theme.colors.border }]}>
        <Text style={styl.pusto}>Brak obszarów na arkuszu</Text>
      </View>
    );
  }

  const panOffset = rysowanie ? 1 : (blokadaPodgladu ? 2 : 14);
  const gXform = `translate(${rozmiar.w / 2 + xform.tx},${rozmiar.h / 2 + xform.ty}) scale(${xform.s}) translate(${-rozmiar.w / 2},${-rozmiar.h / 2})`;
  const swEkran = 1.25;
  const dash = 5 / Math.max(xform.s, 0.12);
  const tloMeta = arkusz.tlo;
  const tloWidoczne = !!(tloMeta && tloMeta.widoczne !== false);
  const buforTla = tloMeta && tickTla >= 0
    ? (buforTlaArkusza(arkusz.id) ?? podlaczBuforDoArkusza(arkusz.id, tloMeta.nazwa) ?? null)
    : null;
  const podswietlony = liniowka?.podswietlonyId
    ? liniowkaSvg.find((o) => o.id === liniowka.podswietlonyId)
    : undefined;
  const szkicPodswietlony = liniowka?.podswietlonySzkicId
    ? szkiceSvg.find((sz) => sz.id === liniowka.podswietlonySzkicId)
    : undefined;
  const kreskaSvg = kreska.length >= 2 && mapa
    ? sciezkaSvg(kreska.map((p) => pdfDoSvgPodgladu(p, mapa.mapaSvg)), false)
    : '';
  const klipSvg = rysowanie?.klip ? szkiceSvg.find((sz) => sz.id === 'rysowany')?.klip : undefined;
  const lam = rysowanie?.lamana;
  const lamanaSvg = lam && lam.wezly.length > 0 ? (() => {
    const toS = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const zamknieta = lam.wezly.length >= 3;
    return {
      zamknieta,
      d: sciezkaSvg((zamknieta ? obrysLamanej(lam) : lam.wezly).map(toS), zamknieta),
      wezly: lam.wezly.map(toS),
      uchwyty: krawedzieLamanej(lam).map((k) => ({ i: k.i, luk: !!k.c, ...toS(srodekKrawedzi(k.a, k.b, k.c)) })),
    };
  })() : null;
  const wKlipie = (sz: { id: string; klip?: string[] }, tresc: React.ReactNode, klucz: string) => (
    sz.klip?.length ? (
      <G key={klucz}>
        <Defs>
          <ClipPath id={idKlipu(`${klucz}-${sz.id}`)}>
            {sz.klip.map((pts, i) => <Polygon key={i} points={pts} />)}
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${idKlipu(`${klucz}-${sz.id}`)})`}>{tresc}</G>
      </G>
    ) : <G key={klucz}>{tresc}</G>
  );
  const szkiceMiedzy = (lo: number, hi: number) => szkiceSvg
    .filter((sz) => sz.poIndeksie > lo && sz.poIndeksie <= hi)
    .map((sz) => wKlipie(sz, sz.elementy.map((e) => (
      <Path
        key={e.id}
        d={e.d}
        stroke={e.plama ? 'none' : e.kolor}
        strokeWidth={e.plama ? 0 : (e.szer || LINIA_OBSZARU_PX)}
        vectorEffect={e.szer ? undefined : 'non-scaling-stroke'}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={e.wypelnienie ?? 'none'}
        fillRule="evenodd"
        fillOpacity={e.wypelnienie ? sz.krycie : 0}
      />
    )), `sz-${sz.id}`));
  /** Świecący obrys jak taśma LED: szeroka poświata, jaśniejsza smuga i biały rdzeń. */
  const obrysLed = (klucz: string, rysuj: (p: { stroke: string; strokeWidth: number; strokeOpacity: number }) => React.ReactNode) => (
    <G key={klucz}>
      {rysuj({ stroke: LED_HALO, strokeWidth: 16, strokeOpacity: 0.18 })}
      {rysuj({ stroke: LED_HALO, strokeWidth: 9, strokeOpacity: 0.4 })}
      {rysuj({ stroke: '#FACC15', strokeWidth: 4.5, strokeOpacity: 0.95 })}
      {rysuj({ stroke: LED_RDZEN, strokeWidth: 1.6, strokeOpacity: 1 })}
    </G>
  );
  const kreskiOdcinka = (o: (typeof liniowkaSvg)[number], klucz: string) => o.kreski.map((k) => {
    const kolor = k.rola === 'start' ? '#16A34A' : '#DC2626';
    return (
      <G key={`${klucz}-${o.id}-${k.rola}`}>
        <Line
          x1={k.x1}
          y1={k.y1}
          x2={k.x2}
          y2={k.y2}
          stroke={kolor}
          strokeWidth={swEkran * 1.8}
          strokeLinecap="butt"
          vectorEffect="non-scaling-stroke"
        />
        <Polygon
          points={strzalka(k.mx, k.my, k.ux, k.uy, k.wymiar)}
          fill={kolor}
          stroke="#FFFFFF"
          strokeWidth={k.wymiar.dl * 0.06}
          strokeLinejoin="round"
        />
      </G>
    );
  });
  const grupyWarstw: Array<{ warstwa: string; odcinki: typeof liniowkaSvg; indeksy: number[] }> = [];
  liniowkaSvg.forEach((o, i) => {
    const ost = grupyWarstw[grupyWarstw.length - 1];
    const w = o.warstwa ?? o.id;
    if (ost && ost.warstwa === w) {
      ost.odcinki.push(o);
      ost.indeksy.push(i);
    } else {
      grupyWarstw.push({ warstwa: w, odcinki: [o], indeksy: [i] });
    }
  });

  return (
    <View>
      <View
        style={[styl.ramka, { height: wysokosc }, blokadaPodgladu && styl.ramkaBlokada]}
        collapsable={false}
      >
        <Text style={styl.etykieta} pointerEvents="none">
          {formatujKmM(arkusz.kilometrazPoczatkowyM)} → {formatujKmM(arkusz.kilometrazKoncowyM)}
        </Text>
        <TouchableOpacity style={styl.celownik} onPress={resetWidoku} accessibilityLabel="Przywróć obszar">
          <Text style={styl.celownikTekst}>⌖</Text>
        </TouchableOpacity>

        <View style={styl.blokadaKol}>
          <TouchableOpacity
            style={styl.blokada}
            onPress={() => onBlokadaPodgladu?.(!blokadaPodgladu)}
            accessibilityLabel="Blokada podglądu"
          >
            <View style={[styl.check, blokadaPodgladu && styl.checkOn]}>
              {blokadaPodgladu ? <Text style={styl.checkTekst}>✓</Text> : null}
            </View>
            <Text style={styl.blokadaTekst}>Ramka</Text>
          </TouchableOpacity>
          {tloMeta ? (
            <>
              <TouchableOpacity
                style={styl.blokada}
                onPress={() => onTloZmiana?.({ widoczne: !tloWidoczne })}
                accessibilityLabel="Tło PDF"
              >
                <View style={[styl.check, tloWidoczne && styl.checkOn]}>
                  {tloWidoczne ? <Text style={styl.checkTekst}>✓</Text> : null}
                </View>
                <Text style={styl.blokadaTekst}>Tło</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styl.blokada}
                onPress={() => onTloZmiana?.({ odwrocY: !tloMeta.odwrocY })}
                accessibilityLabel="Odwróć oś Y tła PDF"
              >
                <View style={[styl.check, tloMeta.odwrocY && styl.checkOn]}>
                  {tloMeta.odwrocY ? <Text style={styl.checkTekst}>✓</Text> : null}
                </View>
                <Text style={styl.blokadaTekst}>Y↕</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity
            style={styl.blokada}
            onPress={() => {
              const next = !zmierz;
              setZmierz(next);
              if (next) onBlokadaPodgladu?.(true);
              else setPunktyPomiaru([]);
            }}
            accessibilityLabel="Zmierz na planie"
          >
            <View style={[styl.check, zmierz && styl.checkOn]}>
              {zmierz ? <Text style={styl.checkTekst}>✓</Text> : null}
            </View>
            <Text style={styl.blokadaTekst}>Zmierz</Text>
          </TouchableOpacity>
        </View>

        <View style={styl.lupka}>
          <TouchableOpacity style={styl.lupkaBtn} onPress={() => ustawSkaleWokolSrodka(nastepnyPresetZoom(bazaSkali.current, -1))}>
            <Text style={styl.lupkaZnak}>−</Text>
          </TouchableOpacity>
          <Text style={styl.lupkaPct}>{skalaPct}%</Text>
          <TouchableOpacity style={styl.lupkaBtn} onPress={() => ustawSkaleWokolSrodka(nastepnyPresetZoom(bazaSkali.current, 1))}>
            <Text style={styl.lupkaZnak}>+</Text>
          </TouchableOpacity>
        </View>

        <View
          ref={podlaczWheel}
          style={[styl.klip, Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null]}
          collapsable={false}
          onLayout={onLayout}
        >
          {tloWidoczne && buforTla ? (
            <PztTloPdfCanvas
              bufor={buforTla}
              widoczne={tloWidoczne}
              cx={mapa.cx}
              cy={mapa.cy}
              skalaFit={mapa.skalaFit}
              szer={rozmiar.w}
              wys={rozmiar.h}
              skala={xform.s}
              tx={xform.tx}
              ty={xform.ty}
              onObraz={onObrazTla}
              onBlad={onBladTla}
            />
          ) : null}
          <GestureHandlerRootView style={[StyleSheet.absoluteFill, { zIndex: 1, backgroundColor: 'transparent' }]}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={[panRef]}
              onGestureEvent={onPinch}
              onHandlerStateChange={onPinchState}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} collapsable={false}>
                <PanGestureHandler
                  ref={panRef}
                  simultaneousHandlers={[pinchRef]}
                  minPointers={1}
                  maxPointers={2}
                  avgTouches
                  activeOffsetX={[-panOffset, panOffset]}
                  activeOffsetY={[-panOffset, panOffset]}
                  onGestureEvent={onPan}
                  onHandlerStateChange={onPanState}
                >
                  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} collapsable={false}>
                    <Svg
                      width={rozmiar.w}
                      height={rozmiar.h}
                      style={{ backgroundColor: 'transparent' }}
                      onPress={Platform.OS === 'web' ? undefined : (e) => {
                        const ne = e.nativeEvent as { locationX?: number; x?: number; locationY?: number; y?: number };
                        const x = ne.locationX ?? ne.x;
                        const y = ne.locationY ?? ne.y;
                        if (Date.now() - ostatniPanMs.current < 350) return;
                        if (x != null && y != null) obsluzTapMapy(x, y);
                      }}
                    >
                      <Rect
                        x={0}
                        y={0}
                        width={rozmiar.w}
                        height={rozmiar.h}
                        fill={tloWidoczne && buforTla ? '#FFFFFF' : (theme.dark ? '#111827' : '#F8FAFC')}
                      />
                      <G transform={gXform}>
                        {tloWidoczne && tloObraz ? (
                          <G
                            transform={tloMeta?.odwrocY
                              ? `translate(${tloObraz.x}, ${tloObraz.y + tloObraz.height}) scale(1,-1)`
                              : undefined}
                          >
                            <SvgImage
                              href={{ uri: tloObraz.uri }}
                              x={tloMeta?.odwrocY ? 0 : tloObraz.x}
                              y={tloMeta?.odwrocY ? 0 : tloObraz.y}
                              width={tloObraz.width}
                              height={tloObraz.height}
                              opacity={tloMeta?.opacity ?? 1}
                              preserveAspectRatio="none"
                            />
                          </G>
                        ) : null}
                        {mapa.odsadzkiSvg.map((o) => (
                          <Polygon
                            key={o.id}
                            points={o.punkty}
                            fill={o.kolor}
                            fillOpacity={o.krycie}
                            stroke={o.kolor}
                            strokeWidth={swEkran}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {mapa.obszary.map((o) => (
                          <Polygon
                            key={o.id}
                            points={o.punkty}
                            fill={o.zaznaczony ? hexDoRgba(o.stroke, 0.55) : o.fill}
                            stroke={o.zaznaczony ? '#111827' : o.stroke}
                            strokeWidth={o.zaznaczony ? swEkran * 3.2 : swEkran}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {mapa.ulozone.map((pts, i) => (
                          <Polygon key={`ulo-${i}`} points={pts} fill={FILL_ULOZONE} />
                        ))}
                        {grupyWarstw.map((g) => (
                          <G key={`lw-${g.indeksy[0]}`}>
                            {g.odcinki.map((o, n) => {
                              const i = g.indeksy[n];
                              return (
                                <G key={`lin-${o.id}`}>
                                  {szkiceMiedzy(i === 0 ? -1 : liniowkaSvg[i - 1].idx, o.idx)}
                                  {o.wielokaty.map((w, j) => (
                                    <Polygon
                                      key={j}
                                      points={w.punkty}
                                      fill={o.kolor}
                                      fillOpacity={o.krycie}
                                      stroke={o.reczny ? o.kolor : 'none'}
                                      strokeOpacity={1}
                                      strokeWidth={o.reczny ? swEkran * 1.6 : 0}
                                      strokeDasharray={o.reczny ? `${dash * 1.4} ${dash}` : undefined}
                                      strokeLinejoin="round"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                  ))}
                                </G>
                              );
                            })}
                            {g.odcinki.flatMap((o) => kreskiOdcinka(o, 'lk'))}
                          </G>
                        ))}
                        {szkiceMiedzy(liniowkaSvg.length ? liniowkaSvg[liniowkaSvg.length - 1].idx : -1, Infinity)}
                        {klipSvg?.map((pts, i) => (
                          <Polygon
                            key={`kl-${i}`}
                            points={pts}
                            fill="none"
                            stroke="#E8A020"
                            strokeWidth={swEkran * 1.6}
                            strokeDasharray={`${dash * 1.2} ${dash * 0.7}`}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {mapa.obszary.flatMap((o) =>
                          o.krawedzniki.map((k) => (
                            <Polyline
                              key={k.id}
                              points={k.punkty}
                              fill="none"
                              stroke={k.kolor}
                              strokeWidth={swEkran * (k.odOsi ? 1.35 : 1.1)}
                              strokeDasharray={k.odOsi ? `${dash} ${dash * 0.6}` : undefined}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          )),
                        )}
                        {mapa.osieBoczne.map((os) => (
                          <Polyline
                            key={os.id}
                            points={os.punkty}
                            fill="none"
                            stroke={pokazWezlyOsi ? '#1D4ED8' : '#2563EB'}
                            strokeWidth={swEkran * (pokazWezlyOsi ? 2.4 : 1.35)}
                            strokeDasharray={pokazWezlyOsi ? undefined : `${dash * 1.2} ${dash * 0.7}`}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {mapa.osPunkty ? (
                          <Polyline
                            points={mapa.osPunkty}
                            fill="none"
                            stroke="#111827"
                            strokeWidth={swEkran * 1.4}
                            strokeDasharray={`${dash * 1.6} ${dash * 0.8} ${dash * 0.7} ${dash * 0.8}`}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : null}
                        {podzialkiBoczne.map((t) => (
                          <G key={`pkb-${t.key}`}>
                            <Line
                              x1={t.x1}
                              y1={t.y1}
                              x2={t.x2}
                              y2={t.y2}
                              stroke="#1D4ED8"
                              strokeWidth={swEkran}
                              strokeLinecap="butt"
                              vectorEffect="non-scaling-stroke"
                            />
                            <G transform={`rotate(${t.rot} ${t.tx} ${t.ty})`}>
                              <SvgText
                                x={t.tx}
                                y={t.ty}
                                fontSize={t.fontSvg}
                                fontWeight="700"
                                fill="#1E3A8A"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                              >
                                {t.etykieta}
                              </SvgText>
                            </G>
                          </G>
                        ))}
                        {wezlyOsi.map((w) => (
                          <Circle
                            key={`wezel-${w.osId}-${w.indeks}`}
                            cx={w.x}
                            cy={w.y}
                            r={6 / xform.s}
                            fill="#FFFFFF"
                            stroke="#1D4ED8"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {mapa.podzialki.map((t) => (
                          <G key={`pk-${t.kmM}`}>
                            <Line
                              x1={t.x1}
                              y1={t.y1}
                              x2={t.x2}
                              y2={t.y2}
                              stroke="#111827"
                              strokeWidth={swEkran * 1.15}
                              strokeLinecap="butt"
                              vectorEffect="non-scaling-stroke"
                            />
                            <G transform={`rotate(${t.rot} ${t.tx} ${t.ty})`}>
                              <SvgText
                                x={t.tx}
                                y={t.ty}
                                fontSize={t.fontSvg}
                                fontWeight="700"
                                fill="#111827"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                              >
                                {t.etykieta}
                              </SvgText>
                            </G>
                          </G>
                        ))}
                        {mapa.zakresKreski.map((t) => {
                          const napis = t.rola === 'start' ? 'START' : 'KONIEC';
                          const font = t.fontSvg * 1.15;
                          const polozenie = napisZakresuWzdluzOsi({
                            mx: t.mx,
                            my: t.my,
                            ux: t.ux,
                            uy: t.uy,
                            rola: t.rola,
                            kilometrazMaleje: (zakresStartM ?? 0) > (zakresKoniecM ?? 0),
                            font,
                          });
                          return (
                            <G key={`zk-${t.rola}-${t.kmM}`}>
                              <Line
                                x1={t.x1}
                                y1={t.y1}
                                x2={t.x2}
                                y2={t.y2}
                                stroke={t.kolor}
                                strokeWidth={swEkran * 1.55}
                                strokeLinecap="butt"
                                vectorEffect="non-scaling-stroke"
                              />
                              <G transform={`rotate(${polozenie.rot} ${polozenie.x} ${polozenie.y})`}>
                                <SvgText
                                  x={polozenie.x}
                                  y={polozenie.y}
                                  fontSize={font}
                                  fontWeight="700"
                                  fill={t.kolor}
                                  textAnchor="middle"
                                  alignmentBaseline="middle"
                                >
                                  {napis}
                                </SvgText>
                              </G>
                            </G>
                          );
                        })}
                        {podswietlony ? (
                          <G accessibilityLabel="Podświetlony obszar">
                            {podswietlony.wielokaty.map((w, j) => (
                              <Polygon
                                key={`psf-${j}`}
                                points={w.punkty}
                                fill={podswietlony.kolor}
                                fillOpacity={Math.min(1, podswietlony.krycie + 0.15)}
                              />
                            ))}
                            {podswietlony.wielokaty.map((w, j) => obrysLed(`ps-${j}`, (p) => (
                              <Polygon
                                points={w.punkty}
                                fill="none"
                                {...p}
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            )))}
                            {kreskiOdcinka(podswietlony, 'psk')}
                          </G>
                        ) : null}
                        {szkicPodswietlony ? wKlipie(szkicPodswietlony, szkicPodswietlony.elementy.map((e) => obrysLed(`pss-${e.id}`, (p) => (
                          <Path
                            d={e.d}
                            fill="none"
                            {...p}
                            strokeWidth={p.strokeWidth + (e.szer ? e.szer * xform.s : 0)}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))), 'pss') : null}
                        {liniowkaSvg.flatMap((o) => o.znaki.map((z, j) => {
                          const on = o.id === liniowka?.podswietlonyId;
                          return (
                            <G key={`li-${o.id}-${j}`}>
                              <Circle
                                cx={z.x}
                                cy={z.y}
                                r={z.r}
                                fill={on ? '#F59E0B' : '#1D4ED8'}
                                stroke="#FFFFFF"
                                strokeWidth={z.r * 0.16}
                              />
                              <SvgText
                                x={z.x}
                                y={z.y + z.r * 0.42}
                                fontSize={z.r * 1.25}
                                fontWeight="800"
                                fontStyle="italic"
                                fill="#FFFFFF"
                                textAnchor="middle"
                              >
                                i
                              </SvgText>
                            </G>
                          );
                        }))}
                        {kreskaSvg && rysowanie ? wKlipie({ id: 'rysowany', klip: klipSvg }, (
                          <Path
                            d={kreskaSvg}
                            stroke={rysowanie.kolor}
                            strokeWidth={rysowanie.gruboscPx || LINIA_OBSZARU_PX}
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        ), 'kreska') : null}
                        {lamanaSvg && rysowanie ? (
                          <G accessibilityLabel="Linia łamana">
                            {lamanaSvg.zamknieta ? wKlipie({ id: 'rysowany', klip: klipSvg }, (
                              <Path d={lamanaSvg.d} fill={rysowanie.kolor} fillOpacity={0.35} stroke="none" />
                            ), 'lam-wyp') : null}
                            <Path
                              d={lamanaSvg.d}
                              fill="none"
                              stroke={rysowanie.kolor === '#FFFFFF' ? '#111827' : rysowanie.kolor}
                              strokeWidth={2}
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                            {lamanaSvg.uchwyty.map((u) => (
                              <Circle
                                key={`lu-${u.i}`}
                                cx={u.x}
                                cy={u.y}
                                r={5 / xform.s}
                                fill={u.luk ? rysowanie.kolor : '#FFFFFF'}
                                fillOpacity={0.9}
                                stroke="#111827"
                                strokeWidth={1.2}
                                strokeDasharray="2 2"
                                vectorEffect="non-scaling-stroke"
                              />
                            ))}
                            {lamanaSvg.wezly.map((w, i) => (
                              <Circle
                                key={`lw-${i}`}
                                cx={w.x}
                                cy={w.y}
                                r={(i === 0 ? 8 : 7) / xform.s}
                                fill="#FFFFFF"
                                stroke={rysowanie.kolor === '#FFFFFF' ? '#111827' : rysowanie.kolor}
                                strokeWidth={2.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            ))}
                          </G>
                        ) : null}
                        {mapa.maszyny.map((m) => (
                          <G key={m.id} onPress={m.rodzaj === 'auto' ? () => onPressAuto?.(m.id) : undefined}>
                            <MaszynaObmiaru
                              x={m.x}
                              y={m.y}
                              rotDeg={m.rotDeg}
                              szerObszaru={m.szerObszaru}
                              rodzaj={m.rodzaj}
                              numer={m.numer}
                            />
                          </G>
                        ))}
                        {rysunekPomiaru && rysunekPomiaru.punkty.length >= 2 ? (
                          <Polyline
                            points={rysunekPomiaru.punkty.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth={swEkran * 1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : null}
                        {wycinkiSvg.filter((w) => w.id === podswietlonyWycinekId).map((w) => (
                          <G key={`led-wycinek-${w.id}`} accessibilityLabel="Podświetlony obszar">
                            {obrysLed(`led-wycinek-${w.id}`, (p) => (
                              <Polygon
                                points={w.punkty}
                                fill="none"
                                {...p}
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            ))}
                          </G>
                        ))}
                        {mapa.obszary.filter((o) => o.id === podswietlonyObszarId && !podswietlonyWycinekId).map((o) => (
                          <G key={`led-obszar-${o.id}`} accessibilityLabel="Podświetlony obszar">
                            {obrysLed(`led-obszar-${o.id}`, (p) => (
                              <Polygon
                                points={o.punkty}
                                fill="none"
                                {...p}
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            ))}
                          </G>
                        ))}
                        {rysunekPomiaru?.punkty.map((mk, i) => {
                          const r = 5.5 / xform.s;
                          const font = 13 / xform.s;
                          const dx = 8 / xform.s;
                          const dy = 9 / xform.s;
                          return (
                            <G key={`pom-${i}`}>
                              <Circle
                                cx={mk.x}
                                cy={mk.y}
                                r={r}
                                fill="#1D4ED8"
                                stroke="#FFFFFF"
                                strokeWidth={1.6}
                                vectorEffect="non-scaling-stroke"
                              />
                              <SvgText
                                x={mk.x + dx}
                                y={mk.y - dy}
                                fontSize={font}
                                fontWeight="800"
                                fill="#FFFFFF"
                                stroke="#FFFFFF"
                                strokeWidth={3.2 / xform.s}
                                textAnchor="start"
                              >
                                {i + 1}
                              </SvgText>
                              <SvgText
                                x={mk.x + dx}
                                y={mk.y - dy}
                                fontSize={font}
                                fontWeight="800"
                                fill="#1E3A8A"
                                textAnchor="start"
                              >
                                {i + 1}
                              </SvgText>
                            </G>
                          );
                        })}
                      </G>
                    </Svg>
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </GestureHandlerRootView>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styl.presety}
        nestedScrollEnabled
      >
        {PRESETY_ZOOM_PROC.map((p) => {
          const aktywny = Math.abs(skalaPct - p) < 1;
          return (
            <TouchableOpacity
              key={p}
              style={[styl.preset, aktywny && styl.presetOn]}
              onPress={() => ustawSkaleWokolSrodka(skalaZProcentu(p))}
            >
              <Text style={[styl.presetTekst, aktywny && styl.presetTekstOn]}>{p}%</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          {mapa.os1500M > 1 ? (
            <Text style={styl.hintPod}>{tekstOsi1500(mapa.os1500M, mapa.xfdfM, mapa.dlM)}</Text>
          ) : null}
          {wynikPomiaru ? (
            <Text style={[styl.hintPod, { color: '#1E3A8A' }]}>
              {tekstPomiaruLamanej(wynikPomiaru.metry, wynikPomiaru.km, wynikPomiaru.wzdluzOsi)}
            </Text>
          ) : null}
          {tloMeta && !buforTla ? (
            <Text style={styl.hintPod}>Odtwarzanie tła z pamięci przeglądarki…</Text>
          ) : null}
          {onWskazPdf ? (
            <Text style={[styl.hintPod, { color: '#166534', fontWeight: '700' }]}>Wskaż punkt na mapie</Text>
          ) : null}
          {zmierz && punktyPomiaru.length > 0 ? (
            <TouchableOpacity
              onPress={() => setPunktyPomiaru([])}
              accessibilityLabel="Kasuj pomiar"
            >
              <Text style={[styl.hintPod, { color: '#1D4ED8', fontWeight: '700' }]}>
                {punktyPomiaru.length === 1 ? 'Stuknij kolejny punkt' : 'Kasuj pomiar'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <InfoTooltip tresc="Ramka blokuje przewijanie strony: jeden palec albo mysz przesuwa rysunek, dwa palce, kółko albo lupka przybliżają. Żeby widać było pikiety, pobocza i budynki, wgraj oryginalny PDF arkusza. Podziałka i jej opis są wektorami w skali arkusza. Stuknięcie obszaru podświetla go i otwiera powierzchnię oraz numer konstrukcji. Zmierz stawia łamaną z małymi numerami 1, 2, 3 obok punktu. Węzeł przesuwasz palcem. Długość jest w metrach skali 1:500. Kasuj pomiar czyści linię." />
      </View>
    </View>
  );
}

const styl = StyleSheet.create({
  ramka: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  ramkaBlokada: { borderColor: '#E8A020' },
  klip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  pusto: { textAlign: 'center', marginTop: 40, color: '#6B7280' },
  etykieta: {
    position: 'absolute',
    top: 8,
    left: 10,
    zIndex: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  celownik: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celownikTekst: { fontSize: 18, color: '#374151', fontWeight: '700' },
  blokadaKol: { position: 'absolute', bottom: 8, left: 8, zIndex: 6, gap: 6 },
  blokada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  check: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#E8A020', borderColor: '#E8A020' },
  checkTekst: { color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 13 },
  blokadaTekst: { fontSize: 11, fontWeight: '700', color: '#374151' },
  lupka: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  lupkaBtn: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  lupkaZnak: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 22 },
  lupkaPct: { minWidth: 58, textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#111827' },
  presety: { gap: 6, paddingVertical: 8, paddingHorizontal: 2 },
  preset: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  presetOn: { borderColor: '#E8A020', backgroundColor: '#FFF7E6' },
  presetTekst: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  presetTekstOn: { color: '#B45309' },
  hintPod: { fontSize: 11, color: '#6B7280', lineHeight: 15, marginTop: 2 },
});
