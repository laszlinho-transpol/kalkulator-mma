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
  void trwaleZapiszBufor(bufor);
}

/** Zapamiętuje PDF bez przypinania do arkusza – użytkownik może potem wybrać / usunąć. */
export function zapiszBuforPliku(bufor: BuforTlaPdf): void {
  poPliku.set(bazowaNazwaPliku(bufor.nazwa), bufor);
  void trwaleZapiszBufor(bufor);
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

export interface WpisWgranegoPdf {
  nazwa: string;
  arkuszIds: string[];
}

export function listaWgranychPdf(): WpisWgranegoPdf[] {
  const idsPoNazwie = new Map<string, string[]>();
  for (const [arkId, buf] of poArkuszu) {
    const klucz = bazowaNazwaPliku(buf.nazwa);
    const lista = idsPoNazwie.get(klucz) ?? [];
    lista.push(arkId);
    idsPoNazwie.set(klucz, lista);
  }
  const seen = new Set<string>();
  const out: WpisWgranegoPdf[] = [];
  for (const buf of poPliku.values()) {
    const klucz = bazowaNazwaPliku(buf.nazwa);
    if (seen.has(klucz)) continue;
    seen.add(klucz);
    out.push({ nazwa: buf.nazwa, arkuszIds: idsPoNazwie.get(klucz) ?? [] });
  }
  return out.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

export function przypnijWgranyPdfDoArkusza(arkuszId: string, nazwa: string): BuforTlaPdf | undefined {
  const buf = poPliku.get(bazowaNazwaPliku(nazwa));
  if (!buf) return undefined;
  poArkuszu.set(arkuszId, buf);
  return buf;
}

export function odpinBuforTlaArkusza(arkuszId: string): void {
  poArkuszu.delete(arkuszId);
}

/** Usuwa PDF z pamięci. Zwraca id arkuszy, które go miały. */
export function usunWgranyPdf(nazwa: string): string[] {
  const klucz = bazowaNazwaPliku(nazwa);
  poPliku.delete(klucz);
  const ids: string[] = [];
  for (const [arkId, buf] of [...poArkuszu.entries()]) {
    if (bazowaNazwaPliku(buf.nazwa) === klucz) {
      poArkuszu.delete(arkId);
      ids.push(arkId);
    }
  }
  void trwaleUsunBufor(nazwa);
  return ids;
}

export function wyczyscBuforyTla(): void {
  poArkuszu.clear();
  poPliku.clear();
}

const IDB_NAZWA = 'kalkulator-mma-pzt';
const IDB_STORE = 'tla-pdf';

interface WpisTlaIdb {
  klucz: string;
  nazwa: string;
  pageW: number;
  pageH: number;
  strona: number;
  data: ArrayBuffer;
}

function idbDostepne(): boolean {
  return typeof indexedDB !== 'undefined';
}

function otworzIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAZWA, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'klucz' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
  });
}

function kopiaBufora(data: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(data.byteLength);
  out.set(data);
  return out.buffer;
}

/** Trwały zapis PDF tła (przeglądarka). Bez IndexedDB – no-op. */
export async function trwaleZapiszBufor(bufor: BuforTlaPdf): Promise<void> {
  if (!idbDostepne() || bufor.data.byteLength < 32) return;
  try {
    const db = await otworzIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('zapis tła'));
      tx.objectStore(IDB_STORE).put({
        klucz: bazowaNazwaPliku(bufor.nazwa),
        nazwa: bufor.nazwa,
        pageW: bufor.pageW,
        pageH: bufor.pageH,
        strona: bufor.strona,
        data: kopiaBufora(bufor.data),
      } satisfies WpisTlaIdb);
    });
    db.close();
  } catch {
    /* prywatny tryb / quota */
  }
}

export async function trwaleUsunBufor(nazwa: string): Promise<void> {
  if (!idbDostepne()) return;
  try {
    const db = await otworzIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('usuwanie tła'));
      tx.objectStore(IDB_STORE).delete(bazowaNazwaPliku(nazwa));
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/** Wczytuje PDF-y z IndexedDB do pamięci sesji. Zwraca liczbę plików. */
export async function odtworzTlaZIdb(): Promise<number> {
  if (!idbDostepne()) return 0;
  try {
    const db = await otworzIdb();
    const wpisy = await new Promise<WpisTlaIdb[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as WpisTlaIdb[]);
      req.onerror = () => reject(req.error ?? new Error('odczyt teł'));
    });
    db.close();
    let n = 0;
    for (const w of wpisy) {
      if (!w?.data || w.data.byteLength < 32) continue;
      poPliku.set(bazowaNazwaPliku(w.nazwa), {
        data: new Uint8Array(w.data),
        nazwa: w.nazwa,
        pageW: w.pageW,
        pageH: w.pageH,
        strona: w.strona || 1,
      });
      n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}
