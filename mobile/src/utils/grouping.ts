// ============================================================
// GRUPOWANIE ELEMENTÓW LIST – wytwórnie, budowy itd.
// ============================================================

export interface GrupaElementow<T> {
  klucz: string;
  tytul: string;
  elementy: T[];
  /** true = grupa „bez przypisania” na końcu listy */
  bezPrzypisania?: boolean;
}

/**
 * Grupuje elementy po kluczu. Puste/brak klucza → osobna grupa na końcu.
 */
export function grupujPoKluczu<T>(
  elementy: T[],
  pobierzKlucz: (el: T) => string | undefined,
  etykietaBezKlucza = 'Bez przypisania',
): GrupaElementow<T>[] {
  const mapa = new Map<string, T[]>();
  const bez: T[] = [];

  for (const el of elementy) {
    const k = pobierzKlucz(el)?.trim();
    if (!k) {
      bez.push(el);
      continue;
    }
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(el);
  }

  const grupy: GrupaElementow<T>[] = Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pl'))
    .map(([klucz, els]) => ({ klucz, tytul: klucz, elementy: els }));

  if (bez.length > 0) {
    grupy.push({
      klucz: '__bez__',
      tytul: etykietaBezKlucza,
      elementy: bez,
      bezPrzypisania: true,
    });
  }

  return grupy;
}
