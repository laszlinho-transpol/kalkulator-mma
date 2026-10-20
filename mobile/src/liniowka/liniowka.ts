// ============================================================
// LINIÓWKA – ułożone obszary z raportów, wpisy ręczne, szkice
// ============================================================

import type {
  ArkuszPzt,
  ElementSzkicu,
  KategoriaWarstwy,
  KolorWarstwyLiniowki,
  LiniowkaProjektu,
  ObszarObmiaru,
  PowierzchniaSzkicuObszaru,
  ProjektBudowy,
  Punkt2D,
  SzkicLiniowki,
  WpisRecznyLiniowki,
} from '../types';
import type { RaportDzienny } from '../raportyBudowy/typy';
import { kluczLegendy, segmentyKonstrukcji } from '../utils/projektBudowy';
import { pasujeWarstwa } from '../utils/planZBudowy';
import { poleZamalowaniaPdf } from './rasterSzkicu';

export const KOLORY_DOMYSLNE: Record<Exclude<KategoriaWarstwy, 'inna'>, KolorWarstwyLiniowki> = {
  sma: { kolor: '#16A34A', krycie: 0.9 },
  wiazaca: { kolor: '#2563EB', krycie: 0.7 },
  podbudowa: { kolor: '#DC2626', krycie: 0.5 },
  klsm: { kolor: '#EAB308', krycie: 0.3 },
};

export const PALETA_INNYCH = ['#9333EA', '#EA580C', '#0891B2', '#DB2777', '#65A30D', '#78716C', '#4F46E5', '#0D9488'];
export const KRYCIE_INNYCH = 0.2;
export const KRYCIE_WLASNYCH = 0.5;
export const KROK_ZNAKU_INFO_M = 200;

export const NAZWY_KATEGORII_LINIOWKI: Record<Exclude<KategoriaWarstwy, 'inna'>, string> = {
  sma: 'Ścieralna',
  wiazaca: 'Wiążąca',
  podbudowa: 'Podbudowa bitumiczna',
  klsm: 'KŁSM',
};

const KATEGORIE_GLOWNE: Array<Exclude<KategoriaWarstwy, 'inna'>> = ['sma', 'wiazaca', 'podbudowa', 'klsm'];
const KOLEJNOSC_DOMYSLNA: Record<KategoriaWarstwy, number> = { sma: 1, wiazaca: 2, podbudowa: 3, inna: 4, klsm: 5 };
const POZIOM_SCIERALNEJ = 1000;
const POZIOM_WLASNEJ = 500;

export function kluczWarstwyLiniowki(kategoria: KategoriaWarstwy, nazwa: string): string {
  return kategoria === 'inna' ? `inna|${nazwa.trim().toLowerCase()}` : kategoria;
}

export function kluczWlasnej(id: string): string {
  return `wlasna|${id}`;
}

export interface SegmentLiniowki {
  id: string;
  zrodlo: 'raport' | 'reczny';
  raportId?: string;
  wpisId?: string;
  /** YYYY-MM-DD */
  data: string;
  legendaId: string;
  obszarNazwa: string;
  warstwaNazwa: string;
  kategoria: KategoriaWarstwy;
  klucz: string;
  /** Start działki roboczej – stąd rusza rozściełacz. */
  kmOdM: number;
  kmDoM: number;
  powierzchniaM2: number;
  mieszankaId?: string;
  mieszankaNazwa?: string;
  komentarz?: string;
}

export function segmentyZRaportow(raporty: RaportDzienny[], budowaId: string): SegmentLiniowki[] {
  const out: SegmentLiniowki[] = [];
  for (const r of raporty) {
    if (r.budowaId !== budowaId) continue;
    for (const p of r.pozycje) {
      for (const o of p.odcinki) {
        if (!o.legendaId || Math.abs(o.kmDoM - o.kmOdM) < 0.01) continue;
        out.push({
          id: `${r.id}|${p.id}|${o.id}`,
          zrodlo: 'raport',
          raportId: r.id,
          data: r.data,
          legendaId: o.legendaId,
          obszarNazwa: o.nazwa,
          warstwaNazwa: p.warstwaNazwa,
          kategoria: p.kategoria,
          klucz: kluczWarstwyLiniowki(p.kategoria, p.warstwaNazwa),
          kmOdM: o.kmOdM,
          kmDoM: o.kmDoM,
          powierzchniaM2: o.powierzchniaM2,
          mieszankaId: p.mieszankaId,
          mieszankaNazwa: p.mieszankaNazwa,
        });
      }
    }
  }
  return out;
}

