import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
  onBlad?: (komunikat: string | null) => void;
}

function hostHtml(node: unknown): HTMLElement | null {
  if (Platform.OS !== 'web' || !node) return null;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return node;
  if (typeof node === 'object' && node && 'appendChild' in node) return node as HTMLElement;
  const anyNode = node as { getNode?: () => unknown; _nativeNode?: unknown; _touchableNode?: unknown };
  const inner = anyNode.getNode?.() ?? anyNode._nativeNode ?? anyNode._touchableNode ?? null;
  if (typeof HTMLElement !== 'undefined' && inner instanceof HTMLElement) return inner;
  if (inner && typeof inner === 'object' && 'appendChild' in inner) return inner as HTMLElement;
  return null;
}

const MAX_KRAWEDZ = 4096;

/**
 * Tło PDF: prawdziwy <canvas> w DOM + pdf.js (strona → offscreen → drawImage
 * w tym samym układzie co poligony SVG). Dzięki temu widać pikiety, pobocza, budynki.
 */
export function PztTloPdfCanvas({
  bufor, widoczne, opacity, odwrocY, cx, cy, skalaFit, szer, wys, skala, tx, ty, onBlad,
}: Props) {
  const wrapRef = useRef<View>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);
  const pageRef = useRef<PdfjsPage | null>(null);
  const kluczDoc = useRef<string>('');

  useEffect(() => () => {
    canvasRef.current?.remove();
    canvasRef.current = null;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !bufor || !widoczne || szer < 8 || wys < 8) return undefined;
    let anulowane = false;

    const zapewnijCanvas = (): HTMLCanvasElement | null => {
      if (canvasRef.current?.parentElement) return canvasRef.current;
      const host = hostHtml(wrapRef.current);
      if (!host || typeof document === 'undefined') return null;
      const c = document.createElement('canvas');
      c.setAttribute('data-pzt-tlo', '1');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
      host.appendChild(c);
      canvasRef.current = c;
      return c;
    };

    const rysuj = async () => {
      try {
        const canvas = zapewnijCanvas();
        if (!canvas) throw new Error('Nie podłączono canvas tła PDF.');
        const pdfjs = await zaladujPdfjs();
        const klucz = `${bufor.nazwa}:${bufor.data.byteLength}:${bufor.strona}`;
        if (kluczDoc.current !== klucz) {
          const data = bufor.data.byteOffset === 0 && bufor.data.byteLength === bufor.data.buffer.byteLength
            ? bufor.data
            : bufor.data.slice();
          const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
          const p = Math.max(1, Math.min(doc.numPages, bufor.strona));
          pageRef.current = await doc.getPage(p);
          kluczDoc.current = klucz;
        }
        const page = pageRef.current;
        if (!page || anulowane) return;

        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        canvas.width = Math.max(1, Math.round(szer * dpr));
        canvas.height = Math.max(1, Math.round(wys * dpr));
        canvas.style.width = `${szer}px`;
        canvas.style.height = `${wys}px`;
        canvas.style.opacity = String(opacity);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Brak kontekstu canvas.');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pageW = bufor.pageW;
        const pageH = bufor.pageH;
        const sfit = Math.max(skala * skalaFit, 1e-6);
        const toScreen = (pdfX: number, pdfY: number) => ({
          x: szer / 2 + tx + sfit * (pdfX - cx),
          y: wys / 2 + ty - sfit * (pdfY - cy),
        });
        const tl = toScreen(0, odwrocY ? 0 : pageH);
        const br = toScreen(pageW, odwrocY ? pageH : 0);
        const destX = Math.min(tl.x, br.x);
        const destY = Math.min(tl.y, br.y);
        const destW = Math.max(Math.abs(br.x - tl.x), 1);
        const destH = Math.max(Math.abs(br.y - tl.y), 1);

        const iL = Math.max(destX, 0);
        const iT = Math.max(destY, 0);
        const iR = Math.min(destX + destW, szer);
        const iB = Math.min(destY + destH, wys);
        if (iR <= iL || iB <= iT) {
          onBlad?.(null);
          return;
        }

        const potrzebna = sfit * dpr;
        const rs = Math.max(
          0.35,
          Math.min(potrzebna, MAX_KRAWEDZ / Math.max(pageW, 1), MAX_KRAWEDZ / Math.max(pageH, 1)),
        );

        taskRef.current?.cancel();
        const viewport = page.getViewport({ scale: rs });
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.round(viewport.width));
        off.height = Math.max(1, Math.round(viewport.height));
        const offCtx = off.getContext('2d');
        if (!offCtx) throw new Error('Brak offscreen canvas.');
        const task = page.render({ canvasContext: offCtx, viewport, intent: 'display' });
        taskRef.current = task;
        await task.promise;
        if (anulowane) return;

        const srcX = ((iL - destX) / destW) * off.width;
        const srcY = ((iT - destY) / destH) * off.height;
        const srcW = ((iR - iL) / destW) * off.width;
        const srcH = ((iB - iT) / destH) * off.height;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, srcX, srcY, srcW, srcH, iL, iT, iR - iL, iB - iT);
        onBlad?.(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(msg)) return;
        onBlad?.(msg || 'Nie udało się narysować PDF.');
      }
    };

    const t = setTimeout(() => { void rysuj(); }, 30);
    const t2 = setTimeout(() => { void rysuj(); }, 180);
    return () => {
      anulowane = true;
      clearTimeout(t);
      clearTimeout(t2);
      taskRef.current?.cancel();
    };
  }, [bufor, widoczne, opacity, odwrocY, cx, cy, skalaFit, szer, wys, skala, tx, ty, onBlad]);

  if (Platform.OS !== 'web' || !bufor || !widoczne) return null;

  return (
    <View
      ref={wrapRef}
      pointerEvents="none"
      collapsable={false}
      style={[StyleSheet.absoluteFill, { zIndex: 0, overflow: 'hidden', backgroundColor: 'transparent' }]}
    />
  );
}
