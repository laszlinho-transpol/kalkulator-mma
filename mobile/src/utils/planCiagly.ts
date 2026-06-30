// ============================================================
// PLAN CIĄGŁY – wszystkie działki jako jeden odcinek dnia
// ============================================================

import type { Plan, DzialkaRobocza, WynikiKontroli, WpisTabeliAut, Rzut } from '../types';
import type { TabeleAutPlanu, TabelaAutDzialki } from './calculations';
import {
  dlugoscFigury,
  sredniaSzerokoscFigury,
  obliczWynikiDzialki,
  obliczLacznaDlugosc,
  round2,
  round3,
  wycinekRzutow,
} from './calculations';
import { gruboscWbudowywania } from './grubosc';

export interface SegmentPlanu {
  dzialkaId: string;
  dzialkaIdx: number;
  nazwa: string;
  dl: number;
  masaNaM: number;
  pozostalo: number;
  grubosc: number;
  ciezar: number;
}

export interface LokalizacjaNaPlanie {
  dzialkaIdx: number;
  dzialkaNazwa: string;
  metryWDzialce: number;
  metryGlobalne: number;
}

export interface WynikiKontroliPlanu extends WynikiKontroli {
  metryPlanowaneOdTonow: number;
  lokalizacja: LokalizacjaNaPlanie | null;
  lacznaDlugoscPlanu: number;
  lacznaPowierzchniaPlanu: number;
  sredniaGruboscPlanu: number;
}

export interface PodsumowaniePlanuDnia {
  lacznaMasa: number;
  lacznaPowierzchnia: number;
  laczneMetry: number;
  lacznaIloscAut: number;
  liczbaDzialek: number;
}

/** Segmenty geometryczne planu w kolejności układania */
export function budujSegmentyPlanu(
  dzialki: DzialkaRobocza[],
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): SegmentPlanu[] {
  const out: SegmentPlanu[] = [];
  dzialki.forEach((dz, dzialkaIdx) => {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) return;
    const gr = gruboscWbudowywania(dz);
    for (const f of dz.figury) {
      const dl = dlugoscFigury(f);
      if (dl <= 0) continue;
      out.push({
        dzialkaId: dz.id,
        dzialkaIdx,
        nazwa: dz.nazwa,
        dl,
        masaNaM: round3(sredniaSzerokoscFigury(f) * (gr / 100) * ciezar),
        pozostalo: dl,
        grubosc: gr,
        ciezar,
      });
    }
  });
  return out;
}

function klonSegmenty(seg: SegmentPlanu[]): SegmentPlanu[] {
  return seg.map((s) => ({ ...s }));
}

/** Ile metrów [od startu planu] pokrywa dana masa */
export function metryOdMasyPlanu(segmenty: SegmentPlanu[], masaMg: number): number {
  if (masaMg <= 0) return 0;
  const seg = klonSegmenty(segmenty);
  let masaPozost = masaMg;
  let metry = 0;
  let i = 0;
  while (masaPozost > 0.0001 && i < seg.length) {
    const s = seg[i];
    if (s.masaNaM <= 0 || s.pozostalo <= 0) { i++; continue; }
    const maxM = s.pozostalo * s.masaNaM;
    const zuzyj = Math.min(masaPozost, maxM);
    const m = s.masaNaM > 0 ? zuzyj / s.masaNaM : 0;
    metry = round2(metry + m);
    s.pozostalo = round2(s.pozostalo - m);
    masaPozost = round3(masaPozost - zuzyj);
    if (s.pozostalo <= 0.001) i++;
  }
  return metry;
}

/** Zakryta powierzchnia przy metrach globalnych od startu planu */
export function powierzchniaOdMetrowPlanu(segmenty: SegmentPlanu[], metryGlobalne: number): number {
  let pow = 0;
  let metryCum = 0;
  for (const s of segmenty) {
    if (metryCum + s.dl <= metryGlobalne) {
      pow += s.dl * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      metryCum += s.dl;
    } else {
      const ulamek = s.dl > 0 ? (metryGlobalne - metryCum) / s.dl : 0;
      pow += s.dl * ulamek * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      break;
    }
  }
  return round2(Math.max(0, pow));
}

/** Gdzie na planie jesteśmy po X metrach od startu */
export function lokalizacjaNaPlanie(segmenty: SegmentPlanu[], metryGlobalne: number): LokalizacjaNaPlanie | null {
  if (segmenty.length === 0 || metryGlobalne < 0) return null;
  let cum = 0;
  for (const s of segmenty) {
    if (cum + s.dl >= metryGlobalne - 0.001) {
      return {
        dzialkaIdx: s.dzialkaIdx,
        dzialkaNazwa: s.nazwa,
        metryWDzialce: round2(metryGlobalne - cum),
        metryGlobalne: round2(metryGlobalne),
      };
    }
    cum += s.dl;
  }
  const ostatni = segmenty[segmenty.length - 1];
  const laczna = round2(segmenty.reduce((a, x) => a + x.dl, 0));
  return {
    dzialkaIdx: ostatni.dzialkaIdx,
    dzialkaNazwa: ostatni.nazwa,
    metryWDzialce: ostatni.dl,
    metryGlobalne: laczna,
  };
}

