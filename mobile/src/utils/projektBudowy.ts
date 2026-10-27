// ============================================================
// PROJEKT BUDOWY – PZT, legenda, konstrukcje, przedmiar
// ============================================================

import { DO_METROW_BIEZACYCH, FORMAT_KILOMETRAZU, Z_METROW_BIEZACYCH } from '../constants';
import type {
  ArkuszPzt,
  KategoriaWarstwy,
  KonstrukcjaObszaru,
  OsBocznaPzt,
  Mieszanka,
  ObszarObmiaru,
  ProjektBudowy,
  Punkt2D,
  SkalaPzt,
  TypElementuLegendy,
  WarstwaKonstrukcji,
  WpisLegendy,
  WierszPrzedmiaruScalony,
  WyjatekKonstrukcji,
} from '../types';
import { DOMYSLNA_SKALA_PZT } from '../types';
import { round2, round3 } from './calculations';
import {
  KOLEJNOSC_KATEGORII, NAZWY_KATEGORII, kategoriaRuchuMieszanki, normalizujKategorieRuchu, porownajMieszanki, rodzajMieszanki, uziarnienieMieszanki,
} from '../mieszanki/kolejnosc';
import { dlugoscUkladaniaObszaru } from './obmiarLive';
import { dlugoscKilometrazaObszaru, bokiFigury } from './obmiarFigura';
import { obszaryZPolygony, czyLiniaOsiBocznej, kreskaNalezyDoOsi, stronaTrasyZKoloru, type WynikParsowaniaXfdf } from './xfdfParser';
import { skalujWierzcholki } from './obmiarGeometry';
import { powierzchniaWarstwyObszaru } from './odsadzkaObszaru';
import {
  dlugoscObszarowWzdluzOsiM,
  dlugoscPolilinii,
  dopasujGeometrieArkuszaDoEtykiety,
  kierunekRosnacegoKm,
  orientujLancuchDoKm,
  stacjaNaOsi,
  stycznyNaOsi,
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
  if (typ === 'os') {
    if (k === '#0000FF' || k === '#0000CD' || k === '#1E40AF' || k === '#2196F3' || k === '#1565C0') return 'oś boczna';
    return 'oś trasy';
  }
  if (typ === 'obszar') {
    if (stronaZKoloru === 'lewa') return 'Trasa główna (strona lewa)';
    if (stronaZKoloru === 'prawa') return 'Trasa główna (strona prawa)';
    if (k === '#8B8B00' || k === '#827717' || k === '#9E9D24' || k === '#AFB42B') return 'Droga boczna';
    if (k === '#009300' || k === '#00C853' || k === '#2E7D32' || k === '#43A047' || k === '#008000') return 'Wjazd';
    if (k === '#40E0D0' || k === '#26A69A' || k === '#00BCD4' || k === '#388E8E' || k === '#80DEEA') return 'Ścieżka rowerowa';
    return '';
  }
  if (k === '#FF0000' || k === '#E53935' || k === '#C62828' || k === '#F44336') {
    return 'krawężnik (brak odsadzek)';
  }
  if (k === '#0000FF' || k === '#0000CD' || k === '#2196F3') return 'oś boczna';
  return '';
}

export const ROLE_OBSZARU_PZT: { id: string; nazwa: string }[] = [
  { id: 'trasa_l', nazwa: 'Trasa główna (strona lewa)' },
  { id: 'trasa_p', nazwa: 'Trasa główna (strona prawa)' },
  { id: 'boczna', nazwa: 'Droga boczna' },
  { id: 'wjazd', nazwa: 'Wjazd' },
  { id: 'sciezka', nazwa: 'Ścieżka rowerowa' },
];

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
  const osieBoczne: OsBocznaPzt[] = wynikOs.polilinie
    .filter((l) => czyLiniaOsiBocznej(l.color, l.subject)
      && l.wierzcholki.length >= 2
      && !kreskaNalezyDoOsi(l.wierzcholki, os?.wierzcholki ?? []))
    .map((l) => {
      const wm = skalujWierzcholki(l.wierzcholki, skala);
      return {
        id: generujId(),
        wierzcholkiPdf: l.wierzcholki,
        wierzcholkiM: wm,
        dlugoscM: round2(dlugoscPolilinii(wm)),
        kolor: l.color,
      };
    });
  return dopasujGeometrieArkuszaDoEtykiety({
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
    osieBoczne: osieBoczne.length ? osieBoczne : undefined,
  });
}

