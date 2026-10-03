// ============================================================
// PLAN MASY Z PROJEKTU BUDOWY – odcinki konstrukcji, powierzchnia, szkic PZT
// ============================================================

import type {
  ArkuszPzt,
  DzialkaRobocza,
  FiguraProstokat,
  KategoriaWarstwy,
  KrawedznikObmiaru,
  Mieszanka,
  Plan,
  ObszarObmiaru,
  ProjektBudowy,
  Punkt2D,
  Rzut,
  WarstwaKonstrukcji,
  WpisLegendy,
} from '../types';
import { round2, round3, generujDomyslneRzuty } from './calculations';
import { formatujDateKrotko } from './dates';
import {
  arkuszeNachodzaceNaKm,
  arkuszWycinekDlaKm,
  powierzchniaWycinkaM2,
  stacjaNaOsi,
  stacjeLokalneNaOsiM,
} from './osPzt';
import {
  formatujKmM,
  kluczLegendy,
  odsadzkiWarstwy,
  segmentyKonstrukcji,
  tonyZPowierzchni,
} from './projektBudowy';

const generujId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function pasujeWarstwa(
  w: WarstwaKonstrukcji,
  nazwa: string,
  kategoria?: KategoriaWarstwy,
): boolean {
  if (kategoria && w.kategoria === kategoria) return true;
  const a = w.nazwa.trim().toLowerCase();
  const b = nazwa.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function opisWarstw(warstwy: WarstwaKonstrukcji[]): string {
  return [...warstwy]
    .sort((a, b) => a.kolejnosc - b.kolejnosc)
    .map((w) => `${w.nazwa} ${w.gruboscCm} cm`)
    .join(', ');
}

export function wpisLegendyObszaru(projekt: ProjektBudowy, legendaId: string): WpisLegendy | undefined {
  return projekt.legenda.find((w) => w.id === legendaId && w.typ === 'obszar');
}

export function obszaryLegendy(projekt: ProjektBudowy, legendaId: string): Array<{ arkusz: ArkuszPzt; obszar: ObszarObmiaru }> {
  const wpis = wpisLegendyObszaru(projekt, legendaId);
  if (!wpis) return [];
  const out: Array<{ arkusz: ArkuszPzt; obszar: ObszarObmiaru }> = [];
  for (const arkusz of projekt.arkusze) {
    for (const obszar of arkusz.obszary) {
      if (kluczLegendy('obszar', obszar.kolorWypelnienia) === wpis.klucz) {
        out.push({ arkusz, obszar });
      }
    }
  }
  return out;
}

export function zakresKmObszaru(projekt: ProjektBudowy, legendaId: string): { odM: number; doM: number } | null {
  const pary = obszaryLegendy(projekt, legendaId);
  if (pary.length === 0) {
    const arkusze = projekt.arkusze;
    if (arkusze.length === 0) return null;
    return {
      odM: Math.min(...arkusze.map((a) => a.kilometrazPoczatkowyM)),
      doM: Math.max(...arkusze.map((a) => a.kilometrazKoncowyM)),
    };
  }
  const odM = Math.min(...pary.map((p) => p.arkusz.kilometrazPoczatkowyM));
  const doM = Math.max(...pary.map((p) => p.arkusz.kilometrazKoncowyM));
  return { odM, doM };
}

export interface OpcjaWarstwyPlanu {
  nazwa: string;
  kategoria: KategoriaWarstwy;
  odsadzkaCm: number;
  odsadzkaLewaCm: number;
  odsadzkaPrawaCm: number;
  mieszankaIds: string[];
}

export function opcjeWarstwWZakresie(
  projekt: ProjektBudowy,
  legendaId: string,
  odM: number,
  doM: number,
): OpcjaWarstwyPlanu[] {
  const konstrukcja = projekt.konstrukcje.find((k) => k.legendaId === legendaId);
  if (!konstrukcja) return [];
  const seg = segmentyKonstrukcji(konstrukcja, odM, doM);
  const mapa = new Map<string, OpcjaWarstwyPlanu>();
  for (const s of seg) {
    for (const w of s.warstwy) {
      const klucz = `${w.kategoria}|${w.nazwa.trim().toLowerCase()}`;
      if (!mapa.has(klucz)) {
        mapa.set(klucz, {
          nazwa: w.nazwa,
          kategoria: w.kategoria,
          odsadzkaCm: w.odsadzkaCm,
          odsadzkaLewaCm: odsadzkiWarstwy(w).lewa,
          odsadzkaPrawaCm: odsadzkiWarstwy(w).prawa,
          mieszankaIds: [...w.mieszankaIds],
        });
      } else {
        const prev = mapa.get(klucz)!;
        prev.mieszankaIds = [...new Set([...prev.mieszankaIds, ...w.mieszankaIds])];
      }
    }
  }
  return [...mapa.values()];
}

export interface OdcinekKonstrukcjiPlanu {
  odM: number;
  doM: number;
  wyjateks: boolean;
  warstwy: WarstwaKonstrukcji[];
  warstwa?: WarstwaKonstrukcji;
  opisKonstrukcji: string;
  gruboscProjektowaCm: number;
}

export function odcinkiKonstrukcjiDlaWarstwy(
  projekt: ProjektBudowy,
  legendaId: string,
  odM: number,
  doM: number,
  warstwaNazwa: string,
  warstwaKategoria?: KategoriaWarstwy,
): OdcinekKonstrukcjiPlanu[] {
  const konstrukcja = projekt.konstrukcje.find((k) => k.legendaId === legendaId);
  if (!konstrukcja) return [];
  const podpisBazy = opisWarstw(konstrukcja.warstwy);
  const seg = segmentyKonstrukcji(konstrukcja, odM, doM);
  const kierunekMalejacy = odM > doM;
  const ordered = kierunekMalejacy ? [...seg].reverse() : seg;
  return ordered.map((s) => {
    const warstwa = s.warstwy.find((w) => pasujeWarstwa(w, warstwaNazwa, warstwaKategoria));
    return {
      odM: s.od,
      doM: s.do,
      wyjateks: opisWarstw(s.warstwy) !== podpisBazy,
      warstwy: s.warstwy,
      warstwa,
      opisKonstrukcji: opisWarstw(s.warstwy),
      gruboscProjektowaCm: warstwa?.gruboscCm ?? 0,
    };
  });
}

function pasujeObszarLegendy(projekt: ProjektBudowy, legendaId: string) {
  const wpis = wpisLegendyObszaru(projekt, legendaId);
  return (o: { kolorWypelnienia?: string }) =>
    !!wpis && kluczLegendy('obszar', o.kolorWypelnienia) === wpis.klucz;
}

/** Krawężnik zewnętrzny L / od osi P na jezdni lewej; odwrotnie na prawej. */
export function stronaKrawedznika(
  obszar: Pick<ObszarObmiaru, 'stronaTrasy'>,
  kr: Pick<KrawedznikObmiaru, 'polozenie'>,
): 'lewa' | 'prawa' {
  if (obszar.stronaTrasy === 'prawa') {
    return kr.polozenie === 'zewnetrzna' ? 'prawa' : 'lewa';
  }
  return kr.polozenie === 'zewnetrzna' ? 'lewa' : 'prawa';
}

function zakresKrawedznikaNaOsi(kr: Pick<KrawedznikObmiaru, 'wierzcholkiM'>, osM: Punkt2D[]): { s0: number; s1: number } | null {
  if (osM.length < 2 || kr.wierzcholkiM.length < 1) return null;
  const stacje = kr.wierzcholkiM.map((p) => stacjaNaOsi(osM, p));
  return { s0: Math.min(...stacje), s1: Math.max(...stacje) };
}

/** 0…1: jaka część wycinka [s0,s1] ma krawężnik na danej stronie. */
export function udzialKrawedznikaNaStronie(
  obszar: ObszarObmiaru,
  osM: Punkt2D[] | undefined,
  s0: number,
  s1: number,
  strona: 'lewa' | 'prawa',
): number {
  const dl = Math.max(0, s1 - s0);
  const lista = (obszar.krawedzniki ?? []).filter((kr) => stronaKrawedznika(obszar, kr) === strona && kr.dlugoscM > 1);
  if (lista.length === 0) return 0;
  if (dl < 1e-6 || !osM || osM.length < 2) return 1;
  let pokryte = 0;
  for (const kr of lista) {
    const z = zakresKrawedznikaNaOsi(kr, osM);
    if (!z) {
      pokryte += dl;
      continue;
    }
    const a = Math.max(s0, Math.min(z.s0, z.s1));
    const b = Math.min(s1, Math.max(z.s0, z.s1));
    if (b > a) pokryte += b - a;
  }
  return Math.max(0, Math.min(1, pokryte / dl));
}

/** Dodatnia odsadzka tylko tam, gdzie nie ma krawężnika. Ujemna (zwężenie) zostaje. */
export function odsadzkiBezKrawedznika(
  obszar: ObszarObmiaru,
  osM: Punkt2D[] | undefined,
  s0: number,
  s1: number,
  odsadzkaLewaCm: number,
  odsadzkaPrawaCm: number,
): { lewa: number; prawa: number } {
  const uL = odsadzkaLewaCm > 0 ? udzialKrawedznikaNaStronie(obszar, osM, s0, s1, 'lewa') : 0;
  const uP = odsadzkaPrawaCm > 0 ? udzialKrawedznikaNaStronie(obszar, osM, s0, s1, 'prawa') : 0;
  return {
    lewa: odsadzkaLewaCm > 0 ? odsadzkaLewaCm * (1 - uL) : odsadzkaLewaCm,
    prawa: odsadzkaPrawaCm > 0 ? odsadzkaPrawaCm * (1 - uP) : odsadzkaPrawaCm,
  };
}

export function powierzchniaOdcinkaM2(
  projekt: ProjektBudowy,
  legendaId: string,
  odM: number,
  doM: number,
  odsadzkaLewaCm: number,
  odsadzkaPrawaCm: number,
): number {
  const lo = Math.min(odM, doM);
  const hi = Math.max(odM, doM);
  const pasuje = pasujeObszarLegendy(projekt, legendaId);
  let suma = 0;
  for (const arkusz of arkuszeNachodzaceNaKm(projekt, lo, hi)) {
    const matching = arkusz.obszary.filter(pasuje);
    const osM = arkusz.osTrasy?.wierzcholkiM;
    const { s0, s1 } = stacjeLokalneNaOsiM(arkusz, lo, hi);
    if (s1 <= s0 + 0.05) continue;
    if (osM && osM.length >= 2) {
      for (const o of matching) {
        const ods = odsadzkiBezKrawedznika(o, osM, s0, s1, odsadzkaLewaCm, odsadzkaPrawaCm);
        suma += powierzchniaWycinkaM2(o, osM, s0, s1, ods.lewa, ods.prawa);
      }
    } else {
      const dlArk = Math.max(0.01, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM);
      const udzial = Math.max(0, s1 - s0) / dlArk;
      for (const o of matching) {
        const ods = odsadzkiBezKrawedznika(o, osM, s0, s1, odsadzkaLewaCm, odsadzkaPrawaCm);
        const extra = Math.abs(s1 - s0) * ((ods.lewa + ods.prawa) / 100);
        suma += o.powierzchniaM2 * udzial + extra / Math.max(matching.length, 1);
      }
    }
  }
  return round2(Math.max(0, suma));
}

export interface OdcinekPlanuPoliczony extends OdcinekKonstrukcjiPlanu {
  gruboscWbudowywaniaCm: number;
  powierzchniaM2: number;
  masaMg: number;
  auta: number;
  odsadzkaLewaCm: number;
  odsadzkaPrawaCm: number;
}

export function parsujOdsadzkeCm(s: string): number {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Wartość wpisana w planie (extra vs obrys PZT). Konstrukcja nie jest doliczana. */
export function odsadzkiWpisaneWPlanie(
  plan: Pick<Plan, 'odsadzkaLewaCm' | 'odsadzkaPrawaCm' | 'odsadzkaKorektaLewaCm' | 'odsadzkaKorektaPrawaCm'>,
): { lewa: number; prawa: number } {
  if (plan.odsadzkaKorektaLewaCm != null || plan.odsadzkaKorektaPrawaCm != null) {
    return {
      lewa: plan.odsadzkaKorektaLewaCm ?? 0,
      prawa: plan.odsadzkaKorektaPrawaCm ?? 0,
    };
  }
  return {
    lewa: plan.odsadzkaLewaCm ?? 0,
    prawa: plan.odsadzkaPrawaCm ?? 0,
  };
}

export function policzOdcinkiPlanu(
  projekt: ProjektBudowy,
  opts: {
    legendaId: string;
    odM: number;
    doM: number;
    warstwaNazwa: string;
    warstwaKategoria?: KategoriaWarstwy;
    /** Extra vs obrys PZT [cm]. 0 = sam obrys. Ujemna zwęża. Przy krawężniku dodatnia = 0. */
    odsadzkaLewaCm: number;
    odsadzkaPrawaCm: number;
    gestoscTm3: number;
    tonazAuta: number;
    grubosciCm?: number[];
  },
): OdcinekPlanuPoliczony[] {
  const baza = odcinkiKonstrukcjiDlaWarstwy(
    projekt,
    opts.legendaId,
    opts.odM,
    opts.doM,
    opts.warstwaNazwa,
    opts.warstwaKategoria,
  );
  const tonaz = Math.max(0.01, opts.tonazAuta);
  return baza.map((s, i) => {
    const grubosc = opts.grubosciCm?.[i] ?? s.gruboscProjektowaCm;
    const lewa = opts.odsadzkaLewaCm;
    const prawa = opts.odsadzkaPrawaCm;
    const pow = powierzchniaOdcinkaM2(
      projekt,
      opts.legendaId,
      s.odM,
      s.doM,
      lewa,
      prawa,
    );
    const masa = tonyZPowierzchni(pow, grubosc, opts.gestoscTm3);
    return {
      ...s,
      gruboscWbudowywaniaCm: grubosc,
      powierzchniaM2: pow,
      masaMg: masa,
      auta: Math.max(0, Math.ceil(masa / tonaz)),
      odsadzkaLewaCm: lewa,
      odsadzkaPrawaCm: prawa,
    };
  });
}

const KROK_PROFILU_SZEROKOSCI_M = 10;
const TOL_SCALANIA_SZER_M = 0.03;

export type PlasterekObmiaru = { dlugoscM: number; szerokoscM: number; powierzchniaM2: number };

/** Łączy sąsiednie plasterki o prawie tej samej szerokości (stała jezdnia = jeden odcinek). */
export function scalPlasterkiObmiaru(plasterki: PlasterekObmiaru[]): PlasterekObmiaru[] {
  const out: PlasterekObmiaru[] = [];
  for (const p of plasterki) {
    const ost = out[out.length - 1];
    if (ost && Math.abs(ost.szerokoscM - p.szerokoscM) < TOL_SCALANIA_SZER_M) {
      const dl = ost.dlugoscM + p.dlugoscM;
      const pow = ost.powierzchniaM2 + p.powierzchniaM2;
      ost.dlugoscM = round2(dl);
      ost.powierzchniaM2 = round2(pow);
      ost.szerokoscM = round2(dl > 0 ? pow / dl : 0);
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

export function plasterkiSzerokosciOdcinka(
  projekt: ProjektBudowy,
  opts: {
    legendaId: string;
    odM: number;
    doM: number;
    odsadzkaLewaCm: number;
    odsadzkaPrawaCm: number;
    krokM?: number;
  },
): PlasterekObmiaru[] {
  const sign = opts.doM >= opts.odM ? 1 : -1;
  const total = Math.abs(opts.doM - opts.odM);
  const krok = Math.max(2, opts.krokM ?? KROK_PROFILU_SZEROKOSCI_M);
  if (total < 0.05) return [];
  const out: PlasterekObmiaru[] = [];
  let t = 0;
  while (t < total - 0.02) {
    let dt = Math.min(krok, total - t);
    if (total - t - dt < 3 && total - t > dt) dt = total - t;
    const a = opts.odM + sign * t;
    const b = opts.odM + sign * (t + dt);
    const pow = powierzchniaOdcinkaM2(
      projekt,
      opts.legendaId,
      a,
      b,
      opts.odsadzkaLewaCm,
      opts.odsadzkaPrawaCm,
    );
    const szer = dt > 0 ? pow / dt : 0;
    out.push({ dlugoscM: round2(dt), szerokoscM: round2(Math.max(0, szer)), powierzchniaM2: pow });
    t += dt;
  }
  return scalPlasterkiObmiaru(out);
}

function dzialkaZOdcinka(
  odc: OdcinekPlanuPoliczony,
  opts: {
    mieszankaId: string;
    kierunek: 'rosnacy' | 'malejacy';
    warstwaNazwa: string;
    obszarNazwa: string;
    profilSzerokosci?: PlasterekObmiaru[];
  },
): DzialkaRobocza {
  const start = opts.kierunek === 'malejacy' ? odc.doM : odc.odM;
  const koniec = opts.kierunek === 'malejacy' ? odc.odM : odc.doM;
  const dl = Math.max(0.01, Math.abs(odc.doM - odc.odM));
  const szer = Math.max(0.01, odc.powierzchniaM2 / dl);
  const figura: FiguraProstokat = {
    id: `${generujId()}-fig`,
    typ: 'prostokat',
    numeracja: 1,
    kilometrazPoczatkowy: start,
    szerokosc: round2(szer),
    dlugosc: round2(dl),
  };
  const km = Math.floor(start / 1000);
  const m = Math.round(start % 1000);
  return {
    id: generujId(),
    nazwa: `${formatujKmM(start)} – ${formatujKmM(koniec)}`,
    mieszankaId: opts.mieszankaId,
    grubosc: odc.gruboscWbudowywaniaCm,
    gruboscProjektowa: odc.gruboscProjektowaCm,
    tolerancja: 10,
    gruboscWbudowywania: odc.gruboscWbudowywaniaCm,
    opis: `${opts.warstwaNazwa} · ${opts.obszarNazwa}${odc.wyjateks ? ` · wyjątek: ${odc.opisKonstrukcji}` : ` · ${odc.opisKonstrukcji}`}`,
    kilometrazPoczatkowyKm: km,
    kilometrazPoczatkowyM: m,
    kierunekUkladania: opts.kierunek,
    figury: [figura],
    profilSzerokosci: opts.profilSzerokosci?.length ? opts.profilSzerokosci : undefined,
  };
}

export interface DanePlanuZBudowy {
  budowaId: string;
  dataWbudowywania: string;
  legendaId: string;
  obszarNazwa: string;
  warstwaNazwa: string;
  warstwaKategoria?: KategoriaWarstwy;
  kilometrazOdM: number;
  kilometrazDoM: number;
  /** Extra vs obrys PZT [cm]. 0 = sam obrys. */
  odsadzkaLewaCm: number;
  odsadzkaPrawaCm: number;
  mieszankaId: string;
  gestoscTm3: number;
  tonazAuta: number;
  rzuty?: Rzut[];
  grubosciCm?: number[];
}

export function zbudujPlanZBudowy(
  projekt: ProjektBudowy,
  dane: DanePlanuZBudowy,
): Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> {
  const odcinki = policzOdcinkiPlanu(projekt, {
    legendaId: dane.legendaId,
    odM: dane.kilometrazOdM,
    doM: dane.kilometrazDoM,
    warstwaNazwa: dane.warstwaNazwa,
    warstwaKategoria: dane.warstwaKategoria,
    odsadzkaLewaCm: dane.odsadzkaLewaCm,
    odsadzkaPrawaCm: dane.odsadzkaPrawaCm,
    gestoscTm3: dane.gestoscTm3,
    tonazAuta: dane.tonazAuta,
    grubosciCm: dane.grubosciCm,
  });
  const kierunek = dane.kilometrazOdM > dane.kilometrazDoM ? 'malejacy' : 'rosnacy';
  const dzialki = odcinki.map((o) => {
    const start = kierunek === 'malejacy' ? o.doM : o.odM;
    const koniec = kierunek === 'malejacy' ? o.odM : o.doM;
    const profil = plasterkiSzerokosciOdcinka(projekt, {
      legendaId: dane.legendaId,
      odM: start,
      doM: koniec,
      odsadzkaLewaCm: dane.odsadzkaLewaCm,
      odsadzkaPrawaCm: dane.odsadzkaPrawaCm,
    });
    return dzialkaZOdcinka(o, {
      mieszankaId: dane.mieszankaId,
      kierunek,
      warstwaNazwa: dane.warstwaNazwa,
      obszarNazwa: dane.obszarNazwa,
      profilSzerokosci: profil,
    });
  });
  const sumaAut = odcinki.reduce((s, o) => s + o.auta, 0);
  return {
    dataWbudowywania: dane.dataWbudowywania,
    budowaId: dane.budowaId,
    iloscDzialek: dzialki.length,
    dzialki,
    tonazAuta: dane.tonazAuta,
    rzuty: dane.rzuty?.length ? dane.rzuty : generujDomyslneRzuty(Math.max(1, sumaAut)),
    status: 'aktywny',
    zrodlo: 'budowa',
    legendaId: dane.legendaId,
    obszarNazwa: dane.obszarNazwa,
    warstwaNazwa: dane.warstwaNazwa,
    warstwaKategoria: dane.warstwaKategoria,
    kilometrazOdM: dane.kilometrazOdM,
    kilometrazDoM: dane.kilometrazDoM,
    odsadzkaLewaCm: dane.odsadzkaLewaCm,
    odsadzkaPrawaCm: dane.odsadzkaPrawaCm,
    odsadzkaKorektaLewaCm: dane.odsadzkaLewaCm,
    odsadzkaKorektaPrawaCm: dane.odsadzkaPrawaCm,
  };
}

/** Uzupełnia brakujące m² w zapisanym profilu. Nie liczy PZT przy otwarciu (to wiesza UI). */
export function uzupelnijProfilObmiaruDzialek(
  _projekt: ProjektBudowy | undefined,
  plan: Plan | null | undefined,
): DzialkaRobocza[] {
  if (!plan) return [];
  let zmieniono = false;
  const dzialki = plan.dzialki.map((dz) => {
    const profil = dz.profilSzerokosci;
    if (!profil?.length) return dz;
    let braki = false;
    const uzup = profil.map((p) => {
      if (p.powierzchniaM2 != null) return p;
      braki = true;
      return { ...p, powierzchniaM2: round2((p.szerokoscM ?? 0) * p.dlugoscM) };
    });
    if (!braki) return dz;
    zmieniono = true;
    return { ...dz, profilSzerokosci: uzup };
  });
  return zmieniono ? dzialki : plan.dzialki;
}

export function planZProfilemObmiaru(
  projekt: ProjektBudowy | undefined,
  plan: Plan,
): Plan {
  const dzialki = uzupelnijProfilObmiaruDzialek(projekt, plan);
  return dzialki === plan.dzialki ? plan : { ...plan, dzialki };
}

export function tytulPlanuBudowy(plan: Pick<Plan, 'warstwaNazwa' | 'dataWbudowywania' | 'dzialki'>): string {
  const iso = plan.dataWbudowywania;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const data = m ? `${m[3]}.${m[2]}.${m[1]}` : formatujDateKrotko(iso);
  if (plan.warstwaNazwa?.trim()) return `${plan.warstwaNazwa} ${data}`;
  const pierwsza = plan.dzialki[0]?.nazwa;
  return pierwsza ? `${pierwsza} ${data}` : data;
}

export function komentarzPlanuBudowy(plan: Pick<Plan, 'kilometrazOdM' | 'kilometrazDoM' | 'obszarNazwa'>): string {
  const od = plan.kilometrazOdM;
  const doM = plan.kilometrazDoM;
  const km = od != null && doM != null ? `${formatujKmM(od)} - ${formatujKmM(doM)}` : '';
  const obszar = plan.obszarNazwa?.trim() ?? '';
  return [km, obszar].filter(Boolean).join(' ');
}

export function arkuszeSzkicuPlanu(projekt: ProjektBudowy, plan: Plan): ArkuszPzt[] {
  const od = plan.kilometrazOdM;
  const doM = plan.kilometrazDoM;
  if (od == null || doM == null || !plan.legendaId) return [];
  const pasuje = pasujeObszarLegendy(projekt, plan.legendaId);
  return arkuszeNachodzaceNaKm(projekt, od, doM)
    .map((a) => arkuszWycinekDlaKm(a, pasuje, od, doM))
    .filter((a) => a.obszary.length > 0);
}

export function gestoscZRecepty(
  mieszankaId: string | undefined,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
  fallback = 2.45,
): number {
  const m = mieszankaId ? mieszanki.find((x) => x.id === mieszankaId) : undefined;
  return m && m.ciezarObjetosciowy > 0 ? m.ciezarObjetosciowy : fallback;
}
