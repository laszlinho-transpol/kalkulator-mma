// Jedna kolejność mieszanek w całej aplikacji:
// 1) rodzaj warstwy od najniższej: podbudowy, wiążące, ścieralne (reszta na końcu),
// 2) uziarnienie od największego: 31,5 → 22 → 16 → 11 → 8 → 5,
// 3) kategoria ruchu od najwyższej (KR7 → KR1).

import type { KategoriaWarstwy, Mieszanka } from '../types';

export type WarstwaMieszanki = 'podbudowa' | 'wiazaca' | 'scieralna' | 'inna';

export const KOLEJNOSC_WARSTW: WarstwaMieszanki[] = ['podbudowa', 'wiazaca', 'scieralna', 'inna'];

export const NAZWY_WARSTW: Record<WarstwaMieszanki, string> = {
  podbudowa: 'Podbudowy',
  wiazaca: 'Wiążące',
  scieralna: 'Ścieralne',
  inna: 'Pozostałe',
};

export const PODPOWIEDZI_KR = ['KR1-2', 'KR3-4', 'KR5-7'];

/** Warstwy konstrukcji od najniższej – KŁSM leży pod podbudową bitumiczną. */
export const KOLEJNOSC_KATEGORII: KategoriaWarstwy[] = ['klsm', 'podbudowa', 'wiazaca', 'sma', 'inna'];

export const NAZWY_KATEGORII: Record<KategoriaWarstwy, string> = {
  klsm: 'Kruszywo (KŁSM)',
  podbudowa: 'Podbudowy',
  wiazaca: 'Wiążące',
  sma: 'Ścieralne',
  inna: 'Pozostałe',
};

export function kategoriaZWarstwyMieszanki(w: WarstwaMieszanki): KategoriaWarstwy {
  return w === 'scieralna' ? 'sma' : w;
}

type DaneMieszanki = Pick<Mieszanka, 'rodzaj'> & Partial<Pick<Mieszanka, 'nrRecepty' | 'kategoriaRuchu'>>;

const ZAKRES_KR = /KR\s*(\d)(?:\s*[-–÷]\s*(?:KR\s*)?(\d))?/i;

/** Rodzaj bez KR i lepiszcza (50/70, PMB 45/80-55), dużymi literami, bez spacji. */
function rdzen(rodzaj: string): string {
  return rodzaj
    .toUpperCase()
    .replace(new RegExp(ZAKRES_KR.source, 'gi'), ' ')
    .replace(/PMB/g, ' ')
    .replace(/\d+\s*\/\s*\d+(?:\s*-\s*\d+)?/g, ' ')
    .replace(/\s+/g, '');
}

export function warstwaMieszanki(rodzaj: string): WarstwaMieszanki {
  const slowa = rodzaj.toLowerCase();
  if (/podbud/.test(slowa)) return 'podbudowa';
  if (/wi[aą][zż]/.test(slowa)) return 'wiazaca';
  if (/[sś]cieral/.test(slowa)) return 'scieralna';
  const r = rdzen(rodzaj);
  const m = /^([A-Z]*)(\d+(?:[,.]\d+)?)([A-Z]*)/.exec(r);
  const przed = m?.[1] ?? r;
  const po = m?.[3] ?? '';
  const zLitery = (litera?: string): WarstwaMieszanki | undefined => (
    litera === 'P' ? 'podbudowa' : litera === 'W' ? 'wiazaca' : litera === 'S' ? 'scieralna' : undefined
  );
  const zSufiksu = zLitery(po[0]);
  if (zSufiksu) return zSufiksu;
  if (przed.includes('WMS')) return 'wiazaca';
  if (/^(SMA|BBTM|PA|MA|BBF)/.test(przed)) return 'scieralna';
  return 'inna';
}

/** Największe ziarno w mm (31,5 dla „AC32P”); undefined gdy nie ma liczby w nazwie. */
export function uziarnienieMieszanki(rodzaj: string): number | undefined {
  const m = /(\d+(?:[,.]\d+)?)/.exec(rdzen(rodzaj));
  if (!m) return undefined;
  const liczba = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(liczba)) return undefined;
  return liczba === 32 ? 31.5 : liczba;
}

/** Najwyższa kategoria ruchu z pola KR, rodzaju albo numeru recepty (KR3-4 → 4). */
export function kategoriaRuchuMieszanki(m: DaneMieszanki): number | undefined {
  for (const tekst of [m.kategoriaRuchu, m.rodzaj, m.nrRecepty]) {
    const z = tekst ? ZAKRES_KR.exec(tekst) : null;
    if (z) return Math.max(Number(z[1]), Number(z[2] ?? z[1]));
  }
  return undefined;
}

export function etykietaUziarnienia(mm: number | undefined): string {
  return mm == null ? 'Bez uziarnienia' : `${String(mm).replace('.', ',')} mm`;
}

export function porownajMieszanki(a: DaneMieszanki, b: DaneMieszanki): number {
  const wa = KOLEJNOSC_WARSTW.indexOf(warstwaMieszanki(a.rodzaj));
  const wb = KOLEJNOSC_WARSTW.indexOf(warstwaMieszanki(b.rodzaj));
  return wa - wb
    || (uziarnienieMieszanki(b.rodzaj) ?? -1) - (uziarnienieMieszanki(a.rodzaj) ?? -1)
    || (kategoriaRuchuMieszanki(b) ?? 0) - (kategoriaRuchuMieszanki(a) ?? 0)
    || a.rodzaj.localeCompare(b.rodzaj, 'pl')
    || (a.nrRecepty ?? '').localeCompare(b.nrRecepty ?? '', 'pl');
}

export function posortujMieszanki<T extends DaneMieszanki>(lista: T[]): T[] {
  return [...lista].sort(porownajMieszanki);
}

export interface GrupaUziarnienia<T> {
  uziarnienie?: number;
  elementy: T[];
}

export interface GrupaWarstwy<T> {
  warstwa: WarstwaMieszanki;
  tytul: string;
  grupy: GrupaUziarnienia<T>[];
}

/** Grupy do wyświetlenia: rodzaj warstwy, a w nim osobne bloki uziarnienia. */
export function grupujMieszanki<T extends DaneMieszanki>(lista: T[]): GrupaWarstwy<T>[] {
  const wynik: GrupaWarstwy<T>[] = [];
  for (const m of posortujMieszanki(lista)) {
    const warstwa = warstwaMieszanki(m.rodzaj);
    const uziarnienie = uziarnienieMieszanki(m.rodzaj);
    let grupa = wynik[wynik.length - 1];
    if (!grupa || grupa.warstwa !== warstwa) {
      grupa = { warstwa, tytul: NAZWY_WARSTW[warstwa], grupy: [] };
      wynik.push(grupa);
    }
    let pod = grupa.grupy[grupa.grupy.length - 1];
    if (!pod || pod.uziarnienie !== uziarnienie) {
      pod = { uziarnienie, elementy: [] };
      grupa.grupy.push(pod);
    }
    pod.elementy.push(m);
  }
  return wynik;
}