/** Długość arkusza = długość osi z XFDF (wymiar tej kreski, inaczej geometria łamanej). */
export function dlugoscArkuszaM(arkusz: ArkuszPzt): number {
  const etykieta = arkusz.osTrasy?.dlugoscEtykietaM;
  if (etykieta && etykieta > 80 && etykieta < 2500) return round2(etykieta);
  let geom = 0;
  if (arkusz.osTrasy) {
    geom = arkusz.osTrasy.wierzcholkiM.length >= 2
      ? round2(dlugoscPolilinii(arkusz.osTrasy.wierzcholkiM))
      : round2(arkusz.osTrasy.dlugoscM);
  }
  if (geom > 0.5) return geom;
  const staraJezdnia = dlugoscObszarowWzdluzOsiM(arkusz);
  if (staraJezdnia > 0.5) return staraJezdnia;
  if (arkusz.obszary.length === 0) return 0;
  const ds = arkusz.obszary.map((o) => dlugoscKilometrazaObszaru(o)).filter((d) => d > 0.5);
  if (ds.length === 0) return 0;
  return round2(ds.reduce((s, d) => s + d, 0) / ds.length);
}

/**
 * Pierwszy arkusz zaczyna trasę. Kolejny z wyłączoną kontynuacją (PZT drogi bocznej)
 * nie wchodzi w pikietaż: następny arkusz z włączoną kontynuacją styka się z poprzednim.
 */
export function czyArkuszNaTrasieGlownej(arkusz: ArkuszPzt, index: number): boolean {
  return index === 0 || arkusz.kontynuacjaPoprzedniego !== false;
}

export function arkuszeTrasyGlownej(arkusze: ArkuszPzt[]): ArkuszPzt[] {
  return arkusze.filter((a, i) => czyArkuszNaTrasieGlownej(a, i));
}

/** Suma pikietażu trasy głównej = osie XFDF arkuszy z włączoną kontynuacją. */
export function sumaOsiTrasyM(projekt: ProjektBudowy): number {
  const naTrasie = arkuszeTrasyGlownej(projekt.arkusze);
  const zeStacji = round2(naTrasie.reduce(
    (s, a) => s + Math.max(0, a.kilometrazKoncowyM - a.kilometrazPoczatkowyM),
    0,
  ));
  if (zeStacji > 1) return zeStacji;
  return round2(naTrasie.reduce((s, a) => s + dlugoscArkuszaM(a), 0));
}

export function koniecTrasyGlownejM(projekt: ProjektBudowy): number | undefined {
  const trasa = arkuszeTrasyGlownej(projekt.arkusze);
  if (trasa.length === 0) return undefined;
  return trasa[trasa.length - 1].kilometrazKoncowyM;
}

