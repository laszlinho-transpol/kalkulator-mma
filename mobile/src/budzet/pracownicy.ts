// Wynagrodzenie pracownika i kolejność listy w grupach.

import { formatLiczby, round2 } from '../utils/calculations';
import { czyDzienWolny } from './kalendarzPracy';
import type { GrupaPracownikow, Pracownik } from './typy';

export type PoleWynagrodzenia = 'stawka8h' | 'nadgodzina' | 'kierowca' | 'pasazer' | 'zus';

export type StawkiPracownika = Partial<Record<PoleWynagrodzenia, number>>;

export interface OpisPolaStawki<K extends string = string> {
  id: K;
  nazwa: string;
  jednostka: string;
  podpowiedz?: string;
  mnoznik?: boolean;
}

export const POLA_WYNAGRODZENIA: OpisPolaStawki<PoleWynagrodzenia>[] = [
  { id: 'stawka8h', nazwa: 'Stawka 8h', jednostka: 'zł / 8 h' },
  {
    id: 'nadgodzina', nazwa: 'Nadgodzina', jednostka: 'zł / h',
    podpowiedz: 'Pn–pt każda godzina powyżej 8 h oraz każda godzina w soboty, niedziele i święta.',
  },
  {
    id: 'kierowca', nazwa: 'Kierowca', jednostka: 'zł / h',
    podpowiedz: 'Za każdą godzinę prowadzenia auta. Można łączyć z pasażerem w jednym dniu.',
  },
  {
    id: 'pasazer', nazwa: 'Pasażer', jednostka: 'zł / h',
    podpowiedz: 'Za każdą godzinę jazdy jako pasażer.',
  },
  {
    id: 'zus', nazwa: 'ZUS', jednostka: 'mnożnik', mnoznik: true,
    podpowiedz: 'Koszt pracodawcy: mnożnik sumy pozycji 1–4, np. 1,2.',
  },
];

/** Godziny jazdy w dniu. Kierowca i pasażer mogą się zmieniać w drodze do pracy i z powrotem. */
export interface Dojazd {
  kierowca: number;
  pasazer: number;
}

export const BEZ_DOJAZDU: Dojazd = { kierowca: 0, pasazer: 0 };

export const GODZINY_DNIOWKI = 8;

export function nazwaPracownika(p: Pick<Pracownik, 'nazwisko' | 'imie'>): string {
  return [p.nazwisko, p.imie].map((s) => s.trim()).filter(Boolean).join(' ');
}

/** Pn–pt: do 8 h w stawce, reszta nadgodziny. Sobota, niedziela, święto: wszystko nadgodziny. */
export function podzialGodzin(isoData: string, godziny: number): { podstawowe: number; nadgodziny: number; wolny: boolean } {
  const h = Math.max(0, godziny);
  const wolny = czyDzienWolny(isoData);
  if (wolny) return { podstawowe: 0, nadgodziny: h, wolny };
  const podstawowe = Math.min(h, GODZINY_DNIOWKI);
  return { podstawowe, nadgodziny: round2(h - podstawowe), wolny };
}

export interface WynikPracownika {
  zaPodstawe: number;
  zaNadgodziny: number;
  zaKierowce: number;
  zaPasazera: number;
  wynagrodzenie: number;
  koszt: number;
}

export function kwotaPracownika(
  stawki: StawkiPracownika,
  podstawowe: number,
  nadgodziny: number,
  dojazd: Dojazd,
): WynikPracownika {
  const zaPodstawe = round2(((stawki.stawka8h ?? 0) * podstawowe) / GODZINY_DNIOWKI);
  const zaNadgodziny = round2((stawki.nadgodzina ?? 0) * nadgodziny);
  const zaKierowce = round2((stawki.kierowca ?? 0) * Math.max(0, dojazd.kierowca));
  const zaPasazera = round2((stawki.pasazer ?? 0) * Math.max(0, dojazd.pasazer));
  const wynagrodzenie = round2(zaPodstawe + zaNadgodziny + zaKierowce + zaPasazera);
  const mnoznik = stawki.zus && stawki.zus > 0 ? stawki.zus : 1;
  return { zaPodstawe, zaNadgodziny, zaKierowce, zaPasazera, wynagrodzenie, koszt: round2(wynagrodzenie * mnoznik) };
}