export function segmentyReczne(
  wpisy: WpisRecznyLiniowki[],
  nazwaMieszanki: (id: string) => string | undefined = () => undefined,
): SegmentLiniowki[] {
  const out: SegmentLiniowki[] = [];
  for (const w of wpisy) {
    w.zakladki.forEach((z, i) => {
      if (!z.legendaId || Math.abs(z.kilometrazDoM - z.kilometrazOdM) < 0.01) return;
      const kategoria = z.warstwaKategoria ?? 'inna';
      out.push({
        id: `${w.id}|${z.id}`,
        zrodlo: 'reczny',
        wpisId: w.id,
        data: w.data,
        legendaId: z.legendaId,
        obszarNazwa: z.obszarNazwa ?? '',
        warstwaNazwa: z.warstwaNazwa,
        kategoria,
        klucz: kluczWarstwyLiniowki(kategoria, z.warstwaNazwa),
        kmOdM: z.kilometrazOdM,
        kmDoM: z.kilometrazDoM,
        powierzchniaM2: w.powierzchnieM2[i] ?? 0,
        mieszankaId: z.mieszankaId || undefined,
        mieszankaNazwa: z.mieszankaId ? nazwaMieszanki(z.mieszankaId) : undefined,
        komentarz: w.komentarz,
      });
    });
  }
  return out;
}

export function segmentyLiniowki(
  projekt: ProjektBudowy,
  raporty: RaportDzienny[],
  budowaId: string,
  nazwaMieszanki?: (id: string) => string | undefined,
): SegmentLiniowki[] {
  return [
    ...segmentyZRaportow(raporty, budowaId),
    ...segmentyReczne(projekt.liniowka?.reczne ?? [], nazwaMieszanki),
  ];
}

/** Kolejność warstwy w konstrukcji obszaru w połowie odcinka (1 = najwyżej). */
export function kolejnoscWKonstrukcji(projekt: ProjektBudowy, s: Pick<SegmentLiniowki, 'legendaId' | 'kmOdM' | 'kmDoM' | 'warstwaNazwa' | 'kategoria'>): number {
  const konstrukcja = projekt.konstrukcje.find((k) => k.legendaId === s.legendaId);
  if (konstrukcja) {
    const mid = (s.kmOdM + s.kmDoM) / 2;
    const seg = segmentyKonstrukcji(konstrukcja, mid - 0.5, mid + 0.5)[0];
    const w = seg?.warstwy.find((x) => pasujeWarstwa(x, s.warstwaNazwa, s.kategoria));
    if (w) return w.kolejnosc;
  }
  return KOLEJNOSC_DOMYSLNA[s.kategoria];
}

/** Im wyższy poziom, tym wyżej na mapie. Ścieralna zawsze na wierzchu. */
export function poziomSegmentu(projekt: ProjektBudowy, s: SegmentLiniowki): number {
  if (s.kategoria === 'sma') return POZIOM_SCIERALNEJ;
  return -kolejnoscWKonstrukcji(projekt, s);
}

export function poziomKlucza(klucz: string): number {
  if (klucz === 'sma') return POZIOM_SCIERALNEJ;
  if (klucz.startsWith('wlasna|')) return POZIOM_WLASNEJ;
  const kat = (klucz.startsWith('inna|') ? 'inna' : klucz) as KategoriaWarstwy;
  return -(KOLEJNOSC_DOMYSLNA[kat] ?? 4);
}

/** Od najniższej do najwyższej warstwy; w tej samej warstwie późniejszy dzień wyżej. */
export function posortujDoRysowania(projekt: ProjektBudowy, segmenty: SegmentLiniowki[]): SegmentLiniowki[] {
  return segmenty
    .map((s) => ({ s, p: poziomSegmentu(projekt, s) }))
    .sort((a, b) => a.p - b.p || a.s.data.localeCompare(b.s.data))
    .map((x) => x.s);
}

/** Pikiety znaków „i” – środki odcinków ok. 200 m, krótszy odcinek ma jeden znak. */
export function stacjeZnakowInfo(kmOdM: number, kmDoM: number, krokM = KROK_ZNAKU_INFO_M): number[] {
  const lo = Math.min(kmOdM, kmDoM);
  const hi = Math.max(kmOdM, kmDoM);
  const dl = hi - lo;
  const n = Math.max(1, Math.round(dl / krokM));
  return Array.from({ length: n }, (_, i) => lo + ((i + 0.5) * dl) / n);
}

export interface WarstwaLiniowki {
  klucz: string;
  nazwa: string;
  opis?: string;
  kolor: string;
  krycie: number;
  poziom: number;
  wlasna: boolean;
}

