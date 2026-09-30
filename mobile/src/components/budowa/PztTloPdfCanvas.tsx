import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { BuforTlaPdf } from '../../utils/tloPdfPamiec';
import { zaladujPdfjs, type PdfjsPage } from '../../utils/pdfjsWeb';

interface Props {
  bufor: BuforTlaPdf | null;
  widoczne: boolean;
  opacity: number;
  odwrocY?: boolean;
  cx: number;
  cy: number;
  skalaFit: number;
  szer: number;
  wys: number;
  skala: number;
  tx: number;
  ty: number;
}

/**
 * Tło PDF rysowane w rozdzielczości ekranu (nie skalowany JPEG).
 * Przy zoomie pdf.js renderuje ponownie widoczny wycinek – kreski zostają ostre.
 */
export function PztTloPdfCanvas({
  bufor, widoczne, opacity, odwrocY, cx, cy, skalaFit, szer, wys, skala, tx, ty,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);
  const pageRef = useRef<PdfjsPage | null>(null);
  const kluczDoc = useRef<string>('');

  useEffect(() => {
    if (Platform.OS !== 'web' || !bufor || !widoczne || szer < 8 || wys < 8) return undefined;
    let anulowane = false;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const rysuj = async () => {
      try {
        const pdfjs = await zaladujPdfjs();
        const klucz = `${bufor.nazwa}:${bufor.data.byteLength}:${bufor.strona}`;
        if (kluczDoc.current !== klucz) {
          const doc = await pdfjs.getDocument({ data: bufor.data, verbosity: 0 }).promise;
          const p = Math.max(1, Math.min(doc.numPages, bufor.strona));
          pageRef.current = await doc.getPage(p);
          kluczDoc.current = klucz;
        }
        const page = pageRef.current;
        if (!page || anulowane) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.max(1, Math.round(szer * dpr));
        canvas.height = Math.max(1, Math.round(wys * dpr));
        canvas.style.width = `${szer}px`;
        canvas.style.height = `${wys}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cssScale = skala * skalaFit;
        const scale = cssScale * dpr;
        const pageH = bufor.pageH;
        const offsetX = (szer / 2 + tx) * dpr - scale * cx;
        const offsetY = odwrocY
          ? (wys / 2 + ty) * dpr - scale * cy
          : (wys / 2 + ty) * dpr + scale * cy - scale * pageH;

        taskRef.current?.cancel();
        const viewport = page.getViewport({
          scale,
          offsetX,
          offsetY,
          dontFlip: !!odwrocY,
        });
        const task = page.render({
          canvasContext: ctx,
          viewport,
          intent: 'display',
        });
        taskRef.current = task;
        await task.promise;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(msg)) return;
      }
    };

    const t = setTimeout(() => { void rysuj(); }, 40);
    return () => {
      anulowane = true;
      clearTimeout(t);
      taskRef.current?.cancel();
    };
  }, [bufor, widoczne, opacity, odwrocY, cx, cy, skalaFit, szer, wys, skala, tx, ty]);

  if (Platform.OS !== 'web' || !bufor || !widoczne) return null;

  return React.createElement('canvas', {
    ref: (n: HTMLCanvasElement | null) => { canvasRef.current = n; },
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      opacity,
      zIndex: 0,
    },
  });
}
