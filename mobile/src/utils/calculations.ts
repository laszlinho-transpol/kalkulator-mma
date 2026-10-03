// ============================================================
// OBLICZENIA – KALKULATOR MMA
// ============================================================

import type {
  Figura,
  FiguraProstokat,
  FiguraTrapez,
  FiguraTrojkat,
  FiguraPierscien,
  FiguraWjazd,
  DzialkaRobocza,
  WynikiDzialki,
  WpisTabeliAut,
  WynikiKontroli,
  Rzut,
  WynikiFigury,
} from '../types';
import { DOMYSLNY_TONAZ_AUTA } from '../constants';
import { obliczTabeleAutPlanuCiagla } from './planCiagly';

// --- Obliczanie powierzchni pojedynczej figury ---

export function obliczPowierzchniFigury(figura: Figura): number {
  switch (figura.typ) {
    case 'prostokat': {
      const f = figura as FiguraProstokat;
      return round2(f.szerokosc * f.dlugosc);
    }
    case 'trapez': {
      const f = figura as FiguraTrapez;
      return round2(((f.szerokosc1 + f.szerokosc2) / 2) * f.dlugosc);
    }
    case 'trojkat': {
      const f = figura as FiguraTrojkat;
      return round2((f.szerokosc * f.dlugosc) / 2);
    }
    case 'pierscien': {
      const f = figura as FiguraPierscien;
      return round2(f.szerokosc * ((f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2));
    }
    case 'wjazd': {
      const f = figura as FiguraWjazd;
      return round2(f.L * f.s + (f.R1 ** 2 + f.R2 ** 2) * 0.2146);
    }
    default:
      return 0;
  }
}

/** Zwraca długość figury [m] – do obliczenia pikietażu i metrów bieżących */
export function dlugoscFigury(figura: Figura): number {
  switch (figura.typ) {
    case 'prostokat': return (figura as FiguraProstokat).dlugosc;
    case 'trapez': return (figura as FiguraTrapez).dlugosc;
    case 'trojkat': return (figura as FiguraTrojkat).dlugosc;
    case 'pierscien': {
      const f = figura as FiguraPierscien;
      return (f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2;
    }
    case 'wjazd': return (figura as FiguraWjazd).L;
    default: return 0;
  }
}

/** Łączna długość liniowa [m] wszystkich figur działki */
export function obliczLacznaDlugosc(dzialka: DzialkaRobocza): number {
  return round2(dzialka.figury.reduce((sum, f) => sum + dlugoscFigury(f), 0));
}

// --- Obliczanie wyników figury z pikietażem ---

export function obliczWynikiSciezkiFigury(
  figura: Figura,
  kierunek: 'rosnacy' | 'malejacy',
): WynikiFigury {
  const powierzchnia = obliczPowierzchniFigury(figura);
  const dlugosc = dlugoscFigury(figura);
  const deltaPikietaz = kierunek === 'rosnacy' ? dlugosc : -dlugosc;
  const kilometrazKoncowy = figura.kilometrazPoczatkowy + deltaPikietaz;
  return { powierzchnia, kilometrazKoncowy };
}

// --- Obliczanie wyników całej działki roboczej ---

export function obliczWynikiDzialki(
  dzialka: DzialkaRobocza,
  ciezarObjetosciowy: number,
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
): WynikiDzialki {
  const lacznaPowierzchnia = round2(
    dzialka.figury.reduce((sum, f) => sum + obliczPowierzchniFigury(f), 0),
  );

  const lacznaIloscMasy = round3(
    lacznaPowierzchnia * (dzialka.grubosc / 100) * ciezarObjetosciowy,
  );

  const iloscSamochodow = Math.ceil(lacznaIloscMasy / tonazAuta);

  return { lacznaPowierzchnia, lacznaIloscMasy, iloscSamochodow };
}

// --- Tabela aut z podziałem na rzuty ---

/** Średnia szerokość figury [m] – powierzchnia / długość */
export function sredniaSzerokoscFigury(figura: Figura): number {
  const dl = dlugoscFigury(figura);
  if (dl <= 0) return 0;
  return round2(obliczPowierzchniFigury(figura) / dl);
}

/**
 * Tabela aut z uwzględnieniem różnych szerokości pól (kolejność figur).
 * Każde auto zużywa masę proporcjonalnie do powierzchni kolejnych odcinków.
 */
export function obliczTabeleAutDlaDzialki(
  dzialka: DzialkaRobocza,
  ciezarObjetosciowy: number,
  rzuty: Rzut[],
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
  numerAutaOffset = 0,
  narastajacoOd: { masa: number; metry: number } = { masa: 0, metry: 0 },
): WpisTabeliAut[] {
  const grubosc = dzialka.gruboscWbudowywania ?? dzialka.grubosc;
  const wyniki = obliczWynikiDzialki(dzialka, ciezarObjetosciowy, tonazAuta);
  const zProfilu = (dzialka.profilSzerokosci ?? []).filter((p) => p.dlugoscM > 0 && p.szerokoscM > 0);
  const segmenty = (zProfilu.length > 0
    ? zProfilu.map((p) => ({ dl: p.dlugoscM, szer: p.szerokoscM }))
    : dzialka.figury.map((f) => ({ dl: dlugoscFigury(f), szer: sredniaSzerokoscFigury(f) }))
  ).map((p) => ({
    dl: p.dl,
    masaNaM: round3(p.szer * (grubosc / 100) * ciezarObjetosciowy),
    pozostalo: p.dl,
  }));

  const wynikiAut: WpisTabeliAut[] = [];
  let masaNarastajaco = narastajacoOd.masa;
  let metryNarastajaco = narastajacoOd.metry;
  let numerAuta = numerAutaOffset;
  let segIdx = 0;

  const pobierzMetryDlaMasy = (masaMg: number): number => {
    let masaPozost = masaMg;
    let metry = 0;
    while (masaPozost > 0.0001 && segIdx < segmenty.length) {
      const seg = segmenty[segIdx];
      if (seg.masaNaM <= 0 || seg.pozostalo <= 0) {
        segIdx++;
        continue;
      }
      const maxM = seg.pozostalo * seg.masaNaM;
      const zuzyj = Math.min(masaPozost, maxM);
      const m = seg.masaNaM > 0 ? zuzyj / seg.masaNaM : 0;
      metry = round2(metry + m);
      seg.pozostalo = round2(seg.pozostalo - m);
      masaPozost = round3(masaPozost - zuzyj);
      if (seg.pozostalo <= 0.001) segIdx++;
    }
    return metry;
  };

  for (const rzut of rzuty) {
    for (let i = 0; i < rzut.iloscSamochodow; i++) {
      numerAuta++;
      const pozostaloMasy = round3(wyniki.lacznaIloscMasy - masaNarastajaco);
      const masa = round2(Math.min(tonazAuta, pozostaloMasy));
      if (masa <= 0) break;
      const metry = pobierzMetryDlaMasy(masa);
      masaNarastajaco = round3(masaNarastajaco + masa);
      metryNarastajaco = round2(metryNarastajaco + metry);
      wynikiAut.push({
        numerAuta,
        numerRzutu: rzut.numerRzutu,
        masa,
        masaNarastajaco,
        metry,
        metryNarastajaco,
      });
    }
  }

  return wynikiAut;
}

/** Wycina fragment podziału rzutów dla N aut (z przesunięciem w globalnej numeracji) */
export function wycinekRzutow(rzuty: Rzut[], pominAut: number, liczbaAut: number): Rzut[] {
  if (liczbaAut <= 0) return [];
  const numeryRzutow: number[] = [];
  for (const r of rzuty) {
    for (let i = 0; i < r.iloscSamochodow; i++) numeryRzutow.push(r.numerRzutu);
  }
  const wycinek = numeryRzutow.slice(pominAut, pominAut + liczbaAut);
  if (wycinek.length === 0) return generujDomyslneRzuty(liczbaAut);

  const wynik: Rzut[] = [];
  for (const nr of wycinek) {
    const ostatni = wynik[wynik.length - 1];
    if (ostatni && ostatni.numerRzutu === nr) {
      ostatni.iloscSamochodow++;
    } else {
      wynik.push({
        id: String(wynik.length + 1),
        numerRzutu: nr,
        iloscSamochodow: 1,
      });
    }
  }
  return wynik;
}

export interface TabelaAutDzialki {
  dzialkaId: string;
  nazwa: string;
  wiersze: WpisTabeliAut[];
  numerAutaOd: number;
  numerAutaDo: number;
}

export interface TabeleAutPlanu {
  calosc: WpisTabeliAut[];
  dzialki: TabelaAutDzialki[];
  lacznaIloscAut: number;
}

/** Tabele aut: całość planu + osobno każda działka (ciągła numeracja, przenoszenie reszty tonażu) */
export function obliczTabeleAutPlanu(
  dzialki: DzialkaRobocza[],
  rzutyPlanu: Rzut[],
  tonazAuta: number,
  ciezarPoMieszance: (mieszankaId: string) => number | undefined,
): TabeleAutPlanu {
  return obliczTabeleAutPlanuCiagla(dzialki, rzutyPlanu, tonazAuta, ciezarPoMieszance);
}

/**
 * @param lacznaIloscMasy - łączna masa do wbudowania [Mg]
 * @param lacznasDlugosc  - łączna długość liniowa działki [m bieżące]
 * @param rzuty           - podział na rzuty (partie aut)
 * @param tonazAuta       - domyślny tonaż pojedynczego auta [t]
 */
export function obliczTabeleAut(
  lacznaIloscMasy: number,
  lacznasDlugosc: number,
  rzuty: Rzut[],
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
  dzialka?: DzialkaRobocza,
  ciezarObjetosciowy?: number,
): WpisTabeliAut[] {
  if (dzialka && ciezarObjetosciowy && dzialka.figury.length > 0) {
    return obliczTabeleAutDlaDzialki(dzialka, ciezarObjetosciowy, rzuty, tonazAuta);
  }

  const wyniki: WpisTabeliAut[] = [];
  let masaNarastajaco = 0;
  let metryNarastajaco = 0;
  let numerAuta = 0;

  // Metry liniowe na tonę masy [m/Mg]
  const metryNaTone = lacznaIloscMasy > 0 ? lacznasDlugosc / lacznaIloscMasy : 0;

  for (const rzut of rzuty) {
    for (let i = 0; i < rzut.iloscSamochodow; i++) {
      numerAuta++;
      const pozostaloMasy = round3(lacznaIloscMasy - masaNarastajaco);
      const masa = round2(Math.min(tonazAuta, pozostaloMasy));
      masaNarastajaco = round3(masaNarastajaco + masa);
      const metry = round2(masa * metryNaTone);
      metryNarastajaco = round2(metryNarastajaco + metry);

      wyniki.push({
        numerAuta,
        numerRzutu: rzut.numerRzutu,
        masa,
        masaNarastajaco,
        metry,
        metryNarastajaco,
      });
    }
  }

  return wyniki;
}

/** Parsuje string "6+6+4" na tablicę Rzut[] */
export function parsujRzuty(rzutyString: string): Rzut[] | null {
  const parts = rzutyString.split('+').map((s) => parseInt(s.trim(), 10));
  if (parts.some(isNaN) || parts.some((n) => n <= 0)) return null;
  return parts.map((count, idx) => ({
    id: String(idx + 1),
    numerRzutu: idx + 1,
    iloscSamochodow: count,
  }));
}

/** Sprawdza czy podział rzutów ma poprawną sumę */
export function walidujRzuty(rzutyString: string, wymaganaLiczbaAut: number): boolean {
  const rzuty = parsujRzuty(rzutyString);
  if (!rzuty) return false;
  return rzuty.reduce((s, r) => s + r.iloscSamochodow, 0) === wymaganaLiczbaAut;
}

/** Generuje domyślny podział rzutów (jeden rzut = wszystkie auta) */
export function generujDomyslneRzuty(iloscAut: number): Rzut[] {
  return [{ id: '1', numerRzutu: 1, iloscSamochodow: iloscAut }];
}

// --- Obliczenia Kontroli (realtime vs plan) ---

export function obliczKontrolę(
  wbudowaneTony: number,
  przejechaneMetry: number,
  dzialka: DzialkaRobocza,
  ciezarObjetosciowy: number,
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
): WynikiKontroli {
  const wyniki = obliczWynikiDzialki(dzialka, ciezarObjetosciowy, tonazAuta);
  const lacznasDlugosc = obliczLacznaDlugosc(dzialka);

  // Zakryta powierzchnia z przejechanych metrów liniowych
  const zakrytaPowierzchnia = obliczPowierzchnioweOdStartu(dzialka, przejechaneMetry);

  // Uzyskana średnia grubość z faktycznie wbudowanych ton i zakrytej powierzchni
  const uzyskanaGrubosc =
    zakrytaPowierzchnia > 0 && ciezarObjetosciowy > 0
      ? round2((wbudowaneTony / (ciezarObjetosciowy * zakrytaPowierzchnia)) * 100)
      : 0;

  // Bilans: ile ton wbudowaliśmy ponad lub poniżej planu
  const masaWgZalozen = round3(zakrytaPowierzchnia * (dzialka.grubosc / 100) * ciezarObjetosciowy);
  const bilansMasy = round3(wbudowaneTony - masaWgZalozen);

  const pozostaloMetrow = round2(Math.max(0, lacznasDlugosc - przejechaneMetry));
  const pozostaloPowierzchni = round2(Math.max(0, wyniki.lacznaPowierzchnia - zakrytaPowierzchnia));

  const sredniaGrubosc = uzyskanaGrubosc > 0 ? uzyskanaGrubosc : dzialka.grubosc;

  const pozostaloMasyWgZalozen = round3(
    pozostaloPowierzchni * (dzialka.grubosc / 100) * ciezarObjetosciowy,
  );
  const pozostaloMasyWgSredniej = round3(
    pozostaloPowierzchni * (sredniaGrubosc / 100) * ciezarObjetosciowy,
  );

  return {
    zakrytaPowierzchnia,
    uzyskanaGrubosc,
    bilansMasy,
    pozostaloMetrow,
    pozostaloPowierzchni,
    pozostaloMasyWgZalozen,
    pozostaloMasyWgSredniej,
  };
}

// --- Pomocnicze: skumulowana powierzchnia od startu do danego metra liniowego ---

export function obliczPowierzchnioweOdStartu(
  dzialka: DzialkaRobocza,
  metryOdStartu: number,
): number {
  let powierzchniaCum = 0;
  let metryCum = 0;

  for (const figura of dzialka.figury) {
    const dlugoscF = dlugoscFigury(figura);
    const powierzchniaF = obliczPowierzchniFigury(figura);

    if (metryCum + dlugoscF <= metryOdStartu) {
      powierzchniaCum += powierzchniaF;
      metryCum += dlugoscF;
    } else {
      const ulamek = dlugoscF > 0 ? (metryOdStartu - metryCum) / dlugoscF : 0;
      powierzchniaCum += powierzchniaF * ulamek;
      break;
    }
  }

  return round2(Math.max(0, powierzchniaCum));
}

// --- Formatowanie liczb ---

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export function formatLiczby(
  n: number,
  miejscaPoPrzecinku = 2,
  separator = ',',
): string {
  return n
    .toFixed(miejscaPoPrzecinku)
    .replace('.', separator)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}
