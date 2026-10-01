// ============================================================
// PLAN MASY Z PROJEKTU BUDOWY – odcinki konstrukcji, powierzchnia, szkic PZT
// ============================================================

import type {
  ArkuszPzt,
  DzialkaRobocza,
  FiguraProstokat,
  KategoriaWarstwy,
  Mieszanka,
  Plan,
  ObszarObmiaru,
  ProjektBudowy,
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
    const s0 = Math.max(0, lo - arkusz.kilometrazPoczatkowyM);
    const s1 = Math.min(
      arkusz.osTrasy?.dlugoscM ?? (arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM),
      hi - arkusz.kilometrazPoczatkowyM,
    );
    if (s1 <= s0 + 0.05) continue;
    if (osM && osM.length >= 2) {
      for (const o of matching) {
        suma += powierzchniaWycinkaM2(o, osM, s0, s1, odsadzkaLewaCm, odsadzkaPrawaCm);
      }
    } else {
      const dlArk = Math.max(0.01, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM);
      const udzial = Math.max(0, s1 - s0) / dlArk;
      const extra = Math.abs(s1 - s0) * ((Math.max(0, odsadzkaLewaCm) + Math.max(0, odsadzkaPrawaCm)) / 100);
      for (const o of matching) {
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
}

export function policzOdcinkiPlanu(
  projekt: ProjektBudowy,
  opts: {
    legendaId: string;
    odM: number;
    doM: number;
    warstwaNazwa: string;
    warstwaKategoria?: KategoriaWarstwy;
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
    const pow = powierzchniaOdcinkaM2(
      projekt,
      opts.legendaId,
      s.odM,
      s.doM,
      opts.odsadzkaLewaCm,
      opts.odsadzkaPrawaCm,
    );
    const masa = tonyZPowierzchni(pow, grubosc, opts.gestoscTm3);
    return {
      ...s,
      gruboscWbudowywaniaCm: grubosc,
      powierzchniaM2: pow,
      masaMg: masa,
      auta: Math.max(0, Math.ceil(masa / tonaz)),
    };
  });
}

function dzialkaZOdcinka(
  odc: OdcinekPlanuPoliczony,
  opts: {
    mieszankaId: string;
    kierunek: 'rosnacy' | 'malejacy';
    warstwaNazwa: string;
    obszarNazwa: string;
  },
): DzialkaRobocza {
  const start = opts.kierunek === 'malejacy' ? odc.doM : odc.odM;
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
    nazwa: `${formatujKmM(odc.odM)} – ${formatujKmM(odc.doM)}`,
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
  const dzialki = odcinki.map((o) => dzialkaZOdcinka(o, {
    mieszankaId: dane.mieszankaId,
    kierunek,
    warstwaNazwa: dane.warstwaNazwa,
    obszarNazwa: dane.obszarNazwa,
  }));
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
  };
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
