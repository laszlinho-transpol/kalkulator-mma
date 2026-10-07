export type WynikZakresuDat =
  | { ok: true; pusty: true }
  | { ok: true; pusty: false; od: string; do: string }
  | { ok: false };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Dzień kalendarzowy YYYY-MM-DD z tokenu 5.10.2026, 05.10.2026 albo 2026-10-05. */
export function dzienZTokenu(token: string): string | null {
  const t = token.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const pl = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!pl) return null;
  const d = Number(pl[1]);
  const mo = Number(pl[2]);
  const y = Number(pl[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Pusty tekst = wszystko. Jedna data albo „od–do” / „od do data”. */
export function parsujZakresDat(tekst: string): WynikZakresuDat {
  const s = tekst.trim();
  if (!s) return { ok: true, pusty: true };
  const jeden = dzienZTokenu(s);
  if (jeden) return { ok: true, pusty: false, od: jeden, do: jeden };
  const isoPara = s.match(/^(\d{4}-\d{2}-\d{2})\s*(?:–|—|-|do)\s*(\d{4}-\d{2}-\d{2})$/i);
  const czesci = isoPara
    ? [isoPara[1], isoPara[2]]
    : s.split(/\s*(?:–|—|-|do)\s*/i).map((x) => x.trim()).filter(Boolean);
  if (czesci.length === 1) {
    const d = dzienZTokenu(czesci[0]);
    if (!d) return { ok: false };
    return { ok: true, pusty: false, od: d, do: d };
  }
  if (czesci.length === 2) {
    const a = dzienZTokenu(czesci[0]);
    const b = dzienZTokenu(czesci[1]);
    if (!a || !b) return { ok: false };
    return a <= b
      ? { ok: true, pusty: false, od: a, do: b }
      : { ok: true, pusty: false, od: b, do: a };
  }
  return { ok: false };
}

export function dzienZIso(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dzienWZakresie(dzien: string, od: string, doDnia: string): boolean {
  return dzien >= od && dzien <= doDnia;
}

export type FazaKalendarza = 'gotowy' | 'poczatek';

/**
 * Pierwsze stuknięcie zaznacza jeden dzień.
 * Drugie zaznacza okres od pierwszego do drugiego (kolejność dowolna).
 * Kolejne zaczyna wybór od nowa.
 */
export function wyborDnia(
  faza: FazaKalendarza,
  od: string,
  dzien: string,
): { faza: FazaKalendarza; od: string; do: string } {
  if (faza !== 'poczatek') {
    return { faza: 'poczatek', od: dzien, do: dzien };
  }
  return dzien >= od
    ? { faza: 'gotowy', od, do: dzien }
    : { faza: 'gotowy', od: dzien, do: od };
}

export function dzisIso(teraz: Date = new Date()): string {
  return `${teraz.getFullYear()}-${pad(teraz.getMonth() + 1)}-${pad(teraz.getDate())}`;
}
