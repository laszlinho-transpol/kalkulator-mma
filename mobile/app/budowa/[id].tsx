// ============================================================
// SZABLON BUDOWY – PROJEKT + WYKONANIE
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Naciskany, Sekcja, Zakladki } from '../../src/components/ui';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { SekcjaPzt, type CelObszaruPzt } from '../../src/components/budowa/SekcjaPzt';
import { SekcjaLegenda } from '../../src/components/budowa/SekcjaLegenda';
import { SekcjaKonstrukcje } from '../../src/components/budowa/SekcjaKonstrukcje';
import { SekcjaSzczegolow } from '../../src/components/budowa/SekcjaSzczegolow';
import { SekcjaPrzedmiar } from '../../src/components/budowa/SekcjaPrzedmiar';
import { SekcjaRaporty } from '../../src/components/budowa/SekcjaRaporty';
import { SekcjaLiniowka } from '../../src/components/budowa/SekcjaLiniowka';
import { SekcjaZaawansowanie } from '../../src/components/budowa/SekcjaZaawansowanie';
import { pustyProjektBudowy } from '../../src/utils/projektBudowy';
import { przygotujProjekt } from '../../src/utils/lokalizacjaObszaru';
import type { ProjektBudowy } from '../../src/types';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../src/stores/wytwornieStore';
import { useRaportyBudowyStore } from '../../src/stores/raportyBudowyStore';
import { usePracownicyStore } from '../../src/stores/pracownicyStore';
import { useSprzetStore } from '../../src/stores/sprzetStore';
import { dokumentBudowy } from '../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../src/eksport/udostepnijPdf';
import { FormularzBudowy } from '../../src/components/budowa/FormularzBudowy';
import { opisStatusu, statusBudowy } from '../../src/utils/statusBudowy';

const PROJEKT = [
  { id: 'pzt', nazwa: 'PZT' },
  { id: 'legenda', nazwa: 'Legenda' },
  { id: 'konstrukcje', nazwa: 'Konstrukcje' },
  { id: 'przedmiar', nazwa: 'Przedmiar' },
] as const;

const WYKONANIE = [
  { id: 'raporty', nazwa: 'Raporty' },
  { id: 'liniowka', nazwa: 'Liniówka' },
  { id: 'zaawansowanie', nazwa: 'Zaawansowanie' },
] as const;

const NAZWY: Record<string, string> = Object.fromEntries([...PROJEKT, ...WYKONANIE].map((p) => [p.id, p.nazwa]));
/** Ostatnio otwarta zakładka budowy – powrót ze szczegółu (także po ponownym zamontowaniu ekranu na webie). */
const ostatnieZakladki = new Map<string, { aktywna: string; widok: 'odcinki' | 'szczegoly' }>();

const grupaZakladki = (id: string) => (PROJEKT.some((p) => p.id === id) ? 'Projekt' : 'Wykonanie');

