// ============================================================
// POSTĘP LIVE – automatyczny podział metrów między działki
// ============================================================

import type { Plan, WpisLive, SesjaDzialkiLive, DzialkaRobocza } from '../types';
import {
  obliczLacznaDlugosc,
  obliczPowierzchnioweOdStartu,
  obliczWynikiDzialki,
  round2,
  round3,
} from './calculations';
import { gruboscWbudowywania } from './grubosc';

export interface SegmentLive {
  dzialkaId: string;
  dzialkaIdx: number;
  metry: number;
  tonaz: number;
}

export interface BilansLivePlanu {
  liczbaAut: number;
  lacznyTonaz: number;
  laczneMetry: number;
  zakrytaPowierzchnia: number;
  lacznaPowierzchniaPlanu: number;
  pozostalaPowierzchnia: number;
  sredniaGrubosc: number;
  pozostalaMasaWgPlanu: number;
  pozostalaMasaWgSredniej: number;
  planowanaMasa: number;
}

const kluczSesji = (planId: string, dzialkaId: string) => `${planId}:${dzialkaId}`;

/** Liczba logicznych aut (nie segmentów po rozbiciu) */
export function liczUnikalnychAut(wpisyPlanu: WpisLive[]): number {
  if (wpisyPlanu.length === 0) return 0;
  return new Set(wpisyPlanu.map((w) => w.numerAuta)).size;
}

/** Kolejny numer auta po istniejących (1 gdy brak wpisów) */
export function nastepnyNumerAuta(wpisyPlanu: WpisLive[]): number {
  return liczUnikalnychAut(wpisyPlanu) + 1;
}

