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
  Circle, G, Image as SvgImage, Line, Polygon, Polyline, Rect, Text as SvgText,
} from 'react-native-svg';
import type { ObszarObmiaru, Punkt2D, SkalaPzt, TloPztObmiaru, TrybWyboruWezla, WezelObmiaru } from '../../types';
import { bboxWielokata, metryNaPunktPdf } from '../../utils/obmiarGeometry';
import { lancuchKrotszy, osFigury, przekrojPoprzeczny, wezlyZKonfiguracji, wielokatUlozony } from '../../utils/obmiarFigura';
import { punktNaSciezceUkladania, znacznikiKilometrazuNaObszarze } from '../../utils/obmiarKilometraz';
import { dlugoscUkladaniaObszaru } from '../../utils/obmiarLive';
import { prostokatTlaPdf } from '../../utils/tloPztGeom';
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
/** Ułożony odcinek – ciemny szary (nie zielony) */
const FILL_ULOZONE = 'rgba(55, 65, 81, 0.72)';
const KOLOR_START = '#2563EB';
const KOLOR_KONIEC = '#DC2626';
const KOLOR_ODS = '#0F766E';
const KOLOR_SZARY = '#9CA3AF';

/** Rozmiary w metrach terenu – skalują się razem z drogą (jak w PDF). */
const WEZEL_R_M = 0.32;
const OBRYS_M = 0.16;
const BAZA_M = 0.22;
const KM_KRESKA_M = 0.9;

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
  tloPzt?: TloPztObmiaru | null;
  skalaPzt?: SkalaPzt;
  onTloWidoczne?: (v: boolean) => void;
}

function hexDoRgba(hex: string | undefined, alpha: number, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)) return fallback;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function headingDoSvgDeg(headingRad: number): number {
  const headingSvg = Math.atan2(-Math.sin(headingRad), Math.cos(headingRad));
  return (headingSvg * 180) / Math.PI;
}

function kolorRoli(rola: WezelObmiaru['rola']): string {
  if (rola === 'startLewy' || rola === 'startPrawy' || rola === 'start') return KOLOR_START;
  if (rola === 'koniecLewy' || rola === 'koniecPrawy' || rola === 'koniec') return KOLOR_KONIEC;
  if (rola === 'lewa' || rola === 'prawa') return KOLOR_ODS;
  return PRIMARY;
}

/** Widok z góry – +X = przód (kierunek układania). Szerokość = odległość L–P. */
function SvgRozkladarka({ szer, dl }: { szer: number; dl: number }) {
  const sx = Math.max(szer, 2);
  const dx = Math.max(dl, 2);
  const sw = Math.max(sx * 0.035, 0.4);
  return (
    <G pointerEvents="none">
      <Rect x={-dx / 2} y={-sx / 2} width={dx} height={sx} rx={sx * 0.08} fill="#D4A017" stroke="#5C4A0A" strokeWidth={sw} />
      <Rect x={-dx * 0.38} y={-sx * 0.32} width={dx * 0.55} height={sx * 0.64} rx={sx * 0.06} fill="#B8860B" />
      <Rect x={-dx / 2 - dx * 0.05} y={-sx * 0.52} width={dx * 0.16} height={sx * 1.04} rx={sx * 0.04} fill="#6B5420" stroke="#3F3110" strokeWidth={sw} />
      <Rect x={-dx * 0.32} y={-sx / 2} width={dx * 0.68} height={sx * 0.12} fill="#374151" />
      <Rect x={-dx * 0.32} y={sx / 2 - sx * 0.12} width={dx * 0.68} height={sx * 0.12} fill="#374151" />
    </G>
  );
}