export default function BudowaSzablonScreen() {
  const { id, zakladka, widok } = useLocalSearchParams<{ id: string; zakladka?: string; widok?: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === id));
  const raportyBudowy = useRaportyBudowyStore((s) => s.raporty);
  const zapiszProjekt = useBudowyStore((s) => s.zapiszProjekt);
  const [mapaAktywna, setMapaAktywna] = useState(false);
  const [blokadaPodgladu, setBlokadaPodgladu] = useState(false);
  const [edycja, setEdycja] = useState(false);
  const [aktywna, setAktywna] = useState<string>(() => (zakladka && NAZWY[zakladka] ? zakladka : ostatnieZakladki.get(id)?.aktywna ?? 'pzt'));
  const [menuOtwarte, setMenuOtwarte] = useState(false);
  const [widokKonstrukcji, setWidokKonstrukcji] = useState<'odcinki' | 'szczegoly'>(
    () => (widok === 'szczegoly' || widok === 'odcinki' ? widok : ostatnieZakladki.get(id)?.widok ?? 'odcinki'),
  );
  useEffect(() => {
    ostatnieZakladki.set(id, { aktywna, widok: widokKonstrukcji });
  }, [id, aktywna, widokKonstrukcji]);
  const [skupienie, setSkupienie] = useState(false);
  const [celObszaru, setCelObszaru] = useState<CelObszaruPzt | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const naSkupienie = useCallback((v: boolean) => {
    setSkupienie(v);
    if (v) {
      setMenuOtwarte(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, []);
  const wybierzZakladke = (id: string) => {
    setAktywna(id);
    setMenuOtwarte(false);
  };

  useEffect(() => {
    if (budowa && !budowa.projekt) {
      void zapiszProjekt(budowa.id, pustyProjektBudowy());
    }
  }, [budowa, zapiszProjekt]);

  useEffect(() => {
    if (!budowa?.projekt) return;
    const next = przygotujProjekt(budowa.projekt);
    if (next !== budowa.projekt) {
      void zapiszProjekt(budowa.id, next);
    }
  }, [budowa?.id, budowa?.projekt, zapiszProjekt]);

  const projekt: ProjektBudowy = useMemo(
    () => budowa?.projekt ?? pustyProjektBudowy(),
    [budowa?.projekt],
  );

  if (!budowa) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Budowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>Nie znaleziono budowy.</Text>
      </View>
    );
  }

  const udostepnij = () => {
    const { wytwornie } = useWytwornieStore.getState();
    return udostepnijDokumentPdf(dokumentBudowy({
      budowa,
      projekt,
      mieszanki: useMieszankiStore.getState().mieszanki,
      nazwaWytworni: (wid) => wytwornie.find((w) => w.id === wid)?.nazwa,
      raporty: useRaportyBudowyStore.getState().raporty,
      raportyPracownikow: usePracownicyStore.getState().raporty,
      raportySprzetu: useSprzetStore.getState().raporty,
    }));
  };

  const onZmien = (p: ProjektBudowy) => {
    void zapiszProjekt(budowa.id, przygotujProjekt(p));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={budowa.kodBudowy}
        podtytul={statusBudowy(budowa) === 'aktywna' ? budowa.nazwaInwestycji : `${budowa.nazwaInwestycji} · ${opisStatusu(budowa)}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        udostepnij={udostepnij}
        prawy={{ tekst: 'Edytuj', onPress: () => setEdycja(true) }}
      />
      <FormularzBudowy widoczny={edycja} budowa={budowa} onZamknij={() => setEdycja(false)} onZapisano={() => setEdycja(false)} />
      {!skupienie ? (
        <View style={[styles.menu, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <Naciskany
            onPress={() => setMenuOtwarte((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Zakładki budowy"
            accessibilityState={{ expanded: menuOtwarte }}
            style={[styles.zwiniete, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.grupa, { color: theme.colors.textSecondary }]}>{grupaZakladki(aktywna)}</Text>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15, flex: 1 }} numberOfLines={1}>{NAZWY[aktywna]}</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>{menuOtwarte ? 'Zwiń ▴' : 'Zakładki ▾'}</Text>
          </Naciskany>
          {menuOtwarte ? (
            <>
              <Text style={[styles.grupa, { color: theme.colors.textSecondary }]}>Projekt</Text>
              <RzadPrzyciskow pozycje={PROJEKT} aktywna={aktywna} theme={theme} onPress={wybierzZakladke} />
              <Text style={[styles.grupa, { color: theme.colors.textSecondary }]}>Wykonanie</Text>
              <RzadPrzyciskow pozycje={WYKONANIE} aktywna={aktywna} theme={theme} onPress={wybierzZakladke} />
            </>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={!blokadaPodgladu && !mapaAktywna}
      >
        {aktywna === 'raporty' ? <SekcjaRaporty budowaId={budowa.id} /> : (
          <Sekcja tytul={NAZWY[aktywna] ?? ''}>
            {aktywna === 'pzt' ? (
              <SekcjaPzt
                projekt={projekt}
                theme={theme}
                onZmien={onZmien}
                blokadaPodgladu={blokadaPodgladu}
                onBlokadaPodgladu={setBlokadaPodgladu}
                onDotykZmiana={setMapaAktywna}
                cel={celObszaru}
              />
            ) : null}
            {aktywna === 'legenda' ? <SekcjaLegenda projekt={projekt} theme={theme} onZmien={onZmien} /> : null}
            {aktywna === 'konstrukcje' ? (
              <View style={{ gap: 12 }}>
                <Zakladki
                  theme={theme}
                  aktywna={widokKonstrukcji}
                  onZmien={setWidokKonstrukcji}
                  zakladki={[['odcinki', 'Odcinki'], ['szczegoly', `Szczegóły · ${projekt.szczegoly?.length ?? 0}`]]}
                />
                {widokKonstrukcji === 'odcinki'
                  ? (
                    <SekcjaKonstrukcje
                      projekt={projekt}
                      theme={theme}
                      onZmien={onZmien}
                      onPokazObszar={(cel) => {
                        setCelObszaru({ ...cel, token: Date.now() });
                        setAktywna('pzt');
                      }}
                    />
                  )
                  : <SekcjaSzczegolow budowaId={budowa.id} projekt={projekt} onZmien={onZmien} />}
              </View>
            ) : null}
            {aktywna === 'przedmiar' ? (
              <SekcjaPrzedmiar projekt={projekt} theme={theme} kodBudowy={budowa.kodBudowy} onZmien={onZmien} />
            ) : null}
            {aktywna === 'liniowka' ? (
              <SekcjaLiniowka
                projekt={projekt}
                budowaId={budowa.id}
                theme={theme}
                onZmien={onZmien}
                blokadaPodgladu={blokadaPodgladu}
                onBlokadaPodgladu={setBlokadaPodgladu}
                onDotykZmiana={setMapaAktywna}
                onSkupienie={naSkupienie}
              />
            ) : null}
            {aktywna === 'zaawansowanie' ? (
              <SekcjaZaawansowanie
                projekt={projekt}
                raporty={raportyBudowy.filter((r) => r.budowaId === budowa.id)}
                theme={theme}
              />
            ) : null}
          </Sekcja>
        )}
      </ScrollView>
    </View>
  );
}

function RzadPrzyciskow({
  pozycje,
  aktywna,
  theme,
  onPress,
}: {
  pozycje: readonly { id: string; nazwa: string }[];
  aktywna: string;
  theme: AppTheme;
  onPress: (id: string) => void;
}) {
  return (
    <View style={styles.rzad}>
      {pozycje.map((p) => {
        const on = aktywna === p.id;
        return (
          <Naciskany
            key={p.id}
            onPress={() => onPress(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`Zakładka ${p.nazwa}`}
            style={[
              styles.guzik,
              {
                backgroundColor: on ? theme.colors.primary : theme.colors.card,
                borderColor: on ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text style={{ color: on ? '#1A1A1A' : theme.colors.text, fontWeight: '800', textAlign: 'center' }}>
              {p.nazwa}
            </Text>
          </Naciskany>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menu: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    gap: 6,
    zIndex: 10,
  },
  grupa: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  zwiniete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rzad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  guzik: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