/** Długość arkusza do pikietażu: zawsze linia osi XFDF. */
export function dlugoscDoPikietazuM(arkusz: ArkuszPzt): number {
  const nat = dlugoscArkuszaM(arkusz);
  if (nat > 0.5) return nat;
  return round2(Math.max(0, arkusz.kilometrazKoncowyM - arkusz.kilometrazPoczatkowyM));
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
  projekt.arkusze.forEach((a, i) => {
    if (!czyArkuszNaTrasieGlownej(a, i)) return;
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
  });
  const xfdf = round2(xfdfM);
  const kmM = sumaOsiTrasyM(projekt);
  return {
    kmM,
    xfdfM: xfdf,
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

function dlugoscZapisanejOsi(os: { wierzcholkiM?: Punkt2D[]; dlugoscM?: number; dlugoscEtykietaM?: number }): number {
  const etykieta = os.dlugoscEtykietaM;
  if (etykieta && etykieta > 0.5) return etykieta;
  if (os.wierzcholkiM && os.wierzcholkiM.length >= 2) {
    const geom = dlugoscPolilinii(os.wierzcholkiM);
    if (geom > 0.5) return geom;
  }
  return os.dlugoscM ?? 0;
}

/**
 * Oś arkusza już wgranego: najdłuższa zapisana kreska (główna albo boczna).
 * Dzięki temu niebieska oś dłuższa niż krótka czarna wchodzi w pikietaż bez ponownego importu.
 */
export function ustawNajdluzszaOs(arkusz: ArkuszPzt): ArkuszPzt {
  const boczne = arkusz.osieBoczne ?? [];
  let bestI = -1;
  let bestDl = arkusz.osTrasy ? dlugoscZapisanejOsi(arkusz.osTrasy) : 0;
  boczne.forEach((os, i) => {
    const dl = dlugoscZapisanejOsi(os);
    if (dl > bestDl + 0.5) {
      bestDl = dl;
      bestI = i;
    }
  });
  if (bestI < 0) return arkusz;
  const os = boczne[bestI];
  const zostaja = boczne.filter((_, i) => i !== bestI);
  const stare = arkusz.osTrasy;
  if (stare && stare.wierzcholkiM.length >= 2) {
    zostaja.push({
      id: `os-krotka-${bestI}`,
      wierzcholkiPdf: stare.wierzcholkiPdf,
      wierzcholkiM: stare.wierzcholkiM,
      dlugoscM: round2(dlugoscZapisanejOsi(stare)),
      kolor: stare.kolor || '#000000',
    });
  }
  return {
    ...arkusz,
    osTrasy: {
      wierzcholkiPdf: os.wierzcholkiPdf,
      wierzcholkiM: os.wierzcholkiM,
      dlugoscM: round2(bestDl),
      dlugoscEtykietaM: round2(bestDl),
      kolor: os.kolor,
    },
    osieBoczne: zostaja,
  };
}

/**
 * Rozpiętość pikietażu arkusza. Domyślnie długość czarnej kreski.
 * `kilometrazProjektuKoncowyM` rozciąga tylko stacje wzdłuż tej kreski.
 */
export function dlugoscPikietazuArkuszaM(arkusz: ArkuszPzt, startM: number): number {
  const kreska = dlugoscArkuszaM(arkusz);
  const koniecProjektu = arkusz.kilometrazProjektuKoncowyM;
  if (koniecProjektu == null || !Number.isFinite(koniecProjektu)) return kreska;
  const dl = round2(koniecProjektu - startM);
  if (dl < 1 || dl > 8000) return kreska;
  return dl;
}

/**
 * Ustawia albo czyści koniec pikietażu z projektu na jednym arkuszu
 * i przelicza stacje następnych. Geometria metrów zostaje.
 */
export function ustawKilometrazProjektuArkusza(
  projekt: ProjektBudowy,
  arkuszId: string,
  koniecM: number | null,
): ProjektBudowy {
  const arkusze = zastosujKilometrazArkuszy(
    projekt.arkusze.map((a) => {
      if (a.id !== arkuszId) return a;
      if (koniecM == null) {
        const { kilometrazProjektuKoncowyM: _pomin, ...reszta } = a;
        return reszta;
      }
      return { ...a, kilometrazProjektuKoncowyM: round2(koniecM) };
    }),
    projekt.kilometrazPoczatkowyM,
  );
  return { ...projekt, arkusze };
}

/**
 * Uciągla kilometraż: pierwszy arkusz od km projektu,
 * kolejne z flagą kontynuacji startują na końcu poprzedniego.
 * Długość = linia osi z XFDF, chyba że arkusz ma koniec wg projektu.
 */
export function zastosujKilometrazArkuszy(
  arkusze: ArkuszPzt[],
  kilometrazPoczatkowyM: number,
): ArkuszPzt[] {
  const przygotowane = arkusze.map((surowy) => dopasujGeometrieArkuszaDoEtykiety(ustawNajdluzszaOs(surowy)));
  let biezacy = Math.max(0, kilometrazPoczatkowyM);
  return przygotowane.map((arkusz, i) => {
    const naTrasie = czyArkuszNaTrasieGlownej(arkusz, i);
    const start = naTrasie ? biezacy : arkusz.kilometrazPoczatkowyM;
    const dlugosc = dlugoscPikietazuArkuszaM(arkusz, start);
    const koniec = round2(start + dlugosc);
    if (naTrasie) biezacy = koniec;
    return {
      ...arkusz,
      kolejnosc: i + 1,
      kontynuacjaPoprzedniego: i === 0 ? false : arkusz.kontynuacjaPoprzedniego !== false,
      kilometrazPoczatkowyM: start,
      kilometrazKoncowyM: koniec,
      obszary: arkusz.obszary.map((o) => ustawKmObszaru(o, start, koniec)),
      osieBoczne: dowiazOsieBoczne(arkusz, start, koniec),
    };
  });
}

function dowiazOsieBoczne(arkusz: ArkuszPzt, start: number, koniec: number): ArkuszPzt['osieBoczne'] {
  const osie = arkusz.osieBoczne;
  if (!osie?.length) return osie;
  const glowna = arkusz.osTrasy?.wierzcholkiM;
  if (!glowna || glowna.length < 2) return osie;
  const dl = dlugoscPolilinii(glowna);
  if (dl < 1e-6) return osie;
  return osie.map((os) => {
    if (os.wierzcholkiM.length === 0) return os;
    let best = os.wierzcholkiM[0];
    let bestD = Infinity;
    for (const p of os.wierzcholkiM) {
      const t = stycznyNaOsi(glowna, stacjaNaOsi(glowna, p));
      if (!t) continue;
      const d = Math.hypot(p.x - t.punkt.x, p.y - t.punkt.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const s = stacjaNaOsi(glowna, best);
    const km = start + (s / dl) * (koniec - start);
    return { ...os, kmDowiazaniaM: round2(km) };
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
    for (const os of arkusz.osieBoczne ?? []) {
      const oKolor = normalizujKolorHex(os.kolor || '#0000FF');
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
  const konstrukcje = zapewnijIdentyfikatoryKonstrukcji(
    uzupelnijKonstrukcjeDlaLegendy(projekt.konstrukcje, legenda),
  );
  const teSameKlucze = legenda.length === projekt.legenda.length
    && legenda.every((w) => projekt.legenda.some((s) => s.klucz === w.klucz))
    && projekt.legenda.every((s) => legenda.some((w) => w.klucz === s.klucz));
  const teSameKonstrukcje = konstrukcje.length === projekt.konstrukcje.length
    && konstrukcje.every((k, i) => k === projekt.konstrukcje[i]);
  if (teSameKlucze && teSameKonstrukcje) return projekt;
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
    czesci.push(`Wymiar osi tylko na ${os.nEtykiet}/${os.nArkuszy} ark. — reszta z długości linii osi na rysunku.`);
  } else if (os.nEtykiet > 0) {
    const xfdf = os.xfdfM.toLocaleString('pl-PL', { maximumFractionDigits: 2 });
    czesci.push(`Oś z wymiaru XFDF: ${xfdf} m (${os.nArkuszy} ark.).`);
  }
  return czesci.join(' ');
}

export function przeliczProjektPoZmianieKm(projekt: ProjektBudowy): ProjektBudowy {
  const arkusze = zastosujKilometrazArkuszy(
    projekt.arkusze,
    projekt.kilometrazPoczatkowyM,
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

/** Opis wyjątku zawiera kilometraż, np. „zatoka (115+000 - 116+020)”. */
export function opisWyjatkuZKilometrazem(opis: string | undefined, odM: number, doM: number): string {
  const km = `${formatujKmM(Math.min(odM, doM))} - ${formatujKmM(Math.max(odM, doM))}`;
  const bez = (opis ?? '')
    .replace(/\s*\(\d+\+\d{3}\s*-\s*\d+\+\d{3}\)\s*$/u, '')
    .replace(/^\d+\+\d{3}\s*-\s*\d+\+\d{3}$/u, '')
    .trim();
  return bez ? `${bez} (${km})` : km;
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
  const extra = Math.max(0, dlugoscM) * ((odsadzkaLewaCm + odsadzkaPrawaCm) / 100);
  return round2(Math.max(0, powierzchniaObrysuM2 + extra));
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
  obszarId?: string,
): SegmentKonstrukcji[] {
  const totalOd = Math.min(od, doKm);
  const totalDo = Math.max(od, doKm);
  const wyjatki = [...konstrukcja.wyjatki]
    .filter((w) => !w.obszarIds?.length || (obszarId != null && w.obszarIds.includes(obszarId)))
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

function obszaryDlaWpisu(projekt: ProjektBudowy, wpis: WpisLegendy): { obszar: ObszarObmiaru; arkusz: ArkuszPzt }[] {
  const out: { obszar: ObszarObmiaru; arkusz: ArkuszPzt }[] = [];
  for (const a of projekt.arkusze) {
    for (const o of a.obszary) {
      if (kluczLegendy('obszar', o.kolorWypelnienia) === wpis.klucz) out.push({ obszar: o, arkusz: a });
    }
  }
  return out;
}

export function arkuszZObszarem(projekt: ProjektBudowy, obszarId: string): ArkuszPzt | undefined {
  return projekt.arkusze.find((a) => a.obszary.some((o) => o.id === obszarId));
}

export function wszystkieObszary(projekt: ProjektBudowy): { obszar: ObszarObmiaru; arkusz: ArkuszPzt }[] {
  const out: { obszar: ObszarObmiaru; arkusz: ArkuszPzt }[] = [];
  for (const arkusz of projekt.arkusze) {
    for (const obszar of arkusz.obszary) out.push({ obszar, arkusz });
  }
  return out;
}

/** Tryb klikania na PZT: choć jedna konstrukcja ma zapisaną listę obszarów. */
export function czyPrzypisaniaAktywne(projekt: Pick<ProjektBudowy, 'konstrukcje'>): boolean {
  return projekt.konstrukcje.some((k) => Array.isArray(k.obszarIds));
}

export function postepPrzypisan(projekt: ProjektBudowy): { wszystkie: number; przypisane: number } {
  const ids = new Set(wszystkieObszary(projekt).map((x) => x.obszar.id));
  const przypisane = new Set<string>();
  for (const k of projekt.konstrukcje) {
    for (const id of k.obszarIds ?? []) if (ids.has(id)) przypisane.add(id);
  }
  return { wszystkie: ids.size, przypisane: przypisane.size };
}

export function konstrukcjaDlaObszaru(projekt: ProjektBudowy, obszarId: string): KonstrukcjaObszaru | undefined {
  if (czyPrzypisaniaAktywne(projekt)) {
    return projekt.konstrukcje.find((k) => k.obszarIds?.includes(obszarId));
  }
  const para = wszystkieObszary(projekt).find((x) => x.obszar.id === obszarId);
  if (!para) return undefined;
  const klucz = kluczLegendy('obszar', para.obszar.kolorWypelnienia);
  const wpis = projekt.legenda.find((w) => w.klucz === klucz && w.typ === 'obszar');
  return wpis ? projekt.konstrukcje.find((k) => k.legendaId === wpis.id) : undefined;
}

export function zapewnijIdentyfikatoryKonstrukcji(konstrukcje: KonstrukcjaObszaru[]): KonstrukcjaObszaru[] {
  let max = 0;
  for (const k of konstrukcje) if ((k.numer ?? 0) > max) max = k.numer ?? 0;
  let zmieniono = false;
  const next = konstrukcje.map((k) => {
    let id = k.id;
    let numer = k.numer;
    if (!id) {
      id = generujId();
      zmieniono = true;
    }
    if (!numer) {
      numer = ++max;
      zmieniono = true;
    }
    if (id === k.id && numer === k.numer) return k;
    return { ...k, id, numer };
  });
  return zmieniono ? next : konstrukcje;
}

export function nowaKonstrukcja(legendaId: string, numer: number): KonstrukcjaObszaru {
  return {
    id: generujId(),
    numer,
    legendaId,
    warstwy: domyslneWarstwyKonstrukcji(),
    wyjatki: [],
    obszarIds: [],
  };
}

function ilosciDlaObszaru(
  obszar: ObszarObmiaru,
  arkusz: ArkuszPzt | undefined,
  konstrukcja: KonstrukcjaObszaru,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
): Map<string, IloscWarstwy> {
  const acc = new Map<string, IloscWarstwy>();
  const km = kmObszaru(obszar);
  const segmenty = segmentyKonstrukcji(konstrukcja, km.od, km.do, obszar.id);
  for (const seg of segmenty) {
    for (const warstwa of [...seg.warstwy].sort((a, b) => a.kolejnosc - b.kolejnosc)) {
      const ods = odsadzkiWarstwy(warstwa);
      const powW = powierzchniaWarstwyObszaru(obszar, arkusz, ods.lewa, ods.prawa, seg.od, seg.do);
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

function wierszZObszarow(
  id: string,
  nazwa: string,
  legendaIds: string[],
  pary: { obszar: ObszarObmiaru; arkusz: ArkuszPzt }[],
  konstrukcja: KonstrukcjaObszaru | undefined,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
): WierszPrzedmiaru {
  const acc = new Map<string, IloscWarstwy>();
  let pow = 0;
  let dl = 0;
  for (const { obszar, arkusz } of pary) {
    pow += obszar.powierzchniaM2;
    dl += dlugoscUkladaniaObszaru(obszar);
    if (!konstrukcja) continue;
    const czastkowe = ilosciDlaObszaru(obszar, arkusz, konstrukcja, mieszanki);
    for (const v of czastkowe.values()) dodajIlosc(acc, v);
  }
  return {
    id,
    nazwa,
    legendaIds,
    powierzchniaObrysuM2: round2(pow),
    dlugoscM: round2(dl),
    warstwy: [...acc.values()].sort((a, b) => a.kolejnosc - b.kolejnosc || a.nazwa.localeCompare(b.nazwa, 'pl')),
    daSieScalicZ: [],
  };
}

function obliczPrzedmiarZPrzypisan(
  projekt: ProjektBudowy,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[],
): WierszPrzedmiaru[] {
  const pary = wszystkieObszary(projekt);
  const uzyte = new Set<string>();
  const wynik: WierszPrzedmiaru[] = [];
  const konstrukcje = [...projekt.konstrukcje].sort((a, b) => (a.numer ?? 99) - (b.numer ?? 99));
  for (const k of konstrukcje) {
    const swoje = pary.filter((p) => k.obszarIds?.includes(p.obszar.id));
    for (const p of swoje) uzyte.add(p.obszar.id);
    if (swoje.length === 0) continue;
    const legenda = projekt.legenda.find((w) => w.id === k.legendaId);
    const nazwy = [...new Set(swoje.map((p) => p.obszar.nazwaDodatkowa?.trim() || p.obszar.nazwa))];
    const nazwa = `Konstrukcja ${k.numer ?? ''}`.trim() + (legenda?.nazwa ? ` · ${legenda.nazwa}` : '');
    const wiersz = wierszZObszarow(
      k.id || k.legendaId,
      swoje.length === 1 && nazwy[0] ? `${nazwa} (${nazwy[0]})` : nazwa,
      [...new Set(swoje.map((p) => {
        const klucz = kluczLegendy('obszar', p.obszar.kolorWypelnienia);
        return projekt.legenda.find((w) => w.klucz === klucz)?.id ?? k.legendaId;
      }))],
      swoje,
      k,
      mieszanki,
    );
    wynik.push(wiersz);
  }
  const wolne = pary.filter((p) => !uzyte.has(p.obszar.id));
  if (wolne.length > 0) {
    wynik.push(wierszZObszarow('bez-konstrukcji', 'Bez konstrukcji', [], wolne, undefined, mieszanki));
  }
  return wynik;
}

export function obliczPrzedmiar(
  projekt: ProjektBudowy,
  mieszanki: Pick<Mieszanka, 'id' | 'ciezarObjetosciowy'>[] = [],
): WierszPrzedmiaru[] {
  if (czyPrzypisaniaAktywne(projekt)) return obliczPrzedmiarZPrzypisan(projekt, mieszanki);
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
    for (const { obszar: o, arkusz } of obszary) {
      pow += o.powierzchniaM2;
      dl += dlugoscUkladaniaObszaru(o);
      const czastkowe = ilosciDlaObszaru(o, arkusz, konstrukcja, mieszanki);
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

export interface ReceptaSumy {
  mieszankaId: string;
  /** Rodzaj z KR i numerem recepty, np. „AC16W KR3-4 · 12/2026”. */
  nazwa: string;
  wytwornia?: string;
}

/** Jedna pozycja na mieszankę warstwy konstrukcji – tonaż całej warstwy, a pod nim zatwierdzone recepty. */
export interface SumaMieszanki {
  klucz: string;
  nazwa: string;
  warstwa: KategoriaWarstwy;
  recepty: ReceptaSumy[];
  powierzchniaM2: number;
  gruboscWazonaCm: number;
  tony: number;
}

type ReceptaDoSum = Pick<Mieszanka, 'id' | 'rodzaj' | 'ciezarObjetosciowy' | 'wytworniaId' | 'wytwórnia'>
  & Partial<Pick<Mieszanka, 'nrRecepty' | 'kategoriaRuchu'>>;

/** Nazwa warstwy, a gdy jest ogólna („Wiążąca”) – wspólny rodzaj zatwierdzonych recept; KR, gdy wszystkie recepty mają ten sam. */
function nazwaSumy(nazwaWarstwy: string, recepty: ReceptaDoSum[]): string {
  const rodzaje = [...new Set(recepty.map((m) => m.rodzaj))];
  const baza = uziarnienieMieszanki(nazwaWarstwy) == null && rodzaje.length === 1 ? rodzaje[0] : nazwaWarstwy;
  const kr = [...new Set(recepty.map((m) => normalizujKategorieRuchu(m.kategoriaRuchu)))];
  return kr.length === 1 && kr[0] ? rodzajMieszanki({ rodzaj: baza, kategoriaRuchu: kr[0] }) : baza;
}

/** Kolejność jak w wytwórniach: od najniższej warstwy (KŁSM, podbudowy, wiążące, ścieralne), uziarnienie i KR malejąco. */
export function sumyMieszanek(
  wiersze: WierszPrzedmiaru[],
  mieszanki: ReceptaDoSum[],
  nazwaWytworni: (id?: string) => string | undefined = () => undefined,
): SumaMieszanki[] {
  const acc = new Map<string, { nazwaWarstwy: string; mieszankaIds: Set<string>; suma: Omit<SumaMieszanki, 'nazwa' | 'recepty'> }>();
  for (const wiersz of wiersze) {
    for (const war of wiersz.warstwy) {
      const klucz = `${war.kategoria}:${war.nazwa}`;
      const prev = acc.get(klucz);
      if (!prev) {
        acc.set(klucz, {
          nazwaWarstwy: war.nazwa,
          mieszankaIds: new Set(war.mieszankaIds),
          suma: { klucz, warstwa: war.kategoria, powierzchniaM2: round2(war.powierzchniaM2), gruboscWazonaCm: war.gruboscCm, tony: round3(war.tony) },
        });
        continue;
      }
      war.mieszankaIds.forEach((id) => prev.mieszankaIds.add(id));
      const s = prev.suma;
      const sumaM2 = s.powierzchniaM2 + war.powierzchniaM2;
      s.gruboscWazonaCm = sumaM2 > 0 ? round2((s.gruboscWazonaCm * s.powierzchniaM2 + war.gruboscCm * war.powierzchniaM2) / sumaM2) : s.gruboscWazonaCm;
      s.powierzchniaM2 = round2(sumaM2);
      s.tony = round3(s.tony + war.tony);
    }
  }

  const wynik = [...acc.values()].map(({ nazwaWarstwy, mieszankaIds, suma }) => {
    const recepty = mieszanki.filter((m) => mieszankaIds.has(m.id));
    const poKolei = [...recepty].sort((a, b) => porownajMieszanki(a, b)
      || (nazwaWytworni(a.wytworniaId) ?? a.wytwórnia ?? '').localeCompare(nazwaWytworni(b.wytworniaId) ?? b.wytwórnia ?? '', 'pl'));
    return {
      ...suma,
      nazwa: nazwaSumy(nazwaWarstwy, recepty),
      recepty: poKolei.map((m) => ({
        mieszankaId: m.id,
        nazwa: `${rodzajMieszanki(m)}${m.nrRecepty ? ` · ${m.nrRecepty}` : ''}`,
        wytwornia: nazwaWytworni(m.wytworniaId) ?? m.wytwórnia,
      })),
    };
  });
  return wynik.sort((a, b) => (
    KOLEJNOSC_KATEGORII.indexOf(a.warstwa) - KOLEJNOSC_KATEGORII.indexOf(b.warstwa)
    || (uziarnienieMieszanki(b.nazwa) ?? -1) - (uziarnienieMieszanki(a.nazwa) ?? -1)
    || (kategoriaRuchuMieszanki({ rodzaj: b.nazwa }) ?? 0) - (kategoriaRuchuMieszanki({ rodzaj: a.nazwa }) ?? 0)
    || a.nazwa.localeCompare(b.nazwa, 'pl')
  ));
}

export function csvSumMieszanek(sumy: SumaMieszanki[]): string {
  const nag = 'Warstwa;Mieszanka;Zatwierdzone recepty;Powierzchnia m²;Grubość ważona cm;Tony';
  const wiersze = sumy.map((s) => [
    NAZWY_KATEGORII[s.warstwa],
    s.nazwa,
    s.recepty.map((r) => (r.wytwornia ? `${r.nazwa} (${r.wytwornia})` : r.nazwa)).join(' | '),
    s.powierzchniaM2.toFixed(2).replace('.', ','),
    s.gruboscWazonaCm.toFixed(2).replace('.', ','),
    s.tony.toFixed(3).replace('.', ','),
  ].join(';'));
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
    })),
    projekt.kilometrazPoczatkowyM,
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
  const przenoszony = idx === 0 ? { ...item, kontynuacjaPoprzedniego: true } : item;
  kopia.splice(j, 0, przenoszony);
  if (kopia[0]) kopia[0] = { ...kopia[0], kontynuacjaPoprzedniego: false };
  const arkusze = zastosujKilometrazArkuszy(
    kopia.map((a, i) => ({ ...a, kolejnosc: i + 1 })),
    projekt.kilometrazPoczatkowyM,
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
