// Raporty dzienne z budowy: warstwy z konstrukcji, przerób, materiał, transport i robocizna dnia.

import { cenaReceptyNaDzien } from '../mieszanki/recepty';
import { formatLiczby, round2, round3 } from '../utils/calculations';
import { GESTOSC_KLSM_DOMYSLNA, GESTOSC_MMA_DOMYSLNA } from '../utils/projektBudowy';
import type { RaportPracownika, RaportSprzetu } from '../budzet/typy';
import type { KategoriaWarstwy, Mieszanka, ProjektBudowy, WarstwaKonstrukcji } from '../types';
import type {
  PozycjaRaportu, Przerzut, RaportDzienny, RodzajRozliczeniaTransportu, RozliczenieTransportu, WpisSamochodow,
} from './typy';
import { rodzajMieszanki } from '../mieszanki/kolejnosc';

const MIESIACE_MIANOWNIK = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export interface OpcjaOdcinka {
  legendaId: string;
  wyjatekId?: string;
  nazwa: string;
  /** Zakres zmiany konstrukcji – podpowiedź km. */
  kmOdM?: number;
  kmDoM?: number;
}

export interface OpcjaWarstwy {
  klucz: string;
  nazwa: string;
  rodzajOpis: string;
  gruboscCm: number;
  kategoria: KategoriaWarstwy;
  mieszankaIds: string[];
  kolejnosc: number;
  odcinki: OpcjaOdcinka[];
}

export function kluczWarstwy(w: Pick<WarstwaKonstrukcji, 'nazwa' | 'gruboscCm'>): string {
  return `${w.nazwa.trim().toLowerCase()}|${w.gruboscCm}`;
}

export const czyKruszywo = (kategoria: KategoriaWarstwy): boolean => kategoria === 'klsm';

export const nazwaIlosci = (kategoria: KategoriaWarstwy): string => (czyKruszywo(kategoria) ? 'Kruszywo' : 'Masa');

export function nazwaRecepty(m: Pick<Mieszanka, 'rodzaj'> & Partial<Pick<Mieszanka, 'nrRecepty' | 'kategoriaRuchu'>>): string {
  return m.nrRecepty ? `${rodzajMieszanki(m)} · ${m.nrRecepty}` : rodzajMieszanki(m);
}

/** Warstwy ze wszystkich konstrukcji budowy (także zmian konstrukcji) i odcinki, na których występują. */
export function warstwyBudowy(projekt: Pick<ProjektBudowy, 'konstrukcje' | 'legenda'>): OpcjaWarstwy[] {
  const mapa = new Map<string, OpcjaWarstwy>();
  const nazwaLegendy = (id: string) => projekt.legenda.find((l) => l.id === id)?.nazwa?.trim() || 'Odcinek';

  const dodaj = (w: WarstwaKonstrukcji, odcinek: OpcjaOdcinka) => {
    const klucz = kluczWarstwy(w);
    let opcja = mapa.get(klucz);
    if (!opcja) {
      opcja = {
        klucz,
        nazwa: w.nazwa.trim(),
        rodzajOpis: w.rodzajOpis,
        gruboscCm: w.gruboscCm,
        kategoria: w.kategoria,
        mieszankaIds: [],
        kolejnosc: w.kolejnosc,
        odcinki: [],
      };
      mapa.set(klucz, opcja);
    }
    opcja.kolejnosc = Math.min(opcja.kolejnosc, w.kolejnosc);
    for (const id of w.mieszankaIds) if (!opcja.mieszankaIds.includes(id)) opcja.mieszankaIds.push(id);
    if (!opcja.odcinki.some((o) => o.legendaId === odcinek.legendaId && o.wyjatekId === odcinek.wyjatekId)) {
      opcja.odcinki.push(odcinek);
    }
  };

  for (const k of projekt.konstrukcje) {
    const nazwa = nazwaLegendy(k.legendaId);
    for (const w of k.warstwy) dodaj(w, { legendaId: k.legendaId, nazwa });
    for (const wy of k.wyjatki) {
      const od = Math.min(wy.kmOdM, wy.kmDoM);
      const doM = Math.max(wy.kmOdM, wy.kmDoM);
      const opis = wy.opis?.trim() || 'zmiana konstrukcji';
      for (const w of wy.warstwy) {
        dodaj(w, { legendaId: k.legendaId, wyjatekId: wy.id, nazwa: `${nazwa} · ${opis}`, kmOdM: od, kmDoM: doM });
      }
    }
  }
  return [...mapa.values()].sort((a, b) => a.kolejnosc - b.kolejnosc || a.nazwa.localeCompare(b.nazwa, 'pl'));
}

