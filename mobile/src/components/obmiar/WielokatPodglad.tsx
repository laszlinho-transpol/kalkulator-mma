import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
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
import { lancuchKrotszy, wezlyZKonfiguracji } from '../../utils/obmiarFigura';
import { punktNaSciezceUkladania, znacznikiKilometrazuNaObszarze } from '../../utils/obmiarKilometraz';
import {
  ograniczenie, SKALA_MAX, SKALA_MIN, TARCIE_DECAY,
  translacjaPrzyObrocie, translacjaPrzyZoomie,
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
}

function hexDoRgba(hex: string | undefined, alpha: number, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)) return fallback;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function literaRoli(rola: WezelObmiaru['rola']): string {
  if (rola === 'startLewy') return 'SL';
  if (rola === 'startPrawy') return 'SP';
  if (rola === 'koniecLewy') return 'KL';
  if (rola === 'koniecPrawy') return 'KP';
  if (rola === 'start') return 'S';
  if (rola === 'koniec') return 'K';
  if (rola === 'lewa') return 'L';
  if (rola === 'prawa') return 'P';
  return '';
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
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });

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

  const zatrzymajBezwladnosc = () => {
    transX.stopAnimation((v) => { bazaX.current = typeof v === 'number' ? v : bazaX.current; });
    transY.stopAnimation((v) => { bazaY.current = typeof v === 'number' ? v : bazaY.current; });
  };

  useEffect(() => {
    bazaSkali.current = 1;
    bazaX.current = 0;
    bazaY.current = 0;
    bazaRot.current = 0;
    skala.setValue(1);
    transX.setValue(0);
    transY.setValue(0);
    rotacja.setValue(0);
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
      punkty,
      punktyStr: punkty.map((p) => `${p.x},${p.y}`).join(' '),
      clipStr: clipPts.map((p) => `${p.x},${p.y}`).join(' '),
      wezlySvg: wezlyWidok.map((w) => {
        const i = Math.max(0, Math.min(wierzcholki.length - 1, w.idx));
        return { ...w, ...toSvg(wierzcholki[i]) };
      }),
      linieBazy,
      lancuchyOds,
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
    const t = translacjaPrzyZoomie({
      skala0: pinchStart.current.s,
      skala1: s1,
      tx0: pinchStart.current.tx,
      ty0: pinchStart.current.ty,
      f0x: pinchStart.current.f0x,
      f0y: pinchStart.current.f0y,
      f1x: f1.x,
      f1y: f1.y,
    });
    skala.setValue(s1);
    transX.setValue(t.tx);
    transY.setValue(t.ty);
  };
  const onPinchState = (e: any) => {
    const st = e.nativeEvent.state;
    if (st === State.BEGAN) {
      zatrzymajBezwladnosc();
      onDotykZmiana?.(true);
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
      const t = translacjaPrzyZoomie({
        skala0: pinchStart.current.s,
        skala1: bazaSkali.current,
        tx0: pinchStart.current.tx,
        ty0: pinchStart.current.ty,
        f0x: pinchStart.current.f0x,
        f0y: pinchStart.current.f0y,
        f1x: f1.x,
        f1y: f1.y,
      });
      bazaX.current = t.tx;
      bazaY.current = t.ty;
      skala.setValue(bazaSkali.current);
      transX.setValue(t.tx);
      transY.setValue(t.ty);
    }
  };

  const onRot = (e: any) => {
    const d = e.nativeEvent.rotation;
    const f = ognisko(e.nativeEvent);
    const t = translacjaPrzyObrocie({
      tx0: rotStart.current.tx,
      ty0: rotStart.current.ty,
      dRot: d,
      fx: f.x,
      fy: f.y,
    });
    rotacja.setValue(rotStart.current.r + d);
    transX.setValue(t.tx);
    transY.setValue(t.ty);
  };
  const onRotState = (e: any) => {
    if (e.nativeEvent.state === State.BEGAN) {
      zatrzymajBezwladnosc();
      onDotykZmiana?.(true);
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
    }
  };

  const onPan = (e: any) => {
    if (e.nativeEvent.numberOfPointers > 1) return;
    transX.setValue(bazaX.current + e.nativeEvent.translationX);
    transY.setValue(bazaY.current + e.nativeEvent.translationY);
  };
  const onPanState = (e: any) => {
    const st = e.nativeEvent.state;
    if (st === State.BEGAN) {
      zatrzymajBezwladnosc();
      onDotykZmiana?.(true);
    }
    if (e.nativeEvent.oldState !== State.ACTIVE) return;
    if (e.nativeEvent.numberOfPointers > 1) {
      onDotykZmiana?.(false);
      return;
    }
    bazaX.current += e.nativeEvent.translationX;
    bazaY.current += e.nativeEvent.translationY;
    transX.setValue(bazaX.current);
    transY.setValue(bazaY.current);
    const vx = e.nativeEvent.velocityX ?? 0;
    const vy = e.nativeEvent.velocityY ?? 0;
    if (Math.hypot(vx, vy) > 90) {
      Animated.parallel([
        Animated.decay(transX, { velocity: vx, deceleration: TARCIE_DECAY, useNativeDriver: true }),
        Animated.decay(transY, { velocity: vy, deceleration: TARCIE_DECAY, useNativeDriver: true }),
      ]).start(() => {
        transX.stopAnimation((v) => { bazaX.current = typeof v === 'number' ? v : bazaX.current; });
        transY.stopAnimation((v) => { bazaY.current = typeof v === 'number' ? v : bazaY.current; });
        onDotykZmiana?.(false);
      });
    } else {
      onDotykZmiana?.(false);
    }
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

  return (
    <View style={[styl.ramka, { height: wysokosc }]} collapsable={false}>
      {etykieta ? <Text style={styl.etykieta} pointerEvents="none">{etykieta}</Text> : null}
      {trybWyboru ? (
        <Text style={styl.tryb} pointerEvents="none">Wybierz węzeł na rysunku</Text>
      ) : (
        <Text style={styl.hint} pointerEvents="none">1 palec: przesuń · 2 palce: zoom i obrót</Text>
      )}

      <View style={styl.klip} collapsable={false} onLayout={onLayout}>
        <GestureHandlerRootView style={StyleSheet.absoluteFill}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={[panRef, rotRef]}
            onGestureEvent={onPinch}
            onHandlerStateChange={onPinchState}
          >
            <Animated.View style={StyleSheet.absoluteFill}>
              <RotationGestureHandler
                ref={rotRef}
                simultaneousHandlers={[pinchRef, panRef]}
                onGestureEvent={onRot}
                onHandlerStateChange={onRotState}
              >
                <Animated.View style={StyleSheet.absoluteFill}>
                  <PanGestureHandler
                    ref={panRef}
                    simultaneousHandlers={[pinchRef, rotRef]}
                    minPointers={1}
                    maxPointers={2}
                    avgTouches
                    onGestureEvent={onPan}
                    onHandlerStateChange={onPanState}
                  >
                    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
                      <Svg width={rozmiar.w} height={rozmiar.h}>
                        <Defs>
                          <ClipPath id="clipObszar">
                            <Polygon points={mapa.punktyStr} />
                          </ClipPath>
                        </Defs>
                        <G>
                          {mapa.lancuchyOds.filter((l) => l.przerywana).map((l, i) => (
                            <Polyline
                              key={`old-${i}`}
                              points={l.punkty}
                              fill="none"
                              stroke={l.kolor}
                              strokeWidth={1.6}
                              strokeDasharray="5 4"
                              opacity={0.85}
                            />
                          ))}
                          <Polygon
                            points={mapa.punktyStr}
                            fill={fillPlan}
                            stroke={PRIMARY}
                            strokeWidth={2.5}
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
                              strokeWidth={3}
                            />
                          ))}
                          {mapa.linieBazy.map((l, i) => (
                            <Line
                              key={`baza-${i}`}
                              x1={l.x1}
                              y1={l.y1}
                              x2={l.x2}
                              y2={l.y2}
                              stroke={l.kolor}
                              strokeWidth={3.5}
                            />
                          ))}
                          {mapa.punkty.map((p, i) => {
                            const hit = idxPodswietlone.includes(i);
                            return (
                              <Circle
                                key={`v-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r={onPressWezel || trybWyboru ? 11 : 4.5}
                                fill={hit ? PRIMARY : '#fff'}
                                stroke={hit ? '#fff' : PRIMARY}
                                strokeWidth={2}
                                onPress={onPressWezel ? () => onPressWezel(i) : undefined}
                              />
                            );
                          })}
                          {mapa.wezlySvg.map((w) => (
                            <G key={`rola-${w.idx}-${w.rola}`}>
                              <Circle
                                cx={w.x}
                                cy={w.y}
                                r={12}
                                fill={kolorRoli(w.rola)}
                                stroke="#fff"
                                strokeWidth={2}
                                onPress={onPressWezel ? () => onPressWezel(w.idx) : undefined}
                              />
                              <SvgText
                                x={w.x}
                                y={w.y + 3.5}
                                fill="#fff"
                                fontSize={8}
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                {literaRoli(w.rola)}
                              </SvgText>
                            </G>
                          ))}
                          {mapa.kmSvg.map((z) => (
                            <G key={`km-${z.etykieta}`}>
                              <Line x1={z.x} y1={z.y - 9} x2={z.x} y2={z.y + 9} stroke="#0F766E" strokeWidth={1.5} />
                              <SvgText x={z.x + 5} y={z.y - 11} fill="#0F766E" fontSize={10} fontWeight="700">
                                {z.etykieta}
                              </SvgText>
                            </G>
                          ))}
                          {mapa.maszyny.map((m, i) => {
                            const isRoz = m.rodzaj === 'rozkladarka';
                            const w = isRoz ? 58 : 50;
                            const h = isRoz ? 42 : 28;
                            return (
                              <G key={`m-${m.rodzaj}-${i}-${m.numer ?? 0}`}>
                                <SvgImage
                                  href={isRoz ? IMG_ROZKLADARKA : IMG_SAMOCHOD}
                                  x={m.x - w / 2}
                                  y={m.y - h / 2}
                                  width={w}
                                  height={h}
                                  opacity={0.96}
                                  transform={`rotate(${m.rotDeg}, ${m.x}, ${m.y})`}
                                  pointerEvents="none"
                                />
                                {!isRoz && m.numer != null && (
                                  <SvgText
                                    x={m.x}
                                    y={m.y + 4}
                                    fill="#111827"
                                    fontSize={11}
                                    fontWeight="800"
                                    textAnchor="middle"
                                    pointerEvents="none"
                                  >
                                    {m.numer}
                                  </SvgText>
                                )}
                                {!isRoz && m.wpisId && onPressAuto && (
                                  <Circle
                                    cx={m.x}
                                    cy={m.y}
                                    r={16}
                                    fill="transparent"
                                    onPress={() => onPressAuto(m.wpisId!)}
                                  />
                                )}
                              </G>
                            );
                          })}
                          <Rect x={-1} y={-1} width={1} height={1} fill="transparent" />
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
    right: 10,
    zIndex: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: 'rgba(219,234,254,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 4,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  pusto: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 13,
  },
});
