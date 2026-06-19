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

/** Zwraca długość figury potrzebną do obliczenia pikietażu ciągłego */
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

// --- Obliczanie wyników figury z pikietażem ---

export function obliczWynikiŚcieżkiFigury(
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
  const lacznaPowierzchnia = dzialka.figury.reduce(
    (sum, f) => sum + obliczPowierzchniFigury(f),
    0,
  );

  const lacznaIloscMasy = round3(
    lacznaPowierzchnia * (dzialka.grubosc / 100) * ciezarObjetosciowy,
  );

  const iloscSamochodow = Math.ceil(lacznaIloscMasy / tonazAuta);

  return { lacznaPowierzchnia: round2(lacznaPowierzchnia), lacznaIloscMasy, iloscSamochodow };
}

// --- Tabela aut z podziałem na rzuty ---

export function obliczTabeleAut(
  lacznaIloscMasy: number,
  lacznaPowierzchnia: number,
  rzuty: Rzut[],
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
): WpisTabeliAut[] {
  const wyniki: WpisTabeliAut[] = [];
  let masaNarastajaco = 0;
  let metryNarastajaco = 0;
  let numerAuta = 0;

  const metryNaTone = lacznaPowierzchnia / lacznaIloscMasy; // [m/Mg]

  for (const rzut of rzuty) {
    for (let i = 0; i < rzut.iloscSamochodow; i++) {
      numerAuta++;
      const pozostaloMasy = lacznaIloscMasy - masaNarastajaco;
      const masa = round2(Math.min(tonazAuta, pozostaloMasy));
      masaNarastajaco = round2(masaNarastajaco + masa);
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

// --- Obliczenia Kontroli (realtime vs plan) ---

export function obliczKontrolę(
  wbudowaneTony: number,
  przejechaneMetry: number,
  dzialka: DzialkaRobocza,
  ciezarObjetosciowy: number,
  tonazAuta: number = DOMYSLNY_TONAZ_AUTA,
): WynikiKontroli {
  const wyniki = obliczWynikiDzialki(dzialka, ciezarObjetosciowy, tonazAuta);

  // Zakryta powierzchnia: przeliczamy z przejechanych metrów
  const zakrytaPowierzchnia = obliczPowierzchnioweOdStartu(dzialka, przejechaneMetry);

  // Uzyskana grubość z tony i powierzchni
  const uzyskanaGrubosc =
    zakrytaPowierzchnia > 0
      ? round2((wbudowaneTony / (ciezarObjetosciowy * zakrytaPowierzchnia)) * 100)
      : 0;

  // Bilans masy: ile ton powinniśmy byli wbudować vs ile wbudowaliśmy
  const masaWgZalozen = round3(zakrytaPowierzchnia * (dzialka.grubosc / 100) * ciezarObjetosciowy);
  const bilansMasy = round3(wbudowaneTony - masaWgZalozen);

  const pozostaloMetrow = round2(wyniki.lacznaPowierzchnia > 0
    ? (wyniki.lacznaPowierzchnia - zakrytaPowierzchnia) /
      (wyniki.lacznaPowierzchnia / obliczCalkowitaDlugosc(dzialka))
    : 0);

  const pozostaloPowierzchni = round2(wyniki.lacznaPowierzchnia - zakrytaPowierzchnia);

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

// --- Pomocnicze: skumulowana powierzchnia od startu do danego metra ---

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
      // Jesteśmy w środku tej figury
      const ulamek = (metryOdStartu - metryCum) / dlugoscF;
      powierzchniaCum += powierzchniaF * ulamek;
      break;
    }
  }

  return round2(powierzchniaCum);
}

function obliczCalkowitaDlugosc(dzialka: DzialkaRobocza): number {
  return dzialka.figury.reduce((sum, f) => sum + dlugoscFigury(f), 0);
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
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); // spacja jako separator tysięcy
}