export function obliczPodsumowaniePlanuDnia(
  plan: Plan,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
  tabele?: TabeleAutPlanu,
): PodsumowaniePlanuDnia {
  let lacznaMasa = 0;
  let lacznaPowierzchnia = 0;
  let laczneMetry = 0;
  for (const dz of plan.dzialki) {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) continue;
    const w = obliczWynikiDzialki(dz, ciezar, plan.tonazAuta);
    lacznaMasa += w.lacznaIloscMasy;
    lacznaPowierzchnia += w.lacznaPowierzchnia;
    laczneMetry += obliczLacznaDlugosc(dz);
  }
  return {
    lacznaMasa: round3(lacznaMasa),
    lacznaPowierzchnia: round2(lacznaPowierzchnia),
    laczneMetry: round2(laczneMetry),
    lacznaIloscAut: tabele?.lacznaIloscAut ?? 0,
    liczbaDzialek: plan.dzialki.length,
  };
}

/** Kontrola całego dnia – metry i tony od startu pierwszej działki */
export function obliczKontrolePlanu(
  plan: Plan,
  wbudowaneTony: number,
  przejechaneMetry: number,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): WynikiKontroliPlanu | null {
  const segmenty = budujSegmentyPlanu(plan.dzialki, ciezarPoMieszance);
  if (segmenty.length === 0) return null;

  const lacznaDlugoscPlanu = round2(segmenty.reduce((s, x) => s + x.dl, 0));
  let lacznaPowierzchniaPlanu = 0;
  let masaPlanWgGr = 0;
  let grWaga = 0;
  for (const dz of plan.dzialki) {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) continue;
    const w = obliczWynikiDzialki(dz, ciezar, plan.tonazAuta);
    const gr = gruboscWbudowywania(dz);
    lacznaPowierzchniaPlanu += w.lacznaPowierzchnia;
    masaPlanWgGr += w.lacznaPowierzchnia * (gr / 100) * ciezar;
    grWaga += w.lacznaPowierzchnia * gr;
  }
  lacznaPowierzchniaPlanu = round2(lacznaPowierzchniaPlanu);
  const sredniaGruboscPlanu = lacznaPowierzchniaPlanu > 0
    ? round2(grWaga / lacznaPowierzchniaPlanu)
    : 0;

  const metryPlanowaneOdTonow = metryOdMasyPlanu(segmenty, wbudowaneTony);
  const zakrytaPowierzchnia = powierzchniaOdMetrowPlanu(segmenty, przejechaneMetry);
  const lokalizacja = lokalizacjaNaPlanie(segmenty, przejechaneMetry);

  let denGr = 0;
  let numGr = 0;
  let cum = 0;
  for (const s of segmenty) {
    const doM = Math.min(s.dl, Math.max(0, przejechaneMetry - cum));
    if (doM > 0) {
      const pow = doM * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      numGr += pow * s.grubosc * s.ciezar;
      denGr += pow * s.ciezar;
    }
    cum += s.dl;
    if (cum >= przejechaneMetry) break;
  }
  const uzyskanaGruboscPoprawna = zakrytaPowierzchnia > 0 && denGr > 0
    ? round2((wbudowaneTony / denGr) * 100)
    : 0;

  let sredniCiezar = 0;
  let wPow = 0;
  cum = 0;
  for (const s of segmenty) {
    const doM = Math.min(s.dl, Math.max(0, przejechaneMetry - cum));
    if (doM > 0) {
      const pow = doM * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      sredniCiezar += s.ciezar * pow;
      wPow += pow;
    }
    cum += s.dl;
  }
  const rho = wPow > 0 ? sredniCiezar / wPow : segmenty[0]?.ciezar ?? 2.4;
  const masaWgPlanuNaZakrytej = round3(zakrytaPowierzchnia * (sredniaGruboscPlanu / 100) * rho);
  const bilansMasy = round3(wbudowaneTony - masaWgPlanuNaZakrytej);

  const pozostaloMetrow = round2(Math.max(0, lacznaDlugoscPlanu - przejechaneMetry));
  const pozostaloPowierzchni = round2(Math.max(0, lacznaPowierzchniaPlanu - zakrytaPowierzchnia));
  const srGr = uzyskanaGruboscPoprawna > 0 ? uzyskanaGruboscPoprawna : sredniaGruboscPlanu;
  const pozostaloMasyWgZalozen = round3(pozostaloPowierzchni * (sredniaGruboscPlanu / 100) * rho);
  const pozostaloMasyWgSredniej = round3(pozostaloPowierzchni * (srGr / 100) * rho);

  return {
    zakrytaPowierzchnia,
    uzyskanaGrubosc: uzyskanaGruboscPoprawna,
    bilansMasy,
    pozostaloMetrow,
    pozostaloPowierzchni,
    pozostaloMasyWgZalozen,
    pozostaloMasyWgSredniej,
    metryPlanowaneOdTonow,
    lokalizacja,
    lacznaDlugoscPlanu,
    lacznaPowierzchniaPlanu,
    sredniaGruboscPlanu,
  };
}

