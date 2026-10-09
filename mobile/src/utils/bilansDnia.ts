// Bilans zapisanej dniówki: kilometraż w kierunku układania, nie zawsze rosnąco.

import type { Plan, WpisLive } from '../types';
import { obliczLacznaDlugosc, obliczPowierzchnioweOdStartu, obliczWynikiDzialki } from './calculations';
import { pikietazPoMetrach } from './chainage';
import { gruboscWbudowywania } from './grubosc';

export interface MieszankaBilansu {
  id: string;
  rodzaj: string;
  ciezarObjetosciowy: number;
}

export interface BilansDnia {
  liczbaDzialek: number;
  mieszanka: string;
  masaPlanMg: number;
  masaLiveMg: number;
  deltaMasaMg: number;
  dlugoscPlanM: number;
  startM: number;
  koniecPlanM: number;
  metryWykonane: number;
  koniecWykonanyM: number;
  deltaMetry: number;
  kierunek: 'rosnacy' | 'malejacy';
  liczbaAut: number;
  autOpis: string;
  gruboscPlanCm: number;
  gruboscUzyskanaCm: number;
  deltaGruboscCm: number;
}

/** „8” albo „8 (6+2)” – liczba aut w kolejnych rzutach I…V. */
export function opisAutPoRzutach(wpisy: WpisLive[]): string {
  const rzutAuta = new Map<number, number>();
  for (const w of wpisy) {
    if (!rzutAuta.has(w.numerAuta)) rzutAuta.set(w.numerAuta, w.numerRzutu ?? 1);
  }
  const n = rzutAuta.size;
  const liczniki = [0, 0, 0, 0, 0];
  for (const r of rzutAuta.values()) {
    const i = Math.min(5, Math.max(1, r)) - 1;
    liczniki[i] += 1;
  }
  let ostatni = 0;
  liczniki.forEach((c, i) => {
    if (c > 0) ostatni = i;
  });
  const uzyte = liczniki.slice(0, ostatni + 1);
  if (n === 0 || uzyte.length <= 1) return String(n);
  return `${n} (${uzyte.join('+')})`;
}

export function policzBilansDnia(
  plan: Plan,
  wpisy: WpisLive[],
  mieszanki: MieszankaBilansu[],
): BilansDnia {
  const dz0 = plan.dzialki[0];
  const startZDzialki = dz0
    ? dz0.kilometrazPoczatkowyKm * 1000 + dz0.kilometrazPoczatkowyM
    : 0;
  const startM = plan.kilometrazOdM ?? startZDzialki;
  const kierunek: 'rosnacy' | 'malejacy' = plan.kilometrazOdM != null && plan.kilometrazDoM != null
    ? (plan.kilometrazOdM > plan.kilometrazDoM ? 'malejacy' : 'rosnacy')
    : (dz0?.kierunekUkladania ?? 'rosnacy');
  const dlugoscZDzialek = plan.dzialki.reduce((s, dz) => s + obliczLacznaDlugosc(dz), 0);
  const dlugoscPlanM = plan.kilometrazOdM != null && plan.kilometrazDoM != null
    ? Math.abs(plan.kilometrazDoM - plan.kilometrazOdM)
    : dlugoscZDzialek;
  const koniecPlanM = plan.kilometrazDoM ?? pikietazPoMetrach(startM, dlugoscPlanM, kierunek);
  const metryWykonane = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);
  const koniecWykonanyM = pikietazPoMetrach(startM, metryWykonane, kierunek);

  const mieszankaNazwy = [...new Set(plan.dzialki.map((dz) => {
    const m = mieszanki.find((x) => x.id === dz.mieszankaId);
    return m?.rodzaj;
  }).filter((x): x is string => !!x))];

  let masaPlanMg = 0;
  let powPlan = 0;
  let grPlanWazona = 0;
  let powWyk = 0;
  let grWykWazona = 0;
  for (const dz of plan.dzialki) {
    const mie = mieszanki.find((x) => x.id === dz.mieszankaId);
    const ciezar = mie?.ciezarObjetosciowy ?? 0;
    if (mie) masaPlanMg += obliczWynikiDzialki(dz, ciezar, plan.tonazAuta).lacznaIloscMasy;
    const dl = obliczLacznaDlugosc(dz);
    const powDz = obliczPowierzchnioweOdStartu(dz, dl);
    powPlan += powDz;
    grPlanWazona += gruboscWbudowywania(dz) * powDz;
    const wpisyDz = wpisy.filter((w) => w.dzialkaId === dz.id);
    const masaDz = wpisyDz.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const metryDz = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);
    const pow = obliczPowierzchnioweOdStartu(dz, metryDz);
    powWyk += pow;
    if (pow > 0 && ciezar > 0) grWykWazona += (masaDz / (ciezar * pow)) * 100 * pow;
  }

  const masaLiveMg = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const gruboscPlanCm = powPlan > 0 ? grPlanWazona / powPlan : (dz0 ? gruboscWbudowywania(dz0) : 0);
  const gruboscUzyskanaCm = powWyk > 0 ? grWykWazona / powWyk : 0;

  return {
    liczbaDzialek: plan.dzialki.length,
    mieszanka: mieszankaNazwy.join(', ') || '–',
    masaPlanMg,
    masaLiveMg,
    deltaMasaMg: masaLiveMg - masaPlanMg,
    dlugoscPlanM,
    startM,
    koniecPlanM,
    metryWykonane,
    koniecWykonanyM,
    deltaMetry: metryWykonane - dlugoscPlanM,
    kierunek,
    liczbaAut: new Set(wpisy.map((w) => w.numerAuta)).size,
    autOpis: opisAutPoRzutach(wpisy),
    gruboscPlanCm,
    gruboscUzyskanaCm,
    deltaGruboscCm: gruboscUzyskanaCm - gruboscPlanCm,
  };
}
