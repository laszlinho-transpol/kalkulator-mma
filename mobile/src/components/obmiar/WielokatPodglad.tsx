import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Svg, {
  Circle, ClipPath, Defs, G, Image as SvgImage, Line, Polygon, Polyline, Rect, Text as SvgText,
} from 'react-native-svg';
import type { ObszarObmiaru, Punkt2D, TrybWyboruWezla, WezelObmiaru } from '../../types';
import { bboxWielokata } from '../../utils/obmiarGeometry';
import { lancuchKrotszy, osFigury, wezlyZKonfiguracji } from '../../utils/obmiarFigura';
import { punktNaSciezceUkladania, znacznikiKilometrazuNaObszarze } from '../../utils/obmiarKilometraz';
import {
  nastepnyPresetZoom,
  ograniczenie,
  PRESETY_ZOOM_PROC,
  punktSvgZEkranu,
  SKALA_MAX,
  SKALA_MIN,
  skalaZProcentu,
  translacjaPrzyObrocie,
  translacjaPrzyZoomie,
} from '../../utils/obmiarMapa';

const PRIMARY = '#E8A020';
const FILL_PLAN = 'rgba(232, 160, 32, 0.28)';
const FILL_LIVE = 'rgba(34, 197, 94, 0.55)';
const KOLOR_START = '#2563EB';
const KOLOR_KONIEC = '#DC2626';
const KOLOR_ODS = '#0F766E';
const KOLOR_SZARY = '#9CA3AF';

/** Widok z góry: przód = LEWA strona PNG → +180° względem heading (0 = +X) */
const MASZYNA_OFFSET_DEG = 180;
const IMG_ROZKLADARKA = require('../../../assets/maszyny/rozkladarka.png');
const IMG_SAMOCHOD = require('../../../assets/maszyny/samochod.png');

/** Rozmiary w metrach terenu – skalują się razem z drogą (jak w PDF). */
const WEZEL_R_M = 0.32;
const OBRYS_M = 0.16;
const BAZA_M = 0.22;
const KM_KRESKA_M = 0.9;
const AUTO_W_M = 2.7;
const AUTO_H_M = 1.5;
const ROZ_W_M = 4.6;
const ROZ_H_M = 2.5;

interface Props {
  wierzcholki: Punkt2D[];
  wezly?: WezelObmiaru[];
  kolorWypelnienia?: string;
  postepLive?: number;
  wysokosc?: number;
  etykieta?: string;
  resetKlucz?: string;
  onPressWezel?: (idx: number) => void;
  obszar?: ObszarObmiaru;
  pokazMaszyny?: boolean;
  trybWyboru?: TrybWyboruWezla | null;
  idxPodswietlone?: number[];
  onPressAuto?: (wpisId: string) => void;
  onDotykZmiana?: (aktywny: boolean) => void;
  blokadaPodgladu?: boolean;
  onBlokadaPodgladu?: (v: boolean) => void;
}

function hexDoRgba(hex: string | undefined, alpha: number, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)) return fallback;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function kolorRoli(rola: WezelObmiaru['rola']): string {
  if (rola === 'startLewy' || rola === 'startPrawy' || rola === 'start') return KOLOR_START;
  if (rola === 'koniecLewy' || rola === 'koniecPrawy' || rola === 'koniec') return KOLOR_KONIEC;
  if (rola === 'lewa' || rola === 'prawa') return KOLOR_ODS;
  return PRIMARY;
}