export function gestoscPozycji(kategoria: KategoriaWarstwy, mieszanka?: Pick<Mieszanka, 'ciezarObjetosciowy'>): number {
  if (mieszanka && mieszanka.ciezarObjetosciowy > 0) return mieszanka.ciezarObjetosciowy;
  return czyKruszywo(kategoria) ? GESTOSC_KLSM_DOMYSLNA : GESTOSC_MMA_DOMYSLNA;
}

/** Grubość wbudowanej warstwy [cm] = t ÷ (m² × t/m³) × 100. */
export function gruboscZMasy(tony: number, powierzchniaM2: number, gestoscTm3: number): number | undefined {
  if (!(tony > 0) || !(powierzchniaM2 > 0) || !(gestoscTm3 > 0)) return undefined;
  return round2((tony / (powierzchniaM2 * gestoscTm3)) * 100);
}

export const powierzchniaPozycji = (p: Pick<PozycjaRaportu, 'odcinki'>): number =>
  round2(p.odcinki.reduce((s, o) => s + (o.powierzchniaM2 || 0), 0));

const dlugoscOdcinkow = (p: Pick<PozycjaRaportu, 'odcinki'>): number =>
  p.odcinki.reduce((s, o) => s + Math.abs(o.kmDoM - o.kmOdM), 0);

// --- Lista raportów ---

export function etykietaMiesiaca(klucz: string): string {
  const [rok, mies] = klucz.split('-').map(Number);
  return `${MIESIACE_MIANOWNIK[(mies || 1) - 1]} ${rok}`;
}

export const raportyOdNajnowszych = (raporty: RaportDzienny[]): RaportDzienny[] =>
  [...raporty].sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));

export interface MiesiacRaportow {
  klucz: string;
  etykieta: string;
  liczba: number;
}

/** Tylko miesiące z raportami, od najnowszego. */
export function miesiaceRaportow(raporty: RaportDzienny[]): MiesiacRaportow[] {
  const liczby = new Map<string, number>();
  for (const r of raporty) {
    const klucz = r.data.slice(0, 7);
    liczby.set(klucz, (liczby.get(klucz) ?? 0) + 1);
  }
  return [...liczby.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([klucz, liczba]) => ({ klucz, etykieta: etykietaMiesiaca(klucz), liczba }));
}

export const raportyMiesiaca = (raporty: RaportDzienny[], klucz: string): RaportDzienny[] =>
  raportyOdNajnowszych(raporty.filter((r) => r.data.startsWith(klucz)));

export function statystykiRaportow(raporty: RaportDzienny[]): { liczba: number; od?: string; do?: string } {
  if (raporty.length === 0) return { liczba: 0 };
  const daty = raporty.map((r) => r.data).sort();
  return { liczba: raporty.length, od: daty[0], do: daty[daty.length - 1] };
}

// --- Przerób ---

export interface WierszPrzerobu {
  klucz: string;
  warstwaNazwa: string;
  mieszankaNazwa?: string;
  kategoria: KategoriaWarstwy;
  gruboscProjCm: number;
  ilosc: number;
  powierzchniaM2: number;
  dlugoscM: number;
  liczbaOdcinkow: number;
  gruboscCm?: number;
}

