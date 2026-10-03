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

export const MAX_POSZERZEN_STRONA = 4;
export const DOMYSLNA_SZER_POSZERZENIA = 0.75;

export function sumaPoszerzen(poszerzenia: number[]): number {
  return poszerzenia.reduce((acc, w) => acc + (Number.isFinite(w) && w > 0 ? w : 0), 0);
}

export interface KonfiguracjaStolu {
  poszL: number;
  poszP: number;
  stolPodstawowy: number;
  szerMin: number;
  szerMax: number;
}

export function konfiguracjaStolu(
  wPodstawa: number,
  wMaxStolu: number,
  poszerzeniaL: number[],
  poszerzeniaP: number[],
): KonfiguracjaStolu {
  const poszL = sumaPoszerzen(poszerzeniaL);
  const poszP = sumaPoszerzen(poszerzeniaP);
  return {
    poszL,
    poszP,
    stolPodstawowy: wPodstawa,
    szerMin: wPodstawa + poszL + poszP,
    szerMax: wMaxStolu + poszL + poszP,
  };
}

export interface WynikWskaznikaRozkladarki {
  odOsiM: number;
  odGasiennicyM: number;
  odPlozyM: number;
  odOsiCm: number;
  odGasiennicyCm: number;
  odPlozyCm: number;
  sumaSzerokosciM: number;
  szerMinM: number;
  szerMaxM: number;
  stolPodstawowyM: number;
  strona: 'Lewa' | 'Prawa';
}

export function obliczWskaznikRozkladarki(params: {
  wPodstawa: number;
  wMaxStolu: number;
  poszerzeniaL: number[];
  poszerzeniaP: number[];
  wDocelowa: number;
  strona: 'lewa' | 'prawa';
  lLinka: number;
}): { ok: true; wynik: WynikWskaznikaRozkladarki } | { ok: false; blad: string; konfiguracja: KonfiguracjaStolu } {
  const {
    wPodstawa, wMaxStolu, poszerzeniaL, poszerzeniaP, wDocelowa, strona, lLinka,
  } = params;
  const konfiguracja = konfiguracjaStolu(wPodstawa, wMaxStolu, poszerzeniaL, poszerzeniaP);

  if (wPodstawa <= 0) {
    return { ok: false, blad: 'Podstawa stołu musi być większa od 0', konfiguracja };
  }
  if (wMaxStolu + 1e-9 < wPodstawa) {
    return { ok: false, blad: 'Max. szerokość stołu nie może być mniejsza od podstawy', konfiguracja };
  }
  if (lLinka < 0) {
    return { ok: false, blad: 'Odległość linki nie może być ujemna', konfiguracja };
  }
  if (wDocelowa <= 0) {
    return { ok: false, blad: 'Docelowa szerokość układania musi być większa od 0', konfiguracja };
  }
  if (wDocelowa + 1e-9 < konfiguracja.szerMin || wDocelowa - 1e-9 > konfiguracja.szerMax) {
    return {
      ok: false,
      blad: `Stół układa od ${konfiguracja.szerMin.toFixed(2)} m do ${konfiguracja.szerMax.toFixed(2)} m`,
      konfiguracja,
    };
  }

  const wStrony = wDocelowa / 2;
  const odOsi = wStrony + lLinka;
  const odGasiennicy = wStrony - wPodstawa / 2 + lLinka;
  const odPlozy = lLinka;

  return {
    ok: true,
    wynik: {
      odOsiM: Math.round(odOsi * 100) / 100,
      odGasiennicyM: Math.round(odGasiennicy * 100) / 100,
      odPlozyM: Math.round(odPlozy * 100) / 100,
      odOsiCm: Math.round(odOsi * 100),
      odGasiennicyCm: Math.round(odGasiennicy * 100),
      odPlozyCm: Math.round(odPlozy * 100),
      sumaSzerokosciM: wDocelowa,
      szerMinM: konfiguracja.szerMin,
      szerMaxM: konfiguracja.szerMax,
      stolPodstawowyM: konfiguracja.stolPodstawowy,
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
