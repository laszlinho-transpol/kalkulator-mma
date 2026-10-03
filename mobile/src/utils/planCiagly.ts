// ============================================================
// PLAN CIĄGŁY – wszystkie działki jako jeden odcinek dnia
// ============================================================

import type { Plan, DzialkaRobocza, WynikiKontroli, WpisTabeliAut, Rzut, Figura, WpisLive } from '../types';
import type { TabeleAutPlanu, TabelaAutDzialki } from './calculations';
import {
  dlugoscFigury,
  obliczPowierzchniFigury,
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
  /** Dokładny obmiar odcinka [m²]. */
  pow: number;
  masaNaM: number;
  pozostalo: number;
  pozostaloPow: number;
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

/** Segmenty geometryczne planu w kolejności układania (plasterki obmiaru, nie średnia figury). */
export function budujSegmentyPlanu(
  dzialki: DzialkaRobocza[],
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): SegmentPlanu[] {
  const out: SegmentPlanu[] = [];
  dzialki.forEach((dz, dzialkaIdx) => {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) return;
    const gr = gruboscWbudowywania(dz);
    const rhoH = (gr / 100) * ciezar;
    const zProfilu = (dz.profilSzerokosci ?? []).filter((p) => p.dlugoscM > 0);
    const plasterki = zProfilu.length > 0
      ? zProfilu.map((p) => ({
        dl: p.dlugoscM,
        pow: Math.max(0, p.powierzchniaM2 ?? (p.szerokoscM ?? 0) * p.dlugoscM),
      }))
      : dz.figury.map((f) => ({
        dl: dlugoscFigury(f),
        pow: Math.max(0, obliczPowierzchniFigury(f)),
      }));
    for (const p of plasterki) {
      if (p.dl <= 0 || p.pow <= 1e-6) continue;
      out.push({
        dzialkaId: dz.id,
        dzialkaIdx,
        nazwa: dz.nazwa,
        dl: p.dl,
        pow: p.pow,
        masaNaM: round3((p.pow / p.dl) * rhoH),
        pozostalo: p.dl,
        pozostaloPow: p.pow,
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

/** Ile metrów [od startu planu] pokrywa dana masa – z dokładnego obmiaru m², nie średniej. */
export function metryOdMasyPlanu(segmenty: SegmentPlanu[], masaMg: number): number {
  if (masaMg <= 0) return 0;
  const seg = klonSegmenty(segmenty);
  let masaPozost = masaMg;
  let metry = 0;
  let i = 0;
  while (masaPozost > 0.0001 && i < seg.length) {
    const s = seg[i];
    const rhoH = (s.grubosc / 100) * s.ciezar;
    if (rhoH <= 0 || s.pozostaloPow <= 1e-6) { i++; continue; }
    const maxM = s.pozostaloPow * rhoH;
    const zuzyj = Math.min(masaPozost, maxM);
    const zjedzPow = zuzyj / rhoH;
    const m = s.pow > 0 ? (zjedzPow / s.pow) * s.dl : 0;
    metry = round2(metry + m);
    s.pozostaloPow -= zjedzPow;
    s.pozostalo = round2(s.pozostalo - m);
    masaPozost = round3(masaPozost - zuzyj);
    if (s.pozostaloPow <= 1e-6) i++;
  }
  return metry;
}

/** Zakryta powierzchnia przy metrach globalnych od startu planu */
export function powierzchniaOdMetrowPlanu(segmenty: SegmentPlanu[], metryGlobalne: number): number {
  let pow = 0;
  let metryCum = 0;
  for (const s of segmenty) {
    if (metryCum + s.dl <= metryGlobalne) {
      pow += s.pow;
      metryCum += s.dl;
    } else {
      const ulamek = s.dl > 0 ? (metryGlobalne - metryCum) / s.dl : 0;
      pow += s.pow * ulamek;
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
      const pow = s.dl > 0 ? s.pow * (doM / s.dl) : 0;
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
      const pow = s.dl > 0 ? s.pow * (doM / s.dl) : 0;
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

  type WierszWew = { numerAuta: number; dzialkaId: string; masa: number; metry: number };
  const wierszeWew: WierszWew[] = [];
  const seg = klonSegmenty(segmenty);
  let numerAuta = 0;
  let ladunekAuta = 0;
  let segIdx = 0;

  const klucz = (n: number, dzId: string) => `${n}:${dzId}`;
  const mapa = new Map<string, WierszWew>();
  let bezpiecznik = 0;
  const limitKrokow = Math.max(2000, seg.length * 8);

  while (segIdx < seg.length && bezpiecznik++ < limitKrokow) {
    const s = seg[segIdx];
    const rhoH = (s.grubosc / 100) * s.ciezar;
    if (s.pozostaloPow <= 1e-4 || s.pow <= 0 || rhoH <= 0) { segIdx++; continue; }

    if (ladunekAuta <= 0.0005) {
      numerAuta++;
      ladunekAuta = tonazAuta;
    }

    const masaNaSeg = s.pozostaloPow * rhoH;
    const doUzycia = round3(Math.min(ladunekAuta, masaNaSeg));
    // Reszta poniżej 0,001 t po round3 = 0 i pętla nigdy nie schodzi z odcinka.
    if (doUzycia <= 0) {
      if (masaNaSeg <= ladunekAuta + 1e-9) segIdx++;
      else ladunekAuta = 0;
      continue;
    }
    const zjedzPow = doUzycia / rhoH;
    const metrySeg = s.pow > 0 ? round2((zjedzPow / s.pow) * s.dl) : 0;

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
    s.pozostaloPow -= zjedzPow;
    s.pozostalo = round2(s.pozostalo - metrySeg);
    if (s.pozostaloPow <= 1e-6) segIdx++;
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

export interface FiguraWCiaguPlanu {
  figura: Figura;
  dzialkaId: string;
  dzialkaNazwa: string;
  metryGlobalneStart: number;
  grubosc: number;
  ciezar: number;
}

export interface MarkerPlanuCiaglego {
  wpis: WpisLive;
  metryKumulatywne: number;
  metryWDzialce: number;
  idxGlobalny: number;
}

export interface PodsumowanieOdcinkaPlanu {
  numerAutaDo: number;
  tonDo: number;
  metryDo: number;
  powDo: number;
  sredniaGrubosc: number;
  bilansMasy: number;
  pozostaloMetrow: number;
}

/** Wpisy w kolejności układania (auto #, działka, czas) */
export function sortujWpisyPlanu(plan: Plan, wpisy: WpisLive[]): WpisLive[] {
  return [...wpisy].sort((a, b) => {
    if (a.numerAuta !== b.numerAuta) return a.numerAuta - b.numerAuta;
    const idxA = plan.dzialki.findIndex((d) => d.id === a.dzialkaId);
    const idxB = plan.dzialki.findIndex((d) => d.id === b.dzialkaId);
    if (idxA !== idxB) return idxA - idxB;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Wszystkie figury planu w jednym ciągu z offsetami metrów globalnych */
export function budujFiguryPlanu(
  plan: Plan,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): FiguraWCiaguPlanu[] {
  const out: FiguraWCiaguPlanu[] = [];
  let offset = 0;
  for (const dz of plan.dzialki) {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) continue;
    const gr = gruboscWbudowywania(dz);
    for (const f of dz.figury) {
      out.push({
        figura: f,
        dzialkaId: dz.id,
        dzialkaNazwa: dz.nazwa,
        metryGlobalneStart: round2(offset),
        grubosc: gr,
        ciezar,
      });
      offset = round2(offset + dlugoscFigury(f));
    }
  }
  return out;
}

export function obliczLacznaDlugoscPlanu(plan: Plan): number {
  return round2(plan.dzialki.reduce((s, dz) => s + obliczLacznaDlugosc(dz), 0));
}

/** Markery aut z metrami od startu całego planu */
export function obliczMarkeryPlanuCiaglego(
  plan: Plan,
  wpisy: WpisLive[],
): MarkerPlanuCiaglego[] {
  const offsets = new Map<string, number>();
  let off = 0;
  for (const dz of plan.dzialki) {
    offsets.set(dz.id, off);
    off += obliczLacznaDlugosc(dz);
  }

  const markery: MarkerPlanuCiaglego[] = [];
  let idx = 0;
  for (const dz of plan.dzialki) {
    const dzWpisy = wpisy
      .filter((w) => w.dzialkaId === dz.id)
      .sort((a, b) => a.numerAuta - b.numerAuta || a.createdAt.localeCompare(b.createdAt));
    let cumDz = 0;
    const base = offsets.get(dz.id) ?? 0;
    for (const w of dzWpisy) {
      cumDz = round2(cumDz + w.przejechaneMetry);
      markery.push({
        wpis: w,
        metryKumulatywne: round2(base + cumDz),
        metryWDzialce: cumDz,
        idxGlobalny: idx++,
      });
    }
  }
  return markery;
}

/** Podsumowanie od startu planu do auta #N (cały dzień) */
export function obliczPodsumowanieOdcinkaPlanu(
  plan: Plan,
  wpisy: WpisLive[],
  numerAutaDo: number,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): PodsumowanieOdcinkaPlanu {
  const segmenty = budujSegmentyPlanu(plan.dzialki, ciezarPoMieszance);
  const lacznaDl = obliczLacznaDlugoscPlanu(plan);
  const wpisyDo = sortujWpisyPlanu(plan, wpisy).filter((w) => w.numerAuta <= numerAutaDo);
  const tonDo = round2(wpisyDo.reduce((s, w) => s + w.tonazPrzywieziony, 0));

  const markery = obliczMarkeryPlanuCiaglego(plan, wpisy);
  const ostatni = [...markery].reverse().find((m) => m.wpis.numerAuta <= numerAutaDo);
  const metryDo = ostatni?.metryKumulatywne ?? 0;
  const powDo = powierzchniaOdMetrowPlanu(segmenty, metryDo);

  let denGr = 0;
  let numGr = 0;
  let cum = 0;
  for (const s of segmenty) {
    const doM = Math.min(s.dl, Math.max(0, metryDo - cum));
    if (doM > 0) {
      const pow = s.dl > 0 ? s.pow * (doM / s.dl) : 0;
      numGr += pow * s.grubosc * s.ciezar;
      denGr += pow * s.ciezar;
    }
    cum += s.dl;
    if (cum >= metryDo) break;
  }
  const sredniaGrubosc = powDo > 0 && denGr > 0 ? round2((tonDo / denGr) * 100) : 0;

  let masaPlan = 0;
  cum = 0;
  for (const s of segmenty) {
    const doM = Math.min(s.dl, Math.max(0, metryDo - cum));
    if (doM > 0) {
      const pow = s.dl > 0 ? s.pow * (doM / s.dl) : 0;
      masaPlan += pow * (s.grubosc / 100) * s.ciezar;
    }
    cum += s.dl;
  }
  const bilansMasy = round3(tonDo - masaPlan);

  return {
    numerAutaDo,
    tonDo,
    metryDo,
    powDo,
    sredniaGrubosc,
    bilansMasy,
    pozostaloMetrow: round2(Math.max(0, lacznaDl - metryDo)),
  };
}