/** Suma warstw dnia, osobno dla każdej recepty. Grubość ze średniej ważonej gęstości. */
export function przerobRaportu(raport: Pick<RaportDzienny, 'pozycje'>): WierszPrzerobu[] {
  const mapa = new Map<string, WierszPrzerobu & { objetosc: number }>();
  for (const p of raport.pozycje) {
    const klucz = `${p.warstwaKlucz}|${p.mieszankaId ?? ''}`;
    let w = mapa.get(klucz);
    if (!w) {
      w = {
        klucz,
        warstwaNazwa: p.warstwaNazwa,
        mieszankaNazwa: p.mieszankaNazwa,
        kategoria: p.kategoria,
        gruboscProjCm: p.gruboscProjCm,
        ilosc: 0,
        powierzchniaM2: 0,
        dlugoscM: 0,
        liczbaOdcinkow: 0,
        objetosc: 0,
      };
      mapa.set(klucz, w);
    }
    w.ilosc += p.ilosc || 0;
    w.powierzchniaM2 += powierzchniaPozycji(p);
    w.dlugoscM += dlugoscOdcinkow(p);
    w.liczbaOdcinkow += p.odcinki.length;
    if (p.ilosc > 0 && p.gestoscTm3 > 0) w.objetosc += p.ilosc / p.gestoscTm3;
  }
  return [...mapa.values()].map(({ objetosc, ...w }) => ({
    ...w,
    ilosc: round3(w.ilosc),
    powierzchniaM2: round2(w.powierzchniaM2),
    dlugoscM: round2(w.dlugoscM),
    gruboscCm: objetosc > 0 && w.powierzchniaM2 > 0 ? round2((objetosc / w.powierzchniaM2) * 100) : undefined,
  }));
}

export function sumaPrzerobu(wiersze: WierszPrzerobu[]): { ilosc: number; powierzchniaM2: number } {
  return {
    ilosc: round3(wiersze.reduce((s, w) => s + w.ilosc, 0)),
    powierzchniaM2: round2(wiersze.reduce((s, w) => s + w.powierzchniaM2, 0)),
  };
}

// --- Materiał ---

export const kluczMaterialu = (p: Pick<PozycjaRaportu, 'mieszankaId' | 'warstwaKlucz'>): string =>
  p.mieszankaId ?? `w:${p.warstwaKlucz}`;

export interface WierszMaterialu {
  klucz: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
  cena: number;
  /** Cena z recepty na dzień raportu. */
  cenaRecepty?: number;
  zmieniona: boolean;
  kwota: number;
  uwagi?: string;
  dodatkowy: boolean;
}

/** Mieszanki wbudowane w raporcie (cena z recepty albo zmieniona w raporcie) i materiał dodatkowy. */
export function materialyRaportu(
  raport: Pick<RaportDzienny, 'pozycje' | 'data' | 'cenyMaterialu' | 'materialyDodatkowe'>,
  mieszanki: Pick<Mieszanka, 'id' | 'cena' | 'historiaCen'>[],
): WierszMaterialu[] {
  const mapa = new Map<string, WierszMaterialu>();
  for (const p of raport.pozycje) {
    const klucz = kluczMaterialu(p);
    let w = mapa.get(klucz);
    if (!w) {
      const recepta = p.mieszankaId ? mieszanki.find((m) => m.id === p.mieszankaId) : undefined;
      const cenaRecepty = recepta ? cenaReceptyNaDzien(recepta, raport.data) : undefined;
      const reczna = raport.cenyMaterialu[klucz];
      const cena = reczna ?? cenaRecepty ?? 0;
      w = {
        klucz,
        nazwa: p.mieszankaNazwa ?? p.warstwaNazwa,
        ilosc: 0,
        jednostka: 't',
        cena,
        cenaRecepty,
        zmieniona: reczna != null && reczna !== cenaRecepty,
        kwota: 0,
        dodatkowy: false,
      };
      mapa.set(klucz, w);
    }
    w.ilosc = round3(w.ilosc + (p.ilosc || 0));
  }
  const wiersze = [...mapa.values()].map((w) => ({ ...w, kwota: round2(w.ilosc * w.cena) }));
  for (const d of raport.materialyDodatkowe) {
    wiersze.push({
      klucz: d.id,
      nazwa: d.nazwa,
      ilosc: d.ilosc,
      jednostka: d.jednostka,
      cena: d.cena,
      zmieniona: false,
      kwota: round2(d.ilosc * d.cena),
      uwagi: d.uwagi,
      dodatkowy: true,
    });
  }
  return wiersze;
}

