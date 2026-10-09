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
import { obliczLacznaDlugoscPlanu } from './planCiagly';

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
  lacznaDlugoscPlanu: number;
  pozostaloMetrow: number;
  sredniaGrubosc: number;
  pozostalaMasaWgPlanu: number;
  pozostalaMasaWgSredniej: number;
  planowanaMasa: number;
}

const kluczSesji = (planId: string, dzialkaId: string) => `${planId}:${dzialkaId}`;

/** Tony do 0,01 Mg. Korekta omija 8,575 → 8,57 przy błędzie zmiennoprzecinkowym. */
function round2tony(n: number): number {
  return Math.round((n + 1e-8) * 100) / 100;
}

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

/** Powierzchnia działki między dwoma metrami od jej startu. */
export function powierzchniaZakresuDzialki(dz: DzialkaRobocza, odM: number, doM: number): number {
  const a = obliczPowierzchnioweOdStartu(dz, Math.max(0, odM));
  const b = obliczPowierzchnioweOdStartu(dz, Math.max(0, doM));
  return round2(Math.max(0, b - a));
}

/** Tony przy grubości planu na podanym zakresie metrów działki. */
export function tonyZakresuPrzyGrubosciPlanu(
  dz: DzialkaRobocza,
  odM: number,
  doM: number,
  gestoscTm3: number,
): number {
  const pow = powierzchniaZakresuDzialki(dz, odM, doM);
  const gr = gruboscWbudowywania(dz);
  return round3(pow * (Math.max(0, gr) / 100) * Math.max(0, gestoscTm3));
}

/** Grubość, która wyszła na zakresie: tony / (powierzchnia × gęstość). */
export function gruboscSegmentuLive(
  dz: DzialkaRobocza,
  metryPrzed: number,
  metrySegmentu: number,
  tonaz: number,
  gestoscTm3: number,
): { powierzchnia: number; grubosc: number } {
  const powierzchnia = powierzchniaZakresuDzialki(dz, metryPrzed, metryPrzed + metrySegmentu);
  const grubosc = powierzchnia > 0 && gestoscTm3 > 0
    ? (tonaz / (gestoscTm3 * powierzchnia)) * 100
    : 0;
  return { powierzchnia, grubosc };
}

function gestoscDzialki(
  dz: DzialkaRobocza,
  ciezar?: (mieszankaId: string) => number | undefined,
): number {
  const g = ciezar?.(dz.mieszankaId);
  return g && g > 0 ? g : 2.45;
}

export interface OpcjeRozdzialuLive {
  /**
   * Działka zamknięta ręcznie („ostatnie auto”) nie przyjmuje kolejnego auta,
   * ale auto, które na niej już leżało, może zostać przy przebudowie historii.
   */
  pominZamknieteGdyJuzCosLezy?: boolean;
  /**
   * Zamknięcia, na których w dotychczasowej historii są już metry.
   * Puste zamknięcie (obszar pominięty przed pierwszym autem) zostaje pominięte.
   * Brak listy = każde zamknięcie można ponownie zająć, gdy w przebudowie jest jeszcze puste.
   */
  zajeteZamknieciaIds?: string[];
}

/**
 * Rozdziela nowe metry od aktywnej działki wzdłuż kolejnych obszarów.
 * Na wcześniejszych obszarach tony biorą się z powierzchni × grubość wbudowywania
 * wpisana w planie (nie grubość projektowa) × gęstość.
 * Ostatni obszar dostaje resztę ładunku – uzyskana grubość porównuje się z tą założoną.
 */
