// ============================================================
// PROJEKT BUDOWY – PZT, legenda, konstrukcje, przedmiar
// ============================================================

import { DO_METROW_BIEZACYCH, FORMAT_KILOMETRAZU, Z_METROW_BIEZACYCH } from '../constants';
import type {
  ArkuszPzt,
  KategoriaWarstwy,
  KonstrukcjaObszaru,
  Mieszanka,
  ObszarObmiaru,
  ProjektBudowy,
  SkalaPzt,
  TypElementuLegendy,
  WarstwaKonstrukcji,
  WpisLegendy,
  WierszPrzedmiaruScalony,
  WyjatekKonstrukcji,
} from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import { round2, round3 } from './calculations';
import { dlugoscUkladaniaObszaru } from './obmiarLive';
import { dlugoscKilometrazaObszaru, bokiFigury } from './obmiarFigura';
import { obszaryZPolygony, stronaTrasyZKoloru, type WynikParsowaniaXfdf } from './xfdfParser';
import { skalujWierzcholki } from './obmiarGeometry';
import {
  dlugoscObszarowWzdluzOsiM,
  dlugoscPikietazuJezdniM,
  dlugoscPolilinii,
  dopasujGeometrieArkuszaDoDlugosci,
  dopasujGeometrieArkuszaDoEtykiety,
  kierunekRosnacegoKm,
  orientujLancuchDoKm,
} from './osPzt';

export const GESTOSC_MMA_DOMYSLNA = 2.45;
export const GESTOSC_KLSM_DOMYSLNA = 2.0;
export const DOMYSLNY_KM_START_PZT = 0;