/** Wszystkie warstwy: z konstrukcji, z odcinków i własne ze szkiców – z kolorami. */
export function warstwyLiniowki(
  projekt: ProjektBudowy,
  segmenty: SegmentLiniowki[] = [],
  opcje: { wszystkieGlowne?: boolean } = {},
): WarstwaLiniowki[] {
  const ustawienia: LiniowkaProjektu = projekt.liniowka ?? {};
  const kolory = ustawienia.kolory ?? {};
  const kategorie = new Set<KategoriaWarstwy>();
  const inne = new Map<string, string>();
  const dodaj = (kategoria: KategoriaWarstwy, nazwa: string) => {
    if (kategoria === 'inna') {
      const k = kluczWarstwyLiniowki('inna', nazwa);
      if (nazwa.trim() && !inne.has(k)) inne.set(k, nazwa.trim());
    } else {
      kategorie.add(kategoria);
    }
  };
  for (const k of projekt.konstrukcje) {
    for (const w of k.warstwy) dodaj(w.kategoria, w.nazwa);
    for (const wy of k.wyjatki) for (const w of wy.warstwy) dodaj(w.kategoria, w.nazwa);
  }
  for (const s of segmenty) dodaj(s.kategoria, s.warstwaNazwa);
  for (const sz of ustawienia.szkice ?? []) {
    if (KATEGORIE_GLOWNE.includes(sz.warstwaKlucz as Exclude<KategoriaWarstwy, 'inna'>)) kategorie.add(sz.warstwaKlucz as KategoriaWarstwy);
  }

  const out: WarstwaLiniowki[] = [];
  for (const kat of KATEGORIE_GLOWNE) {
    if (!kategorie.has(kat) && !opcje.wszystkieGlowne) continue;
    const kol = kolory[kat] ?? KOLORY_DOMYSLNE[kat];
    out.push({ klucz: kat, nazwa: NAZWY_KATEGORII_LINIOWKI[kat], kolor: kol.kolor, krycie: kol.krycie, poziom: poziomKlucza(kat), wlasna: false });
  }
  [...inne.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pl')).forEach(([klucz, nazwa], i) => {
    const kol = kolory[klucz] ?? { kolor: PALETA_INNYCH[i % PALETA_INNYCH.length], krycie: KRYCIE_INNYCH };
    out.push({ klucz, nazwa, kolor: kol.kolor, krycie: kol.krycie, poziom: poziomKlucza(klucz), wlasna: false });
  });
  (ustawienia.warstwyWlasne ?? []).forEach((w, i) => {
    const klucz = kluczWlasnej(w.id);
    const kol = kolory[klucz] ?? { kolor: PALETA_INNYCH[(i + 3) % PALETA_INNYCH.length], krycie: KRYCIE_WLASNYCH };
    out.push({ klucz, nazwa: w.nazwa, opis: w.opis, kolor: kol.kolor, krycie: kol.krycie, poziom: poziomKlucza(klucz), wlasna: true });
  });
  return out;
}

export function ustawKolorWarstwy(projekt: ProjektBudowy, klucz: string, kolor: KolorWarstwyLiniowki): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  return { ...projekt, liniowka: { ...l, kolory: { ...(l.kolory ?? {}), [klucz]: kolor } } };
}

export function przywrocKoloryDomyslne(projekt: ProjektBudowy): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  const zostaw = Object.fromEntries(Object.entries(l.kolory ?? {}).filter(([k]) => k.startsWith('wlasna|')));
  return { ...projekt, liniowka: { ...l, kolory: zostaw } };
}

/** Odcinki zawierające pikietę – od najstarszego. */
export function szukajPoKm(segmenty: SegmentLiniowki[], kmM: number): SegmentLiniowki[] {
  return segmenty
    .filter((s) => kmM >= Math.min(s.kmOdM, s.kmDoM) - 0.01 && kmM <= Math.max(s.kmOdM, s.kmDoM) + 0.01)
    .sort((a, b) => a.data.localeCompare(b.data) || poziomKlucza(a.klucz) - poziomKlucza(b.klucz));
}

export function szukajPoDacie(segmenty: SegmentLiniowki[], data: string): SegmentLiniowki[] {
  return segmenty
    .filter((s) => s.data === data)
    .sort((a, b) => poziomKlucza(a.klucz) - poziomKlucza(b.klucz) || Math.min(a.kmOdM, a.kmDoM) - Math.min(b.kmOdM, b.kmDoM));
}

export function dniLiniowki(segmenty: SegmentLiniowki[]): string[] {
  return [...new Set(segmenty.map((s) => s.data))].sort();
}