function SvgSamochod({ szer, dl, numer }: { szer: number; dl: number; numer?: number }) {
  const sx = Math.max(szer, 2);
  const dx = Math.max(dl, 2);
  const sw = Math.max(sx * 0.035, 0.4);
  return (
    <G pointerEvents="none">
      <Rect x={-dx / 2} y={-sx / 2} width={dx} height={sx} rx={sx * 0.1} fill="#E8B923" stroke="#5C4A0A" strokeWidth={sw} />
      <Rect x={-dx / 2 + dx * 0.06} y={-sx * 0.36} width={dx * 0.55} height={sx * 0.72} fill="#C9A227" />
      <Rect x={dx / 2 - dx * 0.32} y={-sx * 0.42} width={dx * 0.28} height={sx * 0.84} rx={sx * 0.08} fill="#8B6914" />
      <Rect x={dx / 2 - dx * 0.22} y={-sx * 0.2} width={dx * 0.12} height={sx * 0.26} fill="#93C5FD" />
      {numer != null ? (
        <SvgText
          x={-dx * 0.06}
          y={sx * 0.14}
          fill="#111827"
          fontSize={sx * 0.42}
          fontWeight="800"
          textAnchor="middle"
        >
          {numer}
        </SvgText>
      ) : null}
    </G>
  );
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
  tloPzt,
  skalaPzt,
  onTloWidoczne,
}: Props) {
  const [rozmiar, setRozmiar] = useState({ w: 320, h: wysokosc });
  const [skalaPct, setSkalaPct] = useState(100);
  const [xform, setXform] = useState({ s: 1, tx: 0, ty: 0, rot: 0 });

  const bazaSkali = useRef(1);
  const bazaX = useRef(0);
  const bazaY = useRef(0);
  const bazaRot = useRef(0);
  const pinchStart = useRef({ s: 1, tx: 0, ty: 0, f0x: 0, f0y: 0 });
  const rotStart = useRef({ r: 0, tx: 0, ty: 0, fx: 0, fy: 0 });

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

  const ustawWidok = (s: number, tx: number, ty: number, rot: number) => {
    setXform({ s, tx, ty, rot });
    setSkalaPct(Math.round(s * 100));
  };

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
    ustawWidok(s1, t.x, t.y, bazaRot.current);
  };

  const resetWidoku = () => {
    bazaSkali.current = 1;
    bazaX.current = 0;
    bazaY.current = 0;
    bazaRot.current = 0;
    ustawWidok(1, 0, 0, 0);
    zwolnijDotyk();
  };

  useEffect(() => {
    resetWidoku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKlucz]);

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
    const prog = Math.max(0, Math.min(1, postepLive));
    const ulozonyStr = obszar
      ? wielokatUlozony(obszar, prog).map((p) => {
        const s = toSvg(p);
        return `${s.x},${s.y}`;
      }).join(' ')
      : '';

    const linieKrawedznika = (obszar?.krawedzniki ?? []).map((kr) => ({
      punkty: kr.wierzcholkiM.map((p) => {
        const s = toSvg(p);
        return `${s.x},${s.y}`;
      }).join(' '),
      odOsi: kr.polozenie === 'odOsi',
    }));
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
      const idxLanc = (o.idxP != null && o.idxK != null)
        ? lancuchKrotszy(wierzcholki.length, o.idxP, o.idxK)
        : [];
      if (o.zastosowana && o.wierzcholkiPrzed && o.wierzcholkiPrzed.length >= 2 && idxLanc.length >= 2) {
        lancuchyOds.push({
          punkty: idxLanc.map((i) => {
            const p = o.wierzcholkiPrzed![Math.max(0, Math.min(o.wierzcholkiPrzed!.length - 1, i))];
            const s = toSvg(p);
            return `${s.x},${s.y}`;
          }).join(' '),
          kolor: KOLOR_SZARY,
          przerywana: true,
        });
      } else if (o.zastosowana && o.wierzcholkiPrzed && o.wierzcholkiPrzed.length >= 2) {
        lancuchyOds.push({
          punkty: o.wierzcholkiPrzed.map((p) => {
            const s = toSvg(p);
            return `${s.x},${s.y}`;
          }).join(' '),
          kolor: KOLOR_SZARY,
          przerywana: true,
        });
      }
      if (idxLanc.length >= 2) {
        lancuchyOds.push({
          punkty: idxLanc.map((i) => {
            const s = toSvg(wierzcholki[i]);
            return `${s.x},${s.y}`;
          }).join(' '),
          kolor: PRIMARY,
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
      szerPx: number;
      dlPx: number;
      numer?: number;
      wpisId?: string;
    };
    const maszyny: Maszyna[] = [];
    const moznaMaszyny = !!(pokazMaszyny && obszar && (obszar.wpisyWz?.length ?? 0) > 0);
    if (moznaMaszyny && obszar) {
      const dlOs = Math.max(dlugoscUkladaniaObszaru(obszar), 0.01);
      const poloz = (metry: number, rodzaj: Maszyna['rodzaj'], extra?: Partial<Maszyna>) => {
        const t = Math.max(0, Math.min(0.999, metry / dlOs));
        const pr = przekrojPoprzeczny(obszar, t);
        const pos = pr.ok
          ? { punkt: pr.srodek, headingRad: pr.headingRad, ok: true as const }
          : punktNaSciezceUkladania(obszar, metry);
        if (!pos.ok) return;
        const s = toSvg(pos.punkt);
        const szerM = pr.ok ? Math.max(pr.szerokoscM, 2.2) : 4;
        const szerPx = szerM * skalaFit * 0.88;
        const dlPx = szerPx * (rodzaj === 'rozkladarka' ? 1.25 : 1.7);
        maszyny.push({
          rodzaj, x: s.x, y: s.y,
          rotDeg: headingDoSvgDeg(pos.headingRad),
          szerPx, dlPx, ...extra,
        });
      };
      const lista = obszar.wpisyWz ?? [];
      lista.forEach((wpis, i) => {
        const ost = i === lista.length - 1;
        const metry = ost ? wpis.przejechaneMetry + Math.min(8, dlOs * 0.02) : wpis.przejechaneMetry;
        poloz(Math.min(metry, dlOs * 0.995), 'auto', { numer: wpis.numer, wpisId: wpis.id });
      });
      poloz(lista[lista.length - 1].przejechaneMetry, 'rozkladarka');
    }

    const tloWidoczne = !!(tloPzt && tloPzt.widoczne !== false && tloPzt.obrazUri && skalaPzt);
    const tloRect = tloWidoczne
      ? prostokatTlaPdf({
        pageW: tloPzt!.pageW,
        pageH: tloPzt!.pageH,
        k: metryNaPunktPdf(skalaPzt),
        cx,
        cy,
        skalaFit,
        w: rozmiar.w,
        h: rozmiar.h,
      })
      : null;

    return {
      skalaFit,
      punkty,
      punktyStr: punkty.map((p) => `${p.x},${p.y}`).join(' '),
      ulozonyStr,
      wezlySvg: wezlyWidok.map((w) => {
        const i = Math.max(0, Math.min(wierzcholki.length - 1, w.idx));
        return { ...w, ...toSvg(wierzcholki[i]) };
      }),
      linieBazy,
      linieKrawedznika,
      lancuchyOds,
      osSvg,
      kmSvg,
      maszyny,
      tloRect,
      tloUri: tloWidoczne ? tloPzt!.obrazUri : null,
      tloOpacity: tloPzt?.opacity ?? 0.5,
      tloOdwrocY: !!tloPzt?.odwrocY,
    };
  }, [wierzcholki, wezlyWidok, rozmiar.w, rozmiar.h, postepLive, obszar, pokazMaszyny, tloPzt, skalaPzt]);

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
    ustawWidok(s1, t.x, t.y, bazaRot.current);
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
      ustawWidok(bazaSkali.current, t.x, t.y, bazaRot.current);
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
    ustawWidok(bazaSkali.current, t.x, t.y, rotStart.current.r + d);
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
      const d = e.nativeEvent.rotation ?? 0;
      bazaRot.current = rotStart.current.r + d;
      const f = ognisko(e.nativeEvent);
      const t0 = translacjaPrzyObrocie({
        tx0: rotStart.current.tx,
        ty0: rotStart.current.ty,
        dRot: d,
        fx: f.x,
        fy: f.y,
      });
      const t = clampTrans(t0.tx, t0.ty);
      bazaX.current = t.x;
      bazaY.current = t.y;
      ustawWidok(bazaSkali.current, t.x, t.y, bazaRot.current);
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
    ustawWidok(bazaSkali.current, t.x, t.y, bazaRot.current);
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
    ustawWidok(bazaSkali.current, t.x, t.y, bazaRot.current);
    zwolnijDotyk();
  };

  if (!mapa) {
    return (
      <View style={[styl.ramka, { height: wysokosc }]}>
        <Text style={styl.pusto}>Brak geometrii</Text>
      </View>
    );
  }

  const fillPlan = hexDoRgba(kolorWypelnienia, mapa.tloUri ? 0.22 : 0.38, mapa.tloUri ? 'rgba(232, 160, 32, 0.22)' : FILL_PLAN);
  const m = (metry: number) => metry * mapa.skalaFit;
  const wezelR = m(WEZEL_R_M);
  const wezelHit = Math.max(wezelR * 2.2, 14 / Math.max(xform.s, 0.15));
  const panOffset = blokadaPodgladu || trybWyboru ? 2 : 14;
  const gXform = `translate(${rozmiar.w / 2 + xform.tx},${rozmiar.h / 2 + xform.ty}) rotate(${(xform.rot * 180) / Math.PI}) scale(${xform.s}) translate(${-rozmiar.w / 2},${-rozmiar.h / 2})`;

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
          {tloPzt ? (
            <TouchableOpacity
              style={styl.blokada}
              onPress={() => onTloWidoczne?.(tloPzt.widoczne === false)}
              accessibilityLabel="Tło PZT"
            >
              <View style={[styl.check, tloPzt.widoczne !== false && styl.checkOn]}>
                {tloPzt.widoczne !== false ? <Text style={styl.checkTekst}>✓</Text> : null}
              </View>
              <Text style={styl.blokadaTekst}>Tło</Text>
            </TouchableOpacity>
          ) : null}
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

        <View style={styl.klip} collapsable={false} onLayout={onLayout}>
          <GestureHandlerRootView style={StyleSheet.absoluteFill}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={[panRef, rotRef]}
              onGestureEvent={onPinch}
              onHandlerStateChange={onPinchState}
            >
              <Animated.View style={StyleSheet.absoluteFill} collapsable={false}>
                <RotationGestureHandler
                  ref={rotRef}
                  simultaneousHandlers={[pinchRef, panRef]}
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
                      activeOffsetX={[-panOffset, panOffset]}
                      activeOffsetY={[-panOffset, panOffset]}
                      onGestureEvent={onPan}
                      onHandlerStateChange={onPanState}
                    >
                      <Animated.View style={StyleSheet.absoluteFill} collapsable={false}>
                        <Svg width={rozmiar.w} height={rozmiar.h}>
                          <Rect
                            x={0}
                            y={0}
                            width={rozmiar.w}
                            height={rozmiar.h}
                            fill="#F8FAFC"
                          />
                          <G transform={gXform}>
                            {mapa.tloUri && mapa.tloRect ? (
                              <G transform={mapa.tloOdwrocY
                                ? `translate(${mapa.tloRect.x}, ${mapa.tloRect.y + mapa.tloRect.height}) scale(1,-1)`
                                : undefined}
                              >
                                <SvgImage
                                  href={{ uri: mapa.tloUri }}
                                  x={mapa.tloOdwrocY ? 0 : mapa.tloRect.x}
                                  y={mapa.tloOdwrocY ? 0 : mapa.tloRect.y}
                                  width={mapa.tloRect.width}
                                  height={mapa.tloRect.height}
                                  opacity={mapa.tloOpacity}
                                  preserveAspectRatio="none"
                                />
                              </G>
                            ) : null}
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
                            {mapa.linieKrawedznika.map((l, i) => (
                              <Polyline
                                key={`kr-${i}`}
                                points={l.punkty}
                                fill="none"
                                stroke="#DC2626"
                                strokeWidth={m(OBRYS_M * (l.odOsi ? 1.35 : 1.1))}
                                strokeDasharray={l.odOsi ? `${m(0.55)} ${m(0.35)}` : undefined}
                                opacity={0.95}
                              />
                            ))}
                            {mapa.ulozonyStr ? (
                              <Polygon points={mapa.ulozonyStr} fill={FILL_ULOZONE} />
                            ) : null}
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
                                <G key={`v-${i}`} pointerEvents="none">
                                  <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={wezelHit}
                                    fill="transparent"
                                  />
                                  <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={hit || trybWyboru ? wezelR * 1.35 : wezelR}
                                    fill={fill}
                                    stroke={rola ? '#fff' : PRIMARY}
                                    strokeWidth={m(0.08)}
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
                                  x={z.x + 6 / xform.s}
                                  y={z.y - 8 / xform.s}
                                  fill="#0F766E"
                                  fontSize={11 / xform.s}
                                  fontWeight="700"
                                >
                                  {z.etykieta}
                                </SvgText>
                              </G>
                            ))}
                            {mapa.maszyny.map((masz, i) => (
                              <G
                                key={`m-${masz.rodzaj}-${i}-${masz.numer ?? 0}`}
                                transform={`translate(${masz.x},${masz.y}) rotate(${masz.rotDeg})`}
                              >
                                {masz.rodzaj === 'rozkladarka'
                                  ? <SvgRozkladarka szer={masz.szerPx} dl={masz.dlPx} />
                                  : <SvgSamochod szer={masz.szerPx} dl={masz.dlPx} numer={masz.numer} />}
                                {masz.wpisId && onPressAuto ? (
                                  <Circle
                                    cx={0}
                                    cy={0}
                                    r={Math.max(masz.szerPx, masz.dlPx) * 0.55}
                                    fill="transparent"
                                    onPress={() => onPressAuto(masz.wpisId!)}
                                  />
                                ) : null}
                              </G>
                            ))}
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
  blokadaKol: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 6,
    gap: 6,
  },
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