/**
 * Tabela aut z przenoszeniem reszty tonażu między działkami
 * (to samo auto #N może mieć wpisy na kolejnych działkach).
 */
export function obliczTabeleAutPlanuCiagla(
  dzialki: DzialkaRobocza[],
  rzutyPlanu: Rzut[],
  tonazAuta: number,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): TabeleAutPlanu {
  const segmenty = budujSegmentyPlanu(dzialki, ciezarPoMieszance);
  if (segmenty.length === 0) {
    return { calosc: [], dzialki: [], lacznaIloscAut: 0 };
  }

  const lacznaMasaPlanu = round3(
    segmenty.reduce((s, x) => s + x.dl * x.masaNaM, 0),
  );

  type WierszWew = { numerAuta: number; dzialkaId: string; masa: number; metry: number };
  const wierszeWew: WierszWew[] = [];
  const seg = klonSegmenty(segmenty);
  let numerAuta = 0;
  let ladunekAuta = 0;
  let segIdx = 0;

  const klucz = (n: number, dzId: string) => `${n}:${dzId}`;
  const mapa = new Map<string, WierszWew>();

  while (segIdx < seg.length) {
    const s = seg[segIdx];
    if (s.pozostalo <= 0.001 || s.masaNaM <= 0) { segIdx++; continue; }

    if (ladunekAuta <= 0.0001) {
      numerAuta++;
      ladunekAuta = tonazAuta;
    }

    const masaNaSeg = s.pozostalo * s.masaNaM;
    const doUzycia = round3(Math.min(ladunekAuta, masaNaSeg));
    const metrySeg = s.masaNaM > 0 ? round2(doUzycia / s.masaNaM) : 0;

    const k = klucz(numerAuta, s.dzialkaId);
    const istniejacy = mapa.get(k);
    if (istniejacy) {
      istniejacy.masa = round2(istniejacy.masa + doUzycia);
      istniejacy.metry = round2(istniejacy.metry + metrySeg);
    } else {
      const w: WierszWew = { numerAuta, dzialkaId: s.dzialkaId, masa: round2(doUzycia), metry: metrySeg };
      mapa.set(k, w);
      wierszeWew.push(w);
    }

    ladunekAuta = round3(ladunekAuta - doUzycia);
    s.pozostalo = round2(s.pozostalo - metrySeg);
    if (s.pozostalo <= 0.001) segIdx++;
  }

  // Numeracja rzutów
  const numeryRzutow: number[] = [];
  for (const r of rzutyPlanu) {
    for (let i = 0; i < r.iloscSamochodow; i++) numeryRzutow.push(r.numerRzutu);
  }
  const maxAut = numerAuta;
  const rzuty = numeryRzutow.length >= maxAut
    ? wycinekRzutow(rzutyPlanu, 0, maxAut)
    : rzutyPlanu;

  const rzutDlaAuta = (nr: number): number => {
    if (numeryRzutow.length >= nr) return numeryRzutow[nr - 1];
    return rzuty[0]?.numerRzutu ?? 1;
  };

  const calosc: WpisTabeliAut[] = [];
  let masaG = 0;
  let metryG = 0;
  for (const w of wierszeWew) {
    masaG = round3(masaG + w.masa);
    metryG = round2(metryG + w.metry);
    calosc.push({
      numerAuta: w.numerAuta,
      numerRzutu: rzutDlaAuta(w.numerAuta),
      masa: w.masa,
      masaNarastajaco: masaG,
      metry: w.metry,
      metryNarastajaco: metryG,
    });
  }

  const poDzialkach: TabelaAutDzialki[] = [];
  for (const dz of dzialki) {
    const wDz = wierszeWew.filter((w) => w.dzialkaId === dz.id);
    if (wDz.length === 0) continue;
    let mN = 0;
    let metN = 0;
    const wierszeDz: WpisTabeliAut[] = wDz.map((w) => {
      mN = round3(mN + w.masa);
      metN = round2(metN + w.metry);
      return {
        numerAuta: w.numerAuta,
        numerRzutu: rzutDlaAuta(w.numerAuta),
        masa: w.masa,
        masaNarastajaco: mN,
        metry: w.metry,
        metryNarastajaco: metN,
      };
    });
    const numery = wDz.map((w) => w.numerAuta);
    poDzialkach.push({
      dzialkaId: dz.id,
      nazwa: dz.nazwa,
      wiersze: wierszeDz,
      numerAutaOd: Math.min(...numery),
      numerAutaDo: Math.max(...numery),
    });
  }

  const unikalneAuta = new Set(wierszeWew.map((w) => w.numerAuta)).size;

  return {
    calosc,
    dzialki: poDzialkach,
    lacznaIloscAut: unikalneAuta,
  };
}