// ------------------------------------------------------------
// Szkic
// ------------------------------------------------------------

const odl = (a: Punkt2D, b: Punkt2D) => Math.hypot(a.x - b.x, a.y - b.y);

function odlOdOdcinka(p: Punkt2D, a: Punkt2D, b: Punkt2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return odl(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function punktWWielokacie(p: Punkt2D, poly: Punkt2D[]): boolean {
  let wewnatrz = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) wewnatrz = !wewnatrz;
  }
  return wewnatrz;
}

function poleWielokata(poly: Punkt2D[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(s / 2);
}

let licznikId = 0;
const noweId = () => `sz${Date.now().toString(36)}${(licznikId++).toString(36)}`;

/** Gumka: wycina fragmenty kresek w promieniu, reszta zostaje jako osobne kreski. */
export function wymazGumka(elementy: ElementSzkicu[], p: Punkt2D, promien: number): ElementSzkicu[] {
  const out: ElementSzkicu[] = [];
  for (const e of elementy) {
    const pts = e.punktyPdf;
    const usun = pts.map((q) => odl(q, p) <= promien);
    const ciecia = pts.slice(1).map((q, i) => !usun[i] && !usun[i + 1] && odlOdOdcinka(p, pts[i], q) <= promien);
    if (!usun.some(Boolean) && !ciecia.some(Boolean)) {
      out.push(e);
      continue;
    }
    let biezacy: Punkt2D[] = [];
    const kawalki: Punkt2D[][] = [];
    pts.forEach((q, i) => {
      if (usun[i]) {
        if (biezacy.length) kawalki.push(biezacy);
        biezacy = [];
        return;
      }
      biezacy.push(q);
      if (i < ciecia.length && ciecia[i]) {
        kawalki.push(biezacy);
        biezacy = [];
      }
    });
    if (biezacy.length) kawalki.push(biezacy);
    for (const k of kawalki) {
      if (k.length >= 2) out.push({ id: noweId(), punktyPdf: k, kolor: e.kolor, gruboscPdf: e.gruboscPdf });
    }
  }
  return out;
}

/** Element szkicu pod punktem: wnętrze plamy/wypełnienia albo blisko kreski. */
export function elementPodPunktem(elementy: ElementSzkicu[], p: Punkt2D, tolerancja: number): ElementSzkicu | undefined {
  for (let i = elementy.length - 1; i >= 0; i--) {
    const e = elementy[i];
    if (e.wypelnienie && e.punktyPdf.length >= 3 && punktWWielokacie(p, e.punktyPdf)
      && !(e.otwory ?? []).some((o) => punktWWielokacie(p, o))) return e;
    const pol = tolerancja + e.gruboscPdf / 2;
    if (!e.plama && e.punktyPdf.some((q, k) => k > 0 && odlOdOdcinka(p, e.punktyPdf[k - 1], q) <= pol)) return e;
  }
  return undefined;
}

/**
 * Obszary arkusza, po których wolno malować warstwą: te, których konstrukcja ma tę warstwę.
 * Null dla warstwy własnej (rysunek po całym arkuszu). Brak dopasowania = wszystkie obszary arkusza.
 */
export function obszaryWarstwy(projekt: ProjektBudowy, arkusz: ArkuszPzt, klucz: string): ObszarObmiaru[] | null {
  if (klucz.startsWith('wlasna|')) return null;
  const kluczeLegendy = new Set<string>();
  for (const k of projekt.konstrukcje) {
    const warstwy = [...k.warstwy, ...k.wyjatki.flatMap((w) => w.warstwy)];
    if (!warstwy.some((w) => kluczWarstwyLiniowki(w.kategoria, w.nazwa) === klucz)) continue;
    const wpis = projekt.legenda.find((l) => l.id === k.legendaId && l.typ === 'obszar');
    if (wpis) kluczeLegendy.add(wpis.klucz);
  }
  const pasujace = arkusz.obszary.filter((o) => kluczeLegendy.has(kluczLegendy('obszar', o.kolorWypelnienia)));
  return pasujace.length > 0 ? pasujace : arkusz.obszary;
}

/** m² terenu na jednostkę² PDF – z powierzchni obszaru XFDF. */
export function skalaM2Obszaru(o: ObszarObmiaru): number | null {
  const pdf = poleWielokata(o.wierzcholkiPdf);
  return pdf > 1e-9 && o.powierzchniaM2 > 0 ? o.powierzchniaM2 / pdf : null;
}

function skalaM2Arkusza(arkusz: ArkuszPzt): number {
  const skale = arkusz.obszary.map(skalaM2Obszaru).filter((x): x is number => x != null).sort((a, b) => a - b);
  return skale.length > 0 ? skale[Math.floor(skale.length / 2)] : 1;
}

/**
 * Powierzchnia zamalowana szkicem [m²]. Z klipem warstwy liczy tylko wnętrze jej obszarów;
 * bez klipu – całość, z rozbiciem na obszary arkusza, które szkic zachodzi.
 */
export function powierzchnieSzkicu(
  elementy: ElementSzkicu[],
  arkusz: ArkuszPzt,
  klip: ObszarObmiaru[] | null,
): { razemM2: number; powierzchnie: PowierzchniaSzkicuObszaru[] } {
  const zaokr = (x: number) => Math.round(x * 100) / 100;
  const powierzchnie = (klip ?? arkusz.obszary)
    .map((o) => ({
      obszarId: o.id,
      obszarNazwa: o.nazwa,
      m2: zaokr(poleZamalowaniaPdf(elementy, o.wierzcholkiPdf) * (skalaM2Obszaru(o) ?? skalaM2Arkusza(arkusz))),
    }))
    .filter((p) => p.m2 > 0);
  const razemM2 = klip
    ? zaokr(powierzchnie.reduce((s, p) => s + p.m2, 0))
    : zaokr(poleZamalowaniaPdf(elementy) * skalaM2Arkusza(arkusz));
  return { razemM2, powierzchnie };
}

/** Upraszcza kreskę – pomija punkty bliżej niż minOdl od poprzedniego. */
export function dodajPunktKreski(pts: Punkt2D[], p: Punkt2D, minOdl: number): Punkt2D[] {
  const last = pts[pts.length - 1];
  if (last && odl(last, p) < minOdl) return pts;
  return [...pts, p];
}

export function nowySzkic(
  arkuszId: string,
  elementy: ElementSzkicu[],
  warstwaKlucz: string,
  dodatki: Partial<Pick<SzkicLiniowki, 'opis' | 'powierzchniaM2' | 'powierzchnie' | 'raportId'>> = {},
): SzkicLiniowki {
  const teraz = new Date().toISOString();
  return { id: noweId(), arkuszId, elementy, warstwaKlucz, ...dodatki, createdAt: teraz, updatedAt: teraz };
}

/** Szkice podłączone do raportu dziennego. */
export function szkiceRaportu(projekt: ProjektBudowy | undefined, raportId: string): SzkicLiniowki[] {
  return (projekt?.liniowka?.szkice ?? []).filter((s) => s.raportId === raportId);
}

export function zapiszSzkic(projekt: ProjektBudowy, szkic: SzkicLiniowki): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  const lista = l.szkice ?? [];
  const jest = lista.some((s) => s.id === szkic.id);
  return {
    ...projekt,
    liniowka: { ...l, szkice: jest ? lista.map((s) => (s.id === szkic.id ? szkic : s)) : [...lista, szkic] },
  };
}

