import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Svg, { Circle, ClipPath, Defs, G, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type { Punkt2D, WezelObmiaru } from '../../types';
import { bboxWielokata } from '../../utils/obmiarGeometry';

const PRIMARY = '#E8A020';
const FILL_PLAN = 'rgba(232, 160, 32, 0.28)';
const FILL_LIVE = 'rgba(34, 197, 94, 0.55)';

interface Props {
  wierzcholki: Punkt2D[];
  wezly?: WezelObmiaru[];
  kolorWypelnienia?: string;
  postepLive?: number;
  wysokosc?: number;
  etykieta?: string;
  resetKlucz?: string;
  onPressWezel?: (idx: number) => void;
}

function hexDoRgba(hex: string | undefined, alpha: number, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)) return fallback;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function literaRoli(rola: WezelObmiaru['rola']): string {
  if (rola === 'start') return 'S';
  if (rola === 'koniec') return 'K';
  if (rola === 'lewa') return 'L';
  if (rola === 'prawa') return 'P';
  return '';
}

export function WielokatPodglad({
  wierzcholki,
  wezly = [],
  kolorWypelnienia,
  postepLive = 0,
  wysokosc = 280,
  etykieta,
  resetKlucz,
  onPressWezel,
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });

  const bazaSkali = useRef(1);
  const bazaX = useRef(0);
  const bazaY = useRef(0);
  const bazaRot = useRef(0);

  const skala = useRef(new Animated.Value(1)).current;
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const rotacja = useRef(new Animated.Value(0)).current;

  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const rotRef = useRef(null);

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

  const mapa = useMemo(() => {
    if (wierzcholki.length < 3) return null;
    const bb = bboxWielokata(wierzcholki);
    const pad = 32;
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
    const start = wezly.find((w) => w.rola === 'start');
    const koniec = wezly.find((w) => w.rola === 'koniec');
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
    return {
      punkty,
      punktyStr: punkty.map((p) => `${p.x},${p.y}`).join(' '),
      clipStr: clipPts.map((p) => `${p.x},${p.y}`).join(' '),
      wezlySvg: wezly
        .filter((w) => w.rola !== 'zwykly')
        .map((w) => {
          const i = Math.max(0, Math.min(wierzcholki.length - 1, w.idx));
          return { ...w, ...toSvg(wierzcholki[i]) };
        }),
    };
  }, [wierzcholki, wezly, rozmiar.w, rozmiar.h, postepLive]);

  const onPinch = (e: any) => {
    skala.setValue(Math.max(0.35, Math.min(12, bazaSkali.current * e.nativeEvent.scale)));
  };
  const onPinchEnd = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      bazaSkali.current = Math.max(0.35, Math.min(12, bazaSkali.current * e.nativeEvent.scale));
      skala.setValue(bazaSkali.current);
    }
  };
  const onPan = (e: any) => {
    transX.setValue(bazaX.current + e.nativeEvent.translationX);
    transY.setValue(bazaY.current + e.nativeEvent.translationY);
  };
  const onPanEnd = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      bazaX.current += e.nativeEvent.translationX;
      bazaY.current += e.nativeEvent.translationY;
      transX.setValue(bazaX.current);
      transY.setValue(bazaY.current);
    }
  };
  const onRot = (e: any) => {
    rotacja.setValue(bazaRot.current + e.nativeEvent.rotation);
  };
  const onRotEnd = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      bazaRot.current += e.nativeEvent.rotation;
      rotacja.setValue(bazaRot.current);
    }
  };

  if (!mapa) {
    return (
      <View style={[styl.pudelko, { height: wysokosc }]}>
        <Text style={styl.pusto}>Brak geometrii</Text>
      </View>
    );
  }

  const fillPlan = hexDoRgba(kolorWypelnienia, 0.38, FILL_PLAN);
  const animStyle = {
    transform: [
      { translateX: transX },
      { translateY: transY },
      { scale: skala },
      {
        rotate: rotacja.interpolate({
          inputRange: [-Math.PI * 4, Math.PI * 4],
          outputRange: ['-720deg', '720deg'],
        }),
      },
    ],
  };

  return (
    <GestureHandlerRootView style={[styl.pudelko, { height: wysokosc }]} onLayout={onLayout}>
      {etykieta ? <Text style={styl.etykieta}>{etykieta}</Text> : null}
      <Text style={styl.hint}>2 palce: zoom + obrot · 1 palec: przesun</Text>

      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={[panRef, rotRef]}
        onGestureEvent={onPinch}
        onHandlerStateChange={onPinchEnd}
      >
        <Animated.View style={StyleSheet.absoluteFill}>
          <RotationGestureHandler
            ref={rotRef}
            simultaneousHandlers={[pinchRef, panRef]}
            onGestureEvent={onRot}
            onHandlerStateChange={onRotEnd}
          >
            <Animated.View style={StyleSheet.absoluteFill}>
              <PanGestureHandler
                ref={panRef}
                simultaneousHandlers={[pinchRef, rotRef]}
                minPointers={1}
                maxPointers={2}
                avgTouches
                onGestureEvent={onPan}
                onHandlerStateChange={onPanEnd}
              >
                <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
                  <Svg width={rozmiar.w} height={rozmiar.h}>
                    <Defs>
                      <ClipPath id="clipObszar">
                        <Polygon points={mapa.punktyStr} />
                      </ClipPath>
                    </Defs>
                    <G>
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
                      {mapa.punkty.map((p, i) => (
                        <Circle
                          key={`v-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={onPressWezel ? 10 : 4.5}
                          fill="#fff"
                          stroke={PRIMARY}
                          strokeWidth={2}
                          onPress={onPressWezel ? () => onPressWezel(i) : undefined}
                        />
                      ))}
                      {mapa.wezlySvg.map((w) => (
                        <G key={`rola-${w.idx}-${w.rola}`}>
                          <Circle
                            cx={w.x}
                            cy={w.y}
                            r={11}
                            fill={PRIMARY}
                            stroke="#fff"
                            strokeWidth={2}
                            onPress={onPressWezel ? () => onPressWezel(w.idx) : undefined}
                          />
                          <SvgText
                            x={w.x}
                            y={w.y + 3.5}
                            fill="#fff"
                            fontSize={9}
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {literaRoli(w.rola)}
                          </SvgText>
                        </G>
                      ))}
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
  );
}

const styl = StyleSheet.create({
  pudelko: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  etykieta: {
    position: 'absolute',
    top: 8,
    left: 10,
    zIndex: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 2,
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
