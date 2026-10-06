/** Obmiar = uproszczony widok z góry. Bok = rysunek z boku z katalogu SVG. */
export type WygladMaszyny = 'obmiar' | 'bok';

export interface GrafikaMaszyn {
  wyglad: WygladMaszyny;
  svgRozkladarki: string | null;
  svgAuta: string | null;
}

export const DOMYSLNA_GRAFIKA: GrafikaMaszyn = {
  wyglad: 'obmiar',
  svgRozkladarki: null,
  svgAuta: null,
};

const MAX_SVG = 180_000;

export function oczyscSvg(tekst: string): { ok: true; xml: string } | { ok: false; blad: string } {
  const t = tekst.replace(/^\uFEFF/, '').trim();
  if (!t) return { ok: false, blad: 'Plik SVG jest pusty.' };
  if (t.length > MAX_SVG) return { ok: false, blad: 'Plik SVG jest za duży (maks. 180 KB).' };
  if (!/<svg[\s>]/i.test(t)) return { ok: false, blad: 'To nie jest plik SVG.' };
  if (/<script|javascript:|on[a-z]+\s*=|<foreignObject/i.test(t)) {
    return { ok: false, blad: 'SVG nie może zawierać skryptów ani osadzonej strony.' };
  }
  return { ok: true, xml: t };
}
