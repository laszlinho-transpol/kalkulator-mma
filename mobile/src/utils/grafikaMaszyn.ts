/** Obmiar = uproszczony widok z góry. Bok = rysunek z boku z katalogu SVG. */
export type WygladMaszyny = 'obmiar' | 'bok';

export interface GrafikaMaszyn {
  wygladRozkladarki: WygladMaszyny;
  wygladAuta: WygladMaszyny;
  svgRozkladarki: string | null;
  svgAuta: string | null;
}

export const DOMYSLNA_GRAFIKA: GrafikaMaszyn = {
  wygladRozkladarki: 'obmiar',
  wygladAuta: 'obmiar',
  svgRozkladarki: null,
  svgAuta: null,
};

/** Stary zapis miał jedno pole `wyglad` dla obu maszyn. */
export function znormalizujGrafike(
  g?: (Partial<GrafikaMaszyn> & { wyglad?: WygladMaszyny }) | null,
): GrafikaMaszyn {
  const stary = g?.wyglad;
  const roz = g?.wygladRozkladarki ?? stary ?? 'obmiar';
  const aut = g?.wygladAuta ?? stary ?? 'obmiar';
  return {
    wygladRozkladarki: roz === 'bok' ? 'bok' : 'obmiar',
    wygladAuta: aut === 'bok' ? 'bok' : 'obmiar',
    svgRozkladarki: typeof g?.svgRozkladarki === 'string' ? g.svgRozkladarki : null,
    svgAuta: typeof g?.svgAuta === 'string' ? g.svgAuta : null,
  };
}

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