export const sumaKwot = (wiersze: { kwota: number }[]): number => round2(wiersze.reduce((s, w) => s + w.kwota, 0));

// --- Transport ---

export const OPISY_ROZLICZENIA_TRANSPORTU: { id: RodzajRozliczeniaTransportu; nazwa: string; jednostka: string }[] = [
  { id: 'km', nazwa: 'Stawka za km', jednostka: 'zł/km' },
  { id: 'kurs', nazwa: 'Stawka za kurs', jednostka: 'zł/kurs' },
  { id: 'tkm', nazwa: 'Stawka t × km', jednostka: 'zł/t·km' },
  { id: 'godz', nazwa: 'Stawka godzinowa', jednostka: 'zł/h' },
];

/** Przerzut: km łącznie, ryczałt za przewiezienie albo godziny. */
export const RODZAJE_PRZERZUTU: RodzajRozliczeniaTransportu[] = ['km', 'kurs', 'godz'];

export const nazwaRozliczeniaTransportu = (r: RodzajRozliczeniaTransportu): string =>
  OPISY_ROZLICZENIA_TRANSPORTU.find((o) => o.id === r)?.nazwa ?? r;

/** Rozliczenia przerzutu – także ze starego zapisu (stawka × km). */
export function rozliczeniaPrzerzutu(p: Pick<Przerzut, 'rozliczenia' | 'stawka' | 'km'>): RozliczenieTransportu[] {
  if (p.rozliczenia) return p.rozliczenia;
  return p.stawka ? [{ rodzaj: 'km', stawka: p.stawka, km: p.km ?? 0 }] : [];
}

export function rozliczeniaSamochodow(
  s: Pick<WpisSamochodow, 'rozliczenia' | 'rozliczenie' | 'stawka' | 'km' | 'tony'>,
): RozliczenieTransportu[] {
  if (s.rozliczenia) return s.rozliczenia;
  return s.rozliczenie && s.stawka ? [{ rodzaj: s.rozliczenie, stawka: s.stawka, km: s.km, tony: s.tony }] : [];
}

/**
 * km: stawka × km × kursy; kurs: stawka × kursy; t × km: stawka × tony × km; godzinowa: stawka × godziny.
 * Przerzut liczy się jak jeden kurs.
 */
export function kwotaRozliczeniaTransportu(r: RozliczenieTransportu, kursy = 1): number {
  const stawka = r.stawka || 0;
  if (r.rodzaj === 'kurs') return round2(stawka * (kursy || 0));
  if (r.rodzaj === 'tkm') return round2(stawka * (r.tony || 0) * (r.km || 0));
  if (r.rodzaj === 'godz') return round2(stawka * (r.godziny || 0));
  return round2(stawka * (r.km || 0) * (kursy || 0));
}

const liczba = (n: number) => String(round3(n)).replace('.', ',');

export function wzorRozliczeniaTransportu(r: RozliczenieTransportu, kursy?: number): string {
  const wynik = `${formatLiczby(kwotaRozliczeniaTransportu(r, kursy ?? 1))} zł`;
  const razyKursy = kursy != null ? ` × ${kursy} kursów` : '';
  if (r.rodzaj === 'kurs') return `${liczba(r.stawka)} zł${razyKursy} = ${wynik}`;
  if (r.rodzaj === 'tkm') return `${liczba(r.stawka)} zł × ${liczba(r.tony ?? 0)} t × ${liczba(r.km ?? 0)} km = ${wynik}`;
  if (r.rodzaj === 'godz') return `${liczba(r.stawka)} zł/h × ${liczba(r.godziny ?? 0)} h = ${wynik}`;
  return `${liczba(r.stawka)} zł × ${liczba(r.km ?? 0)} km${razyKursy} = ${wynik}`;
}

