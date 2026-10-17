// Dni bez pracy na budowie (UW, L4, R8), bank nadgodzin „na zimę” i miesięczne rozliczenie pracownika.
// Kwoty nieobecności zależą od wypłat z poprzednich miesięcy, więc liczymy je chronologicznie od najstarszego miesiąca.

import { formatLiczby, round2 } from '../utils/calculations';
import { czyDzienWolny } from './kalendarzPracy';
import { dniRoboczeMiesiaca, stawkiObowiazujace } from './rozliczenie';
import type { GrupaPracownikow, Pracownik, RaportPracownika } from './typy';
import type { StawkiPracownika } from './pracownicy';

export type Nieobecnosc = 'UW' | 'L4' | 'R8' | 'UB' | 'NB';
export type RodzajDniaPracownika = 'praca' | Nieobecnosc;

export const NIEOBECNOSCI: { id: Nieobecnosc; nazwa: string; opis: string }[] = [
  { id: 'UW', nazwa: 'Urlop wypoczynkowy', opis: 'Średnia wypłat z 3 ostatnich miesięcy ÷ 3 ÷ dni robocze miesiąca. Koszt pracodawcy × ZUS.' },
  { id: 'L4', nazwa: 'Zwolnienie lekarskie', opis: 'Średnia wypłat z 12 ostatnich miesięcy ÷ dni kalendarzowe miesiąca × 0,8. Pracodawca płaci × 1,2 przez pierwsze 33 dni L4 w roku, od 34. dnia nic.' },
  { id: 'R8', nazwa: 'Dzień wolny za nadgodziny', opis: '8 × stawka 8h. Koszt pracodawcy × ZUS. Dzień schodzi z banku godzin odłożonych na zimę.' },
  { id: 'UB', nazwa: 'Urlop bezpłatny', opis: 'Bez wynagrodzenia i bez kosztu pracodawcy – 0 zł.' },
  { id: 'NB', nazwa: 'Nieobecność', opis: 'Bez wynagrodzenia i bez kosztu pracodawcy – 0 zł.' },
];

export const ZUS_DOMYSLNY = 1.4;
export const MNOZNIK_L4 = 0.8;
export const MNOZNIK_L4_PRACODAWCY = 1.2;
export const DNI_L4_PRACODAWCY = 33;
export const MIESIACE_UW = 3;
export const MIESIACE_L4 = 12;
export const GODZINY_R8 = 8;
export const DOMYSLNE_GODZINY_NA_ZIME = 20;
/** Kwiecień–listopad: sezon, w którym zwykle odkłada się nadgodziny na zimę. */
export const MIESIACE_SEZONU_R8 = [4, 5, 6, 7, 8, 9, 10, 11];

export const nazwaNieobecnosci = (id: Nieobecnosc) => NIEOBECNOSCI.find((n) => n.id === id)!.nazwa;

export const rodzajRaportu = (r: Pick<RaportPracownika, 'rodzaj'>): RodzajDniaPracownika => r.rodzaj ?? 'praca';

export const miesiacRaportu = (iso: string) => iso.slice(0, 7);

export function czyMiesiacSezonuR8(miesiac: string): boolean {
  return MIESIACE_SEZONU_R8.includes(Number(miesiac.slice(5, 7)));
}