/** Po usunięciu aut – ciągła numeracja 1…N bez luk */
export function przenumerujAutaPlanu(wpisy: WpisLive[], planId: string): WpisLive[] {
  const planWpisy = wpisy.filter((w) => w.planId === planId);
  const inne = wpisy.filter((w) => w.planId !== planId);
  if (planWpisy.length === 0) return wpisy;

  const stareNumery = [...new Set(planWpisy.map((w) => w.numerAuta))].sort((a, b) => a - b);
  const mapa = new Map(stareNumery.map((stary, i) => [stary, i + 1]));

  const zaktualizowane = [...planWpisy]
    .sort((a, b) => {
      if (a.numerAuta !== b.numerAuta) return a.numerAuta - b.numerAuta;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((w) => ({ ...w, numerAuta: mapa.get(w.numerAuta) ?? w.numerAuta }));

  return [...inne, ...zaktualizowane];
}

/** Zakres numerów aut na działce (np. 18–22) */
export function zakresAutNaDzialce(wpisyDz: WpisLive[]): { od: number; do: number } | null {
  if (wpisyDz.length === 0) return null;
  const numery = wpisyDz.map((w) => w.numerAuta);
  return { od: Math.min(...numery), do: Math.max(...numery) };
}

/** Suma przejechanych metrów na danej działce */
export function sumaMetrowDzialki(wpisy: WpisLive[], dzialkaId: string): number {
  return round2(
    wpisy
      .filter((w) => w.dzialkaId === dzialkaId)
      .reduce((s, w) => s + w.przejechaneMetry, 0),
  );
}

/** Czy metry na działce osiągnęły planowaną długość */
export function czyDzialkaWypelniona(dz: DzialkaRobocza, wpisy: WpisLive[]): boolean {
  return sumaMetrowDzialki(wpisy, dz.id) >= obliczLacznaDlugosc(dz) - 0.001;
}

/** Działka zakończona ręcznie („Ostatnie auto”) lub wypełniona metrami */
export function czyDzialkaZakonczonaProg(
  planId: string,
  dzialkaId: string,
  wpisy: WpisLive[],
  sesje: SesjaDzialkiLive[],
  dz: DzialkaRobocza,
): boolean {
  const k = kluczSesji(planId, dzialkaId);
  if (sesje.some((s) => kluczSesji(s.planId, s.dzialkaId) === k && s.zakonczona)) {
    return true;
  }
  return czyDzialkaWypelniona(dz, wpisy);
}

/** Pierwsza działka, na której można jeszcze wpisywać auta */
export function znajdzAktywnaDzialke(
  plan: Plan,
  wpisyPlanu: WpisLive[],
  sesje: SesjaDzialkiLive[],
): { idx: number; dzialka: DzialkaRobocza } | null {
  // Pusta lista wpisów = czysta karta od pierwszej działki (ignoruj stare sesje)
  if (wpisyPlanu.length === 0) {
    return plan.dzialki.length > 0 ? { idx: 0, dzialka: plan.dzialki[0] } : null;
  }
  for (let i = 0; i < plan.dzialki.length; i++) {
    const dz = plan.dzialki[i];
    if (!czyDzialkaZakonczonaProg(plan.id, dz.id, wpisyPlanu, sesje, dz)) {
      return { idx: i, dzialka: dz };
    }
  }
  return null;
}

/**
 * Rozdziela nowe metry od aktywnej działki wzdłuż kolejnych działek planu.
 * Tonaż dzielony proporcjonalnie do metrów w każdym segmencie.
 */
export function rozdzielMetryNaDzialki(
  plan: Plan,
  wpisyPlanu: WpisLive[],
  sesje: SesjaDzialkiLive[],
  noweMetry: number,
  tonazCalkowity: number,
): SegmentLive[] {
  const aktywna = znajdzAktywnaDzialke(plan, wpisyPlanu, sesje);
  if (!aktywna || noweMetry <= 0 || tonazCalkowity <= 0) return [];

  const segmenty: SegmentLive[] = [];
  let metryPozost = noweMetry;

  for (let i = aktywna.idx; i < plan.dzialki.length && metryPozost > 0.001; i++) {
    const dz = plan.dzialki[i];
    if (czyDzialkaZakonczonaProg(plan.id, dz.id, wpisyPlanu, sesje, dz)) continue;

    const juz = sumaMetrowDzialki(wpisyPlanu, dz.id);
    const laczna = obliczLacznaDlugosc(dz);
    const wolne = round2(Math.max(0, laczna - juz));
    if (wolne <= 0.001) continue;

    const naTej = round2(Math.min(metryPozost, wolne));
    segmenty.push({
      dzialkaId: dz.id,
      dzialkaIdx: i,
      metry: naTej,
      tonaz: 0,
    });
    metryPozost = round2(metryPozost - naTej);
  }

  const sumaM = segmenty.reduce((s, seg) => s + seg.metry, 0);
  if (sumaM <= 0) return [];

  let tonRozd = 0;
  for (let i = 0; i < segmenty.length; i++) {
    if (i === segmenty.length - 1) {
      segmenty[i].tonaz = round2(tonazCalkowity - tonRozd);
    } else {
      segmenty[i].tonaz = round2(tonazCalkowity * (segmenty[i].metry / sumaM));
      tonRozd = round3(tonRozd + segmenty[i].tonaz);
    }
  }

  return segmenty;
}

/** Zbiorczy bilans całego planu w trybie LIVE */
export function obliczBilansLivePlanu(
  plan: Plan,
  wpisyPlanu: WpisLive[],
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): BilansLivePlanu {
  let lacznyTonaz = 0;
  let laczneMetry = 0;
  let zakrytaPow = 0;
  let lacznaPowPlan = 0;
  let planowanaMasa = 0;
  let pozostalaMasaWgPlanu = 0;
  let numGr = 0;
  let denGr = 0;

  for (const dz of plan.dzialki) {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) continue;

    const wpisyDz = wpisyPlanu.filter((w) => w.dzialkaId === dz.id);
    const tonDz = wpisyDz.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const metDz = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);
    const wyniki = obliczWynikiDzialki(dz, ciezar, plan.tonazAuta);
    const zakrDz = obliczPowierzchnioweOdStartu(dz, metDz);
    const pozPowDz = Math.max(0, wyniki.lacznaPowierzchnia - zakrDz);
    const grDz = gruboscWbudowywania(dz);

    lacznyTonaz += tonDz;
    laczneMetry += metDz;
    zakrytaPow += zakrDz;
    lacznaPowPlan += wyniki.lacznaPowierzchnia;
    planowanaMasa += wyniki.lacznaIloscMasy;
    pozostalaMasaWgPlanu += pozPowDz * (grDz / 100) * ciezar;

    if (zakrDz > 0 && ciezar > 0) {
      numGr += tonDz;
      denGr += ciezar * zakrDz;
    }
  }

  lacznyTonaz = round2(lacznyTonaz);
  laczneMetry = round2(laczneMetry);
  zakrytaPow = round2(zakrytaPow);
  lacznaPowPlan = round2(lacznaPowPlan);
  const pozostalaPow = round2(Math.max(0, lacznaPowPlan - zakrytaPow));
  const sredniaGrubosc = denGr > 0 ? round2((numGr / denGr) * 100) : 0;
  pozostalaMasaWgPlanu = round3(pozostalaMasaWgPlanu);

  let sredniCiezar = 0;
  let wagaCiezar = 0;
  for (const dz of plan.dzialki) {
    const ciezar = ciezarPoMieszance(dz.mieszankaId);
    if (!ciezar) continue;
    const wpisyDz = wpisyPlanu.filter((w) => w.dzialkaId === dz.id);
    const metDz = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);
    const zakrDz = obliczPowierzchnioweOdStartu(dz, metDz);
    if (zakrDz > 0) {
      sredniCiezar += ciezar * zakrDz;
      wagaCiezar += zakrDz;
    }
  }
  const rhoSr = wagaCiezar > 0 ? sredniCiezar / wagaCiezar : 0;
  const pozostalaMasaSrednia = rhoSr > 0 && sredniaGrubosc > 0
    ? round3(pozostalaPow * (sredniaGrubosc / 100) * rhoSr)
    : pozostalaMasaWgPlanu;

  return {
    liczbaAut: liczUnikalnychAut(wpisyPlanu),
    lacznyTonaz,
    laczneMetry,
    zakrytaPowierzchnia: zakrytaPow,
    lacznaPowierzchniaPlanu: lacznaPowPlan,
    pozostalaPowierzchnia: pozostalaPow,
    sredniaGrubosc,
    pozostalaMasaWgPlanu,
    pozostalaMasaWgSredniej: pozostalaMasaSrednia,
    planowanaMasa: round3(planowanaMasa),
  };
}

