import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Etykieta, Wybor, stylFormularza } from '../common/Formularz';
import { Naciskany } from '../ui/Naciskany';
import { useMotyw } from '../../hooks/useMotyw';
import { ODSTEP, PROMIEN, TYPOGRAFIA } from '../../constants/styl';
import { etykietaUziarnienia, grupujMieszanki, normalizujKategorieRuchu, rodzajMieszanki } from '../../mieszanki/kolejnosc';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import type { Mieszanka } from '../../types';

const BEZ_WYTWORNI = '__bez__';

export const nazwaMieszanki = (m: Pick<Mieszanka, 'rodzaj'> & Partial<Pick<Mieszanka, 'nrRecepty' | 'kategoriaRuchu'>>) => (
  `${rodzajMieszanki(m)}${m.nrRecepty ? ` · ${m.nrRecepty}` : ''}`
);

export function opisMieszanki(m: Mieszanka): string {
  return `ρ = ${m.ciezarObjetosciowy.toFixed(3)} t/m³${normalizujKategorieRuchu(m.kategoriaRuchu) ? '' : ' · bez kategorii ruchu'}`;
}

/** Mieszanki pogrupowane: nagłówek rodzaju warstwy, a w nim oddzielone bloki uziarnienia. */
export function ListaMieszanek<T extends Mieszanka>({ mieszanki, renderuj }: {
  mieszanki: T[];
  renderuj: (m: T) => React.ReactNode;
}) {
  const theme = useMotyw();
  const grupy = useMemo(() => grupujMieszanki(mieszanki), [mieszanki]);
  return (
    <View style={styles.lista}>
      {grupy.map((g) => (
        <View key={g.warstwa} style={styles.warstwa}>
          <View style={[styles.naglowek, { borderBottomColor: theme.colors.primary }]}>
            <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.text }]}>{g.tytul}</Text>
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
              {g.grupy.reduce((s, x) => s + x.elementy.length, 0)}
            </Text>
          </View>
          {g.grupy.map((pod) => (
            <View
              key={String(pod.uziarnienie)}
              accessibilityLabel={`Grupa ${g.tytul} ${etykietaUziarnienia(pod.uziarnienie)}`}
              style={[styles.blok, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
            >
              <Text style={[styles.uziarnienie, { color: theme.colors.textSecondary }]}>{etykietaUziarnienia(pod.uziarnienie)}</Text>
              {pod.elementy.map((m, i) => (
                <View key={m.id} style={i > 0 ? [styles.odciecie, { borderTopColor: theme.colors.border }] : undefined}>
                  {renderuj(m)}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Wiersz recepty w ListaMieszanek prowadzący do jej karty. */
export function WierszMieszanki({ mieszanka, prawy, onPress }: { mieszanka: Mieszanka; prawy?: string; onPress: () => void }) {
  const theme = useMotyw();
  return (
    <Naciskany accessibilityRole="button" accessibilityLabel={`Recepta ${rodzajMieszanki(mieszanka)}`} onPress={onPress} style={styles.wiersz}>
      <View style={{ flex: 1 }}>
        <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>{nazwaMieszanki(mieszanka)}</Text>
        <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]} numberOfLines={1}>{opisMieszanki(mieszanka)}</Text>
      </View>
      {prawy ? <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.text }]}>{prawy}</Text> : null}
      <Text style={{ color: theme.colors.textSecondary, fontSize: 18 }}>›</Text>
    </Naciskany>
  );
}

/**
 * Wybór mieszanki zawsze z konkretnej wytwórni: najpierw wytwórnia, potem jej recepty w stałej kolejności.
 * `mieszanki` to dozwolone recepty (np. zatwierdzone dla warstwy).
 */
export function WyborMieszanki({ mieszanki, zaznaczone, onWybierz, etykietaDostepnosci, pustyTekst }: {
  mieszanki: Mieszanka[];
  zaznaczone: string[];
  onWybierz: (m: Mieszanka) => void;
  etykietaDostepnosci?: (m: Mieszanka) => string;
  pustyTekst?: string;
}) {
  const theme = useMotyw();
  const wytwornie = useWytwornieStore((s) => s.wytwornie);

  const kluczWytworni = (m: Mieszanka) => (m.wytworniaId && wytwornie.some((w) => w.id === m.wytworniaId) ? m.wytworniaId : BEZ_WYTWORNI);
  const opcje = useMemo(() => {
    const ile = new Map<string, number>();
    for (const m of mieszanki) ile.set(kluczWytworni(m), (ile.get(kluczWytworni(m)) ?? 0) + 1);
    const lista = wytwornie
      .filter((w) => ile.has(w.id))
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
      .map((w) => ({ klucz: w.id, nazwa: w.nazwa, ile: ile.get(w.id) ?? 0 }));
    if (ile.has(BEZ_WYTWORNI)) lista.push({ klucz: BEZ_WYTWORNI, nazwa: 'Bez wytwórni', ile: ile.get(BEZ_WYTWORNI) ?? 0 });
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mieszanki, wytwornie]);

  const startowa = () => {
    const pierwsza = mieszanki.find((m) => zaznaczone.includes(m.id));
    if (pierwsza) return kluczWytworni(pierwsza);
    return opcje.length === 1 ? opcje[0].klucz : '';
  };
  const [wybrana, setWybrana] = useState(startowa);
  useEffect(() => {
    if (!opcje.some((o) => o.klucz === wybrana)) setWybrana(startowa());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcje]);

  if (mieszanki.length === 0) {
    return <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>{pustyTekst ?? 'Brak mieszanek.'}</Text>;
  }

  const recepty = mieszanki.filter((m) => kluczWytworni(m) === wybrana);
  const zaznaczoneW = (klucz: string) => mieszanki.filter((m) => kluczWytworni(m) === klucz && zaznaczone.includes(m.id)).length;

  return (
    <View style={styles.wybor}>
      <View>
        <Etykieta tekst="Wytwórnia" info="Mieszankę zawsze wybierasz z konkretnej wytwórni. Kolejność recept: podbudowy, wiążące, ścieralne; w nich od największego uziarnienia i od najwyższej kategorii ruchu." />
        <View style={stylFormularza.chipy}>
          {opcje.map((o) => {
            const ile = zaznaczoneW(o.klucz);
            return (
              <Wybor
                key={o.klucz}
                zaznaczony={o.klucz === wybrana}
                etykieta={`${o.nazwa} · ${o.ile}${ile > 0 ? ' ✓' : ''}`}
                accessibilityLabel={`Wytwórnia ${o.nazwa}`}
                onPress={() => setWybrana(o.klucz)}
              />
            );
          })}
        </View>
      </View>
      {!wybrana ? (
        <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Wybierz wytwórnię, aby zobaczyć jej mieszanki.</Text>
      ) : (
        <ListaMieszanek
          mieszanki={recepty}
          renderuj={(m) => {
            const sel = zaznaczone.includes(m.id);
            return (
              <Naciskany
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={etykietaDostepnosci ? etykietaDostepnosci(m) : `Mieszanka ${nazwaMieszanki(m)}`}
                onPress={() => onWybierz(m)}
                style={[styles.wiersz, sel && { backgroundColor: `${theme.colors.primary}22`, borderColor: theme.colors.primary }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>{nazwaMieszanki(m)}</Text>
                  <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]} numberOfLines={1}>{opisMieszanki(m)}</Text>
                </View>
                {sel ? <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>✓</Text> : null}
              </Naciskany>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wybor: { gap: ODSTEP.m },
  lista: { gap: ODSTEP.l },
  warstwa: { gap: ODSTEP.s },
  naglowek: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderBottomWidth: 2, paddingBottom: ODSTEP.xs },
  blok: { borderWidth: 1, borderRadius: PROMIEN.m, paddingHorizontal: ODSTEP.s, paddingVertical: ODSTEP.xs },
  uziarnienie: { fontSize: 11, fontWeight: '800', paddingTop: ODSTEP.xs, paddingBottom: 2, paddingHorizontal: ODSTEP.xs },
  odciecie: { borderTopWidth: StyleSheet.hairlineWidth },
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, paddingVertical: ODSTEP.s, paddingHorizontal: ODSTEP.xs, borderRadius: PROMIEN.s, borderWidth: 1, borderColor: 'transparent' },
  ptaszek: { fontSize: 20, fontWeight: '800' },
});
