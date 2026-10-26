// Postęp budowy: przedmiar (odsadzki z konstrukcji) wobec mas i powierzchni z raportów.

import type { KategoriaWarstwy, Mieszanka, ProjektBudowy } from '../types';
import type { RaportDzienny } from '../raportyBudowy/typy';
import { kluczWarstwy } from '../raportyBudowy/raporty';
import { round2, round3 } from './calculations';
import { GESTOSC_KLSM_DOMYSLNA, GESTOSC_MMA_DOMYSLNA, obliczPrzedmiar } from './projektBudowy';

export interface WierszZaawansowania {
  klucz: string;
  nazwa: string;
  kategoria: KategoriaWarstwy;
  gruboscCm: number;
  mieszanka: string;
  przedmiarM2: number;
  przedmiarT: number;
  wykonaneM2: number;
  wykonaneT: number;
  /** Powierzchnia jeszcze do zakrycia. */
  zostaloM2: number;
  /** Zostało do wbudowania: powierzchnia do zakrycia × grubość projektowa. */
  zostaloT: number;
  /** Tony teoretyczne za już zakrytą powierzchnię − tony z raportów. Dodatnie = oszczędność, ujemne = przepał. */
  roznicaT: number;
}

export interface ZaawansowanieBudowy {
  wiersze: WierszZaawansowania[];
  procentM2: number;
  procentT: number;
  przedmiarM2: number;
  przedmiarT: number;
  wykonaneM2: number;
  wykonaneT: number;
  zostaloM2: number;
  zostaloT: number;
  roznicaT: number;
}

interface Agregat {
  klucz: string;
  nazwa: string;
  kategoria: KategoriaWarstwy;
  gruboscCm: number;
  przedmiarM2: number;
  przedmiarT: number;
  wykonaneM2: number;
  wykonaneT: number;
  gestosc: number;
  mieszanki: Set<string>;
}

function gestoscZPrzedmiaru(m2: number, cm: number, tony: number, kategoria: KategoriaWarstwy): number {
  const objetosc = m2 * (Math.max(cm, 0) / 100);
  if (objetosc > 0.01 && tony > 0) return tony / objetosc;
  return kategoria === 'klsm' ? GESTOSC_KLSM_DOMYSLNA : GESTOSC_MMA_DOMYSLNA;
}

