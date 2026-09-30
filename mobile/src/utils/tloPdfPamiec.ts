// ============================================================
// TŁO PDF ARKUSZY PZT – dopasowanie nazw + cache binariów (nie w AsyncStorage)
// ============================================================

export interface BuforTlaPdf {
  data: Uint8Array;
  nazwa: string;
  pageW: number;
  pageH: number;
  strona: number;
}

const poArkuszu = new Map<string, BuforTlaPdf>();
const poPliku = new Map<string, BuforTlaPdf>();

export function bazowaNazwaPliku(n: string): string {
  const bezSchematu = n.replace(/^file:\/\//i, '').replace(/^file:/i, '');
  const bezSciezki = bezSchematu.replace(/^.*[/\\]/, '');
  return bezSciezki
    .replace(/\.[^.]+$/, '')
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Wspólny klucz arkusza, np. „Ark. 2_1.xfdf” i „DK25M_kowarsko_Ark_2_1.pdf” → „2 1”. */
export function kluczArkuszaZNazwy(n: string): string | null {
  const b = bazowaNazwaPliku(n);
  const zArk = b.match(/ark(?:usz)?\s+(\d+)\s+(\d+)/);
  if (zArk) return `${zArk[1]} ${zArk[2]}`;
  const ogon = b.match(/(\d+)\s+(\d+)$/);
  if (ogon) return `${ogon[1]} ${ogon[2]}`;
  return null;
}

export function kandydaciNazwyArkusza(arkusz: {
  zrodloPdfHref?: string;
  zrodloNazwa: string;
  nazwa: string;
}): string[] {
  return [arkusz.zrodloPdfHref, arkusz.zrodloNazwa, arkusz.nazwa]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .map(bazowaNazwaPliku);
}

export function dopasujNazwePdfDoArkusza(
  arkusz: { zrodloPdfHref?: string; zrodloNazwa: string; nazwa: string },
  pdfNazwa: string,
): boolean {
  const pdf = bazowaNazwaPliku(pdfNazwa);
  if (!pdf) return false;
  const kandydaci = kandydaciNazwyArkusza(arkusz);
  const kluczPdf = kluczArkuszaZNazwy(pdfNazwa);
  return kandydaci.some((k) => {
    if (k === pdf) return true;
    if (kluczPdf && kluczArkuszaZNazwy(k) === kluczPdf) return true;
    if (k.length >= 4 && pdf.length >= 4 && (k.endsWith(pdf) || pdf.endsWith(k))) return true;
    if (k.includes(pdf) && pdf.length >= 6) return true;
    if (pdf.includes(k) && k.length >= 6) return true;
    return false;
  });
}

/** arkuszId → nazwa pliku PDF. Najpierw dokładna nazwa, potem jedyny pozostały PDF. */
export function dopasujPdfDoArkuszy(
  arkusze: Array<{ id: string; zrodloPdfHref?: string; zrodloNazwa: string; nazwa: string }>,
  pdfNazwy: string[],
): Map<string, string> {
  const wynik = new Map<string, string>();
  const wolne = [...pdfNazwy];
  for (const a of arkusze) {
    const idx = wolne.findIndex((n) => dopasujNazwePdfDoArkusza(a, n));
    if (idx < 0) continue;
    wynik.set(a.id, wolne[idx]);
    wolne.splice(idx, 1);
  }
  if (wolne.length === 1 && arkusze.length === 1 && !wynik.has(arkusze[0].id)) {
    wynik.set(arkusze[0].id, wolne[0]);
  }
  return wynik;
}

export function ustawBuforTla(arkuszId: string, bufor: BuforTlaPdf): void {
  poArkuszu.set(arkuszId, bufor);
  poPliku.set(bazowaNazwaPliku(bufor.nazwa), bufor);
}

export function buforTlaArkusza(arkuszId: string): BuforTlaPdf | undefined {
  return poArkuszu.get(arkuszId);
}

export function buforTlaPoNazwie(nazwa: string): BuforTlaPdf | undefined {
  return poPliku.get(bazowaNazwaPliku(nazwa));
}

export function podlaczBuforDoArkusza(arkuszId: string, nazwaHint?: string): BuforTlaPdf | undefined {
  const jest = poArkuszu.get(arkuszId);
  if (jest) return jest;
  if (!nazwaHint) return undefined;
  const zNazwy = poPliku.get(bazowaNazwaPliku(nazwaHint));
  if (zNazwy) {
    poArkuszu.set(arkuszId, zNazwy);
    return zNazwy;
  }
  return undefined;
}
