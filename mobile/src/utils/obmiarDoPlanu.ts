// ============================================================
// OBMIAR → PLAN DNIA / DZIAŁKI WBUDOWYWANIA
// ============================================================

import type { DzialkaRobocza, FiguraProstokat, Mieszanka, ObszarObmiaru, Plan, Rzut, SesjaObmiaruDnia } from '../types';
import { bazaKompletna } from './obmiarFigura';
import { dlugoscUkladaniaObszaru } from './obmiarLive';
import { formatLiczby, generujDomyslneRzuty, round2, round3 } from './calculations';

export function gruboscWbudowywaniaObszaru(o: ObszarObmiaru): number {
  return o.gruboscWbudowywania ?? o.gruboscCm ?? 0;
}

export function brakiZatwierdzeniaObszaru(o: ObszarObmiaru): { pole: 'start' | 'konstrukcja'; komunikat: string }[] {
  const braki: { pole: 'start' | 'konstrukcja'; komunikat: string }[] = [];
  if (!bazaKompletna(o.bazaStart) || !bazaKompletna(o.bazaKoniec)) {
    braki.push({ pole: 'start', komunikat: 'Ustaw punkty startowe i końcowe (L i P).' });
  }
  if (!o.mieszankaId) {
    braki.push({ pole: 'konstrukcja', komunikat: 'Wybierz mieszankę.' });
  }
  if (gruboscWbudowywaniaObszaru(o) <= 0) {
    braki.push({ pole: 'konstrukcja', komunikat: 'Podaj grubość wbudowywania.' });
  }
  return braki;
}

export function obszarNaDzialke(o: ObszarObmiaru): DzialkaRobocza {
  const dl = Math.max(dlugoscUkladaniaObszaru(o), 0.01);
  const szer = Math.max(o.powierzchniaM2 / dl, 0.01);
  const km = o.bazaStart?.kilometrazKm ?? o.kilometrazStartKm ?? 0;
  const m = o.bazaStart?.kilometrazM ?? o.kilometrazStartM ?? 0;
  const grub = gruboscWbudowywaniaObszaru(o);
  const figura: FiguraProstokat = {
    id: `${o.id}-fig`,
    typ: 'prostokat',
    numeracja: 1,
    kilometrazPoczatkowy: km * 1000 + m,
    szerokosc: round2(szer),
    dlugosc: round2(dl),
  };
  return {
    id: o.id,
    nazwa: o.nazwaDzialki?.trim() || o.nazwa,
    mieszankaId: o.mieszankaId ?? '',
    grubosc: grub,
    gruboscProjektowa: o.gruboscProjektowa ?? grub,
    tolerancja: o.tolerancja ?? 10,
    gruboscWbudowywania: grub,
    kilometrazPoczatkowyKm: km,
    kilometrazPoczatkowyM: m,
    kierunekUkladania: o.kierunekUkladania ?? 'rosnacy',
    figury: [figura],
  };
}

export interface PozycjaPowierzchni {
  etykieta: string;
  powierzchniaM2: number;
}

export interface PozycjaMieszanki {
  mieszankaId: string;
  etykieta: string;
  rodzaj: string;
  gruboscCm: number;
  masaMg: number;
  powierzchniaM2: number;
}

export interface PodsumowaniePlanuObmiaru {
  powierzchniaRazem: number;
  powierzchnie: PozycjaPowierzchni[];
  liczbaObszarow: number;
  mieszanki: PozycjaMieszanki[];
  masaNaMieszanke: { mieszankaId: string; etykieta: string; masaMg: number; auta: number }[];
  sumaAut: number;
  sumaMasy: number;
}

