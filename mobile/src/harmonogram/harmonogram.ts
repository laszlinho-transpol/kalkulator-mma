// Harmonogram: wpisy proste (budowa, mieszanka, tony) i plany z „Zaplanuj masę” w jednym widoku,
// dzielone na tygodnie kalendarzowe (TK, poniedziałek–niedziela, numeracja ISO).

import { formatLiczby, obliczLacznaDlugosc, obliczWynikiDzialki, round2 } from '../utils/calculations';
import { formatujPikietaz, pikietazPoMetrach } from '../utils/chainage';
import { formatujKmM } from '../utils/projektBudowy';
import { rodzajMieszanki } from '../mieszanki/kolejnosc';
import type { Budowa, Mieszanka, Plan } from '../types';
import type { DokumentPdf, SekcjaPdf } from '../eksport/dokumentPdf';

export interface WpisHarmonogramu {
  id: string;
  /** YYYY-MM-DD */
  data: string;
  budowaId: string;
  /** Mieszanki planu dnia z ilością [t]. */
  mieszanki?: MieszankaWpisu[];
  /** @deprecated wpisy z 1.8.46 – jedna mieszanka; czytaj przez `mieszankiWpisu`. */
  mieszankaId?: string;
  /** @deprecated [t] */
  ilosc?: number;
  uwagi?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MieszankaWpisu {
  mieszankaId: string;
  /** [t] */
  ilosc: number;
}

export const mieszankiWpisu = (w: Pick<WpisHarmonogramu, 'mieszanki' | 'mieszankaId' | 'ilosc'>): MieszankaWpisu[] => (
  w.mieszanki?.length ? w.mieszanki : w.mieszankaId ? [{ mieszankaId: w.mieszankaId, ilosc: w.ilosc ?? 0 }] : []
);

export interface PozycjaHarmonogramu {
  klucz: string;
  data: string;
  rodzaj: 'prosty' | 'plan';
  wpisId?: string;
  planId?: string;
  zrealizowany?: boolean;
  budowaId?: string;
  budowa: string;
  obszar?: string;
  kilometraz?: string;
  warstwa?: string;
  recepta: string;
  tony: number;
  powierzchniaM2?: number;
  auta?: number;
}

type MieszankaH = Pick<Mieszanka, 'id' | 'rodzaj' | 'ciezarObjetosciowy'> & Partial<Pick<Mieszanka, 'kategoriaRuchu' | 'nrRecepty'>>;
type BudowaH = Pick<Budowa, 'id' | 'kodBudowy' | 'nazwaInwestycji'>;

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDnia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dataLokalna = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
};

/** Dzień planu po czasie lokalnym (plany zapisują `toISOString()`). */
export const dzienPlanu = (plan: Pick<Plan, 'dataWbudowywania'>) => (
  /^\d{4}-\d{2}-\d{2}$/.test(plan.dataWbudowywania) ? plan.dataWbudowywania : isoDnia(new Date(plan.dataWbudowywania))
);

export function przesunDni(iso: string, dni: number): string {
  const d = dataLokalna(iso);
  d.setDate(d.getDate() + dni);
  return isoDnia(d);
}

export const poczatekTygodnia = (iso: string) => przesunDni(iso, -((dataLokalna(iso).getDay() + 6) % 7));
export const dniTygodnia = (iso: string) => Array.from({ length: 7 }, (_, i) => przesunDni(poczatekTygodnia(iso), i));

/** Numer tygodnia kalendarzowego wg ISO 8601 (tydzień z pierwszym czwartkiem roku = TK 1). */
export function numerTygodnia(iso: string): { tk: number; rok: number } {
  const d = dataLokalna(iso);
  const czwartek = new Date(d);
  czwartek.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const pierwszy = new Date(czwartek.getFullYear(), 0, 4, 12);
  const tk = 1 + Math.round(((czwartek.getTime() - pierwszy.getTime()) / 86400000 - 3 + ((pierwszy.getDay() + 6) % 7)) / 7);
  return { tk, rok: czwartek.getFullYear() };
}

const krotko = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
export const etykietaTygodnia = (iso: string) => {
  const dni = dniTygodnia(iso);
  return `TK ${numerTygodnia(iso).tk} · ${krotko(dni[0])}–${krotko(dni[6])}.${dni[6].slice(0, 4)}`;
};

export const nazwaRecepty = (m?: MieszankaH) => (m ? `${rodzajMieszanki(m)}${m.nrRecepty ? ` · ${m.nrRecepty}` : ''}` : 'Mieszanka usunięta');
const nazwaBudowy = (budowy: BudowaH[], id?: string) => {
  const b = budowy.find((x) => x.id === id);
  return b ? `${b.kodBudowy} · ${b.nazwaInwestycji}` : id ? 'Budowa usunięta' : 'Bez budowy';
};