export function przesunMiesiac(miesiac: string, o: number): string {
  const [r, m] = miesiac.split('-').map(Number);
  const d = new Date(r, m - 1 + o, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dniKalendarzoweMiesiaca(miesiac: string): number {
  const [r, m] = miesiac.split('-').map(Number);
  return new Date(r, m, 0).getDate();
}

export const ostatniDzienMiesiaca = (miesiac: string) => `${miesiac}-${String(dniKalendarzoweMiesiaca(miesiac)).padStart(2, '0')}`;

/** UW, R8, UB i NB tylko w dni robocze; L4 obejmuje każdy dzień kalendarzowy. */
export function czyDzienNieobecnosci(rodzaj: Nieobecnosc, iso: string): boolean {
  return rodzaj === 'L4' || !czyDzienWolny(iso);
}

export function dniZakresu(od: string, doDnia: string): string[] {
  const dni: string[] = [];
  const [r, m, d] = od.split('-').map(Number);
  const kursor = new Date(r, m - 1, d, 6);
  for (let i = 0; i < 366; i += 1) {
    const iso = `${kursor.getFullYear()}-${String(kursor.getMonth() + 1).padStart(2, '0')}-${String(kursor.getDate()).padStart(2, '0')}`;
    if (iso > doDnia) break;
    dni.push(iso);
    kursor.setDate(kursor.getDate() + 1);
  }
  return dni;
}

const zus = (stawki: StawkiPracownika) => (stawki.zus && stawki.zus > 0 ? stawki.zus : ZUS_DOMYSLNY);

export interface WynikNieobecnosci {
  wynagrodzenie: number;
  koszt: number;
  /** Rozpisanie wzoru do wyświetlenia w raporcie. */
  linie: string[];
}

interface Podstawa {
  suma: number;
  miesiace: number;
}

/** Suma wypłat z ostatnich `n` pełnych miesięcy przed `miesiac` – albo z krótszego okresu, gdy pracownik ma mniej danych. */
function podstawa(miesiac: string, n: number, pierwszy: string | undefined, wyplaty: Map<string, number>): Podstawa {
  let suma = 0;
  let miesiace = 0;
  for (let i = 1; i <= n; i += 1) {
    const m = przesunMiesiac(miesiac, -i);
    if (!pierwszy || m < pierwszy) break;
    suma += wyplaty.get(m) ?? 0;
    miesiace += 1;
  }
  return { suma: round2(suma), miesiace };
}

/** Godziny nadgodzin odłożone w miesiącu „na zimę” (R8). Brak wpisu = nic nie odłożono. */
export function godzinyNaZime(pracownik: Pick<Pracownik, 'odlozoneNadgodziny'>, miesiac: string): number {
  return pracownik.odlozoneNadgodziny?.[miesiac] ?? 0;
}

export interface OdlozenieMiesiaca {
  godziny: number;
  stawka: number;
  wynagrodzenie: number;
  koszt: number;
}

/** Odłożone nadgodziny pomniejszają wypłatę (godziny × stawka nadgodziny) i koszt pracodawcy (× ZUS). */
export function odlozenieMiesiaca(pracownik: Pick<Pracownik, 'stawki' | 'historiaStawek' | 'odlozoneNadgodziny'>, miesiac: string): OdlozenieMiesiaca {
  const godziny = godzinyNaZime(pracownik, miesiac);
  const stawki = stawkiObowiazujace(pracownik.stawki, pracownik.historiaStawek, ostatniDzienMiesiaca(miesiac));
  const stawka = stawki.nadgodzina ?? 0;
  const wynagrodzenie = round2(godziny * stawka);
  return { godziny, stawka, wynagrodzenie, koszt: round2(wynagrodzenie * zus(stawki)) };
}

const sortujRaporty = (raporty: RaportPracownika[]) => [...raporty]
  .sort((a, b) => a.data.localeCompare(b.data) || a.createdAt.localeCompare(b.createdAt));

/**
 * Kwoty wszystkich dni UW / L4 / R8 pracownika (id raportu → wynik).
 * Wypłata miesiąca = wynagrodzenia z raportów (bez delegacji) − odłożone nadgodziny.
 */
export function rozliczNieobecnosci(
  pracownik: Pick<Pracownik, 'stawki' | 'historiaStawek' | 'odlozoneNadgodziny'>,
  raporty: RaportPracownika[],
): Map<string, WynikNieobecnosci> {
  const wyniki = new Map<string, WynikNieobecnosci>();
  const posortowane = sortujRaporty(raporty);
  if (posortowane.length === 0) return wyniki;
  const pierwszy = miesiacRaportu(posortowane[0].data);
  const wyplaty = new Map<string, number>();
  const dniL4WRoku = new Map<string, number>();

  for (const r of posortowane) {
    const miesiac = miesiacRaportu(r.data);
    const rodzaj = rodzajRaportu(r);
    let wynagrodzenie = r.wynagrodzenie;
    if (rodzaj !== 'praca') {
      const stawki = r.stawki;
      let wynik: WynikNieobecnosci;
      if (rodzaj === 'UB' || rodzaj === 'NB') {
        wynik = { wynagrodzenie: 0, koszt: 0, linie: [`${nazwaNieobecnosci(rodzaj)} – 0 zł dla pracownika i pracodawcy`] };
      } else if (rodzaj === 'UW') {
        const p = podstawa(miesiac, MIESIACE_UW, pierwszy, wyplaty);
        const dni = dniRoboczeMiesiaca(r.data);
        const dzien = p.miesiace > 0 && dni > 0 ? round2(p.suma / p.miesiace / dni) : 0;
        wynik = {
          wynagrodzenie: dzien,
          koszt: round2(dzien * zus(stawki)),
          linie: p.miesiace > 0
            ? [
              `Wypłaty z ${p.miesiace} mies.: ${formatLiczby(p.suma)} zł ÷ ${p.miesiace} ÷ ${dni} dni roboczych = ${formatLiczby(dzien)} zł`,
              `Koszt pracodawcy: × ZUS ${formatLiczby(zus(stawki))}`,
            ]
            : ['Brak wypłat z poprzednich miesięcy – kwota 0 zł do czasu uzupełnienia raportów.'],
        };
      } else if (rodzaj === 'L4') {
        const rok = r.data.slice(0, 4);
        const numer = (dniL4WRoku.get(rok) ?? 0) + 1;
        dniL4WRoku.set(rok, numer);
        const p = podstawa(miesiac, MIESIACE_L4, pierwszy, wyplaty);
        const dni = dniKalendarzoweMiesiaca(miesiac);
        const dzien = p.miesiace > 0 ? round2((p.suma / p.miesiace / dni) * MNOZNIK_L4) : 0;
        const placiPracodawca = numer <= DNI_L4_PRACODAWCY;
        wynik = {
          wynagrodzenie: dzien,
          koszt: placiPracodawca ? round2(dzien * MNOZNIK_L4_PRACODAWCY) : 0,
          linie: [
            p.miesiace > 0
              ? `Wypłaty z ${p.miesiace} mies.: ${formatLiczby(p.suma)} zł ÷ ${p.miesiace} ÷ ${dni} dni × 0,8 = ${formatLiczby(dzien)} zł`
              : 'Brak wypłat z poprzednich miesięcy – kwota 0 zł do czasu uzupełnienia raportów.',
            placiPracodawca
              ? `Dzień L4 nr ${numer} w ${rok} r. – pracodawca: × 1,2`
              : `Dzień L4 nr ${numer} w ${rok} r. – od 34. dnia pracodawca nie ponosi kosztu`,
          ],
        };
      } else {
        const s8 = stawki.stawka8h ?? 0;
        const dzien = round2(GODZINY_R8 * s8);
        wynik = {
          wynagrodzenie: dzien,
          koszt: round2(dzien * zus(stawki)),
          linie: [`8 h × ${formatLiczby(s8)} zł = ${formatLiczby(dzien)} zł`, `Koszt pracodawcy: × ZUS ${formatLiczby(zus(stawki))}`],
        };
      }
      wyniki.set(r.id, wynik);
      wynagrodzenie = wynik.wynagrodzenie;
    }
    if (!wyplaty.has(miesiac)) wyplaty.set(miesiac, -odlozenieMiesiaca(pracownik, miesiac).wynagrodzenie);
    wyplaty.set(miesiac, round2((wyplaty.get(miesiac) ?? 0) + wynagrodzenie));
  }
  return wyniki;
}

/** Raporty z przeliczonymi kwotami nieobecności – zapisujemy je, żeby inne ekrany czytały gotowe kwoty. */
export function przeliczoneRaporty(
  pracownik: Pick<Pracownik, 'id' | 'stawki' | 'historiaStawek' | 'odlozoneNadgodziny'>,
  wszystkie: RaportPracownika[],
): RaportPracownika[] {
  const wyniki = rozliczNieobecnosci(pracownik, wszystkie.filter((r) => r.pracownikId === pracownik.id));
  return wszystkie.map((r) => {
    const w = wyniki.get(r.id);
    if (!w || (w.wynagrodzenie === r.wynagrodzenie && w.koszt === r.kwota)) return r;
    return { ...r, wynagrodzenie: w.wynagrodzenie, kwota: w.koszt };
  });
}

/** Bank R8 na koniec miesiąca: godziny odłożone do tego miesiąca − 8 h za każdy odebrany dzień R8. */
export function bankR8(
  pracownik: Pick<Pracownik, 'odlozoneNadgodziny'>,
  raporty: RaportPracownika[],
  doMiesiaca?: string,
): { odlozone: number; wykorzystane: number; saldo: number } {
  const odlozone = Object.entries(pracownik.odlozoneNadgodziny ?? {})
    .filter(([m]) => !doMiesiaca || m <= doMiesiaca)
    .reduce((s, [, h]) => s + h, 0);
  const wykorzystane = raporty
    .filter((r) => rodzajRaportu(r) === 'R8' && (!doMiesiaca || miesiacRaportu(r.data) <= doMiesiaca))
    .length * GODZINY_R8;
  return { odlozone: round2(odlozone), wykorzystane, saldo: round2(odlozone - wykorzystane) };
}

export interface PozycjaPodzialu {
  klucz: string;
  /** Budowa (praca) albo brygada (UW, L4, R8, UB, NB, odłożone nadgodziny). */
  typ: 'budowa' | 'brygada';
  id?: string;
  wyplata: number;
  koszt: number;
}

export interface PodsumowanieMiesiaca {
  miesiac: string;
  raporty: RaportPracownika[];
  godzinyPracy: number;
  nadgodziny: number;
  dniUW: number;
  dniL4: number;
  dniR8: number;
  dniUB: number;
  dniNB: number;
  delegacje: number;
  odlozenie: OdlozenieMiesiaca;
  /** Do wypłaty: wynagrodzenia + nieobecności − odłożone nadgodziny (bez delegacji). */
  wyplata: number;
  /** Koszt pracodawcy z ZUS i delegacjami, po odjęciu odłożonych nadgodzin. */
  koszt: number;
  podzial: PozycjaPodzialu[];
}

export function podsumowanieMiesiaca(
  pracownik: Pick<Pracownik, 'stawki' | 'historiaStawek' | 'odlozoneNadgodziny' | 'grupaId'>,
  raportyPracownika: RaportPracownika[],
  miesiac: string,
): PodsumowanieMiesiaca {
  const raporty = sortujRaporty(raportyPracownika.filter((r) => miesiacRaportu(r.data) === miesiac));
  const praca = raporty.filter((r) => rodzajRaportu(r) === 'praca');
  const ile = (rodzaj: Nieobecnosc) => raporty.filter((r) => rodzajRaportu(r) === rodzaj).length;
  const odlozenie = odlozenieMiesiaca(pracownik, miesiac);
  const delegacje = round2(praca.reduce((s, r) => s + (r.delegacja ? r.stawki.delegacja ?? 0 : 0), 0));

  const podzial = new Map<string, PozycjaPodzialu>();
  const dodaj = (typ: PozycjaPodzialu['typ'], id: string | undefined, wyplata: number, koszt: number) => {
    const klucz = `${typ}:${id ?? ''}`;
    const p = podzial.get(klucz) ?? { klucz, typ, id, wyplata: 0, koszt: 0 };
    p.wyplata = round2(p.wyplata + wyplata);
    p.koszt = round2(p.koszt + koszt);
    podzial.set(klucz, p);
  };
  for (const r of raporty) {
    if (rodzajRaportu(r) === 'praca') dodaj('budowa', r.budowaId || undefined, r.wynagrodzenie, r.kwota);
    else dodaj('brygada', r.grupaId ?? pracownik.grupaId, r.wynagrodzenie, r.kwota);
  }
  if (odlozenie.godziny > 0) dodaj('brygada', pracownik.grupaId, -odlozenie.wynagrodzenie, -odlozenie.koszt);

  return {
    miesiac,
    raporty,
    godzinyPracy: round2(praca.reduce((s, r) => s + r.godziny, 0)),
    nadgodziny: round2(praca.reduce((s, r) => s + r.nadgodziny, 0)),
    dniUW: ile('UW'),
    dniL4: ile('L4'),
    dniR8: ile('R8'),
    dniUB: ile('UB'),
    dniNB: ile('NB'),
    delegacje,
    odlozenie,
    wyplata: round2(raporty.reduce((s, r) => s + r.wynagrodzenie, 0) - odlozenie.wynagrodzenie),
    koszt: round2(raporty.reduce((s, r) => s + r.kwota, 0) - odlozenie.koszt),
    podzial: [...podzial.values()].sort((a, b) => (a.typ === b.typ ? 0 : a.typ === 'budowa' ? -1 : 1)),
  };
}

export const nazwaBrygady = (grupy: GrupaPracownikow[], id?: string) => {
  const g = grupy.find((x) => x.id === id);
  return g ? `Brygada ${g.nazwa}` : 'Bez brygady';
};

export interface MiesiacRaportow {
  miesiac: string;
  liczba: number;
}

export interface RokRaportow {
  rok: string;
  miesiace: MiesiacRaportow[];
}

/** Lata, a w nich miesiące z raportami – od najnowszych. */
export function lataRaportow(raporty: Pick<RaportPracownika, 'data'>[]): RokRaportow[] {
  const liczby = new Map<string, number>();
  for (const r of raporty) liczby.set(miesiacRaportu(r.data), (liczby.get(miesiacRaportu(r.data)) ?? 0) + 1);
  const lata: RokRaportow[] = [];
  for (const miesiac of [...liczby.keys()].sort().reverse()) {
    const rok = miesiac.slice(0, 4);
    let grupa = lata.find((l) => l.rok === rok);
    if (!grupa) { grupa = { rok, miesiace: [] }; lata.push(grupa); }
    grupa.miesiace.push({ miesiac, liczba: liczby.get(miesiac)! });
  }
  return lata;
}

/** Dzień roboczy (pn–pt bez świąt) przed dziś, od początku zatrudnienia, bez żadnego raportu. */
export function czyBrakRaportu(iso: string, dzis: string, start: string, zRaportem: Set<string>): boolean {
  return iso < dzis && iso >= start && !czyDzienWolny(iso) && !zRaportem.has(iso);
}
