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
import Svg, { Circle, G, Image as SvgImage, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { ArkuszPzt, Punkt2D, TloArkuszaPzt } from '../../types';
import { bboxWielokata } from '../../utils/obmiarGeometry';
import {
  czoloObmiaruPdf,
  dlugoscOsiPdf1500M,
  dlugoscPolilinii,
  medianaSzerokosciObszarowPdf,
  napisZakresuWzdluzOsi,
  ocenaOdstempuPodzialkiM,
  osPdfZorientowana,
  pdfDoSvgPodgladu,
  pomiarWzdlozOsiPdf,
  punktNaOsi,
  rozmiarPodzialkiOsi,
  stacjaNaOsi,
  stacjePodzialki,
  stycznyNaOsi,
  svgDoPdfPodgladu,
  szerokoscPoprzecznaPdf,
  wycinekPolilinii,
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
import { buforTlaArkusza, podlaczBuforDoArkusza } from '../../utils/tloPdfPamiec';
import { PztTloPdfCanvas, type ObrazTlaPdf } from './PztTloPdfCanvas';
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

function kmAlboPuste(v: number | null | undefined): string {
  return v == null ? '—' : formatujKmM(v);
}

function tekstHintuPomiaru(n: number, metry: number | null): string {
  if (n === 0) {
    return 'Zmierz: zaznacz „Ramka”, przybliż nadruk (np. 115+700) i tapnij kreskę na osi. Drugie tapnięcie = kolejna pikieta (115+800). Wynik w metrach 1:500.';
  }
  if (n === 1) return 'Zmierz: tapnij drugą pikietę na osi (np. 115+800).';
  const m = (metry ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Zmierz 1:500: ${m} m. Trzecie tapnięcie zaczyna nowy odcinek.`;
}

function tekstKmPunktow(w: WynikPomiaruOsi): string {
  return `A ${kmAlboPuste(w.kmPztA)} · B ${kmAlboPuste(w.kmPztB)}`;
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
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });
  const [skalaPct, setSkalaPct] = useState(100);
  const [xform, setXform] = useState({ s: 1, tx: 0, ty: 0 });
  const [bladTla, setBladTla] = useState<string | null>(null);
  const [tloObraz, setTloObraz] = useState<ObrazTlaPdf | null>(null);
  const [zmierz, setZmierz] = useState(false);
  const [punktyPomiaru, setPunktyPomiaru] = useState<Punkt2D[]>([]);
  const onObrazTla = useCallback((o: ObrazTlaPdf | null) => setTloObraz(o), []);
  const onBladTla = useCallback((m: string | null) => setBladTla(m), []);
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
    return bboxWielokata(pts);
  }, [arkusz]);

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
      };
    });
    const osPdf = osPdfZorientowana(arkusz);
    const osPts = osPdf.map(toSvg);
    const osPunkty = osPts.map((p) => `${p.x},${p.y}`).join(' ');
    const dlM = Math.max(0.01, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM);
    const stacjaNaSvg = (stacjaM: number): Punkt2D | null => {
      if (!osPdf || osPdf.length < 2) return null;
      const sM = stacjaM - arkusz.kilometrazPoczatkowyM;
      if (sM < -1 || sM > dlM + 1) return null;
      const sPdf = (sM / dlM) * dlugoscPolilinii(osPdf);
      const p = punktNaOsi(osPdf, sPdf);
      return p ? toSvg(p) : null;
    };
    const rozkladarka = liveStacjaM != null ? stacjaNaSvg(liveStacjaM) : null;
    const auta = (liveAuta ?? [])
      .map((a) => {
        const p = stacjaNaSvg(a.stacjaM);
        return p ? { ...a, ...p } : null;
      })
      .filter((x): x is LiveAutoPzt & Punkt2D => !!x);
    const dlPdf = osPdf && osPdf.length >= 2 ? dlugoscPolilinii(osPdf) : 0;
    const krok = podzialkaM ?? 0;
    const szerPdf = medianaSzerokosciObszarowPdf(arkusz.obszary);
    const kreskaNaStacji = (kmM: number, odM: number, span: number, skalaKreski: number) => {
      if (!osPdf || osPdf.length < 2) return null;
      const sPdf = ((kmM - odM) / span) * dlPdf;
      const t = stycznyNaOsi(osPdf, sPdf);
      if (!t) return null;
      const lokalna = szerokoscPoprzecznaPdf(arkusz.obszary, osPdf, sPdf);
      const podz = rozmiarPodzialkiOsi(lokalna > 2 ? lokalna : szerPdf);
      const plen = Math.hypot(t.dx, t.dy) || 1;
      const nx = -t.dy / plen;
      const ny = t.dx / plen;
      const half = podz.halfPdf * skalaKreski;
      const p1 = toSvg({ x: t.punkt.x + nx * half, y: t.punkt.y + ny * half });
      const p2 = toSvg({ x: t.punkt.x - nx * half, y: t.punkt.y - ny * half });
      const mid = toSvg(t.punkt);
      let tp = toSvg({
        x: t.punkt.x + nx * podz.odstepTekstuPdf * skalaKreski,
        y: t.punkt.y + ny * podz.odstepTekstuPdf * skalaKreski,
      });
      if (tp.y > mid.y) {
        tp = toSvg({
          x: t.punkt.x - nx * podz.odstepTekstuPdf * skalaKreski,
          y: t.punkt.y - ny * podz.odstepTekstuPdf * skalaKreski,
        });
      }
      const sdx = t.dx * skalaFit;
      const sdy = -t.dy * skalaFit;
      const sl = Math.hypot(sdx, sdy) || 1;
      return {
        kmM,
        etykieta: formatujKmM(kmM),
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        tx: tp.x,
        ty: tp.y,
        mx: mid.x,
        my: mid.y,
        ux: sdx / sl,
        uy: sdy / sl,
        fontSvg: podz.fontPdf * skalaFit * (skalaKreski < 1 ? 0.92 : 1),
        rMarkerSvg: Math.max(2.2, Math.min(4.5, podz.halfPdf * skalaFit * 0.28)),
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
    const mapaSvg = { w: rozmiar.w, h: rozmiar.h, cx, cy, skalaFit };
    const os1500M = osPdf && osPdf.length >= 2 ? dlugoscOsiPdf1500M(osPdf) : 0;
    const xfdfM = arkusz.osTrasy?.dlugoscEtykietaM;
    return {
      obszary,
      skalaFit,
      cx,
      cy,
      osPdf,
      osPunkty,
      mapaSvg,
      os1500M,
      xfdfM,
      dlM,
      rozkladarka,
      auta,
      podzialki,
      zakresKreski,
      rMarkerSvg: podzialki[0]?.rMarkerSvg ?? Math.max(2.2, Math.min(4.5, 3.2 * skalaFit)),
    };
  }, [arkusz, geometria, rozmiar.w, rozmiar.h, liveStacjaM, liveAuta, podzialkaM, zakresStartM, zakresKoniecM]);

  const mapaRef = useRef(mapa);
  mapaRef.current = mapa;
  const zmierzRef = useRef(zmierz);
  zmierzRef.current = zmierz;
  const lastTapMs = useRef(0);

  const dodajPunktPomiaru = (ekranX: number, ekranY: number) => {
    const m = mapaRef.current;
    if (!zmierzRef.current || !m?.osPdf || m.osPdf.length < 2) return;
    const now = Date.now();
    if (now - lastTapMs.current < 280) return;
    lastTapMs.current = now;
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
    const pdf = svgDoPdfPodgladu(svg, m.mapaSvg);
    setPunktyPomiaru((prev) => (prev.length >= 2 ? [pdf] : [...prev, pdf]));
  };

  const wynikPomiaru = useMemo(() => {
    if (!mapa?.osPdf || punktyPomiaru.length < 2) return null;
    return pomiarWzdlozOsiPdf({
      osPdf: mapa.osPdf,
      a: punktyPomiaru[0],
      b: punktyPomiaru[1],
      kmPzt: { odM: arkusz.kilometrazPoczatkowyM, doM: arkusz.kilometrazKoncowyM },
      kmXfdf: { odM: arkusz.kilometrazPoczatkowyM, doM: arkusz.kilometrazKoncowyM },
    });
  }, [mapa, punktyPomiaru, arkusz.kilometrazPoczatkowyM, arkusz.kilometrazKoncowyM]);

  const rysunekPomiaru = useMemo(() => {
    if (!mapa?.osPdf || punktyPomiaru.length === 0) return null;
    const toSvg = (p: Punkt2D) => pdfDoSvgPodgladu(p, mapa.mapaSvg);
    const markery = punktyPomiaru.map((p, i) => {
      const naOsi = i === 0 && wynikPomiaru
        ? wynikPomiaru.punktA
        : (i === 1 && wynikPomiaru
          ? wynikPomiaru.punktB
          : (punktNaOsi(mapa.osPdf, stacjaNaOsi(mapa.osPdf, p)) ?? p));
      return { i, ...toSvg(naOsi) };
    });
    const odcinek = wynikPomiaru
      ? wycinekPolilinii(
        mapa.osPdf,
        Math.min(wynikPomiaru.stacjaAPdf, wynikPomiaru.stacjaBPdf),
        Math.max(wynikPomiaru.stacjaAPdf, wynikPomiaru.stacjaBPdf),
      ).map(toSvg)
      : [];
    return { markery, odcinek };
  }, [mapa, punktyPomiaru, wynikPomiaru]);

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
      if (!zmierzRef.current) return;
      const rect = el.getBoundingClientRect();
      dodajPunktPomiaru(e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('click', onClick);
    odpinWheel.current = () => {
      el.removeEventListener('wheel', handler);
      el.removeEventListener('click', onClick);
    };
  }, []);
  useEffect(() => () => odpinWheel.current?.(), []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setRozmiar({ w: width, h: height });
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
    if (st === State.ACTIVE) onDotykZmiana?.(true);
    if (e.nativeEvent.oldState !== State.ACTIVE) {
      if (st === State.FAILED || st === State.CANCELLED || st === State.END) {
        if (zmierzRef.current && tap) {
          const x = e.nativeEvent.x as number | undefined;
          const y = e.nativeEvent.y as number | undefined;
          if (x != null && y != null) dodajPunktPomiaru(x, y);
        }
        onDotykZmiana?.(false);
      }
      return;
    }
    if (zmierzRef.current && tap) {
      const x = e.nativeEvent.x as number | undefined;
      const y = e.nativeEvent.y as number | undefined;
      if (x != null && y != null) dodajPunktPomiaru(x, y);
      onDotykZmiana?.(false);
      return;
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

  const panOffset = blokadaPodgladu ? 2 : 14;
  const gXform = `translate(${rozmiar.w / 2 + xform.tx},${rozmiar.h / 2 + xform.ty}) scale(${xform.s}) translate(${-rozmiar.w / 2},${-rozmiar.h / 2})`;
  const swEkran = 1.25;
  const dash = 5 / Math.max(xform.s, 0.12);
  const rZnak = (mapa?.rMarkerSvg ?? 3.2) / Math.max(xform.s, 0.35);
  const tloMeta = arkusz.tlo;
  const tloWidoczne = !!(tloMeta && tloMeta.widoczne !== false);
  const buforTla = tloMeta
    ? (buforTlaArkusza(arkusz.id) ?? podlaczBuforDoArkusza(arkusz.id, tloMeta.nazwa) ?? null)
    : null;

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
              setZmierz((v) => {
                const next = !v;
                if (next) onBlokadaPodgladu?.(true);
                else setPunktyPomiaru([]);
                return next;
              });
            }}
            accessibilityLabel="Zmierz oś 1:500"
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
                      onPress={(e) => {
                        if (!zmierzRef.current) return;
                        const ne = e.nativeEvent as { locationX?: number; x?: number; locationY?: number; y?: number };
                        const x = ne.locationX ?? ne.x;
                        const y = ne.locationY ?? ne.y;
                        if (x != null && y != null) dodajPunktPomiaru(x, y);
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
                        {mapa.obszary.map((o) => (
                          <Polygon
                            key={o.id}
                            points={o.punkty}
                            fill={o.fill}
                            stroke={o.stroke}
                            strokeWidth={swEkran}
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
                        {mapa.podzialki.map((t) => (
                          <G key={`pk-${t.kmM}`}>
                            <Line
                              x1={t.x1}
                              y1={t.y1}
                              x2={t.x2}
                              y2={t.y2}
                              stroke="#374151"
                              strokeWidth={swEkran * 0.75}
                              strokeLinecap="butt"
                              vectorEffect="non-scaling-stroke"
                            />
                            <SvgText
                              x={t.tx}
                              y={t.ty}
                              fontSize={t.fontSvg}
                              fontWeight="600"
                              fill="#374151"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                            >
                              {t.etykieta}
                            </SvgText>
                          </G>
                        ))}
                        {mapa.zakresKreski.map((t) => {
                          const napis = t.rola === 'start' ? 'START' : 'KONIEC';
                          const font = 13 / Math.max(xform.s, 0.08);
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
                        {mapa.auta.map((a) => (
                          <G key={a.id} onPress={() => onPressAuto?.(a.id)}>
                            <Circle cx={a.x} cy={a.y} r={rZnak} fill="#F59E0B" stroke="#fff" strokeWidth={1.2} />
                            <SvgText
                              x={a.x}
                              y={a.y + rZnak * 0.35}
                              fontSize={Math.max(6, rZnak * 1.15)}
                              fontWeight="700"
                              fill="#111827"
                              textAnchor="middle"
                            >
                              {String(a.numer)}
                            </SvgText>
                          </G>
                        ))}
                        {mapa.rozkladarka ? (
                          <Circle
                            cx={mapa.rozkladarka.x}
                            cy={mapa.rozkladarka.y}
                            r={rZnak * 1.15}
                            fill="#16A34A"
                            stroke="#fff"
                            strokeWidth={1.4}
                          />
                        ) : null}
                        {rysunekPomiaru?.odcinek && rysunekPomiaru.odcinek.length >= 2 ? (
                          <Polyline
                            points={rysunekPomiaru.odcinek.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth={swEkran * 2.1}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : null}
                        {rysunekPomiaru?.markery.map((mk) => (
                          <G key={`pom-${mk.i}`}>
                            <Circle
                              cx={mk.x}
                              cy={mk.y}
                              r={rZnak}
                              fill="#2563EB"
                              stroke="#fff"
                              strokeWidth={1.2}
                            />
                            <SvgText
                              x={mk.x}
                              y={mk.y + rZnak * 0.35}
                              fontSize={Math.max(6, rZnak * 1.15)}
                              fontWeight="800"
                              fill="#fff"
                              textAnchor="middle"
                            >
                              {mk.i === 0 ? 'A' : 'B'}
                            </SvgText>
                          </G>
                        ))}
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
      {mapa.os1500M > 1 ? (
        <Text style={styl.hintPod}>{tekstOsi1500(mapa.os1500M, mapa.xfdfM, mapa.dlM)}</Text>
      ) : null}
      {zmierz ? (
        <Text style={[styl.hintPod, { color: '#1D4ED8', fontWeight: '700' }]}>
          {tekstHintuPomiaru(punktyPomiaru.length, wynikPomiaru?.metry1500 ?? null)}
        </Text>
      ) : null}
      {wynikPomiaru ? (
        <Text style={[styl.hintPod, { color: '#1E3A8A' }]}>
          {`${tekstKmPunktow(wynikPomiaru)}. ${ocenaOdstempuPodzialkiM(wynikPomiaru.metry1500).tekst}`}
        </Text>
      ) : null}
      <Text style={styl.hintPod}>
        {tloMeta
          ? `Tło PDF: ${tloMeta.nazwa}${buforTla ? '' : ' — odtwarzanie z pamięci przeglądarki… Jeśli nie wraca, otwórz konfigurator teł.'}`
          : 'Żeby widać było pikiety, pobocza i budynki, wgraj oryginalny PDF arkusza („+ Tło PDF”). Nazwy nie muszą być identyczne z XFDF – wystarczy numer arkusza (Ark_2_1) albo jeden PDF na otwartą zakładkę.'}
      </Text>
      <Text style={styl.hintPod}>
        {blokadaPodgladu
          ? 'Blokada ramki: przesuwanie i zoom w podglądzie (strona nie scrolluje). Odznacz „Ramka”, aby przewinąć w dół.'
          : '1 palec / mysz: przesuń · 2 palce / kółko / lupka: zoom. Zaznacz „Ramka”, żeby nie scrollować strony.'}
      </Text>
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