export function podsumowaniePlanuObmiaru(
  sesja: SesjaObmiaruDnia,
  mieszanki: Mieszanka[],
  tonazAuta: number,
): PodsumowaniePlanuObmiaru {
  const getM = (id?: string) => (id ? mieszanki.find((m) => m.id === id) : undefined);
  const powMap = new Map<string, number>();
  const masaMap = new Map<string, PozycjaMieszanki>();
  const masaMix = new Map<string, { etykieta: string; masaMg: number }>();

  for (const o of sesja.obszary) {
    const mie = getM(o.mieszankaId);
    const kluczPow = mie
      ? `${mie.rodzaj}${mie.nrRecepty ? ` ${mie.nrRecepty}` : ''}`
      : 'Bez mieszanki';
    powMap.set(kluczPow, (powMap.get(kluczPow) ?? 0) + o.powierzchniaM2);

    const gr = gruboscWbudowywaniaObszaru(o);
    if (!mie || gr <= 0) continue;
    const masa = round3(o.powierzchniaM2 * (gr / 100) * mie.ciezarObjetosciowy);
    const klucz = `${mie.id}::${gr}`;
    const prev = masaMap.get(klucz);
    if (prev) {
      prev.masaMg = round3(prev.masaMg + masa);
      prev.powierzchniaM2 = round2(prev.powierzchniaM2 + o.powierzchniaM2);
    } else {
      masaMap.set(klucz, {
        mieszankaId: mie.id,
        etykieta: `${mie.rodzaj}${mie.nrRecepty ? ` ${mie.nrRecepty}` : ''}`,
        rodzaj: mie.rodzaj,
        gruboscCm: gr,
        masaMg: masa,
        powierzchniaM2: round2(o.powierzchniaM2),
      });
    }
    const mix = masaMix.get(mie.id);
    const etykieta = `${mie.rodzaj}${mie.nrRecepty ? ` ${mie.nrRecepty}` : ''}`;
    if (mix) mix.masaMg = round3(mix.masaMg + masa);
    else masaMix.set(mie.id, { etykieta, masaMg: masa });
  }

  const masaNaMieszanke = [...masaMix.entries()].map(([mieszankaId, v]) => ({
    mieszankaId,
    etykieta: v.etykieta,
    masaMg: v.masaMg,
    auta: Math.max(1, Math.ceil(v.masaMg / Math.max(tonazAuta, 0.01))),
  }));
  const sumaAut = masaNaMieszanke.reduce((a, x) => a + x.auta, 0);
  const sumaMasy = masaNaMieszanke.reduce((a, x) => a + x.masaMg, 0);

  return {
    powierzchniaRazem: round2(sesja.obszary.reduce((a, o) => a + o.powierzchniaM2, 0)),
    powierzchnie: [...powMap.entries()].map(([etykieta, powierzchniaM2]) => ({
      etykieta, powierzchniaM2: round2(powierzchniaM2),
    })),
    liczbaObszarow: sesja.obszary.length,
    mieszanki: [...masaMap.values()],
    masaNaMieszanke,
    sumaAut,
    sumaMasy: round3(sumaMasy),
  };
}

export function etykietaPowierzchni(p: PozycjaPowierzchni): string {
  return `${formatLiczby(p.powierzchniaM2)} m² ${p.etykieta}`;
}

export function etykietaMasy(p: PozycjaMieszanki): string {
  return `${formatLiczby(p.masaMg, 2)} t ${p.etykieta} gr (${formatLiczby(p.gruboscCm)} cm)`;
}

export function obszarZWpisamiLive(
  obszar: ObszarObmiaru,
  wpisy: { id: string; numerAuta: number; tonazPrzywieziony: number; przejechaneMetry: number; createdAt: string }[],
): ObszarObmiaru {
  let cum = 0;
  const wpisyWz = wpisy.map((w) => {
    cum += w.przejechaneMetry;
    return {
      id: w.id,
      numer: w.numerAuta,
      tony: w.tonazPrzywieziony,
      przejechaneMetry: cum,
      createdAt: w.createdAt,
    };
  });
  return { ...obszar, wpisyWz, przejechaneMetry: cum };
}

export function sesjaNaDanePlanu(
  sesja: SesjaObmiaruDnia,
  tonazAuta: number,
  rzuty: Rzut[],
): Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> {
  const dzialki = [...sesja.obszary]
    .sort((a, b) => a.kolejnosc - b.kolejnosc)
    .map(obszarNaDzialke);
  return {
    dataWbudowywania: sesja.data.length <= 10 ? `${sesja.data}T08:00:00.000Z` : sesja.data,
    budowaId: sesja.budowaId,
    iloscDzialek: dzialki.length,
    dzialki,
    tonazAuta,
    rzuty: rzuty.length ? rzuty : generujDomyslneRzuty(1),
    status: 'aktywny',
    zrodlo: 'obmiar',
    sesjaObmiaruId: sesja.id,
  };
}