export function obliczZaawansowanie(
  projekt: ProjektBudowy,
  raporty: RaportDzienny[],
  mieszanki: Pick<Mieszanka, 'id' | 'rodzaj' | 'nrRecepty'>[] = [],
): ZaawansowanieBudowy {
  const mapa = new Map<string, Agregat>();
  const zapewnij = (
    klucz: string,
    nazwa: string,
    kategoria: KategoriaWarstwy,
    gruboscCm: number,
  ): Agregat => {
    let a = mapa.get(klucz);
    if (!a) {
      a = {
        klucz, nazwa, kategoria, gruboscCm,
        przedmiarM2: 0, przedmiarT: 0, wykonaneM2: 0, wykonaneT: 0,
        gestosc: kategoria === 'klsm' ? GESTOSC_KLSM_DOMYSLNA : GESTOSC_MMA_DOMYSLNA,
        mieszanki: new Set(),
      };
      mapa.set(klucz, a);
    }
    return a;
  };

  for (const wiersz of obliczPrzedmiar(projekt)) {
    if (wiersz.id === 'bez-konstrukcji') continue;
    for (const w of wiersz.warstwy) {
      const klucz = kluczWarstwy({ nazwa: w.nazwa, gruboscCm: w.gruboscCm });
      const a = zapewnij(klucz, w.nazwa, w.kategoria, w.gruboscCm);
      a.przedmiarM2 = round2(a.przedmiarM2 + w.powierzchniaM2);
      a.przedmiarT = round3(a.przedmiarT + w.tony);
      a.gestosc = gestoscZPrzedmiaru(a.przedmiarM2, a.gruboscCm, a.przedmiarT, a.kategoria);
      for (const id of w.mieszankaIds) {
        const m = mieszanki.find((x) => x.id === id);
        if (m) a.mieszanki.add(m.nrRecepty ? `${m.rodzaj} · ${m.nrRecepty}` : m.rodzaj);
      }
    }
  }

  for (const r of raporty) {
    for (const p of r.pozycje) {
      const a = zapewnij(p.warstwaKlucz, p.warstwaNazwa, p.kategoria, p.gruboscProjCm);
      a.wykonaneT = round3(a.wykonaneT + (p.ilosc || 0));
      a.wykonaneM2 = round2(a.wykonaneM2 + p.odcinki.reduce((s, o) => s + (o.powierzchniaM2 || 0), 0));
      if (p.mieszankaNazwa) a.mieszanki.add(p.mieszankaNazwa);
      else if (p.mieszankaId) {
        const m = mieszanki.find((x) => x.id === p.mieszankaId);
        if (m) a.mieszanki.add(m.nrRecepty ? `${m.rodzaj} · ${m.nrRecepty}` : m.rodzaj);
      }
    }
  }

  const wiersze: WierszZaawansowania[] = [...mapa.values()]
    .map((a) => {
      const zostaloM2 = round2(Math.max(0, a.przedmiarM2 - a.wykonaneM2));
      const zostaloT = round3(zostaloM2 * (Math.max(a.gruboscCm, 0) / 100) * a.gestosc);
      const teoretyczneWykonaniaT = round3(a.wykonaneM2 * (Math.max(a.gruboscCm, 0) / 100) * a.gestosc);
      return {
        klucz: a.klucz,
        nazwa: a.nazwa,
        kategoria: a.kategoria,
        gruboscCm: a.gruboscCm,
        mieszanka: [...a.mieszanki].join(', '),
        przedmiarM2: a.przedmiarM2,
        przedmiarT: a.przedmiarT,
        wykonaneM2: a.wykonaneM2,
        wykonaneT: a.wykonaneT,
        zostaloM2,
        zostaloT,
        roznicaT: round3(teoretyczneWykonaniaT - a.wykonaneT),
      };
    })
    .sort((a, b) => a.gruboscCm - b.gruboscCm || a.nazwa.localeCompare(b.nazwa, 'pl'));

  const suma = wiersze.reduce((s, w) => ({
    przedmiarM2: s.przedmiarM2 + w.przedmiarM2,
    przedmiarT: s.przedmiarT + w.przedmiarT,
    wykonaneM2: s.wykonaneM2 + w.wykonaneM2,
    wykonaneT: s.wykonaneT + w.wykonaneT,
    zostaloM2: s.zostaloM2 + w.zostaloM2,
    zostaloT: s.zostaloT + w.zostaloT,
    roznicaT: s.roznicaT + w.roznicaT,
  }), { przedmiarM2: 0, przedmiarT: 0, wykonaneM2: 0, wykonaneT: 0, zostaloM2: 0, zostaloT: 0, roznicaT: 0 });

  return {
    wiersze,
    procentM2: suma.przedmiarM2 > 0 ? round2((suma.wykonaneM2 / suma.przedmiarM2) * 100) : 0,
    procentT: suma.przedmiarT > 0 ? round2((suma.wykonaneT / suma.przedmiarT) * 100) : 0,
    przedmiarM2: round2(suma.przedmiarM2),
    przedmiarT: round3(suma.przedmiarT),
    wykonaneM2: round2(suma.wykonaneM2),
    wykonaneT: round3(suma.wykonaneT),
    zostaloM2: round2(suma.zostaloM2),
    zostaloT: round3(suma.zostaloT),
    roznicaT: round3(suma.roznicaT),
  };
}

export function opisRoznicyTon(roznicaT: number, wykonaneT = 1, wykonaneM2 = 1): string {
  if (wykonaneT < 0.05 && wykonaneM2 < 0.5) return 'jeszcze bez wbudowania';
  if (Math.abs(roznicaT) < 0.05) return 'zgodnie z przedmiarem';
  if (roznicaT > 0) return `oszczędność ${roznicaT.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} t`;
  return `przepał ${Math.abs(roznicaT).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} t`;
}