function pozycjePlanu(plan: Plan, budowy: BudowaH[], mieszanki: MieszankaH[]): PozycjaHarmonogramu[] {
  const data = dzienPlanu(plan);
  const wspolne = {
    data,
    rodzaj: 'plan' as const,
    planId: plan.id,
    zrealizowany: plan.status === 'archiwalny',
    budowaId: plan.budowaId,
    budowa: nazwaBudowy(budowy, plan.budowaId),
  };
  const wyniki = plan.dzialki.map((dz) => {
    const m = mieszanki.find((x) => x.id === dz.mieszankaId);
    const w = m ? obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta) : undefined;
    return { dz, m, pow: w?.lacznaPowierzchnia ?? 0, tony: w?.lacznaIloscMasy ?? 0 };
  });
  const suma = (lista: typeof wyniki) => ({
    powierzchniaM2: round2(lista.reduce((s, x) => s + x.pow, 0)),
    tony: round2(lista.reduce((s, x) => s + x.tony, 0)),
  });
  const auta = (tony: number) => (plan.tonazAuta > 0 ? Math.ceil(tony / plan.tonazAuta - 1e-9) : undefined);
  const recepty = (lista: typeof wyniki) => [...new Set(lista.map((x) => nazwaRecepty(x.m)))].join(', ') || '—';

  const zakladki = plan.zakladkiBudowy ?? [];
  if (plan.zrodlo === 'budowa' && zakladki.length > 0) {
    return zakladki.map((z) => {
      const lista = wyniki.filter((x) => x.dz.zakladkaId === z.id || (zakladki.length === 1 && !x.dz.zakladkaId));
      const s = suma(lista);
      return {
        ...wspolne,
        klucz: `${plan.id}-${z.id}`,
        obszar: z.obszarNazwa || plan.obszarNazwa,
        kilometraz: `${formatujKmM(z.kilometrazOdM)} – ${formatujKmM(z.kilometrazDoM)}`,
        warstwa: z.warstwaNazwa || plan.warstwaNazwa,
        recepta: z.mieszankaId ? nazwaRecepty(mieszanki.find((m) => m.id === z.mieszankaId)) : recepty(lista),
        ...s,
        auta: auta(s.tony),
      };
    });
  }
  if (plan.zrodlo === 'budowa') {
    const s = suma(wyniki);
    return [{
      ...wspolne,
      klucz: plan.id,
      obszar: plan.obszarNazwa,
      kilometraz: plan.kilometrazOdM != null && plan.kilometrazDoM != null ? `${formatujKmM(plan.kilometrazOdM)} – ${formatujKmM(plan.kilometrazDoM)}` : undefined,
      warstwa: plan.warstwaNazwa,
      recepta: recepty(wyniki),
      ...s,
      auta: auta(s.tony),
    }];
  }
  return wyniki.map((x) => {
    const km0 = x.dz.kilometrazPoczatkowyKm * 1000 + x.dz.kilometrazPoczatkowyM;
    const km1 = pikietazPoMetrach(km0, obliczLacznaDlugosc(x.dz), x.dz.kierunekUkladania);
    return {
      ...wspolne,
      klucz: `${plan.id}-${x.dz.id}`,
      obszar: x.dz.nazwa,
      kilometraz: `${formatujPikietaz(km0)} – ${formatujPikietaz(km1)}`,
      warstwa: plan.warstwaNazwa,
      recepta: nazwaRecepty(x.m),
      powierzchniaM2: round2(x.pow),
      tony: round2(x.tony),
      auta: auta(x.tony),
    };
  });
}

export function pozycjeHarmonogramu({ wpisy, plany, budowy, mieszanki }: {
  wpisy: WpisHarmonogramu[];
  plany: Plan[];
  budowy: BudowaH[];
  mieszanki: MieszankaH[];
}): PozycjaHarmonogramu[] {
  const proste: PozycjaHarmonogramu[] = wpisy.flatMap((w) => mieszankiWpisu(w).map((x, i) => ({
    klucz: `${w.id}-${i}`,
    data: w.data,
    rodzaj: 'prosty' as const,
    wpisId: w.id,
    budowaId: w.budowaId,
    budowa: nazwaBudowy(budowy, w.budowaId),
    recepta: nazwaRecepty(mieszanki.find((m) => m.id === x.mieszankaId)),
    tony: x.ilosc,
  })));
  return [...proste, ...plany.flatMap((p) => pozycjePlanu(p, budowy, mieszanki))]
    .sort((a, b) => a.data.localeCompare(b.data) || a.budowa.localeCompare(b.budowa, 'pl'));
}

/** Recepty zatwierdzone w konstrukcjach budowy (także w zmianach konstrukcji). */
export function mieszankiBudowy(budowa?: Pick<Budowa, 'projekt'>): string[] {
  const ids = new Set<string>();
  for (const k of budowa?.projekt?.konstrukcje ?? []) {
    for (const w of [...k.warstwy, ...k.wyjatki.flatMap((x) => x.warstwy)]) {
      for (const id of w.mieszankaIds ?? []) ids.add(id);
    }
  }
  return [...ids];
}