/** Identyfikatory działek, które po dodaniu segmentów będą wypełnione */
export function dzialkiDoAutoZamkniecia(
  plan: Plan,
  wpisyPlanu: WpisLive[],
  sesje: SesjaDzialkiLive[],
  segmenty: SegmentLive[],
): string[] {
  const symulacja = [...wpisyPlanu];
  for (const seg of segmenty) {
    symulacja.push({
      id: 'sym',
      planId: plan.id,
      dzialkaId: seg.dzialkaId,
      numerAuta: 0,
      tonazPrzywieziony: seg.tonaz,
      przejechaneMetry: seg.metry,
      godzinaWybudowania: '00:00',
      createdAt: '',
    });
  }

  const doZamkniecia: string[] = [];
  for (const seg of segmenty) {
    const dz = plan.dzialki.find((d) => d.id === seg.dzialkaId);
    if (!dz) continue;
    const k = kluczSesji(plan.id, seg.dzialkaId);
    const juzZamknieta = sesje.some((s) => kluczSesji(s.planId, s.dzialkaId) === k && s.zakonczona);
    if (juzZamknieta) continue;
    if (czyDzialkaWypelniona(dz, symulacja) && !doZamkniecia.includes(seg.dzialkaId)) {
      doZamkniecia.push(seg.dzialkaId);
    }
  }
  return doZamkniecia;
}
