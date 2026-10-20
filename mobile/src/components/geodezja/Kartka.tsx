// Kartka szkicownika: przesuwanie, przybliżanie (dwa palce / kółko myszy), stuknięcia i przeciąganie obiektów.
// Rysunek przychodzi jako prymitywy w pikselach ekranu (src/geodezja/rysunek.ts).

import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { odl, zoomWokol, type Pkt, type Widok } from '../../geodezja/geometria';
import { PAPIER, type Prymityw } from '../../geodezja/rysunek';

const PROG_RUCHU = 8;

interface Props {
  widok: Widok;
  onWidok: (w: Widok) => void;
  prymitywy: Prymityw[];
  szer: number;
  wys: number;
  onRozmiar: (szer: number, wys: number) => void;
  onStukniecie?: (ekran: Pkt) => void;
  /** Początek przeciągania – `true`, gdy palec chwycił obiekt (inaczej przesuwa się kartka). */
  onChwyc?: (ekran: Pkt) => boolean;
  onPrzeciagnij?: (ekran: Pkt) => void;
  onPusc?: (przesunieto: boolean) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function hostHtml(node: unknown): HTMLElement | null {
  if (Platform.OS !== 'web' || !node) return null;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return node;
  const n = node as { getNode?: () => unknown; _nativeNode?: unknown };
  const inner = n.getNode?.() ?? n._nativeNode ?? null;
  return typeof HTMLElement !== 'undefined' && inner instanceof HTMLElement ? inner : null;
}

export function RysunekSvg({ prymitywy }: { prymitywy: Prymityw[] }) {
  return (
    <>
      {prymitywy.map((p, i) => {
        if (p.t === 'sciezka') {
          if (!p.d) return null;
          return (
            <Path
              key={i}
              d={p.d}
              fill={p.wypelnienie ?? 'none'}
              stroke={p.kolor ?? 'none'}
              strokeWidth={p.grubosc ?? 1}
              strokeDasharray={p.kreska}
              opacity={p.krycie}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        }
        if (p.t === 'kolo') {
          return <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.wypelnienie} stroke={p.kolor ?? 'none'} strokeWidth={p.grubosc ?? 1} strokeDasharray={p.kreska} />;
        }
        const wspolne = {
          x: p.x,
          y: p.y,
          fontSize: p.rozmiar,
          fontWeight: p.pogrubiony ? ('700' as const) : ('400' as const),
          fontStyle: p.kursywa ? ('italic' as const) : ('normal' as const),
          textAnchor: p.kotwica ?? ('start' as const),
          transform: p.obrot ? `rotate(${p.obrot} ${p.x} ${p.y})` : undefined,
        };
        return (
          <React.Fragment key={i}>
            {p.halo ? <SvgText {...wspolne} fill="none" stroke={PAPIER.tlo} strokeWidth={3.5} strokeLinejoin="round">{p.tekst}</SvgText> : null}
            <SvgText {...wspolne} fill={p.kolor}>{p.tekst}</SvgText>
          </React.Fragment>
        );
      })}
    </>
  );
}

export function Kartka({
  widok, onWidok, prymitywy, szer, wys, onRozmiar, onStukniecie, onChwyc, onPrzeciagnij, onPusc, style, accessibilityLabel,
}: Props) {
  const ref = useRef<View>(null);
  const poczatekOkna = useRef<Pkt>({ x: 0, y: 0 });
  const props = useRef({ widok, onWidok, onStukniecie, onChwyc, onPrzeciagnij, onPusc });
  props.current = { widok, onWidok, onStukniecie, onChwyc, onPrzeciagnij, onPusc };
  const gest = useRef({
    tryb: 'brak' as 'brak' | 'kartka' | 'obiekt' | 'szczypanie',
    start: { x: 0, y: 0 },
    widok0: widok,
    ruch: false,
    szczyp0: { d: 1, sr: { x: 0, y: 0 }, widok: widok },
  });

  const zmierzOkno = () => {
    const el = hostHtml(ref.current);
    if (el) {
      const r = el.getBoundingClientRect();
      poczatekOkna.current = { x: r.left + (window.scrollX || 0), y: r.top + (window.scrollY || 0) };
      return;
    }
    ref.current?.measureInWindow?.((x, y) => {
      poczatekOkna.current = { x, y };
    });
  };

  const lokalnie = (t: { pageX: number; pageY: number }): Pkt => ({
    x: t.pageX - poczatekOkna.current.x,
    y: t.pageY - poczatekOkna.current.y,
  });

  const dotyki = (e: GestureResponderEvent): Pkt[] => {
    const lista = (e.nativeEvent.touches ?? []) as unknown as { pageX: number; pageY: number }[];
    if (lista.length > 0) return Array.from(lista).map(lokalnie);
    return [lokalnie(e.nativeEvent)];
  };

  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        if (Platform.OS === 'web') zmierzOkno();
        const [p] = dotyki(e);
        const g = gest.current;
        g.start = p;
        g.widok0 = props.current.widok;
        g.ruch = false;
        g.tryb = props.current.onChwyc?.(p) ? 'obiekt' : 'kartka';
      },
      onPanResponderMove: (e) => {
        const g = gest.current;
        const t = dotyki(e);
        if (t.length >= 2) {
          const d = Math.max(odl(t[0], t[1]), 1);
          const sr = { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };
          if (g.tryb !== 'szczypanie') {
            if (g.tryb === 'obiekt') props.current.onPusc?.(g.ruch);
            g.tryb = 'szczypanie';
            g.szczyp0 = { d, sr, widok: props.current.widok };
          }
          g.ruch = true;
          const w0 = g.szczyp0.widok;
          const z = zoomWokol(w0, (w0.s * d) / g.szczyp0.d, g.szczyp0.sr);
          props.current.onWidok({ s: z.s, tx: z.tx + sr.x - g.szczyp0.sr.x, ty: z.ty + sr.y - g.szczyp0.sr.y });
          return;
        }
        const p = t[0];
        if (!g.ruch && odl(p, g.start) < PROG_RUCHU) return;
        g.ruch = true;
        if (g.tryb === 'obiekt') props.current.onPrzeciagnij?.(p);
        else if (g.tryb === 'kartka') {
          props.current.onWidok({ s: g.widok0.s, tx: g.widok0.tx + p.x - g.start.x, ty: g.widok0.ty + p.y - g.start.y });
        }
      },
      onPanResponderRelease: () => {
        const g = gest.current;
        if (!g.ruch && g.tryb !== 'szczypanie') {
          if (g.tryb === 'obiekt') props.current.onPusc?.(false);
          props.current.onStukniecie?.(g.start);
        } else if (g.tryb === 'obiekt') {
          props.current.onPusc?.(true);
        }
        g.tryb = 'brak';
      },
      onPanResponderTerminate: () => {
        const g = gest.current;
        if (g.tryb === 'obiekt') props.current.onPusc?.(g.ruch);
        g.tryb = 'brak';
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const el = hostHtml(ref.current);
    if (!el) return undefined;
    const kolko = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const w = props.current.widok;
      const f = { x: e.clientX - r.left, y: e.clientY - r.top };
      props.current.onWidok(zoomWokol(w, w.s * (e.deltaY > 0 ? 1 / 1.25 : 1.25), f));
    };
    el.addEventListener('wheel', kolko, { passive: false });
    return () => el.removeEventListener('wheel', kolko);
  }, []);

  return (
    <View
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      style={[styles.kartka, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'crosshair' } as object) : null, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        zmierzOkno();
        if (Math.round(width) !== szer || Math.round(height) !== wys) onRozmiar(Math.round(width), Math.round(height));
      }}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={szer} height={wys}>
          <Rect x={0} y={0} width={szer} height={wys} fill={PAPIER.tlo} />
          <RysunekSvg prymitywy={prymitywy} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kartka: { flex: 1, overflow: 'hidden', backgroundColor: PAPIER.tlo },
});
