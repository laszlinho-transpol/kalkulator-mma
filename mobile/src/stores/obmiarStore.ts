// ============================================================
// STORE – OBMIAR PZT (sesje dnia z obszarami XFDF)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BazaObmiaru, ObszarObmiaru, OdsadzkaObmiaru, Punkt2D, RolaWezlaObmiaru,
  Rzut, SesjaObmiaruDnia, SkalaPzt, WpisWzObmiaru,
} from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import {
  absKilometraz, bokiFigury, idxWezlowOdcinkaKm, lancuchKrotszy, nowaOdsadzka, podlancuch,
  zastosujKilometrazKonca,
} from '../utils/obmiarFigura';
import { odsadzKrawedz, odsadzPoLancuchuOdOsi } from '../utils/obmiarOffset';
import { metryNaPunktPdf, obwodWielokata, powierzchniaWielokata } from '../utils/obmiarGeometry';
import { dlugoscUkladaniaObszaru, zastosujRoleWezla } from '../utils/obmiarLive';
import { round2 } from '../utils/calculations';
import { nadajKolejnosc, obszaryZPolygony, przeliczObszarySkalą, type WynikParsowaniaXfdf } from '../utils/xfdfParser';

const KLUCZ = '@mma:obmiar_sesje';

interface ObmiarStore {
  sesje: SesjaObmiaruDnia[];
  zaladowane: boolean;
  zaladuj: () => Promise<void>;
  utworzSesje: (nazwa: string, data: string, skala?: SkalaPzt) => Promise<SesjaObmiaruDnia>;
  usunSesje: (id: string) => Promise<void>;
  dodajObszaryZXfdf: (sesjaId: string, wynik: WynikParsowaniaXfdf) => Promise<void>;
  ustawKolejnosc: (sesjaId: string, obszaryIdsWKolejnosci: string[]) => Promise<void>;
  przesunObszar: (sesjaId: string, obszarId: string, kierunek: -1 | 1) => Promise<void>;
  usunObszar: (sesjaId: string, obszarId: string) => Promise<void>;
  zmienSkale: (sesjaId: string, skala: SkalaPzt) => Promise<void>;
  zmienNazweObszaru: (sesjaId: string, obszarId: string, nazwa: string) => Promise<void>;
  ustawRoleWezla: (sesjaId: string, obszarId: string, idx: number, rola: RolaWezlaObmiaru) => Promise<void>;
  ustawKilometraz: (
    sesjaId: string,
    obszarId: string,
    dane: Partial<Pick<ObszarObmiaru, 'kilometrazStartKm' | 'kilometrazStartM' | 'kilometrazKoniecKm' | 'kilometrazKoniecM'>>,
  ) => Promise<void>;
  ustawLiveObszaru: (
    sesjaId: string,
    obszarId: string,
    dane: { przejechaneMetry?: number; sumaTon?: number },
  ) => Promise<void>;
  zastosujOdsadzke: (
    sesjaId: string,
    obszarId: string,
    idxKrawedzi: number,
    dystansM: number,
  ) => Promise<{ deltaPowierzchniaM2: number; powierzchniaM2: number; dlugoscKrawedziM: number } | null>;
  ustawBazeObszaru: (
    sesjaId: string,
    obszarId: string,
    ktora: 'start' | 'koniec',
    dane: Partial<BazaObmiaru>,
  ) => Promise<void>;
  ustawOdsadzke: (
    sesjaId: string,
    obszarId: string,
    odsadzkaId: string,
    dane: Partial<OdsadzkaObmiaru>,
  ) => Promise<void>;
  dodajOdsadzke: (
    sesjaId: string,
    obszarId: string,
    dane?: Partial<OdsadzkaObmiaru>,
  ) => Promise<string | null>;
  usunOdsadzke: (sesjaId: string, obszarId: string, odsadzkaId: string) => Promise<void>;
  zastosujOdsadzkeLancucha: (
    sesjaId: string,
    obszarId: string,
    odsadzkaId: string,
    dystansM: number,
    extra?: Partial<OdsadzkaObmiaru>,
  ) => Promise<{ deltaPowierzchniaM2: number; powierzchniaM2: number; dlugoscKrawedziM: number } | null>;
  ustawKonfiguracjeZablokowana: (sesjaId: string, obszarId: string, zablokowana: boolean) => Promise<void>;
  ustawParametryUkladania: (
    sesjaId: string,
    obszarId: string,
    dane: {
      gruboscCm?: number;
      mieszankaId?: string;
      nazwaDzialki?: string;
      gruboscProjektowa?: number;
      tolerancja?: number;
      gruboscWbudowywania?: number;
    },
  ) => Promise<void>;
  ustawDateSesji: (sesjaId: string, data: string) => Promise<void>;
  ustawPlanDniaMeta: (sesjaId: string, dane: { tonazAuta?: number; rzuty?: Rzut[] }) => Promise<void>;
  powiazPlanSesji: (sesjaId: string, planId: string) => Promise<void>;
  dodajWpisWz: (
    sesjaId: string,
    obszarId: string,
    dane: { tony: number; przejechaneMetry: number },
  ) => Promise<WpisWzObmiaru | null>;
  usunWpisWz: (sesjaId: string, obszarId: string, wpisId: string) => Promise<void>;
  edytujWpisWz: (
    sesjaId: string,
    obszarId: string,
    wpisId: string,
    dane: { tony?: number; przejechaneMetry?: number },
  ) => Promise<void>;
  ustawKierunekUkladania: (
    sesjaId: string,
    obszarId: string,
    kierunek: 'rosnacy' | 'malejacy',
  ) => Promise<void>;
  ustawKontynuacje: (sesjaId: string, obszarId: string, kontynuacja: boolean) => Promise<void>;
  ustawBudoweSesji: (sesjaId: string, budowaId?: string) => Promise<void>;
  archiwizujSesje: (sesjaId: string) => Promise<void>;
  sesjaPoId: (id: string) => SesjaObmiaruDnia | undefined;
}

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const zapisz = async (sesje: SesjaObmiaruDnia[]) => {
  await AsyncStorage.setItem(KLUCZ, JSON.stringify(sesje));
};

