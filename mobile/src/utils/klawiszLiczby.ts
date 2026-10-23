// Edycja liczby klawiaturą w aplikacji: cyfry, przecinek, cofnij, wyczyść, zmiana znaku.

/** Nowa wartość pola po naciśnięciu klawisza `k`; `zastap` = pierwszy klawisz po wejściu w pole. */
export function klawiszLiczby(wartosc: string, k: string, zastap: boolean): string {
  if (k === '±') return wartosc.startsWith('-') ? wartosc.slice(1) : `-${wartosc}`;
  const v = zastap ? '' : wartosc;
  if (/^\d$/.test(k)) return v === '0' ? k : v === '-0' ? `-${k}` : v + k;
  if (k === ',') {
    if (/[.,]/.test(v)) return v;
    return v === '' || v === '-' ? `${v}0,` : `${v},`;
  }
  if (k === '⌫') return v.slice(0, -1);
  if (k === 'C') return '';
  return wartosc;
}