export function liniePodsumowania(
  stawki: StawkiPracownika,
  podstawowe: number,
  nadgodziny: number,
  dojazd: Dojazd,
  wynik: WynikPracownika,
): string[] {
  const linie: string[] = [];
  if (podstawowe > 0) {
    linie.push(`Stawka 8h: ${formatLiczby(stawki.stawka8h ?? 0)} zł × ${formatLiczby(podstawowe)} h ÷ 8 = ${formatLiczby(wynik.zaPodstawe)} zł`);
  }
  if (nadgodziny > 0) {
    linie.push(`Nadgodziny: ${formatLiczby(nadgodziny)} h × ${formatLiczby(stawki.nadgodzina ?? 0)} zł = ${formatLiczby(wynik.zaNadgodziny)} zł`);
  }
  if (dojazd.kierowca > 0) {
    linie.push(`Kierowca: ${formatLiczby(dojazd.kierowca)} h × ${formatLiczby(stawki.kierowca ?? 0)} zł = ${formatLiczby(wynik.zaKierowce)} zł`);
  }
  if (dojazd.pasazer > 0) {
    linie.push(`Pasażer: ${formatLiczby(dojazd.pasazer)} h × ${formatLiczby(stawki.pasazer ?? 0)} zł = ${formatLiczby(wynik.zaPasazera)} zł`);
  }
  linie.push(`Wynagrodzenie: ${formatLiczby(wynik.wynagrodzenie)} zł`);
  if (stawki.zus) linie.push(`ZUS: × ${formatLiczby(stawki.zus)}`);
  return linie;
}

/** Raporty z 1.8.28 miały dojazd jako wybór jednej opcji bez godzin. */
export function dojazdRaportu(raport: { dojazd?: unknown; godzinyKierowca?: number; godzinyPasazer?: number }): Dojazd {
  return { kierowca: raport.godzinyKierowca ?? 0, pasazer: raport.godzinyPasazer ?? 0 };
}

export function linieStawekPola(pola: OpisPolaStawki[], stawki: object): string[] {
  const wartosci = stawki as Record<string, number | undefined>;
  return pola
    .filter((pole) => (wartosci[pole.id] ?? 0) > 0)
    .map((pole) => (pole.mnoznik
      ? `${pole.nazwa}: × ${formatLiczby(wartosci[pole.id]!)}`
      : `${pole.nazwa}: ${formatLiczby(wartosci[pole.id]!)} ${pole.jednostka}`));
}

export interface SekcjaPracownikow {
  grupa?: GrupaPracownikow;
  pracownicy: Pracownik[];
}

function porownajPracownikow(a: Pracownik, b: Pracownik): number {
  return (Number(!a.ulubiony) - Number(!b.ulubiony))
    || a.nazwisko.localeCompare(b.nazwisko, 'pl', { sensitivity: 'base' })
    || a.imie.localeCompare(b.imie, 'pl', { sensitivity: 'base' });
}

export function pracownicyAlfabetycznie(pracownicy: Pracownik[]): Pracownik[] {
  return [...pracownicy].sort(porownajPracownikow);
}

/** Ulubione grupy na górze, potem reszta alfabetycznie, na końcu pracownicy bez grupy. */
export function sekcjePracownikow(pracownicy: Pracownik[], grupy: GrupaPracownikow[]): {
  ulubione: SekcjaPracownikow[];
  pozostale: SekcjaPracownikow[];
} {
  const wgGrupy = new Map<string, Pracownik[]>();
  const bezGrupy: Pracownik[] = [];
  const znane = new Set(grupy.map((g) => g.id));
  for (const p of pracownicy) {
    if (p.grupaId && znane.has(p.grupaId)) {
      wgGrupy.set(p.grupaId, [...(wgGrupy.get(p.grupaId) ?? []), p]);
    } else {
      bezGrupy.push(p);
    }
  }
  const posortowane = [...grupy].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl', { sensitivity: 'base' }));
  const sekcja = (grupa: GrupaPracownikow): SekcjaPracownikow => ({
    grupa,
    pracownicy: [...(wgGrupy.get(grupa.id) ?? [])].sort(porownajPracownikow),
  });
  const ulubione = posortowane.filter((g) => g.ulubiona).map(sekcja);
  const pozostale = posortowane.filter((g) => !g.ulubiona).map(sekcja).filter((s) => s.pracownicy.length > 0);
  if (bezGrupy.length > 0) pozostale.push({ pracownicy: bezGrupy.sort(porownajPracownikow) });
  return { ulubione, pozostale };
}

/** Stary zapis miał jedno pole „Imię Nazwisko”. */
export function rozdzielImieNazwisko(tekst: string): { imie: string; nazwisko: string } {
  const czesci = tekst.trim().split(/\s+/).filter(Boolean);
  if (czesci.length <= 1) return { imie: '', nazwisko: czesci[0] ?? '' };
  return { imie: czesci[0], nazwisko: czesci.slice(1).join(' ') };
}