function geometriaZWierzcholkow(
  o: ObszarObmiaru,
  wierzcholkiM: Punkt2D[],
  skala: SkalaPzt,
): Pick<ObszarObmiaru, 'wierzcholkiM' | 'wierzcholkiPdf' | 'powierzchniaM2' | 'obwodM' | 'wezlyRole'> {
  const k = metryNaPunktPdf(skala);
  return {
    wierzcholkiM,
    wierzcholkiPdf: wierzcholkiM.map((p) => ({ x: p.x / k, y: p.y / k })),
    powierzchniaM2: round2(powierzchniaWielokata(wierzcholkiM)),
    obwodM: round2(obwodWielokata(wierzcholkiM)),
    wezlyRole: (o.wezlyRole ?? []).map((w) => {
      const i = Math.max(0, Math.min(wierzcholkiM.length - 1, w.idx));
      return { ...w, x: wierzcholkiM[i].x, y: wierzcholkiM[i].y };
    }),
  };
}

function lancuchDlaOdsadzki(obszar: ObszarObmiaru, ods: OdsadzkaObmiaru): number[] | null {
  if (ods.idxP == null || ods.idxK == null) {
    if (ods.strona) {
      const odAbs = absKilometraz(ods.kmOdKm, ods.kmOdM);
      const doAbs = absKilometraz(ods.kmDoKm, ods.kmDoM);
      if (odAbs != null && doAbs != null) {
        const poKm = idxWezlowOdcinkaKm(obszar, ods.strona, odAbs, doAbs);
        if (poKm && poKm.length >= 1) return poKm;
      }
      const boki = bokiFigury(obszar);
      if (boki) return ods.strona === 'lewa' ? boki.lewa : boki.prawa;
    }
    return null;
  }
  const boki = bokiFigury(obszar);
  if (ods.strona && boki) {
    const bok = ods.strona === 'lewa' ? boki.lewa : boki.prawa;
    const pod = podlancuch(bok, ods.idxP, ods.idxK);
    if (pod.length >= 1) return pod;
  }
  if (ods.idxP === ods.idxK) return [ods.idxP];
  return lancuchKrotszy(obszar.wierzcholkiM.length, ods.idxP, ods.idxK);
}

function zastosujJednaOdsadzke(
  obszar: ObszarObmiaru,
  ods: OdsadzkaObmiaru,
  wierzcholki: Punkt2D[],
  dystansM: number,
) {
  const lancuch = lancuchDlaOdsadzki({ ...obszar, wierzcholkiM: wierzcholki }, { ...ods, dystansM });
  if (!lancuch || lancuch.length < 1) return null;
  const wynik = odsadzPoLancuchuOdOsi({ ...obszar, wierzcholkiM: wierzcholki }, lancuch, dystansM);
  return { wynik, lancuch };
}