export function usunSzkic(projekt: ProjektBudowy, id: string): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  return { ...projekt, liniowka: { ...l, szkice: (l.szkice ?? []).filter((s) => s.id !== id) } };
}

export function dodajWarstweWlasna(projekt: ProjektBudowy, nazwa: string, opis: string | undefined, kolor: string): { projekt: ProjektBudowy; klucz: string } {
  const l = projekt.liniowka ?? {};
  const id = noweId();
  const klucz = kluczWlasnej(id);
  return {
    klucz,
    projekt: {
      ...projekt,
      liniowka: {
        ...l,
        warstwyWlasne: [...(l.warstwyWlasne ?? []), { id, nazwa: nazwa.trim(), opis: opis?.trim() || undefined }],
        kolory: { ...(l.kolory ?? {}), [klucz]: { kolor, krycie: KRYCIE_WLASNYCH } },
      },
    },
  };
}

export function zapiszWpisReczny(projekt: ProjektBudowy, wpis: WpisRecznyLiniowki): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  const lista = l.reczne ?? [];
  const jest = lista.some((w) => w.id === wpis.id);
  return {
    ...projekt,
    liniowka: { ...l, reczne: jest ? lista.map((w) => (w.id === wpis.id ? wpis : w)) : [...lista, wpis] },
  };
}

export function usunWpisReczny(projekt: ProjektBudowy, id: string): ProjektBudowy {
  const l = projekt.liniowka ?? {};
  return { ...projekt, liniowka: { ...l, reczne: (l.reczne ?? []).filter((w) => w.id !== id) } };
}