let _idSeq = 0;
const generujId = (): string =>
  `${Date.now().toString(36)}${(_idSeq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function pustyProjektBudowy(kilometrazPoczatkowyM = DOMYSLNY_KM_START_PZT): ProjektBudowy {
  return {
    kilometrazPoczatkowyM,
    podzialkaKilometrazuM: 50,
    skala: DOMYSLNA_SKALA_PZT,
    arkusze: [],
    legenda: [],
    konstrukcje: [],
    scaloneWiersze: [],
  };
}

export function normalizujKolorHex(hex?: string): string {
  if (!hex) return '#000000';
  let h = hex.trim().toUpperCase();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9A-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9A-F]{6}$/.test(h)) return '#000000';
  return h;
}

export function kluczLegendy(typ: TypElementuLegendy, kolor?: string): string {
  return `${typ}|${normalizujKolorHex(kolor)}`;
}

export function sugerowanaNazwaLegendy(
  typ: TypElementuLegendy,
  kolor?: string,
  strona?: 'lewa' | 'prawa',
): string {
  const k = normalizujKolorHex(kolor);
  const stronaZKoloru = strona ?? stronaTrasyZKoloru(k);
  if (typ === 'os') return 'oś trasy';
  if (typ === 'obszar') {
    if (stronaZKoloru === 'lewa') return 'Trasa główna (strona lewa)';
    if (stronaZKoloru === 'prawa') return 'Trasa główna (strona prawa)';
    return '';
  }
  if (k === '#FF0000' || k === '#E53935' || k === '#C62828' || k === '#F44336') {
    return 'krawężnik (brak odsadzek)';
  }
  return '';
}

export function nowaWarstwa(
  partial: Partial<WarstwaKonstrukcji> & Pick<WarstwaKonstrukcji, 'nazwa' | 'kolejnosc'>,
): WarstwaKonstrukcji {
  const lewa = partial.odsadzkaLewaCm ?? partial.odsadzkaCm ?? 0;
  const prawa = partial.odsadzkaPrawaCm ?? partial.odsadzkaCm ?? 0;
  return {
    id: generujId(),
    rodzajOpis: '',
    gruboscCm: 4,
    kategoria: 'inna',
    mieszankaIds: [],
    ...partial,
    odsadzkaLewaCm: partial.odsadzkaLewaCm ?? lewa,
    odsadzkaPrawaCm: partial.odsadzkaPrawaCm ?? prawa,
    odsadzkaCm: partial.odsadzkaCm ?? lewa,
  };
}

/** Odsadzki L/P: nowe pola; stary zapis ma tylko odsadzkaCm (jedna krawędź). */
export function odsadzkiWarstwy(
  w: Pick<WarstwaKonstrukcji, 'odsadzkaCm' | 'odsadzkaLewaCm' | 'odsadzkaPrawaCm'>,
): { lewa: number; prawa: number } {
  if (w.odsadzkaLewaCm != null || w.odsadzkaPrawaCm != null) {
    return { lewa: w.odsadzkaLewaCm ?? 0, prawa: w.odsadzkaPrawaCm ?? 0 };
  }
  return { lewa: w.odsadzkaCm ?? 0, prawa: 0 };
}

/** Domyślny układ: SMA 4/0, wiążąca 6/7, podbudowa 10/15, KŁSM 20/25. */
export function domyslneWarstwyKonstrukcji(): WarstwaKonstrukcji[] {
  return [
    nowaWarstwa({
      kolejnosc: 1,
      nazwa: 'SMA8',
      rodzajOpis: 'KR 3-7',
      gruboscCm: 4,
      odsadzkaCm: 0,
      odsadzkaLewaCm: 0,
      odsadzkaPrawaCm: 0,
      kategoria: 'sma',
    }),
    nowaWarstwa({
      kolejnosc: 2,
      nazwa: 'Wiążąca',
      rodzajOpis: 'KR 3-7',
      gruboscCm: 6,
      odsadzkaCm: 7,
      odsadzkaLewaCm: 7,
      odsadzkaPrawaCm: 7,
      kategoria: 'wiazaca',
    }),
    nowaWarstwa({
      kolejnosc: 3,
      nazwa: 'Podbudowa',
      rodzajOpis: 'KR 3-7',
      gruboscCm: 10,
      odsadzkaCm: 15,
      odsadzkaLewaCm: 15,
      odsadzkaPrawaCm: 15,
      kategoria: 'podbudowa',
    }),
    nowaWarstwa({
      kolejnosc: 4,
      nazwa: 'KŁSM',
      rodzajOpis: 'kruszywo łamane 0-31,5',
      gruboscCm: 20,
      odsadzkaCm: 25,
      odsadzkaLewaCm: 25,
      odsadzkaPrawaCm: 25,
      kategoria: 'klsm',
    }),
  ];
}

export function sklonujWarstwy(warstwy: WarstwaKonstrukcji[]): WarstwaKonstrukcji[] {
  return warstwy.map((w, i) => ({
    ...w,
    id: generujId(),
    kolejnosc: i + 1,
    mieszankaIds: [...w.mieszankaIds],
  }));
}

export function arkuszZWynikuXfdf(
  wynik: WynikParsowaniaXfdf,
  opts: {
    kolejnosc: number;
    kontynuacjaPoprzedniego: boolean;
    skala?: SkalaPzt;
    kolejnoscObszarowStart?: number;
  },
): ArkuszPzt {
  const skala = opts.skala ?? DOMYSLNA_SKALA_PZT;
  const os0 = wynik.osTrasy;
  const kier = kierunekRosnacegoKm(wynik.polygony.flatMap((g) => g.wierzcholki));
  const wynikOs = os0 && os0.wierzcholki.length >= 2
    ? {
      ...wynik,
      osTrasy: { ...os0, wierzcholki: orientujLancuchDoKm(os0.wierzcholki, kier) },
    }
    : wynik;
  const obszary = obszaryZPolygony(wynikOs, skala, opts.kolejnoscObszarowStart ?? 1);
  const nazwa = wynikOs.zrodloNazwa.replace(/\.(xfdf|xml|txt)$/i, '');
  const os = wynikOs.osTrasy;
  const wierzcholkiM = os && os.wierzcholki.length >= 2
    ? skalujWierzcholki(os.wierzcholki, skala)
    : [];
  const geomM = wierzcholkiM.length >= 2 ? round2(dlugoscPolilinii(wierzcholkiM)) : 0;
  const etykietaM = os?.dlugoscEtykietaM && os.dlugoscEtykietaM > 1
    ? round2(os.dlugoscEtykietaM)
    : undefined;
  const osTrasy0 = os && os.wierzcholki.length >= 2
    ? {
      wierzcholkiPdf: os.wierzcholki,
      wierzcholkiM,
      dlugoscM: round2(etykietaM && etykietaM > 80 ? etykietaM : geomM),
      dlugoscEtykietaM: etykietaM,
      kolor: os.color,
    }
    : undefined;
  const surowy: ArkuszPzt = {
    id: generujId(),
    nazwa,
    zrodloNazwa: wynik.zrodloNazwa,
    zrodloPdfHref: wynik.zrodloPdfHref,
    kolejnosc: opts.kolejnosc,
    kontynuacjaPoprzedniego: opts.kontynuacjaPoprzedniego,
    kilometrazPoczatkowyM: 0,
    kilometrazKoncowyM: 0,
    obszary,
    osTrasy: osTrasy0,
  };
  const jezdnia = osTrasy0 ? dlugoscPikietazuJezdniM(surowy) : 0;
  const e0 = etykietaM && etykietaM > 80 && etykietaM < 2500 ? etykietaM : 0;
  const baza = e0 || (geomM > 80 ? geomM : 0);
  let e = e0;
  if (jezdnia > 80 && jezdnia < 2500) {
    const cap = (baza || jezdnia) * 1.02 + 2.5;
    if (jezdnia >= (baza || jezdnia) - 0.05 && jezdnia <= cap) e = round2(Math.max(e, jezdnia));
  }
  const osTrasy = osTrasy0 && e > 80
    ? { ...osTrasy0, dlugoscEtykietaM: e, dlugoscM: e }
    : osTrasy0;
  return dopasujGeometrieArkuszaDoEtykiety({ ...surowy, osTrasy });
}

/** Długość arkusza = pikietaż drogi (wymiar osi albo czoła L/P, nie krótsza kreska 1:500). */
export function dlugoscArkuszaM(arkusz: ArkuszPzt): number {
  const etykieta = arkusz.osTrasy?.dlugoscEtykietaM;
  const e = etykieta && etykieta > 80 && etykieta < 2500 ? round2(etykieta) : 0;
  const jezdnia = dlugoscPikietazuJezdniM(arkusz);
  let geom = 0;
  if (arkusz.osTrasy) {
    geom = arkusz.osTrasy.wierzcholkiM.length >= 2
      ? round2(dlugoscPolilinii(arkusz.osTrasy.wierzcholkiM))
      : round2(arkusz.osTrasy.dlugoscM);
  }
  const kandydaci = [e, jezdnia, geom].filter((n) => n > 80 && n < 2500);
  if (kandydaci.length > 0) {
    const baza = e || Math.max(...kandydaci);
    const doPikietazu = kandydaci.filter((n) => n >= baza - 0.05 && n <= baza * 1.02 + 2.5);
    return round2(Math.max(...(doPikietazu.length > 0 ? doPikietazu : [baza])));
  }
  const staraJezdnia = dlugoscObszarowWzdluzOsiM(arkusz);
  if (staraJezdnia > 0.5) return staraJezdnia;
  if (arkusz.obszary.length === 0) return 0;
  const ds = arkusz.obszary.map((o) => dlugoscKilometrazaObszaru(o)).filter((d) => d > 0.5);
  if (ds.length === 0) return 0;
  return round2(ds.reduce((s, d) => s + d, 0) / ds.length);
}

/** Suma pikietażu PZT (po rozciągnięciu do zadanej pikiety, jeśli jest). */
export function sumaOsiTrasyM(projekt: ProjektBudowy): number {
  const zKm = projekt.arkusze.reduce(
    (s, a) => s + Math.max(0, a.kilometrazKoncowyM - a.kilometrazPoczatkowyM),
    0,
  );
  if (zKm > 1) return round2(zKm);
  return round2(projekt.arkusze.reduce((s, a) => s + dlugoscArkuszaM(a), 0));
}

/** Długość arkusza do pikietażu: XFDF, albo już przypisany km gdy rozciągnięto do PZT (< ~1,2 %). */
export function dlugoscDoPikietazuM(arkusz: ArkuszPzt): number {
  const nat = dlugoscArkuszaM(arkusz);
  const km = round2(Math.max(0, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM));
  if (nat > 80 && km > 80 && Math.abs(km - nat) <= nat * 0.012 + 2.5) return km;
  return nat > 0.5 ? nat : km;
}

export function podsumowanieOsiTrasy(projekt: ProjektBudowy): {
  kmM: number;
  xfdfM: number;
  etykietyM: number;
  nEtykiet: number;
  nArkuszy: number;
  geomM: number;
  wymiary: number[];
  lukaNumeracji: string | null;
} {
  let etykietyM = 0;
  let nEtykiet = 0;
  let geomM = 0;
  const wymiary: number[] = [];
  let xfdfM = 0;
  for (const a of projekt.arkusze) {
    const e = a.osTrasy?.dlugoscEtykietaM;
    const native = (e && e > 80 && e < 2500) ? round2(e) : dlugoscArkuszaM(a);
    wymiary.push(native);
    xfdfM += native;
    if (e && e > 80 && e < 2500) {
      etykietyM += e;
      nEtykiet += 1;
    }
    if (a.osTrasy && a.osTrasy.wierzcholkiM.length >= 2) {
      geomM += dlugoscPolilinii(a.osTrasy.wierzcholkiM);
    } else if (a.osTrasy && a.osTrasy.dlugoscM > 0.5) {
      geomM += a.osTrasy.dlugoscM;
    }
  }
  return {
    kmM: sumaOsiTrasyM(projekt),
    xfdfM: round2(xfdfM),
    etykietyM: round2(etykietyM),
    nEtykiet,
    nArkuszy: projekt.arkusze.length,
    geomM: round2(geomM),
    wymiary,
    lukaNumeracji: lukaNumeracjiArkuszy(projekt),
  };
}

export function numerArkuszaZNazwy(nazwa: string, zrodloNazwa?: string): { seria: number; nr: number } | null {
  for (const kandydat of [zrodloNazwa, nazwa]) {
    if (!kandydat) continue;
    const e = etykietaZakladkiArkusza(kandydat);
    const ark = e.match(/^Ark\.\s+(\d+)_(\d+)$/i);
    if (ark) return { seria: Number(ark[1]), nr: Number(ark[2]) };
    const konc = kandydat.replace(/\.(xfdf|xml|txt|pdf)$/i, '').match(/(\d+)[._-](\d+)$/);
    if (konc) return { seria: Number(konc[1]), nr: Number(konc[2]) };
  }
  return null;
}

function lukaNumeracjiArkuszy(projekt: ProjektBudowy): string | null {
  const pary = projekt.arkusze
    .map((a) => numerArkuszaZNazwy(a.nazwa, a.zrodloNazwa))
    .filter((p): p is { seria: number; nr: number } => !!p);
  if (pary.length < 2) return null;
  const seria = pary[0].seria;
  if (!pary.every((p) => p.seria === seria)) return null;
  const nrs = [...new Set(pary.map((p) => p.nr))].sort((a, b) => a - b);
  const min = nrs[0];
  const max = nrs[nrs.length - 1];
  const brak: number[] = [];
  for (let n = min; n <= max; n++) {
    if (!nrs.includes(n)) brak.push(n);
  }
  if (brak.length > 0) {
    return `Pominięto ${brak.map((n) => `${seria}_${n}`).join(', ')} (np. droga boczna) — nie robi dziury na osi głównej; ${seria}_${min} styka się z następnym wgranym arkuszem.`;
  }
  return null;
}

/** Średnia/max długość układania MMA (wyspy na krawędzi od osi wydłużają). */
export function dlugoscUkladaniaArkuszaM(arkusz: ArkuszPzt): number {
  if (arkusz.obszary.length === 0) return 0;
  return round2(Math.max(...arkusz.obszary.map((o) => dlugoscUkladaniaObszaru(o))));
}

export function podsumowanieDlugosciArkusza(arkusz: ArkuszPzt): {
  kmM: number;
  ukladanieM: number;
  obszary: Array<{ nazwa: string; kmM: number; ukladanieM: number; lewaDl: number; prawaDl: number }>;
} {
  const obszary = arkusz.obszary.map((o) => {
    const b = bokiFigury(o);
    return {
      nazwa: o.nazwa,
      kmM: dlugoscKilometrazaObszaru(o),
      ukladanieM: dlugoscUkladaniaObszaru(o),
      lewaDl: round2(b?.lewaDl ?? 0),
      prawaDl: round2(b?.prawaDl ?? 0),
    };
  });
  return {
    kmM: dlugoscArkuszaM(arkusz),
    ukladanieM: dlugoscUkladaniaArkuszaM(arkusz),
    obszary,
  };
}

function ustawKmObszaru(obszar: ObszarObmiaru, startM: number, koniecM: number): ObszarObmiaru {
  const start = Z_METROW_BIEZACYCH(Math.round(startM));
  const koniec = Z_METROW_BIEZACYCH(Math.round(koniecM));
  return {
    ...obszar,
    kilometrazStartKm: start.km,
    kilometrazStartM: start.m,
    kilometrazKoniecKm: koniec.km,
    kilometrazKoniecM: koniec.m,
    kontynuacjaPoprzedniego: true,
    kierunekUkladania: 'rosnacy',
  };
}

/**
 * Uciągla kilometraż: pierwszy arkusz od km projektu,
 * kolejne z flagą kontynuacji startują na końcu poprzedniego.
 * Gdy podano pikietę końcową PZT, długości XFDF są rozciągane proporcjonalnie
 * (oś od pierwszej kreski do ostatniej, np. 106+850 → 116+031).
 */
export function zastosujKilometrazArkuszy(
  arkusze: ArkuszPzt[],
  kilometrazPoczatkowyM: number,
  kilometrazKoncowyZadanyM?: number,
): ArkuszPzt[] {
  const przygotowane = arkusze.map((surowy) => dopasujGeometrieArkuszaDoEtykiety(surowy));
  const raw = przygotowane.map((a) => dlugoscArkuszaM(a));
  const rawSum = raw.reduce((s, d) => s + d, 0);
  const start0 = Math.max(0, kilometrazPoczatkowyM);
  const zadany = kilometrazKoncowyZadanyM != null && kilometrazKoncowyZadanyM > start0 + 1
    ? kilometrazKoncowyZadanyM
    : undefined;
  const targetSpan = zadany != null ? round2(zadany - start0) : rawSum;
  const skala = rawSum > 1 && targetSpan > 1 ? targetSpan / rawSum : 1;

  let biezacy = start0;
  const ciagOdStartu = przygotowane.every((a, j) => j === 0 || a.kontynuacjaPoprzedniego);
  return przygotowane.map((arkusz, i) => {
    const start = i === 0 || arkusz.kontynuacjaPoprzedniego
      ? biezacy
      : arkusz.kilometrazPoczatkowyM;
    let dlugosc = round2(raw[i] * skala);
    let koniec = round2(start + dlugosc);
    if (zadany != null && ciagOdStartu && i === przygotowane.length - 1) {
      koniec = round2(zadany);
      dlugosc = round2(Math.max(0.01, koniec - start));
    }
    biezacy = koniec;
    const zOsi = arkusz.osTrasy?.wierzcholkiM && arkusz.osTrasy.wierzcholkiM.length >= 2 && dlugosc > 80
      ? dopasujGeometrieArkuszaDoDlugosci(arkusz, dlugosc)
      : arkusz;
    return {
      ...zOsi,
      kolejnosc: i + 1,
      kontynuacjaPoprzedniego: i > 0,
      kilometrazPoczatkowyM: start,
      kilometrazKoncowyM: koniec,
      obszary: zOsi.obszary.map((o) => ustawKmObszaru(o, start, koniec)),
    };
  });
}

export function zbierzLegendeZArkuszy(
  arkusze: ArkuszPzt[],
  istniejaca: WpisLegendy[] = [],
): WpisLegendy[] {
  const mapa = new Map<string, WpisLegendy>();
  for (const w of istniejaca) mapa.set(w.klucz, w);

  for (const arkusz of arkusze) {
    for (const obszar of arkusz.obszary) {
      const kolor = normalizujKolorHex(obszar.kolorWypelnienia);
      const klucz = kluczLegendy('obszar', kolor);
      if (!mapa.has(klucz)) {
        const sugerowana = sugerowanaNazwaLegendy('obszar', kolor, obszar.stronaTrasy);
        mapa.set(klucz, {
          id: generujId(),
          kolor,
          typ: 'obszar',
          klucz,
          nazwa: sugerowana,
          sugerowanaNazwa: sugerowana || undefined,
        });
      }
      for (const kr of obszar.krawedzniki ?? []) {
        const kKolor = normalizujKolorHex(kr.kolor || '#FF0000');
        const kKlucz = kluczLegendy('linia', kKolor);
        if (!mapa.has(kKlucz)) {
          const sugerowana = sugerowanaNazwaLegendy('linia', kKolor);
          mapa.set(kKlucz, {
            id: generujId(),
            kolor: kKolor,
            typ: 'linia',
            klucz: kKlucz,
            nazwa: sugerowana,
            sugerowanaNazwa: sugerowana || undefined,
          });
        }
      }
    }
    if (arkusz.osTrasy) {
      const oKolor = normalizujKolorHex(arkusz.osTrasy.kolor || '#000000');
      const oKlucz = kluczLegendy('os', oKolor);
      if (!mapa.has(oKlucz)) {
        const sugerowana = sugerowanaNazwaLegendy('os', oKolor);
        mapa.set(oKlucz, {
          id: generujId(),
          kolor: oKolor,
          typ: 'os',
          klucz: oKlucz,
          nazwa: sugerowana,
          sugerowanaNazwa: sugerowana || undefined,
        });
      }
    }
  }

  const obszary = [...mapa.values()].filter((w) => w.typ === 'obszar');
  const linie = [...mapa.values()].filter((w) => w.typ === 'linia');
  const osie = [...mapa.values()].filter((w) => w.typ === 'os');
  const kolejnoscKoloru = (a: WpisLegendy, b: WpisLegendy) => a.kolor.localeCompare(b.kolor);
  return [...obszary.sort(kolejnoscKoloru), ...linie.sort(kolejnoscKoloru), ...osie.sort(kolejnoscKoloru)];
}

/** Uzupełnia legendę i konstrukcje o nowe kolory / oś z już wgranych arkuszy (bez utraty ręcznych nazw). */
export function zsynchronizujLegendeProjektu(projekt: ProjektBudowy): ProjektBudowy {
  const legenda = zbierzLegendeZArkuszy(projekt.arkusze, projekt.legenda);
  const konstrukcje = uzupelnijKonstrukcjeDlaLegendy(projekt.konstrukcje, legenda);
  const teSameKlucze = legenda.length === projekt.legenda.length
    && legenda.every((w) => projekt.legenda.some((s) => s.klucz === w.klucz))
    && projekt.legenda.every((s) => legenda.some((w) => w.klucz === s.klucz));
  if (teSameKlucze && konstrukcje.length === projekt.konstrukcje.length) return projekt;
  return { ...projekt, legenda, konstrukcje };
}

export function uzupelnijKonstrukcjeDlaLegendy(
  konstrukcje: KonstrukcjaObszaru[],
  legenda: WpisLegendy[],
): KonstrukcjaObszaru[] {
  const ids = new Set(legenda.filter((w) => w.typ === 'obszar').map((w) => w.id));
  const zachowane = konstrukcje.filter((k) => ids.has(k.legendaId));
  const istniejace = new Set(zachowane.map((k) => k.legendaId));
  const brakujace = legenda
    .filter((w) => w.typ === 'obszar' && w.nazwa.trim() && !istniejace.has(w.id))
    .map((w) => ({
      legendaId: w.id,
      warstwy: domyslneWarstwyKonstrukcji(),
      wyjatki: [] as WyjatekKonstrukcji[],
    }));
  return [...zachowane, ...brakujace];
}

/** Ten sam arkusz PZT (Ark. 2_1) – także po ręcznej zmianie nazwy zakładki. */
export function kluczArkuszaPzt(nazwa: string, zrodloNazwa?: string): string {
  for (const kandydat of [zrodloNazwa, nazwa]) {
    if (!kandydat) continue;
    const e = etykietaZakladkiArkusza(kandydat);
    if (/^Ark\.\s+\d+_\d+$/i.test(e)) return e.replace(/\s+/g, ' ').toLowerCase();
  }
  return etykietaZakladkiArkusza(zrodloNazwa || nazwa).toLowerCase();
}

export function dodajArkuszeDoProjektu(
  projekt: ProjektBudowy,
  wyniki: WynikParsowaniaXfdf[],
): ProjektBudowy {
  const startKolejnosc = projekt.arkusze.length;
  let obszarStart = projekt.arkusze.reduce((n, a) => n + a.obszary.length, 0) + 1;
  const nowe = wyniki.map((wynik, i) => {
    const arkusz = arkuszZWynikuXfdf(wynik, {
      kolejnosc: startKolejnosc + i + 1,
      kontynuacjaPoprzedniego: startKolejnosc + i > 0 || projekt.arkusze.length > 0,
      skala: projekt.skala,
      kolejnoscObszarowStart: obszarStart,
    });
    obszarStart += arkusz.obszary.length;
    return arkusz;
  });
  const uzyte = new Set<number>();
  const scalone: ArkuszPzt[] = [];
  for (const stary of projekt.arkusze) {
    const kluczStary = kluczArkuszaPzt(stary.nazwa, stary.zrodloNazwa);
    const i = nowe.findIndex(
      (n, idx) => !uzyte.has(idx) && kluczArkuszaPzt(n.nazwa, n.zrodloNazwa) === kluczStary,
    );
    if (i >= 0) {
      uzyte.add(i);
      scalone.push({
        ...nowe[i],
        id: stary.id,
        tlo: stary.tlo,
      });
    } else {
      scalone.push(stary);
    }
  }
  for (let i = 0; i < nowe.length; i++) {
    if (!uzyte.has(i)) scalone.push(nowe[i]);
  }
  const arkusze = zastosujKilometrazArkuszy(
    scalone,
    projekt.kilometrazPoczatkowyM,
    projekt.kilometrazKoncowyZadanyM,
  );
  const legenda = zbierzLegendeZArkuszy(arkusze, projekt.legenda);
  return {
    ...projekt,
    arkusze,
    legenda,
    konstrukcje: uzupelnijKonstrukcjeDlaLegendy(projekt.konstrukcje, legenda),
  };
}

/** Komunikat po wgraniu XFDF: podmiana (nie doklejanie) + pikietaż z wymiaru osi. */
export function komunikatPoImporcieXfdf(
  przed: ProjektBudowy,
  po: ProjektBudowy,
  zrodla: string[],
): string {
  const os = podsumowanieOsiTrasy(po);
  const przedKlucze = new Set(przed.arkusze.map((a) => kluczArkuszaPzt(a.nazwa, a.zrodloNazwa)));
  const seen = new Set<string>();
  let zastapiono = 0;
  for (const z of zrodla) {
    const k = kluczArkuszaPzt(z, z);
    if (przedKlucze.has(k) && !seen.has(k)) {
      zastapiono += 1;
      seen.add(k);
    }
  }
  const dodano = Math.max(0, zrodla.length - zastapiono);
  const start = formatujKmM(po.kilometrazPoczatkowyM);
  const koniecArk = po.arkusze[po.arkusze.length - 1];
  const koniec = koniecArk ? formatujKmM(koniecArk.kilometrazKoncowyM) : start;
  const dl = os.kmM.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const czesci: string[] = [];
  if (zastapiono > 0 && dodano === 0) {
    czesci.push(`Zastąpiono ${zastapiono} arkusz(y) świeżym XFDF (stary kilometraż z przeglądarki nie obowiązuje).`);
  } else if (zastapiono > 0) {
    czesci.push(`Zastąpiono ${zastapiono}, dodano ${dodano} arkusz(y). Łącznie ${po.arkusze.length}.`);
  } else {
    czesci.push(`Dodano ${zrodla.length} arkusz(y). Łącznie ${po.arkusze.length}.`);
  }
  czesci.push(`${start} + ${dl} m = ${koniec}.`);
  if (os.lukaNumeracji) czesci.push(os.lukaNumeracji);
  if (os.nArkuszy > 0 && os.nEtykiet < os.nArkuszy) {
    czesci.push(`Wymiar osi tylko na ${os.nEtykiet}/${os.nArkuszy} ark. — reszta z rysunku (stąd bywa 116+016 zamiast 116+031).`);
  } else if (os.nEtykiet > 0) {
    const xfdf = os.xfdfM.toLocaleString('pl-PL', { maximumFractionDigits: 2 });
    if (po.kilometrazKoncowyZadanyM != null && Math.abs(os.kmM - os.xfdfM) > 0.5) {
      czesci.push(`Wymiar XFDF ${xfdf} m rozciągnięty do pikiet PZT ${dl} m (${os.nArkuszy} ark.).`);
    } else {
      czesci.push(`Oś z wymiaru XFDF: ${xfdf} m (${os.nArkuszy} ark.).`);
    }
  }
  return czesci.join(' ');
}

export function przeliczProjektPoZmianieKm(projekt: ProjektBudowy): ProjektBudowy {
  const arkusze = zastosujKilometrazArkuszy(
    projekt.arkusze,
    projekt.kilometrazPoczatkowyM,
    projekt.kilometrazKoncowyZadanyM,
  );
  return { ...projekt, arkusze };
}

export function czyLegendaUzupelniona(legenda: WpisLegendy[]): boolean {
  const obszary = legenda.filter((w) => w.typ === 'obszar');
  if (obszary.length === 0) return false;
  return obszary.every((w) => w.nazwa.trim().length > 0);
}

export function formatujKmM(metry: number): string {
  const { km, m } = Z_METROW_BIEZACYCH(Math.max(0, Math.round(metry)));
  return FORMAT_KILOMETRAZU(km, m);
}

export function parsujKmNaMetry(km: number, m: number): number {
  return DO_METROW_BIEZACYCH(km, m);
}

export function powierzchniaWarstwyZOdsadzka(
  powierzchniaObrysuM2: number,
  dlugoscM: number,
  odsadzkaCm: number,
): number {
  return powierzchniaWarstwyZOdsadzkami(powierzchniaObrysuM2, dlugoscM, odsadzkaCm, 0);
}

export function powierzchniaWarstwyZOdsadzkami(
  powierzchniaObrysuM2: number,
  dlugoscM: number,
  odsadzkaLewaCm: number,
  odsadzkaPrawaCm: number,
): number {
  const extra = Math.max(0, dlugoscM) * ((Math.max(0, odsadzkaLewaCm) + Math.max(0, odsadzkaPrawaCm)) / 100);
  return round2(Math.max(0, powierzchniaObrysuM2) + extra);
}

export function tonyZPowierzchni(powierzchniaM2: number, gruboscCm: number, gestoscTm3: number): number {
  return round3(powierzchniaM2 * (Math.max(0, gruboscCm) / 100) * Math.max(0, gestoscTm3));
}

export function gestoscWarstwy(
  warstwa: WarstwaKonstrukcji,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
): number {
  const zRecept = warstwa.mieszankaIds
    .map((id) => mieszanki.find((m) => m.id === id)?.ciezarObjetosciowy)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  if (zRecept.length > 0) {
    return round3(zRecept.reduce((a, b) => a + b, 0) / zRecept.length);
  }
  if (warstwa.kategoria === 'klsm') return GESTOSC_KLSM_DOMYSLNA;
  return GESTOSC_MMA_DOMYSLNA;
}

function kmObszaru(obszar: ObszarObmiaru): { od: number; do: number } {
  const od = DO_METROW_BIEZACYCH(obszar.kilometrazStartKm ?? 0, obszar.kilometrazStartM ?? 0);
  const doM = DO_METROW_BIEZACYCH(obszar.kilometrazKoniecKm ?? 0, obszar.kilometrazKoniecM ?? 0);
  if (doM > od) return { od, do: doM };
  const d = dlugoscUkladaniaObszaru(obszar);
  return { od, do: od + d };
}

export interface SegmentKonstrukcji {
  od: number;
  do: number;
  warstwy: WarstwaKonstrukcji[];
}

/** Dzieli zakres km na odcinki konstrukcji normalnej i wyjątków. */
export function segmentyKonstrukcji(
  konstrukcja: KonstrukcjaObszaru,
  od: number,
  doKm: number,
): SegmentKonstrukcji[] {
  const totalOd = Math.min(od, doKm);
  const totalDo = Math.max(od, doKm);
  const wyjatki = [...konstrukcja.wyjatki]
    .map((w) => ({
      od: Math.max(totalOd, Math.min(w.kmOdM, w.kmDoM)),
      do: Math.min(totalDo, Math.max(w.kmOdM, w.kmDoM)),
      warstwy: w.warstwy,
    }))
    .filter((w) => w.do > w.od)
    .sort((a, b) => a.od - b.od);

  const out: SegmentKonstrukcji[] = [];
  let kursor = totalOd;
  for (const w of wyjatki) {
    if (w.od > kursor) {
      out.push({ od: kursor, do: w.od, warstwy: konstrukcja.warstwy });
    }
    out.push({ od: Math.max(kursor, w.od), do: w.do, warstwy: w.warstwy });
    kursor = Math.max(kursor, w.do);
  }
  if (kursor < totalDo) {
    out.push({ od: kursor, do: totalDo, warstwy: konstrukcja.warstwy });
  }
  return out.filter((s) => s.do > s.od);
}

export const podzielZakresNaKonstrukcje = segmentyKonstrukcji;

export interface IloscWarstwy {
  nazwa: string;
  kategoria: KategoriaWarstwy;
  kolejnosc: number;
  powierzchniaM2: number;
  gruboscCm: number;
  odsadzkaCm: number;
  tony: number;
  mieszankaIds: string[];
}

function kluczIlosci(ilosc: Pick<IloscWarstwy, 'kategoria' | 'nazwa' | 'kolejnosc'>): string {
  return `${ilosc.kategoria}|${ilosc.nazwa}|${ilosc.kolejnosc}`;
}

function dodajIlosc(acc: Map<string, IloscWarstwy>, ilosc: IloscWarstwy) {
  const klucz = kluczIlosci(ilosc);
  const prev = acc.get(klucz);
  if (!prev) {
    acc.set(klucz, { ...ilosc, mieszankaIds: [...new Set(ilosc.mieszankaIds)] });
    return;
  }
  const sumaM2 = prev.powierzchniaM2 + ilosc.powierzchniaM2;
  const gruboscWazona = sumaM2 > 0
    ? (prev.gruboscCm * prev.powierzchniaM2 + ilosc.gruboscCm * ilosc.powierzchniaM2) / sumaM2
    : prev.gruboscCm;
  acc.set(klucz, {
    ...prev,
    powierzchniaM2: round2(sumaM2),
    gruboscCm: round2(gruboscWazona),
    tony: round3(prev.tony + ilosc.tony),
    mieszankaIds: [...new Set([...prev.mieszankaIds, ...ilosc.mieszankaIds])],
  });
}

export interface WierszPrzedmiaru {
  id: string;
  nazwa: string;
  legendaIds: string[];
  powierzchniaObrysuM2: number;
  dlugoscM: number;
  warstwy: IloscWarstwy[];
  daSieScalicZ: string[];
}

function obszaryDlaWpisu(projekt: ProjektBudowy, wpis: WpisLegendy): ObszarObmiaru[] {
  const out: ObszarObmiaru[] = [];
  for (const a of projekt.arkusze) {
    for (const o of a.obszary) {
      if (kluczLegendy('obszar', o.kolorWypelnienia) === wpis.klucz) out.push(o);
    }
  }
  return out;
}

function ilosciDlaObszaru(
  obszar: ObszarObmiaru,
  konstrukcja: KonstrukcjaObszaru,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
): Map<string, IloscWarstwy> {
  const acc = new Map<string, IloscWarstwy>();
  const km = kmObszaru(obszar);
  const dlugoscCalk = Math.max(km.do - km.od, 0.01);
  const segmenty = segmentyKonstrukcji(konstrukcja, km.od, km.do);
  for (const seg of segmenty) {
    const udzial = Math.max(0, seg.do - seg.od) / dlugoscCalk;
    const powSeg = obszar.powierzchniaM2 * udzial;
    const dlSeg = dlugoscUkladaniaObszaru(obszar) * udzial;
    for (const warstwa of [...seg.warstwy].sort((a, b) => a.kolejnosc - b.kolejnosc)) {
      const ods = odsadzkiWarstwy(warstwa);
      const powW = powierzchniaWarstwyZOdsadzkami(powSeg, dlSeg, ods.lewa, ods.prawa);
      const rho = gestoscWarstwy(warstwa, mieszanki);
      dodajIlosc(acc, {
        nazwa: warstwa.nazwa,
        kategoria: warstwa.kategoria,
        kolejnosc: warstwa.kolejnosc,
        powierzchniaM2: powW,
        gruboscCm: warstwa.gruboscCm,
        odsadzkaCm: ods.lewa + ods.prawa,
        tony: tonyZPowierzchni(powW, warstwa.gruboscCm, rho),
        mieszankaIds: warstwa.mieszankaIds,
      });
    }
  }
  return acc;
}

function podpisWarstw(warstwy: WarstwaKonstrukcji[]): string {
  return warstwy
    .slice()
    .sort((a, b) => a.kolejnosc - b.kolejnosc)
    .map((w) => {
      const ods = odsadzkiWarstwy(w);
      return `${w.nazwa}:${w.gruboscCm}:${ods.lewa}/${ods.prawa}:${w.kategoria}`;
    })
    .join('|');
}

export function obliczPrzedmiar(
  projekt: ProjektBudowy,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[] = [],
): WierszPrzedmiaru[] {
  const obszaryLegendy = projekt.legenda.filter((w) => w.typ === 'obszar' && w.nazwa.trim());
  const surowe: WierszPrzedmiaru[] = obszaryLegendy.map((wpis) => {
    const konstrukcja = projekt.konstrukcje.find((k) => k.legendaId === wpis.id) ?? {
      legendaId: wpis.id,
      warstwy: [],
      wyjatki: [],
    };
    const obszary = obszaryDlaWpisu(projekt, wpis);
    const acc = new Map<string, IloscWarstwy>();
    let pow = 0;
    let dl = 0;
    for (const o of obszary) {
      pow += o.powierzchniaM2;
      dl += dlugoscUkladaniaObszaru(o);
      const czastkowe = ilosciDlaObszaru(o, konstrukcja, mieszanki);
      for (const v of czastkowe.values()) dodajIlosc(acc, v);
    }
    return {
      id: wpis.id,
      nazwa: wpis.nazwa,
      legendaIds: [wpis.id],
      powierzchniaObrysuM2: round2(pow),
      dlugoscM: round2(dl),
      warstwy: [...acc.values()].sort((a, b) => a.kolejnosc - b.kolejnosc || a.nazwa.localeCompare(b.nazwa, 'pl')),
      daSieScalicZ: [],
    };
  });

  const podpisKonstrukcji = (legendaId: string) => {
    const k = projekt.konstrukcje.find((x) => x.legendaId === legendaId);
    if (!k) return '';
    return `${podpisWarstw(k.warstwy)}::${k.wyjatki.map((w) => `${w.kmOdM}-${w.kmDoM}:${podpisWarstw(w.warstwy)}`).join(';')}`;
  };

  for (const w of surowe) {
    w.daSieScalicZ = surowe
      .filter((inny) => inny.id !== w.id && podpisKonstrukcji(inny.legendaIds[0]) === podpisKonstrukcji(w.legendaIds[0]))
      .map((inny) => inny.id);
  }

  const zuzyte = new Set<string>();
  const wynik: WierszPrzedmiaru[] = [];
  for (const grupa of projekt.scaloneWiersze) {
    const czesci = surowe.filter((w) => grupa.legendaIds.includes(w.id) || w.legendaIds.some((id) => grupa.legendaIds.includes(id)));
    if (czesci.length === 0) continue;
    for (const c of czesci) zuzyte.add(c.id);
    const acc = new Map<string, IloscWarstwy>();
    for (const c of czesci) {
      for (const war of c.warstwy) dodajIlosc(acc, war);
    }
    wynik.push({
      id: grupa.id,
      nazwa: grupa.nazwa?.trim() || czesci.map((c) => c.nazwa).join(' + '),
      legendaIds: [...new Set(czesci.flatMap((c) => c.legendaIds))],
      powierzchniaObrysuM2: round2(czesci.reduce((s, c) => s + c.powierzchniaObrysuM2, 0)),
      dlugoscM: round2(czesci.reduce((s, c) => s + c.dlugoscM, 0)),
      warstwy: [...acc.values()].sort((a, b) => a.kolejnosc - b.kolejnosc),
      daSieScalicZ: [],
    });
  }

  for (const w of surowe) {
    if (!zuzyte.has(w.id)) wynik.push(w);
  }
  return wynik;
}

export interface SumaMieszanki {
  klucz: string;
  mieszankaId?: string;
  nazwa: string;
  wytwornia?: string;
  powierzchniaM2: number;
  gruboscWazonaCm: number;
  tony: number;
}

export function sumyMieszanek(
  wiersze: WierszPrzedmiaru[],
  mieszanki: Pick<Mieszanka, 'id' | 'rodzaj' | 'ciezarObjetosciowy' | 'wytworniaId' | 'wytwórnia'>[],
  nazwaWytworni: (id?: string) => string | undefined = () => undefined,
): SumaMieszanki[] {
  const acc = new Map<string, SumaMieszanki>();
  const dodaj = (klucz: string, patch: Omit<SumaMieszanki, 'klucz'>) => {
    const prev = acc.get(klucz);
    if (!prev) {
      acc.set(klucz, { klucz, ...patch });
      return;
    }
    const sumaM2 = prev.powierzchniaM2 + patch.powierzchniaM2;
    acc.set(klucz, {
      ...prev,
      powierzchniaM2: round2(sumaM2),
      gruboscWazonaCm: sumaM2 > 0
        ? round2((prev.gruboscWazonaCm * prev.powierzchniaM2 + patch.gruboscWazonaCm * patch.powierzchniaM2) / sumaM2)
        : prev.gruboscWazonaCm,
      tony: round3(prev.tony + patch.tony),
    });
  };

  for (const wiersz of wiersze) {
    for (const war of wiersz.warstwy) {
      if (war.mieszankaIds.length === 0) {
        dodaj(`warstwa:${war.kategoria}:${war.nazwa}`, {
          nazwa: war.nazwa,
          powierzchniaM2: war.powierzchniaM2,
          gruboscWazonaCm: war.gruboscCm,
          tony: war.tony,
        });
        continue;
      }
      const udzial = 1 / war.mieszankaIds.length;
      for (const mid of war.mieszankaIds) {
        const m = mieszanki.find((x) => x.id === mid);
        dodaj(`mix:${mid}`, {
          mieszankaId: mid,
          nazwa: m?.rodzaj ?? war.nazwa,
          wytwornia: nazwaWytworni(m?.wytworniaId) ?? m?.wytwórnia,
          powierzchniaM2: round2(war.powierzchniaM2 * udzial),
          gruboscWazonaCm: war.gruboscCm,
          tony: round3(war.tony * udzial),
        });
      }
    }
  }

  return [...acc.values()].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

export function csvSumMieszanek(sumy: SumaMieszanki[]): string {
  const nag = 'Mieszanka / warstwa;Wytwórnia;Powierzchnia m²;Grubość ważona cm;Tony';
  const wiersze = sumy.map((s) =>
    [s.nazwa, s.wytwornia ?? '', s.powierzchniaM2.toFixed(2).replace('.', ','), s.gruboscWazonaCm.toFixed(2).replace('.', ','), s.tony.toFixed(3).replace('.', ',')].join(';'),
  );
  return [nag, ...wiersze].join('\n');
}

export function scalWiersze(
  projekt: ProjektBudowy,
  legendaIds: string[],
  nazwa?: string,
): ProjektBudowy {
  const unikalne = [...new Set(legendaIds)].filter(Boolean);
  if (unikalne.length < 2) return projekt;
  const pozostale = projekt.scaloneWiersze.filter(
    (g) => !g.legendaIds.some((id) => unikalne.includes(id)),
  );
  return {
    ...projekt,
    scaloneWiersze: [
      ...pozostale,
      { id: generujId(), legendaIds: unikalne, nazwa },
    ],
  };
}

export function rozlaczWiersz(projekt: ProjektBudowy, grupaId: string): ProjektBudowy {
  return {
    ...projekt,
    scaloneWiersze: projekt.scaloneWiersze.filter((g) => g.id !== grupaId),
  };
}

export function usunArkusz(projekt: ProjektBudowy, arkuszId: string): ProjektBudowy {
  const arkusze = zastosujKilometrazArkuszy(
    projekt.arkusze.filter((a) => a.id !== arkuszId).map((a, i) => ({
      ...a,
      kolejnosc: i + 1,
      kontynuacjaPoprzedniego: i === 0 ? false : true,
    })),
    projekt.kilometrazPoczatkowyM,
    projekt.kilometrazKoncowyZadanyM,
  );
  const legenda = zbierzLegendeZArkuszy(arkusze, projekt.legenda);
  return {
    ...projekt,
    arkusze,
    legenda,
    konstrukcje: uzupelnijKonstrukcjeDlaLegendy(projekt.konstrukcje, legenda),
  };
}

/** Przesuwa arkusz wcześniej / później na trasie i przelicza ciągły kilometraż. */
export function przesunArkusz(projekt: ProjektBudowy, arkuszId: string, kierunek: -1 | 1): ProjektBudowy {
  const idx = projekt.arkusze.findIndex((a) => a.id === arkuszId);
  const j = idx + kierunek;
  if (idx < 0 || j < 0 || j >= projekt.arkusze.length) return projekt;
  const kopia = [...projekt.arkusze];
  const [item] = kopia.splice(idx, 1);
  kopia.splice(j, 0, item);
  const arkusze = zastosujKilometrazArkuszy(
    kopia.map((a, i) => ({
      ...a,
      kolejnosc: i + 1,
      kontynuacjaPoprzedniego: i > 0,
    })),
    projekt.kilometrazPoczatkowyM,
    projekt.kilometrazKoncowyZadanyM,
  );
  return { ...projekt, arkusze };
}

export function zmienNazweArkusza(projekt: ProjektBudowy, arkuszId: string, nazwa: string): ProjektBudowy {
  return {
    ...projekt,
    arkusze: projekt.arkusze.map((a) => (a.id === arkuszId ? { ...a, nazwa } : a)),
  };
}

export function zmienNazweScalonegoWiersza(
  projekt: ProjektBudowy,
  grupaId: string,
  nazwa: string,
): ProjektBudowy {
  return {
    ...projekt,
    scaloneWiersze: projekt.scaloneWiersze.map((g) => (g.id === grupaId ? { ...g, nazwa } : g)),
  };
}

export function ustawTloArkusza(
  projekt: ProjektBudowy,
  arkuszId: string,
  tlo: ProjektBudowy['arkusze'][0]['tlo'] | undefined,
): ProjektBudowy {
  return {
    ...projekt,
    arkusze: projekt.arkusze.map((a) => (a.id === arkuszId ? { ...a, tlo } : a)),
  };
}

/** Krótka etykieta zakładki z numeru arkusza w nazwie pliku – niezależna od inwestycji. */
export function etykietaZakladkiArkusza(nazwa: string): string {
  const bezExt = nazwa.replace(/\.(xfdf|xml|txt|pdf)$/i, '').trim();
  const ark = bezExt.match(/ark(?:usz)?[._\-\s]*(\d+)[._\-\s]+(\d+)/i);
  if (ark) return `Ark. ${ark[1]}_${ark[2]}`;
  return bezExt || nazwa;
}