/** „Zaplanuj masę” wymaga obszarów z XFDF na arkuszach PZT i warstw w konstrukcjach. */
export function brakiZaawansowanego(budowa?: Pick<Budowa, 'projekt'>): string[] {
  const p = budowa?.projekt;
  const braki: string[] = [];
  if (!p?.arkusze.some((a) => a.obszary.length > 0)) braki.push('PZT z obszarami z plików XFDF');
  if (!p?.konstrukcje.some((k) => k.warstwy.length > 0)) braki.push('konstrukcje z warstwami');
  return braki;
}

// --- Eksport PDF ---

export type KolumnaHarmonogramu = 'budowa' | 'obszar' | 'powierzchnia' | 'kilometraz' | 'warstwa' | 'recepta' | 'tony' | 'auta';

export const KOLUMNY_HARMONOGRAMU: { id: KolumnaHarmonogramu; nazwa: string }[] = [
  { id: 'budowa', nazwa: 'Budowa' },
  { id: 'obszar', nazwa: 'Obszar' },
  { id: 'powierzchnia', nazwa: 'Powierzchnia' },
  { id: 'kilometraz', nazwa: 'Kilometraż' },
  { id: 'warstwa', nazwa: 'Warstwa' },
  { id: 'recepta', nazwa: 'Recepta' },
  { id: 'tony', nazwa: 'Ilość ton' },
  { id: 'auta', nazwa: 'Ilość aut' },
];

export const PELNY_ZESTAW: KolumnaHarmonogramu[] = KOLUMNY_HARMONOGRAMU.map((k) => k.id);
export const ZESTAW_SKROCONY: KolumnaHarmonogramu[] = ['recepta', 'tony'];

const LICZBOWE: KolumnaHarmonogramu[] = ['powierzchnia', 'tony', 'auta'];

function komorka(p: PozycjaHarmonogramu, k: KolumnaHarmonogramu): string {
  switch (k) {
    case 'budowa': return p.budowa;
    case 'obszar': return p.obszar || '—';
    case 'powierzchnia': return p.powierzchniaM2 != null ? `${formatLiczby(p.powierzchniaM2)} m²` : '—';
    case 'kilometraz': return p.kilometraz || '—';
    case 'warstwa': return p.warstwa || '—';
    case 'recepta': return p.recepta;
    case 'tony': return `${formatLiczby(p.tony)} t`;
    case 'auta': return p.auta != null ? String(p.auta) : '—';
    default: return '';
  }
}

const dzienTygodnia = (iso: string) => dataLokalna(iso).toLocaleDateString('pl-PL', { weekday: 'short' });

export function dokumentHarmonogramu({ pozycje, od, doDnia, kolumny }: {
  pozycje: PozycjaHarmonogramu[];
  od: string;
  doDnia: string;
  kolumny: KolumnaHarmonogramu[];
}): DokumentPdf {
  const wybrane = KOLUMNY_HARMONOGRAMU.filter((k) => kolumny.includes(k.id)).map((k) => k.id);
  const wZakresie = pozycje.filter((p) => p.data >= od && p.data <= doDnia);
  const tygodnie = new Map<string, PozycjaHarmonogramu[]>();
  for (const p of wZakresie) {
    const t = poczatekTygodnia(p.data);
    tygodnie.set(t, [...(tygodnie.get(t) ?? []), p]);
  }
  const suma = (lista: PozycjaHarmonogramu[]) => wybrane.map((k) => {
    if (k === 'tony') return `${formatLiczby(round2(lista.reduce((s, p) => s + p.tony, 0)))} t`;
    if (k === 'auta') return String(lista.reduce((s, p) => s + (p.auta ?? 0), 0));
    if (k === 'powierzchnia') return `${formatLiczby(round2(lista.reduce((s, p) => s + (p.powierzchniaM2 ?? 0), 0)))} m²`;
    return '';
  });
  const sekcje: SekcjaPdf[] = [...tygodnie.entries()].map(([t, lista]) => ({
    tytul: etykietaTygodnia(t),
    bloki: [{
      typ: 'tabela',
      naglowki: ['Data', ...wybrane.map((k) => KOLUMNY_HARMONOGRAMU.find((x) => x.id === k)!.nazwa)],
      liczbowe: wybrane.map((k, i) => (LICZBOWE.includes(k) ? i + 1 : -1)).filter((i) => i > 0),
      wiersze: lista.map((p) => [`${dzienTygodnia(p.data)} ${krotko(p.data)}`, ...wybrane.map((k) => komorka(p, k))]),
      suma: wybrane.some((k) => LICZBOWE.includes(k)) ? ['Razem', ...suma(lista)] : undefined,
    }],
  }));
  return {
    tytul: 'Harmonogram',
    podtytul: `${od.split('-').reverse().join('.')} – ${doDnia.split('-').reverse().join('.')}`,
    sekcje: sekcje.length ? sekcje : [{ tytul: 'Brak pozycji', bloki: [{ typ: 'tekst', linie: ['W wybranym zakresie nie ma zaplanowanych dostaw.'] }] }],
  };
}