export function WielokatPodglad({
  wierzcholki,
  wezly = [],
  kolorWypelnienia,
  postepLive = 0,
  wysokosc = 320,
  etykieta,
  resetKlucz,
  onPressWezel,
  obszar,
  pokazMaszyny = false,
  trybWyboru = null,
  idxPodswietlone = [],
  onPressAuto,
  onDotykZmiana,
  blokadaPodgladu = false,
  onBlokadaPodgladu,
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });
  const [skalaPct, setSkalaPct] = useState(100);

  const bazaSkali = useRef(1);
  const bazaX = useRef(0);
  const bazaY = useRef(0);
  const bazaRot = useRef(0);
  const pinchStart = useRef({ s: 1, tx: 0, ty: 0, f0x: 0, f0y: 0 });
  const rotStart = useRef({ r: 0, tx: 0, ty: 0, fx: 0, fy: 0 });

  const skala = useRef(new Animated.Value(1)).current;
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const rotacja = useRef(new Animated.Value(0)).current;

  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const rotRef = useRef(null);

  const PAN_CZYNNIK = 0.55;
  const TAP_MAX = 10;

  const clampTrans = (x: number, y: number, s = bazaSkali.current) => {
    const max = Math.max(rozmiar.w, rozmiar.h) * Math.max(s, 1) * 3;
    return { x: ograniczenie(x, -max, max), y: ograniczenie(y, -max, max) };
  };

  const zwolnijDotyk = () => onDotykZmiana?.(false);

  const ustawSkaleWokolSrodka = (s1raw: number) => {
    const s0 = bazaSkali.current;
    const s1 = ograniczenie(s1raw, SKALA_MIN, SKALA_MAX);
    const t0 = translacjaPrzyZoomie({
      skala0: s0,
      skala1: s1,
      tx0: bazaX.current,
      ty0: bazaY.current,
      f0x: 0,
      f0y: 0,
      f1x: 0,
      f1y: 0,
    });
    const t = clampTrans(t0.tx, t0.ty, s1);
    bazaSkali.current = s1;
    bazaX.current = t.x;
    bazaY.current = t.y;
    skala.setValue(s1);
    transX.setValue(t.x);
    transY.setValue(t.y);
    setSkalaPct(Math.round(s1 * 100));
  };

  const resetWidoku = () => {
    bazaSkali.current = 1;
    bazaX.current = 0;
    bazaY.current = 0;
    bazaRot.current = 0;
    skala.setValue(1);
    transX.setValue(0);
    transY.setValue(0);
    rotacja.setValue(0);
    setSkalaPct(100);
    zwolnijDotyk();
  };

  useEffect(() => {
    resetWidoku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKlucz, skala, transX, transY, rotacja]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setRozmiar({ w: width, h: height });
  };

  const wezlyWidok = useMemo(
    () => (obszar ? wezlyZKonfiguracji(obszar) : wezly),
    [obszar, wezly],
  );

  const mapa = useMemo(() => {
    if (wierzcholki.length < 3) return null;
    const bb = bboxWielokata(wierzcholki);
    const pad = 36;
    const skalaFit = Math.min(
      (rozmiar.w - pad * 2) / Math.max(bb.szer, 0.01),
      (rozmiar.h - pad * 2) / Math.max(bb.wys, 0.01),
    );
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const toSvg = (p: Punkt2D) => ({
      x: rozmiar.w / 2 + (p.x - cx) * skalaFit,
      y: rozmiar.h / 2 - (p.y - cy) * skalaFit,
    });
    const punkty = wierzcholki.map(toSvg);
    const start = wezlyWidok.find((w) => w.rola === 'start' || w.rola === 'startLewy');
    const koniec = wezlyWidok.find((w) => w.rola === 'koniec' || w.rola === 'koniecLewy');
    const sIdx = start ? Math.max(0, Math.min(wierzcholki.length - 1, start.idx)) : 0;
    const kIdx = koniec
      ? Math.max(0, Math.min(wierzcholki.length - 1, koniec.idx))
      : Math.min(1, wierzcholki.length - 1);
    const sSvg = toSvg(wierzcholki[sIdx]);
    const kSvg = toSvg(wierzcholki[kIdx]);
    const dx = kSvg.x - sSvg.x;
    const dy = kSvg.y - sSvg.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const prog = Math.max(0, Math.min(1, postepLive));
    const reach = len * prog + 40;
    const halfW = Math.max(rozmiar.w, rozmiar.h);
    const clipPts = [
      { x: sSvg.x - ux * 40 + px * halfW, y: sSvg.y - uy * 40 + py * halfW },
      { x: sSvg.x - ux * 40 - px * halfW, y: sSvg.y - uy * 40 - py * halfW },
      { x: sSvg.x + ux * reach - px * halfW, y: sSvg.y + uy * reach - py * halfW },
      { x: sSvg.x + ux * reach + px * halfW, y: sSvg.y + uy * reach + py * halfW },
    ];

    const linieBazy: { x1: number; y1: number; x2: number; y2: number; kolor: string }[] = [];
    if (obszar?.bazaStart?.idxLewy != null && obszar.bazaStart.idxPrawy != null) {
      const a = toSvg(wierzcholki[obszar.bazaStart.idxLewy]);
      const b = toSvg(wierzcholki[obszar.bazaStart.idxPrawy]);
      linieBazy.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kolor: KOLOR_START });
    }
    if (obszar?.bazaKoniec?.idxLewy != null && obszar.bazaKoniec.idxPrawy != null) {
      const a = toSvg(wierzcholki[obszar.bazaKoniec.idxLewy]);
      const b = toSvg(wierzcholki[obszar.bazaKoniec.idxPrawy]);
      linieBazy.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kolor: KOLOR_KONIEC });
    }

    const lancuchyOds: { punkty: string; kolor: string; przerywana?: boolean }[] = [];
    for (const o of obszar?.odsadzki ?? []) {
      if (o.zastosowana && o.wierzcholkiPrzed && o.wierzcholkiPrzed.length >= 2) {
        lancuchyOds.push({
          punkty: o.wierzcholkiPrzed.map((p) => {
            const s = toSvg(p);
            return `${s.x},${s.y}`;
          }).join(' '),
          kolor: KOLOR_SZARY,
          przerywana: true,
        });
      }
      if (o.idxP != null && o.idxK != null) {
        const idx = lancuchKrotszy(wierzcholki.length, o.idxP, o.idxK);
        lancuchyOds.push({
          punkty: idx.map((i) => {
            const s = toSvg(wierzcholki[i]);
            return `${s.x},${s.y}`;
          }).join(' '),
          kolor: o.zastosowana ? KOLOR_SZARY : KOLOR_ODS,
        });
      }
    }

    const osSvg: { x: number; y: number }[] = [];
    if (obszar) {
      for (const p of osFigury(obszar, 20)) {
        osSvg.push(toSvg(p.punkt));
      }
    }

    const kmSvg: { etykieta: string; x: number; y: number }[] = [];
    if (obszar) {
      for (const z of znacznikiKilometrazuNaObszarze(obszar)) {
        if (!z.pozycja.ok) continue;
        const s = toSvg(z.pozycja.punkt);
        kmSvg.push({ etykieta: z.etykieta, x: s.x, y: s.y });
      }
    }

    type Maszyna = {
      rodzaj: 'rozkladarka' | 'auto';
      x: number;
      y: number;
      rotDeg: number;
      numer?: number;
      wpisId?: string;
    };
    const maszyny: Maszyna[] = [];
    const moznaMaszyny = !!(pokazMaszyny && obszar && (obszar.wpisyWz?.length ?? 0) > 0 && !trybWyboru);
    if (moznaMaszyny && obszar) {
      const headingDoSvg = (headingRad: number) => {
        const headingSvg = Math.atan2(-Math.sin(headingRad), Math.cos(headingRad));
        return (headingSvg * 180) / Math.PI + MASZYNA_OFFSET_DEG;
      };
      for (const wpis of obszar.wpisyWz ?? []) {
        const pos = punktNaSciezceUkladania(obszar, wpis.przejechaneMetry);
        if (!pos.ok) continue;
        const s = toSvg(pos.punkt);
        maszyny.push({
          rodzaj: 'auto',
          x: s.x,
          y: s.y,
          rotDeg: headingDoSvg(pos.headingRad),
          numer: wpis.numer,
          wpisId: wpis.id,
        });
      }
      const ost = obszar.wpisyWz![obszar.wpisyWz!.length - 1];
      const posRoz = punktNaSciezceUkladania(obszar, ost.przejechaneMetry);
      if (posRoz.ok) {
        const s = toSvg(posRoz.punkt);
        maszyny.push({
          rodzaj: 'rozkladarka',
          x: s.x,
          y: s.y,
          rotDeg: headingDoSvg(posRoz.headingRad),
        });
        const posPrzod = punktNaSciezceUkladania(obszar, ost.przejechaneMetry + 6);
        if (posPrzod.ok) {
          const p = toSvg(posPrzod.punkt);
          const lastAuto = maszyny.filter((m) => m.rodzaj === 'auto').pop();
          if (lastAuto) {
            lastAuto.x = p.x;
            lastAuto.y = p.y;
            lastAuto.rotDeg = headingDoSvg(posPrzod.headingRad);
          }
        }
      }
    }

    return {
      skalaFit,
      punkty,
      punktyStr: punkty.map((p) => `${p.x},${p.y}`).join(' '),
      clipStr: clipPts.map((p) => `${p.x},${p.y}`).join(' '),
      wezlySvg: wezlyWidok.map((w) => {
        const i = Math.max(0, Math.min(wierzcholki.length - 1, w.idx));
        return { ...w, ...toSvg(wierzcholki[i]) };
      }),
      linieBazy,
      lancuchyOds,
      osSvg,
      kmSvg,
      maszyny,
    };
  }, [wierzcholki, wezlyWidok, rozmiar.w, rozmiar.h, postepLive, obszar, pokazMaszyny, trybWyboru]);

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
    skala.setValue(s1);
    transX.setValue(t.x);
    transY.setValue(t.y);
    const pct = Math.round(s1 * 100);
    if (pct !== skalaPct) setSkalaPct(pct);
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
      skala.setValue(bazaSkali.current);
      transX.setValue(t.x);
      transY.setValue(t.y);
      setSkalaPct(Math.round(bazaSkali.current * 100));
      zwolnijDotyk();
    }
    if (st === State.FAILED || st === State.CANCELLED || st === State.END) zwolnijDotyk();
  };

  const onRot = (e: any) => {
    const d = e.nativeEvent.rotation;
    const f = ognisko(e.nativeEvent);
    const t0 = translacjaPrzyObrocie({
      tx0: rotStart.current.tx,
      ty0: rotStart.current.ty,
      dRot: d,
      fx: f.x,
      fy: f.y,
    });
    const t = clampTrans(t0.tx, t0.ty);
    rotacja.setValue(rotStart.current.r + d);
    transX.setValue(t.x);
    transY.setValue(t.y);
  };
  const onRotState = (e: any) => {
    const st = e.nativeEvent.state;
    if (st === State.ACTIVE) onDotykZmiana?.(true);
    if (st === State.BEGAN) {
      const f = ognisko(e.nativeEvent);
      rotStart.current = {
        r: bazaRot.current,
        tx: bazaX.current,
        ty: bazaY.current,
        fx: f.x,
        fy: f.y,
      };
    }
    if (e.nativeEvent.oldState === State.ACTIVE) {
      bazaRot.current += e.nativeEvent.rotation;
      transX.stopAnimation((v) => { bazaX.current = typeof v === 'number' ? v : bazaX.current; });
      transY.stopAnimation((v) => { bazaY.current = typeof v === 'number' ? v : bazaY.current; });
      rotacja.setValue(bazaRot.current);
      zwolnijDotyk();
    }
    if (st === State.FAILED || st === State.CANCELLED || st === State.END) zwolnijDotyk();
  };

  const trafWezel = (ekranX: number, ekranY: number) => {
    if (!mapa || !onPressWezel) return;
    const p = punktSvgZEkranu({
      ekranX,
      ekranY,
      szer: rozmiar.w,
      wys: rozmiar.h,
      tx: bazaX.current,
      ty: bazaY.current,
      rot: bazaRot.current,
      skala: bazaSkali.current,
    });
    const hitSvg = Math.max(WEZEL_R_M * 3 * mapa.skalaFit, 18 / Math.max(bazaSkali.current, 0.15));
    let best = -1;
    let bestD = hitSvg;
    mapa.punkty.forEach((pt, i) => {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) onPressWezel(best);
  };

  const onPan = (e: any) => {
    if (e.nativeEvent.numberOfPointers > 1) return;
    const t = clampTrans(
      bazaX.current + e.nativeEvent.translationX * PAN_CZYNNIK,
      bazaY.current + e.nativeEvent.translationY * PAN_CZYNNIK,
    );
    transX.setValue(t.x);
    transY.setValue(t.y);
  };
  const onPanState = (e: any) => {
    const st = e.nativeEvent.state;
    if (st === State.ACTIVE) onDotykZmiana?.(true);
    if (e.nativeEvent.oldState !== State.ACTIVE) {
      if (st === State.FAILED || st === State.CANCELLED || st === State.END) {
        const dx = e.nativeEvent.translationX ?? 0;
        const dy = e.nativeEvent.translationY ?? 0;
        if (onPressWezel && Math.hypot(dx, dy) < TAP_MAX) {
          const x = e.nativeEvent.x as number | undefined;
          const y = e.nativeEvent.y as number | undefined;
          if (x != null && y != null) trafWezel(x, y);
        }
        zwolnijDotyk();
      }
      return;
    }
    if (e.nativeEvent.numberOfPointers > 1) {
      zwolnijDotyk();
      return;
    }
    const t = clampTrans(
      bazaX.current + e.nativeEvent.translationX * PAN_CZYNNIK,
      bazaY.current + e.nativeEvent.translationY * PAN_CZYNNIK,
    );
    bazaX.current = t.x;
    bazaY.current = t.y;
    transX.setValue(t.x);
    transY.setValue(t.y);
    zwolnijDotyk();
  };

  if (!mapa) {
    return (
      <View style={[styl.ramka, { height: wysokosc }]}>
        <Text style={styl.pusto}>Brak geometrii</Text>
      </View>
    );
  }

  const fillPlan = hexDoRgba(kolorWypelnienia, 0.38, FILL_PLAN);
  const animStyle = {
    transform: [
      { translateX: transX },
      { translateY: transY },
      {
        rotate: rotacja.interpolate({
          inputRange: [-Math.PI * 4, Math.PI * 4],
          outputRange: ['-720deg', '720deg'],
        }),
      },
      { scale: skala },
    ],
  };

  const m = (metry: number) => metry * mapa.skalaFit;
  const inv = 1 / Math.max(skalaPct / 100, 0.08);
  const wezelR = m(WEZEL_R_M);
  const wezelHit = Math.max(wezelR * 2.2, 16 * inv);
  const panOffset = blokadaPodgladu ? 2 : 14;
  const gestyWlaczane = !trybWyboru;

  return (
    <View>
      <View style={[styl.ramka, { height: wysokosc }, blokadaPodgladu && styl.ramkaBlokada]} collapsable={false}>
        {etykieta ? <Text style={styl.etykieta} pointerEvents="none">{etykieta}</Text> : null}
        {trybWyboru ? (
          <Text style={styl.tryb} pointerEvents="none">Wybierz węzeł na rysunku</Text>
        ) : null}
        <TouchableOpacity style={styl.celownik} onPress={resetWidoku} accessibilityLabel="Przywróć obszar">
          <Text style={styl.celownikTekst}>⌖</Text>
        </TouchableOpacity>

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

        <View style={styl.lupka}>
          <TouchableOpacity style={styl.lupkaBtn} onPress={() => ustawSkaleWokolSrodka(nastepnyPresetZoom(bazaSkali.current, -1))}>
            <Text style={styl.lupkaZnak}>−</Text>
          </TouchableOpacity>
          <Text style={styl.lupkaPct}>{skalaPct}%</Text>
          <TouchableOpacity style={styl.lupkaBtn} onPress={() => ustawSkaleWokolSrodka(nastepnyPresetZoom(bazaSkali.current, 1))}>
            <Text style={styl.lupkaZnak}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styl.klip} collapsable={false} onLayout={onLayout}>
          <GestureHandlerRootView style={StyleSheet.absoluteFill}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={[panRef, rotRef]}
              enabled={gestyWlaczane}
              onGestureEvent={onPinch}
              onHandlerStateChange={onPinchState}
            >
              <Animated.View style={StyleSheet.absoluteFill} collapsable={false}>
                <RotationGestureHandler
                  ref={rotRef}
                  simultaneousHandlers={[pinchRef, panRef]}
                  enabled={gestyWlaczane}
                  onGestureEvent={onRot}
                  onHandlerStateChange={onRotState}
                >
                  <Animated.View style={StyleSheet.absoluteFill} collapsable={false}>
                    <PanGestureHandler
                      ref={panRef}
                      simultaneousHandlers={[pinchRef, rotRef]}
                      minPointers={1}
                      maxPointers={2}
                      avgTouches
                      enabled={gestyWlaczane}
                      activeOffsetX={[-panOffset, panOffset]}
                      activeOffsetY={[-panOffset, panOffset]}
                      onGestureEvent={onPan}
                      onHandlerStateChange={onPanState}
                    >
                      <Animated.View style={[StyleSheet.absoluteFill, animStyle]} collapsable={false}>
                        <Svg width={rozmiar.w} height={rozmiar.h}>
                          <Defs>
                            <ClipPath id="clipObszar">
                              <Polygon points={mapa.punktyStr} />
                            </ClipPath>
                          </Defs>
                          <Rect
                            x={0}
                            y={0}
                            width={rozmiar.w}
                            height={rozmiar.h}
                            fill="#F8FAFC"
                          />
                          <G>
                            {mapa.lancuchyOds.filter((l) => l.przerywana).map((l, i) => (
                              <Polyline
                                key={`old-${i}`}
                                points={l.punkty}
                                fill="none"
                                stroke={l.kolor}
                                strokeWidth={m(OBRYS_M * 0.7)}
                                strokeDasharray={`${m(0.8)} ${m(0.55)}`}
                                opacity={0.85}
                              />
                            ))}
                            <Polygon
                              points={mapa.punktyStr}
                              fill={fillPlan}
                              stroke={PRIMARY}
                              strokeWidth={m(OBRYS_M)}
                            />
                            {postepLive > 0.001 && (
                              <G clipPath="url(#clipObszar)">
                                <Polygon points={mapa.clipStr} fill={FILL_LIVE} />
                              </G>
                            )}
                            {mapa.lancuchyOds.filter((l) => !l.przerywana).map((l, i) => (
                              <Polyline
                                key={`ods-${i}`}
                                points={l.punkty}
                                fill="none"
                                stroke={l.kolor}
                                strokeWidth={m(OBRYS_M * 1.15)}
                              />
                            ))}
                            {mapa.osSvg.length > 1 && (
                              <Polyline
                                points={mapa.osSvg.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="#64748B"
                                strokeWidth={m(0.1)}
                                strokeDasharray={`${m(0.7)} ${m(0.45)}`}
                              />
                            )}
                            {mapa.linieBazy.map((l, i) => (
                              <Line
                                key={`baza-${i}`}
                                x1={l.x1}
                                y1={l.y1}
                                x2={l.x2}
                                y2={l.y2}
                                stroke={l.kolor}
                                strokeWidth={m(BAZA_M)}
                              />
                            ))}
                            {mapa.punkty.map((p, i) => {
                              const hit = idxPodswietlone.includes(i);
                              const rola = mapa.wezlySvg.find((w) => w.idx === i);
                              const fill = hit
                                ? PRIMARY
                                : rola
                                  ? kolorRoli(rola.rola)
                                  : '#fff';
                              return (
                                <G key={`v-${i}`}>
                                  <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={wezelHit}
                                    fill="transparent"
                                    onPress={onPressWezel ? () => onPressWezel(i) : undefined}
                                  />
                                  <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={hit || trybWyboru ? wezelR * 1.35 : wezelR}
                                    fill={fill}
                                    stroke={rola ? '#fff' : PRIMARY}
                                    strokeWidth={m(0.08)}
                                    pointerEvents="none"
                                  />
                                </G>
                              );
                            })}
                            {mapa.kmSvg.map((z) => (
                              <G key={`km-${z.etykieta}`}>
                                <Line
                                  x1={z.x}
                                  y1={z.y - m(KM_KRESKA_M)}
                                  x2={z.x}
                                  y2={z.y + m(KM_KRESKA_M)}
                                  stroke="#0F766E"
                                  strokeWidth={m(0.12)}
                                />
                                <SvgText
                                  x={z.x + 6 * inv}
                                  y={z.y - 8 * inv}
                                  fill="#0F766E"
                                  fontSize={11 * inv}
                                  fontWeight="700"
                                >
                                  {z.etykieta}
                                </SvgText>
                              </G>
                            ))}
                            {mapa.maszyny.map((masz, i) => {
                              const isRoz = masz.rodzaj === 'rozkladarka';
                              const w = m(isRoz ? ROZ_W_M : AUTO_W_M);
                              const h = m(isRoz ? ROZ_H_M : AUTO_H_M);
                              return (
                                <G key={`m-${masz.rodzaj}-${i}-${masz.numer ?? 0}`}>
                                  <SvgImage
                                    href={isRoz ? IMG_ROZKLADARKA : IMG_SAMOCHOD}
                                    x={masz.x - w / 2}
                                    y={masz.y - h / 2}
                                    width={w}
                                    height={h}
                                    opacity={0.96}
                                    transform={`rotate(${masz.rotDeg}, ${masz.x}, ${masz.y})`}
                                    pointerEvents="none"
                                  />
                                  {!isRoz && masz.numer != null && (
                                    <SvgText
                                      x={masz.x}
                                      y={masz.y + 4 * inv}
                                      fill="#111827"
                                      fontSize={11 * inv}
                                      fontWeight="800"
                                      textAnchor="middle"
                                      pointerEvents="none"
                                    >
                                      {masz.numer}
                                    </SvgText>
                                  )}
                                  {!isRoz && masz.wpisId && onPressAuto && (
                                    <Circle
                                      cx={masz.x}
                                      cy={masz.y}
                                      r={Math.max(w, h) * 0.55}
                                      fill="transparent"
                                      onPress={() => onPressAuto(masz.wpisId!)}
                                    />
                                  )}
                                </G>
                              );
                            })}
                          </G>
                        </Svg>
                      </Animated.View>
                    </PanGestureHandler>
                  </Animated.View>
                </RotationGestureHandler>
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
      <Text style={styl.hintPod}>
        {blokadaPodgladu
          ? 'Blokada ramki: przesuwanie i zoom w podglądzie (strona nie scrolluje). Odznacz „Ramka”, aby przewinąć w dół.'
          : '1 palec: przesuń · 2 palce / lupka: zoom. Zaznacz „Ramka”, żeby nie scrollować strony.'}
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
  ramkaBlokada: {
    borderColor: '#E8A020',
  },
  klip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
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
  tryb: {
    position: 'absolute',
    top: 8,
    right: 48,
    zIndex: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: 'rgba(219,234,254,0.95)',
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
  blokada: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  checkOn: {
    backgroundColor: '#E8A020',
    borderColor: '#E8A020',
  },
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
  lupkaBtn: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lupkaZnak: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 22 },
  lupkaPct: {
    minWidth: 58,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 4,
  },
  presety: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  preset: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  presetOn: {
    borderColor: '#E8A020',
    backgroundColor: 'rgba(232,160,32,0.18)',
  },
  presetTekst: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  presetTekstOn: { color: '#92400E' },
  hintPod: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 14,
  },
  pusto: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 13,
  },
});
