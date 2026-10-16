// ============================================================
// APP HEADER – nagłówek z bezpiecznym marginesem od status bar
// Wiersz 1: wstecz + domek | tytuł | akcja; wiersz 2: przyciski akcji
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tekstPrzycisk, tekstPrzyciskNaglowkaWrap } from '../../constants/layout';
import { cien } from '../../constants/styl';
import { useMotyw } from '../../hooks/useMotyw';
import { doMenuGlownego } from '../../budzet/nawigacja';
import { Naciskany } from '../ui/Naciskany';
import { PrzyciskIkony } from '../ui/Przycisk';

interface Przycisk {
  tekst: string;
  onPress: () => void;
  kolor?: string;
  tlo?: string;
  disabled?: boolean;
}

interface AppHeaderProps {
  tytul: string;
  podtytul?: string;
  przyciski?: Przycisk[];
  /** Lewy górny róg. „‹ Wstecz” rysuje się jako strzałka obok domku; inny tekst (Anuluj/Zamknij) – jako napis. */
  lewy?: Przycisk;
  /** Przycisk w prawym górnym rogu (jeden, opcjonalny) */
  prawy?: Przycisk;
  /** Domek do menu głównego – domyślnie przy przycisku Wstecz. */
  menu?: boolean;
}

const czyWstecz = (p?: Przycisk) => !!p && /wstecz/i.test(p.tekst);

export function AppHeader({ tytul, podtytul, przyciski, lewy, prawy, menu }: AppHeaderProps) {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const pokazMenu = menu ?? czyWstecz(lewy);
  const hasPrzyciski = przyciski && przyciski.length > 0;

  return (
    <View
      style={[
        styles.container,
        cien(theme),
        { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: insets.top + 6, zIndex: 20 },
      ]}
    >
      <View style={styles.rzadTytul}>
        <View style={styles.bok}>
          {lewy && czyWstecz(lewy) ? (
            <PrzyciskIkony ikona="wstecz" accessibilityLabel="Wstecz" onPress={lewy.onPress} kolor={lewy.kolor ?? theme.colors.primary} />
          ) : lewy ? (
            <Naciskany accessibilityRole="button" accessibilityLabel={lewy.tekst} onPress={lewy.onPress} hitSlop={10}>
              <Text style={[tekstPrzyciskNaglowkaWrap, { color: lewy.kolor ?? theme.colors.primary }]} numberOfLines={2}>{lewy.tekst}</Text>
            </Naciskany>
          ) : null}
          {pokazMenu ? (
            <PrzyciskIkony ikona="dom" accessibilityLabel="Menu główne" onPress={doMenuGlownego} kolor={theme.colors.textSecondary} tlo={`${theme.colors.textSecondary}14`} />
          ) : null}
        </View>

        <View style={styles.tytulWrap}>
          <Text style={[styles.tytul, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {tytul}
          </Text>
          {podtytul ? <Text style={[styles.podtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>{podtytul}</Text> : null}
        </View>

        <View style={[styles.bok, styles.bokPrawy]}>
          {prawy ? (
            <Naciskany accessibilityRole="button" accessibilityLabel={prawy.tekst} onPress={prawy.onPress} disabled={prawy.disabled} hitSlop={10}>
              <Text style={[tekstPrzyciskNaglowkaWrap, { color: prawy.kolor ?? theme.colors.primary }]} numberOfLines={2}>{prawy.tekst}</Text>
            </Naciskany>
          ) : null}
        </View>
      </View>

      {hasPrzyciski && (
        <View style={styles.rzadPrzyciskow}>
          {przyciski!.map((p) => (
            <Naciskany
              key={p.tekst}
              accessibilityRole="button"
              accessibilityLabel={p.tekst}
              style={[
                styles.btnAkcji,
                { backgroundColor: p.tlo ?? `${theme.colors.primary}15`, borderColor: p.tlo ? 'transparent' : theme.colors.border },
              ]}
              onPress={p.onPress}
              disabled={p.disabled}
            >
              <Text style={[tekstPrzycisk, { color: p.kolor ?? theme.colors.primary }]} numberOfLines={2}>
                {p.tekst}
              </Text>
            </Naciskany>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  rzadTytul: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  bok: { width: 84, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bokPrawy: { justifyContent: 'flex-end' },
  tytulWrap: { flex: 1, alignItems: 'center' },
  tytul: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  podtytul: { fontSize: 11, marginTop: 1 },
  rzadPrzyciskow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  btnAkcji: {
    flex: 1,
    minWidth: 72,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
