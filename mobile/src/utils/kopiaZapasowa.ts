// ============================================================
// KOPIA ZAPASOWA – format pliku, walidacja, podsumowanie
// ============================================================

export const PREFIKS_DANYCH = '@mma:';
export const FORMAT_KOPII = 'kalkulator-mma-kopia';
export const WERSJA_FORMATU = 1;

export interface KopiaZapasowa {
  format: typeof FORMAT_KOPII;
  wersjaFormatu: number;
  wersjaAplikacji: string;
  utworzono: string;
  /** Surowe wartości z pamięci aplikacji – przywracane bez zmian. */
  dane: Record<string, string>;
}

export type WynikOdczytuKopii =
  | { sukces: true; kopia: KopiaZapasowa }
  | { sukces: false; blad: string };

export interface PozycjaPodsumowania {
  etykieta: string;
  liczba: number;
}

const ETYKIETY: Array<[string, string]> = [
  ['budowy', 'Budowy'],
  ['mieszanki', 'Mieszanki'],
  ['wytwornie', 'Wytwórnie'],
  ['plany', 'Plany'],
  ['live', 'Wpisy Live'],
  ['live_sesje', 'Sesje Live'],
  ['obmiar_sesje', 'Obmiary'],
  ['notatnik', 'Notatki'],
  ['firmy', 'Firmy'],
  ['sprzet', 'Sprzęt'],
  ['sprzet_raporty', 'Raporty sprzętu'],
  ['pracownicy', 'Pracownicy'],
  ['grupy_pracownikow', 'Grupy pracowników'],
  ['pracownicy_raporty', 'Raporty pracowników'],
];

export function utworzKopie(
  wpisy: ReadonlyArray<readonly [string, string | null]>,
  wersjaAplikacji: string,
  teraz: Date = new Date(),
): KopiaZapasowa {
  const dane: Record<string, string> = {};
  for (const [klucz, wartosc] of wpisy) {
    if (klucz.startsWith(PREFIKS_DANYCH) && typeof wartosc === 'string') dane[klucz] = wartosc;
  }
  return {
    format: FORMAT_KOPII,
    wersjaFormatu: WERSJA_FORMATU,
    wersjaAplikacji,
    utworzono: teraz.toISOString(),
    dane,
  };
}

export function odczytajKopie(tekst: string): WynikOdczytuKopii {
  let surowe: unknown;
  try {
    surowe = JSON.parse(tekst.replace(/^\uFEFF/, ''));
  } catch {
    return { sukces: false, blad: 'Plik nie jest kopią zapasową Kalkulatora MMA (błędny JSON).' };
  }
  const obiekt = surowe as Partial<KopiaZapasowa> | null;
  if (!obiekt || typeof obiekt !== 'object' || obiekt.format !== FORMAT_KOPII) {
    return { sukces: false, blad: 'To nie jest plik kopii zapasowej Kalkulatora MMA.' };
  }
  if (typeof obiekt.wersjaFormatu !== 'number' || obiekt.wersjaFormatu > WERSJA_FORMATU) {
    return { sukces: false, blad: 'Kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.' };
  }
  if (!obiekt.dane || typeof obiekt.dane !== 'object') {
    return { sukces: false, blad: 'Plik kopii jest uszkodzony – brak danych.' };
  }
  const dane: Record<string, string> = {};
  for (const [klucz, wartosc] of Object.entries(obiekt.dane)) {
    if (klucz.startsWith(PREFIKS_DANYCH) && typeof wartosc === 'string') dane[klucz] = wartosc;
  }
  if (Object.keys(dane).length === 0) {
    return { sukces: false, blad: 'Kopia zapasowa jest pusta.' };
  }
  return {
    sukces: true,
    kopia: {
      format: FORMAT_KOPII,
      wersjaFormatu: obiekt.wersjaFormatu,
      wersjaAplikacji: typeof obiekt.wersjaAplikacji === 'string' ? obiekt.wersjaAplikacji : '?',
      utworzono: typeof obiekt.utworzono === 'string' ? obiekt.utworzono : '',
      dane,
    },
  };
}

/** Liczby rekordów w kopii (tylko niepuste listy), w stałej kolejności. */
export function podsumujKopie(dane: Record<string, string>): PozycjaPodsumowania[] {
  const wynik: PozycjaPodsumowania[] = [];
  for (const [nazwa, etykieta] of ETYKIETY) {
    const wartosc = dane[PREFIKS_DANYCH + nazwa];
    if (wartosc == null) continue;
    try {
      const lista = JSON.parse(wartosc);
      if (Array.isArray(lista) && lista.length > 0) wynik.push({ etykieta, liczba: lista.length });
    } catch {
      /* uszkodzony wpis – pomijamy w podsumowaniu */
    }
  }
  return wynik;
}

export function opisPodsumowania(pozycje: PozycjaPodsumowania[]): string {
  if (pozycje.length === 0) return 'Ustawienia aplikacji (bez list danych).';
  return pozycje.map((p) => `• ${p.etykieta}: ${p.liczba}`).join('\n');
}

/** Przywrócenie zastępuje dane: klucze spoza kopii są usuwane. */
export function planPrzywracania(
  obecneKlucze: readonly string[],
  kopia: KopiaZapasowa,
): { usun: string[]; zapisz: Array<[string, string]> } {
  const wKopii = new Set(Object.keys(kopia.dane));
  return {
    usun: obecneKlucze.filter((k) => k.startsWith(PREFIKS_DANYCH) && !wKopii.has(k)),
    zapisz: Object.entries(kopia.dane),
  };
}

export function nazwaPlikuKopii(teraz: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `kalkulator-mma-kopia-${teraz.getFullYear()}-${d(teraz.getMonth() + 1)}-${d(teraz.getDate())}-${d(teraz.getHours())}${d(teraz.getMinutes())}.json`;
}

export function formatujDateKopii(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'nieznana data';
  const d = (n: number) => String(n).padStart(2, '0');
  return `${d(data.getDate())}.${d(data.getMonth() + 1)}.${data.getFullYear()} ${d(data.getHours())}:${d(data.getMinutes())}`;
}
