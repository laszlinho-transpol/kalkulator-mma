// Kalkulatory pomocnicze – Niezbędnik masiarza

export function wydajnoscPowierzchniowa(
  tonaz: number, gruboscCm: number, szerokoscM: number, gestosc: number,
): number {
  if (gruboscCm <= 0 || szerokoscM <= 0 || gestosc <= 0) return 0;
  return (tonaz / (gruboscCm / 100 * szerokoscM * gestosc));
}

export function wydajnoscGrubosciowa(
  masaMg: number, dlugoscM: number, szerokoscM: number, gestosc: number,
): number {
  if (dlugoscM <= 0 || szerokoscM <= 0 || gestosc <= 0) return 0;
  return (masaMg / (dlugoscM * szerokoscM * gestosc)) * 100;
}

export interface WynikWskaznikaRozkladarki {
  odOsiCm: number;
  odGasiennicyCm: number;
  odPlozyCm: number;
  sumaSzerokosciM: number;
  strona: 'Lewa' | 'Prawa';
}

export function obliczWskaznikRozkladarki(params: {
  wBaza: number;
  poszLeweIlosc: number;
  poszLeweSzer: number;
  poszPraweIlosc: number;
  poszPraweSzer: number;
  wDocelowaL: number;
  wDocelowaP: number;
  strona: 'lewa' | 'prawa';
  lLinka: number;
}): { ok: true; wynik: WynikWskaznikaRozkladarki } | { ok: false; blad: string } {
  const {
    wBaza, poszLeweIlosc, poszLeweSzer, poszPraweIlosc, poszPraweSzer,
    wDocelowaL, wDocelowaP, strona, lLinka,
  } = params;

  const poszL = poszLeweIlosc * poszLeweSzer;
  const poszP = poszPraweIlosc * poszPraweSzer;
  const minL = wBaza / 2 + poszL;
  const maxL = wBaza + poszL;
  const minP = wBaza / 2 + poszP;
  const maxP = wBaza + poszP;

  if (wDocelowaL < minL || wDocelowaL > maxL) {
    return { ok: false, blad: `Lewa strona układa od ${minL.toFixed(2)} m do ${maxL.toFixed(2)} m` };
  }
  if (wDocelowaP < minP || wDocelowaP > maxP) {
    return { ok: false, blad: `Prawa strona układa od ${minP.toFixed(2)} m do ${maxP.toFixed(2)} m` };
  }

  const wStrony = strona === 'lewa' ? wDocelowaL : wDocelowaP;
  const odOsi = wStrony + lLinka;
  const odGasiennicy = wStrony - wBaza / 2 + lLinka;
  const odPlozy = lLinka;

  return {
    ok: true,
    wynik: {
      odOsiCm: Math.round(odOsi * 100),
      odGasiennicyCm: Math.round(odGasiennicy * 100),
      odPlozyCm: Math.round(odPlozy * 100),
      sumaSzerokosciM: wDocelowaL + wDocelowaP,
      strona: strona === 'lewa' ? 'Lewa' : 'Prawa',
    },
  };
}

export function tyczenieLukow(R: number, krokM = 1): { x: number; y: number }[] {
  const wynik: { x: number; y: number }[] = [];
  for (let x = 0; x <= R; x += krokM) {
    if (x > R) break;
    const y = R - Math.sqrt(Math.max(0, R * R - x * x));
    wynik.push({ x, y: Math.round(y * 1000) / 1000 });
  }
  return wynik;
}

export function kalkulatorSpadkow(rzednaStart: number, rzednaKoniec: number, odlegloscM: number) {
  const roznica = rzednaKoniec - rzednaStart;
  const procent = odlegloscM > 0 ? (roznica / odlegloscM) * 100 : 0;
  return { procent: Math.round(procent * 1000) / 1000, promile: Math.round(procent * 10 * 10) / 10 };
}

export function przenoszenieWysokosci(
  rzednaStart: number, spadekProcent: number, odlegloscM: number, kierunek: 'gora' | 'dol',
): number {
  const delta = odlegloscM * (spadekProcent / 100);
  return kierunek === 'gora' ? rzednaStart + delta : rzednaStart - delta;
}

export function interpolacjaPikietażu(
  pikA: number, rzednaA: number, pikB: number, rzednaB: number, pikX: number,
): number {
  if (pikB === pikA) return rzednaA;
  const proporcja = (pikX - pikA) / (pikB - pikA);
  return rzednaA + proporcja * (rzednaB - rzednaA);
}

export function tyczenieKataProstego(skala: number) {
  const s = skala > 0 ? skala : 1;
  return { bokA: 3 * s, bokB: 4 * s, przeciwprostokatna: 5 * s };
}

export function logistykaTransportu(params: {
  czasPrzejazduMin: number;
  mnoznikCiezarowki: number;
  czasOczyszczeniaMin?: number;
  szerokoscM: number;
  gruboscCm: number;
  gestosc: number;
  wydajnoscWbmTH: number;
  tonazAuta: number;
}): { czasCalkowityMin: number; predkoscMMin: number; autWKolku: number } {
  const {
    czasPrzejazduMin, mnoznikCiezarowki, czasOczyszczeniaMin = 10,
    szerokoscM, gruboscCm, gestosc, wydajnoscWbmTH, tonazAuta,
  } = params;
  const czasJazdy = czasPrzejazduMin * mnoznikCiezarowki;
  const pauzy = Math.floor(czasJazdy / 180) * 30;
  const czasCalkowityMin = czasJazdy + czasOczyszczeniaMin + pauzy;
  const przekroj = szerokoscM * (gruboscCm / 100) * gestosc;
  const predkoscMMin = przekroj > 0 ? (wydajnoscWbmTH / 60) / przekroj : 0;
  const czasNaAuto = tonazAuta > 0 && wydajnoscWbmTH > 0 ? (tonazAuta / (wydajnoscWbmTH / 60)) : 0;
  const autWKolku = czasNaAuto > 0 ? Math.max(1, Math.ceil(czasCalkowityMin / czasNaAuto)) : 1;
  return { czasCalkowityMin, predkoscMMin, autWKolku };
}
