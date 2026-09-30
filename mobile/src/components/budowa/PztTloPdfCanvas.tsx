import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { BuforTlaPdf } from '../../utils/tloPdfPamiec';
import { otworzStronePdf, rasterujFragmentStrony, type PdfjsOpcjonalnaTresc, type PdfjsPage } from '../../utils/pdfjsWeb';
import { widocznyFragmentPdf } from '../../utils/tloPztGeom';

export interface ObrazTlaPdf {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  bufor: BuforTlaPdf | null;
  widoczne: boolean;
  cx: number;
  cy: number;
  skalaFit: number;
  szer: number;
  wys: number;
  skala: number;
  tx: number;
  ty: number;
  onObraz: (obraz: ObrazTlaPdf | null) => void;
  onBlad?: (komunikat: string | null) => void;
}

/**
 * Raster tła PDF → obraz wkładany do SVG (ten sam sposób co Obmiar).
 * Wycinek widoku w wysokiej rozdzielczości, żeby kreski CAD (pikiety, budynki) były widoczne.
 */
export function PztTloPdfCanvas({
  bufor, widoczne, cx, cy, skalaFit, szer, wys, skala, tx, ty, onObraz, onBlad,
}: Props) {
  const pageRef = useRef<{
    klucz: string;
    page: PdfjsPage;
    pageW: number;
    pageH: number;
    oc: PdfjsOpcjonalnaTresc | null;
  } | null>(null);
  const uriRef = useRef<string | null>(null);
  const genRef = useRef(0);

  useEffect(() => () => {
    if (uriRef.current?.startsWith('blob:')) URL.revokeObjectURL(uriRef.current);
    uriRef.current = null;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !bufor || !widoczne || szer < 8 || wys < 8) {
      onObraz(null);
      onBlad?.(null);
      return undefined;
    }
    let anulowane = false;
    const gen = ++genRef.current;

    const odp = (uri: string) => {
      if (uriRef.current?.startsWith('blob:') && uriRef.current !== uri) {
        URL.revokeObjectURL(uriRef.current);
      }
      uriRef.current = uri;
    };

    const rysuj = async () => {
      try {
        const klucz = `${bufor.nazwa}:${bufor.data.byteLength}:${bufor.strona}`;
        if (bufor.data.byteLength < 32) {
          throw new Error('Bufor PDF jest pusty – wgraj plik ponownie („+ Tło PDF”).');
        }
        if (!pageRef.current || pageRef.current.klucz !== klucz) {
          const otw = await otworzStronePdf(bufor.data, bufor.strona);
          pageRef.current = {
            klucz,
            page: otw.page,
            pageW: otw.pageW || bufor.pageW,
            pageH: otw.pageH || bufor.pageH,
            oc: otw.oc,
          };
        }
        if (anulowane || gen !== genRef.current) return;
        const sesja = pageRef.current;
        const pageW = sesja.pageW || bufor.pageW;
        const pageH = sesja.pageH || bufor.pageH;
        const frag = widocznyFragmentPdf({
          pageW, pageH, cx, cy, skalaFit, skala, tx, ty, szer, wys,
        });
        if (!frag) {
          onObraz(null);
          onBlad?.(null);
          return;
        }
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const sfit = Math.max(skala * skalaFit, 1e-6);
        const { uri } = await rasterujFragmentStrony(sesja.page, {
          pageW,
          pageH,
          x0: frag.pdf.x0,
          y0: frag.pdf.y0,
          x1: frag.pdf.x1,
          y1: frag.pdf.y1,
          pxNaPunkt: Math.max(sfit * dpr * 2, 2.5),
          oc: sesja.oc,
        });
        if (anulowane || gen !== genRef.current) {
          if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
          return;
        }
        odp(uri);
        onObraz({
          uri,
          x: szer / 2 + (frag.pdf.x0 - cx) * skalaFit,
          y: wys / 2 - (frag.pdf.y1 - cy) * skalaFit,
          width: (frag.pdf.x1 - frag.pdf.x0) * skalaFit,
          height: (frag.pdf.y1 - frag.pdf.y0) * skalaFit,
        });
        onBlad?.(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(msg)) return;
        onObraz(null);
        onBlad?.(msg || 'Nie udało się narysować PDF.');
      }
    };

    const t = setTimeout(() => { void rysuj(); }, 40);
    return () => {
      anulowane = true;
      clearTimeout(t);
    };
  }, [bufor, widoczne, cx, cy, skalaFit, szer, wys, skala, tx, ty, onObraz, onBlad]);

  return null;
}