export function rozdzielMetryNaDzialki(
  plan: Plan,
  wpisyPlanu: WpisLive[],
  sesje: SesjaDzialkiLive[],
  noweMetry: number,
  tonazCalkowity: number,
  ciezarPoMieszance?: (mieszankaId: string) => number | undefined,
  opcje?: OpcjeRozdzialuLive,
): SegmentLive[] {
  const aktywna = znajdzAktywnaDzialke(plan, wpisyPlanu, sesje);
  if (!aktywna || noweMetry <= 0 || tonazCalkowity <= 0) return [];

  const segmenty: SegmentLive[] = [];
  let metryPozost = noweMetry;

  for (let i = aktywna.idx; i < plan.dzialki.length && metryPozost > 0.001; i++) {
    const dz = plan.dzialki[i];
    const juz = sumaMetrowDzialki(wpisyPlanu, dz.id);
    const laczna = obliczLacznaDlugosc(dz);
    const wolne = round2(Math.max(0, laczna - juz));
    if (wolne <= 0.001) continue;
    const zamknieta = sesje.some((s) => kluczSesji(s.planId, s.dzialkaId) === kluczSesji(plan.id, dz.id) && s.zakonczona);
    const wolnoWrocic = Boolean(
      opcje?.pominZamknieteGdyJuzCosLezy
      && juz <= 0.05
      && (opcje.zajeteZamknieciaIds == null || opcje.zajeteZamknieciaIds.includes(dz.id)),
    );
    if (zamknieta && !wolnoWrocic) continue;

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

  let zostalo = round2tony(tonazCalkowity);
  for (let i = 0; i < segmenty.length; i++) {
    const seg = segmenty[i];
    const dz = plan.dzialki[seg.dzialkaIdx];
    if (i === segmenty.length - 1 || !dz) {
      seg.tonaz = round2tony(Math.max(0, zostalo));
      zostalo = 0;
      continue;
    }
    const juz = sumaMetrowDzialki(wpisyPlanu, dz.id);
    const rho = gestoscDzialki(dz, ciezarPoMieszance);
    const pow = powierzchniaZakresuDzialki(dz, juz, juz + seg.metry);
    const przyPlanie = round2tony(pow * (Math.max(0, gruboscWbudowywania(dz)) / 100) * rho);
    const wez = round2tony(Math.min(Math.max(0, przyPlanie), Math.max(0, zostalo)));
    seg.tonaz = wez;
    zostalo = round2tony(zostalo - wez);
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

  const lacznaDlugoscPlanu = obliczLacznaDlugoscPlanu(plan);
  const pozostaloMetrow = round2(Math.max(0, lacznaDlugoscPlanu - laczneMetry));

  return {
    liczbaAut: liczUnikalnychAut(wpisyPlanu),
    lacznyTonaz,
    laczneMetry,
    zakrytaPowierzchnia: zakrytaPow,
    lacznaPowierzchniaPlanu: lacznaPowPlan,
    pozostalaPowierzchnia: pozostalaPow,
    lacznaDlugoscPlanu,
    pozostaloMetrow,
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

/** Jedno auto, niezależnie od tego na ile obszarów się rozłożyło. */
export interface AutoLogiczneLive {
  numerAuta: number;
  /** Cały ładunek przywieziony tym autem [Mg]. */
  tonaz: number;
  /** Całe metry przejazdu tego auta, suma obszarów [m]. */
  metry: number;
  numerRzutu?: number;
  komentarz?: string;
  godzinaWybudowania: string;
  createdAt: string;
}

/** Składa segmenty o tym samym numerze w jedno auto. Kolejność = kolejność wbudowywania. */
export function grupujAutaLive(plan: Plan, wpisy: WpisLive[]): AutoLogiczneLive[] {
  const kolejnoscDzialki = new Map(plan.dzialki.map((d, i) => [d.id, i]));
  const posortowane = [...wpisy].sort((a, b) => {
    if (a.numerAuta !== b.numerAuta) return a.numerAuta - b.numerAuta;
    return (kolejnoscDzialki.get(a.dzialkaId) ?? 0) - (kolejnoscDzialki.get(b.dzialkaId) ?? 0)
      || a.createdAt.localeCompare(b.createdAt);
  });
  const mapa = new Map<number, AutoLogiczneLive>();
  const kolejnosc: number[] = [];
  for (const w of posortowane) {
    const jest = mapa.get(w.numerAuta);
    if (!jest) {
      kolejnosc.push(w.numerAuta);
      mapa.set(w.numerAuta, {
        numerAuta: w.numerAuta,
        tonaz: round2(w.tonazPrzywieziony),
        metry: round2(w.przejechaneMetry),
        numerRzutu: w.numerRzutu,
        komentarz: w.komentarz,
        godzinaWybudowania: w.godzinaWybudowania,
        createdAt: w.createdAt,
      });
    } else {
      jest.tonaz = round2(jest.tonaz + w.tonazPrzywieziony);
      jest.metry = round2(jest.metry + w.przejechaneMetry);
      if (!jest.komentarz && w.komentarz) jest.komentarz = w.komentarz;
    }
  }
  return kolejnosc.map((n) => mapa.get(n)!);
}

/**
 * Zamknięcia, które nie wynikają z wypełnienia metrów – „ostatnie auto” w środku obszaru.
 * Takie obszary kolejne auta omijają.
 */
export function zamknieciaReczneDzialek(
  plan: Plan,
  wpisy: WpisLive[],
  sesje: SesjaDzialkiLive[],
): string[] {
  const ids: string[] = [];
  for (const s of sesje) {
    if (s.planId !== plan.id || !s.zakonczona) continue;
    const dz = plan.dzialki.find((d) => d.id === s.dzialkaId);
    if (!dz) continue;
    if (sumaMetrowDzialki(wpisy, dz.id) < obliczLacznaDlugosc(dz) - 0.05) ids.push(dz.id);
  }
  return ids;
}

/** Metry już ułożone na działce przed tym wpisem (wcześniejsze auta i wcześniejsze segmenty). */
export function metryPrzedWpisem(plan: Plan, wpisy: WpisLive[], wpis: WpisLive): number {
  const kolejnosc = new Map(plan.dzialki.map((d, i) => [d.id, i]));
  const naDzialce = wpisy
    .filter((w) => w.dzialkaId === wpis.dzialkaId)
    .sort((a, b) => a.numerAuta - b.numerAuta
      || (kolejnosc.get(a.dzialkaId) ?? 0) - (kolejnosc.get(b.dzialkaId) ?? 0)
      || a.createdAt.localeCompare(b.createdAt));
  let metry = 0;
  for (const w of naDzialce) {
    if (w.id === wpis.id) break;
    metry += w.przejechaneMetry;
  }
  return round2(metry);
}

/**
 * Układa auta od początku dnia. Ten sam numer zostaje na każdym obszarze,
 * a tony wcześniejszych obszarów liczą się z ich grubości.
 */
export function ulozenieAutLive(
  plan: Plan,
  auta: AutoLogiczneLive[],
  zamknieciaReczneIds: string[],
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
  noweId: () => string,
  zajeteZamknieciaIds?: string[],
): WpisLive[] {
  const reczne: SesjaDzialkiLive[] = zamknieciaReczneIds.map((id) => ({
    planId: plan.id,
    dzialkaId: id,
    zakonczona: true,
  }));
  const wynik: WpisLive[] = [];
  for (const auto of auta) {
    if (auto.metry <= 0 || auto.tonaz <= 0) continue;
    let segmenty = rozdzielMetryNaDzialki(
      plan,
      wynik,
      reczne,
      auto.metry,
      auto.tonaz,
      ciezarPoMieszance,
      { pominZamknieteGdyJuzCosLezy: true, zajeteZamknieciaIds },
    );
    if (segmenty.length === 0 && plan.dzialki.length > 0) {
      const ostatnia = plan.dzialki[plan.dzialki.length - 1];
      segmenty = [{
        dzialkaId: ostatnia.id,
        dzialkaIdx: plan.dzialki.length - 1,
        metry: round2(auto.metry),
        tonaz: round2(auto.tonaz),
      }];
    }
    for (const seg of segmenty) {
      wynik.push({
        id: noweId(),
        planId: plan.id,
        dzialkaId: seg.dzialkaId,
        numerAuta: auto.numerAuta,
        numerRzutu: auto.numerRzutu,
        tonazPrzywieziony: seg.tonaz,
        przejechaneMetry: seg.metry,
        komentarz: auto.komentarz,
        godzinaWybudowania: auto.godzinaWybudowania,
        createdAt: auto.createdAt,
      });
    }
  }
  return wynik;
}

/** Sesje po nowym ułożeniu: pełny obszar albo ręczne zamknięcie zostają, reszta wraca do układania. */
export function sesjePoUlozeniu(
  plan: Plan,
  wpisy: WpisLive[],
  reczneIds: string[],
  poprzednie: SesjaDzialkiLive[],
): SesjaDzialkiLive[] {
  const inne = poprzednie.filter((s) => s.planId !== plan.id);
  const teraz = new Date().toISOString();
  const tego: SesjaDzialkiLive[] = [];
  for (const dz of plan.dzialki) {
    const pelna = czyDzialkaWypelniona(dz, wpisy);
    const reczna = reczneIds.includes(dz.id) && !pelna;
    if (!pelna && !reczna) continue;
    const stara = poprzednie.find((s) => s.planId === plan.id && s.dzialkaId === dz.id && s.zakonczona);
    tego.push({
      planId: plan.id,
      dzialkaId: dz.id,
      zakonczona: true,
      zakonczonaAt: stara?.zakonczonaAt ?? teraz,
    });
  }
  return [...inne, ...tego];
}