function kaskadaKilometrazy(obszary: ObszarObmiaru[]): ObszarObmiaru[] {
  const sorted = [...obszary].sort((a, b) => a.kolejnosc - b.kolejnosc);
  const mapa = new Map<string, ObszarObmiaru>();
  let prev: ObszarObmiaru | undefined;
  for (const o of sorted) {
    let n: ObszarObmiaru = { ...o };
    if (n.kontynuacjaPoprzedniego && prev) {
      const km = prev.bazaKoniec?.kilometrazKm ?? prev.kilometrazKoniecKm;
      const m = prev.bazaKoniec?.kilometrazM ?? prev.kilometrazKoniecM;
      if (km != null || m != null) {
        n = {
          ...n,
          bazaStart: { ...(n.bazaStart ?? {}), kilometrazKm: km ?? 0, kilometrazM: m ?? 0 },
          kilometrazStartKm: km ?? 0,
          kilometrazStartM: m ?? 0,
        };
      }
    }
    n = zastosujKilometrazKonca(n, dlugoscUkladaniaObszaru(n));
    mapa.set(n.id, n);
    prev = n;
  }
  return obszary.map((o) => mapa.get(o.id) ?? o);
}

export const useObmiarStore = create<ObmiarStore>((set, get) => ({
  sesje: [],
  zaladowane: false,

  zaladuj: async () => {
    try {
      const json = await AsyncStorage.getItem(KLUCZ);
      set({ sesje: json ? JSON.parse(json) : [], zaladowane: true });
    } catch {
      set({ sesje: [], zaladowane: true });
    }
  },

  utworzSesje: async (nazwa, data, skala = DOMYSLNA_SKALA_PZT) => {
    const teraz = new Date().toISOString();
    const sesja: SesjaObmiaruDnia = {
      id: generujId(),
      nazwa,
      data,
      skala,
      obszary: [],
      status: 'aktywna',
      createdAt: teraz,
      updatedAt: teraz,
    };
    const zaktualizowane = [sesja, ...get().sesje];
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return sesja;
  },

  usunSesje: async (id) => {
    const zaktualizowane = get().sesje.filter((s) => s.id !== id);
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  dodajObszaryZXfdf: async (sesjaId, wynik) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const start = sesja.obszary.length + 1;
    const nowe = obszaryZPolygony(wynik, sesja.skala, start);
    const obszary = nadajKolejnosc([...sesja.obszary, ...nowe]);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId
        ? { ...s, obszary, updatedAt: new Date().toISOString() }
        : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKolejnosc: async (sesjaId, obszaryIdsWKolejnosci) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const mapa = new Map(sesja.obszary.map((o) => [o.id, o]));
    const uporzadkowane: ObszarObmiaru[] = [];
    for (const id of obszaryIdsWKolejnosci) {
      const o = mapa.get(id);
      if (o) uporzadkowane.push(o);
    }
    // dopisz ewentualnie pominięte
    for (const o of sesja.obszary) {
      if (!obszaryIdsWKolejnosci.includes(o.id)) uporzadkowane.push(o);
    }
    const obszary = nadajKolejnosc(uporzadkowane);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  przesunObszar: async (sesjaId, obszarId, kierunek) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const idx = sesja.obszary.findIndex((o) => o.id === obszarId);
    if (idx < 0) return;
    const nowyIdx = idx + kierunek;
    if (nowyIdx < 0 || nowyIdx >= sesja.obszary.length) return;
    const kopia = [...sesja.obszary];
    const [el] = kopia.splice(idx, 1);
    kopia.splice(nowyIdx, 0, el);
    const obszary = kaskadaKilometrazy(nadajKolejnosc(kopia));
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  usunObszar: async (sesjaId, obszarId) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const obszary = nadajKolejnosc(sesja.obszary.filter((o) => o.id !== obszarId));
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId ? { ...s, obszary, updatedAt: new Date().toISOString() } : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  zmienSkale: async (sesjaId, skala) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const obszary = przeliczObszarySkalą(sesja.obszary, skala);
    const zaktualizowane = get().sesje.map((s) =>
      s.id === sesjaId
        ? { ...s, skala, obszary, updatedAt: new Date().toISOString() }
        : s,
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  zmienNazweObszaru: async (sesjaId, obszarId, nazwa) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => (o.id === obszarId ? { ...o, nazwa } : o)),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawRoleWezla: async (sesjaId, obszarId, idx, rola) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          return { ...o, wezlyRole: zastosujRoleWezla(o.wierzcholkiM, o.wezlyRole, idx, rola) };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKilometraz: async (sesjaId, obszarId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => (o.id === obszarId ? { ...o, ...dane } : o)),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawLiveObszaru: async (sesjaId, obszarId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          return {
            ...o,
            przejechaneMetry: dane.przejechaneMetry !== undefined
              ? Math.max(0, dane.przejechaneMetry)
              : o.przejechaneMetry,
            sumaTon: dane.sumaTon !== undefined ? Math.max(0, dane.sumaTon) : o.sumaTon,
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  
  zastosujOdsadzke: async (sesjaId, obszarId, idxKrawedzi, dystansM) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return null;
    const obszar = sesja.obszary.find((o) => o.id === obszarId);
    if (!obszar) return null;

    const wynik = odsadzKrawedz(obszar.wierzcholkiM, idxKrawedzi, dystansM);
    const k = metryNaPunktPdf(sesja.skala);
    const wierzcholkiM = wynik.wierzcholki;
    const wierzcholkiPdf = wierzcholkiM.map((p) => ({ x: p.x / k, y: p.y / k }));
    // zaktualizuj pozycje węzłów ról
    const wezlyRole = (obszar.wezlyRole ?? []).map((w) => {
      const i = Math.max(0, Math.min(wierzcholkiM.length - 1, w.idx));
      return { ...w, x: wierzcholkiM[i].x, y: wierzcholkiM[i].y };
    });

    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) =>
          o.id !== obszarId
            ? o
            : {
                ...o,
                wierzcholkiM,
                wierzcholkiPdf,
                powierzchniaM2: wynik.powierzchniaM2,
                obwodM: wynik.obwodM,
                wezlyRole,
              },
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return {
      deltaPowierzchniaM2: wynik.deltaPowierzchniaM2,
      powierzchniaM2: wynik.powierzchniaM2,
      dlugoscKrawedziM: wynik.dlugoscKrawedziM,
    };
  },

  ustawBazeObszaru: async (sesjaId, obszarId, ktora, dane) => {
    const klucz = ktora === 'start' ? 'bazaStart' : 'bazaKoniec';
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      const obszary = s.obszary.map((o) => {
        if (o.id !== obszarId) return o;
        const baza = { ...(o[klucz] ?? {}), ...dane };
        const extra: Partial<ObszarObmiaru> = {};
        if (ktora === 'start' && dane.kilometrazKm != null) {
          extra.kilometrazStartKm = dane.kilometrazKm;
          extra.kilometrazStartM = dane.kilometrazM ?? o.kilometrazStartM;
        }
        if (ktora === 'koniec' && dane.kilometrazKm != null) {
          extra.kilometrazKoniecKm = dane.kilometrazKm;
          extra.kilometrazKoniecM = dane.kilometrazM ?? o.kilometrazKoniecM;
        }
        return { ...o, [klucz]: baza, ...extra };
      });
      return {
        ...s,
        obszary: kaskadaKilometrazy(obszary),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawOdsadzke: async (sesjaId, obszarId, odsadzkaId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          const lista = o.odsadzki?.length ? o.odsadzki : [nowaOdsadzka(1)];
          return {
            ...o,
            odsadzki: lista.map((x) => (x.id === odsadzkaId ? { ...x, ...dane } : x)),
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  dodajOdsadzke: async (sesjaId, obszarId, dane) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    const obszar = sesja?.obszary.find((o) => o.id === obszarId);
    if (!obszar) return null;
    const nr = (obszar.odsadzki?.reduce((m, x) => Math.max(m, x.nr), 0) ?? 0) + 1;
    const bazowa = nowaOdsadzka(nr);
    const nowa = { ...bazowa, ...dane, id: bazowa.id, nr };
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) =>
          o.id !== obszarId ? o : { ...o, odsadzki: [...(o.odsadzki ?? []), nowa] },
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return nowa.id;
  },

  usunOdsadzke: async (sesjaId, obszarId, odsadzkaId) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return;
    const obszar = sesja.obszary.find((o) => o.id === obszarId);
    if (!obszar) return;
    const lista = [...(obszar.odsadzki ?? [])];
    const idx = lista.findIndex((x) => x.id === odsadzkaId);
    if (idx < 0) return;
    const target = lista[idx];
    let wierz = obszar.wierzcholkiM.map((p) => ({ ...p }));
    if (target.zastosowana && target.wierzcholkiPrzed && target.wierzcholkiPrzed.length >= 3) {
      wierz = target.wierzcholkiPrzed.map((p) => ({ ...p }));
    }
    const pozostale = lista.filter((x) => x.id !== odsadzkaId);
    const geom0 = geometriaZWierzcholkow(obszar, wierz, sesja.skala);
    let oNowy: ObszarObmiaru = { ...obszar, ...geom0, odsadzki: pozostale };
    for (let i = idx; i < pozostale.length; i++) {
      const ods = pozostale[i];
      if (!ods.zastosowana || ods.dystansM == null) continue;
      const zastos = zastosujJednaOdsadzke(oNowy, ods, oNowy.wierzcholkiM, ods.dystansM);
      if (!zastos) continue;
      const przed = oNowy.wierzcholkiM.map((p) => ({ ...p }));
      const g = geometriaZWierzcholkow(oNowy, zastos.wynik.wierzcholki, sesja.skala);
      pozostale[i] = {
        ...ods,
        idxP: zastos.lancuch[0],
        idxK: zastos.lancuch[zastos.lancuch.length - 1],
        wierzcholkiPrzed: przed,
      };
      oNowy = { ...oNowy, ...g, odsadzki: pozostale };
    }
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: kaskadaKilometrazy(s.obszary.map((o) => (o.id !== obszarId ? o : oNowy))),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  zastosujOdsadzkeLancucha: async (sesjaId, obszarId, odsadzkaId, dystansM, extra) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    if (!sesja) return null;
    const obszar = sesja.obszary.find((o) => o.id === obszarId);
    if (!obszar) return null;
    const lista = [...(obszar.odsadzki ?? [])];
    const idx = lista.findIndex((x) => x.id === odsadzkaId);
    if (idx < 0) return null;
    const ods: OdsadzkaObmiaru = { ...lista[idx], ...extra, dystansM };

    let wierz = obszar.wierzcholkiM.map((p) => ({ ...p }));
    if (lista[idx].zastosowana && lista[idx].wierzcholkiPrzed && lista[idx].wierzcholkiPrzed.length >= 3) {
      wierz = lista[idx].wierzcholkiPrzed.map((p) => ({ ...p }));
    }

    const zastos = zastosujJednaOdsadzke({ ...obszar, wierzcholkiM: wierz }, ods, wierz, dystansM);
    if (!zastos) return null;
    const przed = wierz.map((p) => ({ ...p }));
    lista[idx] = {
      ...ods,
      dystansM,
      zastosowana: true,
      wierzcholkiPrzed: przed,
      idxP: zastos.lancuch[0],
      idxK: zastos.lancuch[zastos.lancuch.length - 1],
    };
    let oNowy: ObszarObmiaru = {
      ...obszar,
      ...geometriaZWierzcholkow(obszar, zastos.wynik.wierzcholki, sesja.skala),
      odsadzki: lista,
    };
    for (let i = idx + 1; i < lista.length; i++) {
      const nastepna = lista[i];
      if (!nastepna.zastosowana || nastepna.dystansM == null) continue;
      const z2 = zastosujJednaOdsadzke(oNowy, nastepna, oNowy.wierzcholkiM, nastepna.dystansM);
      if (!z2) continue;
      const przed2 = oNowy.wierzcholkiM.map((p) => ({ ...p }));
      lista[i] = {
        ...nastepna,
        idxP: z2.lancuch[0],
        idxK: z2.lancuch[z2.lancuch.length - 1],
        wierzcholkiPrzed: przed2,
      };
      oNowy = {
        ...oNowy,
        ...geometriaZWierzcholkow(oNowy, z2.wynik.wierzcholki, sesja.skala),
        odsadzki: lista,
      };
    }

    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: kaskadaKilometrazy(s.obszary.map((o) => (o.id !== obszarId ? o : oNowy))),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return {
      deltaPowierzchniaM2: zastos.wynik.deltaPowierzchniaM2,
      powierzchniaM2: oNowy.powierzchniaM2,
      dlugoscKrawedziM: zastos.wynik.dlugoscKrawedziM,
    };
  },

  ustawKonfiguracjeZablokowana: async (sesjaId, obszarId, zablokowana) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) =>
          o.id !== obszarId ? o : { ...o, konfiguracjaZablokowana: zablokowana },
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawParametryUkladania: async (sesjaId, obszarId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => (o.id !== obszarId ? o : { ...o, ...dane })),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  dodajWpisWz: async (sesjaId, obszarId, dane) => {
    const sesja = get().sesje.find((s) => s.id === sesjaId);
    const obszar = sesja?.obszary.find((o) => o.id === obszarId);
    if (!obszar) return null;
    const numer = (obszar.wpisyWz?.reduce((m, w) => Math.max(m, w.numer), 0) ?? 0) + 1;
    const wpis: WpisWzObmiaru = {
      id: generujId(),
      numer,
      tony: Math.max(0, dane.tony),
      przejechaneMetry: Math.max(0, dane.przejechaneMetry),
      createdAt: new Date().toISOString(),
    };
    const wpisy = [...(obszar.wpisyWz ?? []), wpis];
    const sumaTon = wpisy.reduce((a, w) => a + w.tony, 0);
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) =>
          o.id !== obszarId
            ? o
            : {
                ...o,
                wpisyWz: wpisy,
                sumaTon,
                przejechaneMetry: wpis.przejechaneMetry,
              },
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
    return wpis;
  },

  usunWpisWz: async (sesjaId, obszarId, wpisId) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          const wpisy = (o.wpisyWz ?? [])
            .filter((w) => w.id !== wpisId)
            .map((w, i) => ({ ...w, numer: i + 1 }));
          const ost = wpisy[wpisy.length - 1];
          return {
            ...o,
            wpisyWz: wpisy,
            sumaTon: wpisy.reduce((a, w) => a + w.tony, 0),
            przejechaneMetry: ost?.przejechaneMetry ?? 0,
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  edytujWpisWz: async (sesjaId, obszarId, wpisId, dane) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      return {
        ...s,
        obszary: s.obszary.map((o) => {
          if (o.id !== obszarId) return o;
          const wpisy = (o.wpisyWz ?? []).map((w) => {
            if (w.id !== wpisId) return w;
            return {
              ...w,
              tony: dane.tony != null ? Math.max(0, dane.tony) : w.tony,
              przejechaneMetry: dane.przejechaneMetry != null
                ? Math.max(0, dane.przejechaneMetry)
                : w.przejechaneMetry,
            };
          });
          const ost = wpisy[wpisy.length - 1];
          return {
            ...o,
            wpisyWz: wpisy,
            sumaTon: wpisy.reduce((a, w) => a + w.tony, 0),
            przejechaneMetry: ost?.przejechaneMetry ?? 0,
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKierunekUkladania: async (sesjaId, obszarId, kierunek) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      const obszary = s.obszary.map((o) =>
        o.id !== obszarId ? o : { ...o, kierunekUkladania: kierunek },
      );
      return { ...s, obszary: kaskadaKilometrazy(obszary), updatedAt: new Date().toISOString() };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawKontynuacje: async (sesjaId, obszarId, kontynuacja) => {
    const zaktualizowane = get().sesje.map((s) => {
      if (s.id !== sesjaId) return s;
      const obszary = s.obszary.map((o) =>
        o.id !== obszarId ? o : { ...o, kontynuacjaPoprzedniego: kontynuacja },
      );
      return { ...s, obszary: kaskadaKilometrazy(obszary), updatedAt: new Date().toISOString() };
    });
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawDateSesji: async (sesjaId, data) => {
    const teraz = new Date().toISOString();
    const zaktualizowane = get().sesje.map((s) =>
      s.id !== sesjaId ? s : { ...s, data, updatedAt: teraz },
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  powiazPlanSesji: async (sesjaId, planId) => {
    const teraz = new Date().toISOString();
    const zaktualizowane = get().sesje.map((s) =>
      s.id !== sesjaId ? s : { ...s, planId, updatedAt: teraz },
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawPlanDniaMeta: async (sesjaId, dane) => {
    const teraz = new Date().toISOString();
    const zaktualizowane = get().sesje.map((s) =>
      s.id !== sesjaId ? s : { ...s, ...dane, updatedAt: teraz },
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  ustawBudoweSesji: async (sesjaId, budowaId) => {
    const teraz = new Date().toISOString();
    const zaktualizowane = get().sesje.map((s) =>
      s.id !== sesjaId ? s : { ...s, budowaId, updatedAt: teraz },
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  archiwizujSesje: async (sesjaId) => {
    const teraz = new Date().toISOString();
    const zaktualizowane = get().sesje.map((s) =>
      s.id !== sesjaId
        ? s
        : { ...s, status: 'archiwalna' as const, zakonczonoAt: teraz, updatedAt: teraz },
    );
    set({ sesje: zaktualizowane });
    await zapisz(zaktualizowane);
  },

  sesjaPoId: (id) => get().sesje.find((s) => s.id === id),
}));
