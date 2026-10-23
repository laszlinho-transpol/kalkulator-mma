// Dni wolne w Polsce: weekendy i święta ustawowe.

function iso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function wielkanoc(rok: number): Date {
  const a = rok % 19;
  const b = Math.floor(rok / 100);
  const c = rok % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const miesiac = Math.floor((h + l - 7 * m + 114) / 31);
  const dzien = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(rok, miesiac - 1, dzien);
}

const cache = new Map<number, Set<string>>();

export function swietaPolskie(rok: number): Set<string> {
  const zapisane = cache.get(rok);
  if (zapisane) return zapisane;
  const stale = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'];
  // Wigilia jest dniem wolnym od 2025 r.
  if (rok >= 2025) stale.push('12-24');
  const dni = new Set(stale.map((md) => `${rok}-${md}`));
  const pascha = wielkanoc(rok);
  for (const przesuniecie of [0, 1, 49, 60]) {
    const dzien = new Date(pascha);
    dzien.setDate(pascha.getDate() + przesuniecie);
    dni.add(iso(dzien));
  }
  cache.set(rok, dni);
  return dni;
}

export function czySwieto(isoData: string): boolean {
  const rok = Number(isoData.slice(0, 4));
  return Number.isFinite(rok) && swietaPolskie(rok).has(isoData);
}

export function czyDzienWolny(isoData: string): boolean {
  const [rok, miesiac, dzien] = isoData.split('-').map(Number);
  const numer = new Date(rok, miesiac - 1, dzien).getDay();
  return numer === 0 || numer === 6 || czySwieto(isoData);
}

export function opisDnia(isoData: string): string {
  const [rok, miesiac, dzien] = isoData.split('-').map(Number);
  const numer = new Date(rok, miesiac - 1, dzien).getDay();
  if (czySwieto(isoData)) return 'Święto';
  if (numer === 6) return 'Sobota';
  if (numer === 0) return 'Niedziela';
  return 'Dzień roboczy';
}