export const kwotaPrzerzutu = (p: Pick<Przerzut, 'rozliczenia' | 'stawka' | 'km'>): number =>
  round2(rozliczeniaPrzerzutu(p).reduce((s, r) => s + kwotaRozliczeniaTransportu(r, 1), 0));

export function kwotaSamochodow(s: Pick<WpisSamochodow, 'rozliczenia' | 'rozliczenie' | 'stawka' | 'kursy' | 'km' | 'tony'>): number {
  return round2(rozliczeniaSamochodow(s).reduce((suma, r) => suma + kwotaRozliczeniaTransportu(r, s.kursy), 0));
}

export function kwotaTransportu(raport: Pick<RaportDzienny, 'przerzuty' | 'samochody'>): number {
  return round2(
    raport.przerzuty.reduce((s, p) => s + kwotaPrzerzutu(p), 0)
      + raport.samochody.reduce((s, w) => s + kwotaSamochodow(w), 0),
  );
}

/** Link Google Maps z trasą „Inowrocław - Mąkowarsko” (punkty pośrednie po kolejnych myślnikach). */
export function linkTrasy(trasa: string): string | undefined {
  const punkty = trasa.split(/\s+[-–—>]+\s+|→/).map((p) => p.trim()).filter(Boolean);
  if (punkty.length === 0) return undefined;
  const e = encodeURIComponent;
  if (punkty.length === 1) return `https://www.google.com/maps/search/?api=1&query=${e(punkty[0])}`;
  const posrednie = punkty.slice(1, -1);
  return `https://www.google.com/maps/dir/?api=1&origin=${e(punkty[0])}&destination=${e(punkty[punkty.length - 1])}`
    + (posrednie.length ? `&waypoints=${posrednie.map(e).join('%7C')}` : '');
}

// --- Robocizna ---

export interface RobociznaDnia {
  pracownicy: RaportPracownika[];
  sprzet: RaportSprzetu[];
  kwotaPracownikow: number;
  kwotaSprzetu: number;
}

/** Raporty pracowników i sprzętu z dnia raportu na tej budowie; do kwoty wchodzą tylko zatwierdzone. */
export function robociznaDnia(
  raport: Pick<RaportDzienny, 'budowaId' | 'data' | 'zatwierdzonePracownicy' | 'zatwierdzonySprzet'>,
  raportyPracownikow: RaportPracownika[],
  raportySprzetu: RaportSprzetu[],
): RobociznaDnia {
  const pracownicy = raportyPracownikow.filter((r) => r.budowaId === raport.budowaId && r.data === raport.data);
  const sprzet = raportySprzetu.filter((r) => r.budowaId === raport.budowaId && r.data === raport.data);
  return {
    pracownicy,
    sprzet,
    kwotaPracownikow: round2(pracownicy.filter((r) => raport.zatwierdzonePracownicy.includes(r.id)).reduce((s, r) => s + r.kwota, 0)),
    kwotaSprzetu: round2(sprzet.filter((r) => raport.zatwierdzonySprzet.includes(r.id)).reduce((s, r) => s + r.kwota, 0)),
  };
}

export interface PodsumowanieDnia {
  material: number;
  transport: number;
  robocizna: number;
  razem: number;
}

export function podsumowanieDnia(
  raport: RaportDzienny,
  mieszanki: Pick<Mieszanka, 'id' | 'cena' | 'historiaCen'>[],
  raportyPracownikow: RaportPracownika[],
  raportySprzetu: RaportSprzetu[],
): PodsumowanieDnia {
  const material = sumaKwot(materialyRaportu(raport, mieszanki));
  const transport = kwotaTransportu(raport);
  const r = robociznaDnia(raport, raportyPracownikow, raportySprzetu);
  const robocizna = round2(r.kwotaPracownikow + r.kwotaSprzetu);
  return { material, transport, robocizna, razem: round2(material + transport + robocizna) };
}

const odmianaRaportow = (n: number) => {
  if (n === 1) return 'raport';
  const r10 = n % 10;
  const r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? 'raporty' : 'raportów';
};

export const liczbaRaportow = (n: number) => `${n} ${odmianaRaportow(n)}`;
