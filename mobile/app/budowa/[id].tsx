// ============================================================
// SZABLON BUDOWY – PROJEKT + WYKONANIE
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { SekcjaPzt } from '../../src/components/budowa/SekcjaPzt';
import { SekcjaLegenda } from '../../src/components/budowa/SekcjaLegenda';
import { SekcjaKonstrukcje } from '../../src/components/budowa/SekcjaKonstrukcje';
import { SekcjaPrzedmiar } from '../../src/components/budowa/SekcjaPrzedmiar';
import { pustyProjektBudowy, zsynchronizujLegendeProjektu } from '../../src/utils/projektBudowy';
import type { ProjektBudowy } from '../../src/types';

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

const KOLEJNOSC = [...PROJEKT, ...WYKONANIE].map((p) => p.id);

export default function BudowaSzablonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === id));
  const zapiszProjekt = useBudowyStore((s) => s.zapiszProjekt);
  const [mapaAktywna, setMapaAktywna] = useState(false);
  const [blokadaPodgladu, setBlokadaPodgladu] = useState(false);
  const [aktywna, setAktywna] = useState<string>('pzt');
  const scrollRef = useRef<ScrollView>(null);
  const pozycje = useRef<Record<string, number>>({});
  const przewija = useRef(false);

  useEffect(() => {
    if (budowa && !budowa.projekt) {
      void zapiszProjekt(budowa.id, pustyProjektBudowy());
    }
  }, [budowa, zapiszProjekt]);

  useEffect(() => {
    if (!budowa?.projekt) return;
    const next = zsynchronizujLegendeProjektu(budowa.projekt);
    if (next !== budowa.projekt) {
      void zapiszProjekt(budowa.id, next);
    }
  }, [budowa?.id, budowa?.projekt, zapiszProjekt]);

  const projekt: ProjektBudowy = useMemo(
    () => budowa?.projekt ?? pustyProjektBudowy(),
    [budowa?.projekt],
  );

  const idz = (sekcja: string) => {
    setAktywna(sekcja);
    przewija.current = true;
    const y = Math.max(0, (pozycje.current[sekcja] ?? 0) - 8);
    scrollRef.current?.scrollTo({ y, animated: true });
    setTimeout(() => { przewija.current = false; }, 450);
  };

  const zapamietaj = (sekcja: string, y: number) => {
    pozycje.current[sekcja] = y;
  };

  if (!budowa) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Budowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>Nie znaleziono budowy.</Text>
      </View>
    );
  }

  const onZmien = (p: ProjektBudowy) => {
    void zapiszProjekt(budowa.id, zsynchronizujLegendeProjektu(p));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={budowa.kodBudowy}
        podtytul={budowa.nazwaInwestycji}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />
      <View style={[styles.menu, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.grupa, { color: theme.colors.textSecondary }]}>Projekt</Text>
        <RzadPrzyciskow pozycje={PROJEKT} aktywna={aktywna} theme={theme} onPress={idz} />
        <Text style={[styles.grupa, { color: theme.colors.textSecondary }]}>Wykonanie</Text>
        <RzadPrzyciskow pozycje={WYKONANIE} aktywna={aktywna} theme={theme} onPress={idz} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={!blokadaPodgladu && !mapaAktywna}
        scrollEventThrottle={32}
        onScroll={(e) => {
          if (przewija.current) return;
          const y = e.nativeEvent.contentOffset.y + 28;
          let biezaca = KOLEJNOSC[0];
          for (const sekcja of KOLEJNOSC) {
            if ((pozycje.current[sekcja] ?? 0) <= y) biezaca = sekcja;
          }
          setAktywna((prev) => (prev === biezaca ? prev : biezaca));
        }}
      >
        <SekcjaEkranu idSekcji="pzt" tytul="PZT" theme={theme} onLayout={zapamietaj}>
          <SekcjaPzt
            projekt={projekt}
            theme={theme}
            onZmien={onZmien}
            blokadaPodgladu={blokadaPodgladu}
            onBlokadaPodgladu={setBlokadaPodgladu}
            onDotykZmiana={setMapaAktywna}
          />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="legenda" tytul="Legenda" theme={theme} onLayout={zapamietaj}>
          <SekcjaLegenda projekt={projekt} theme={theme} onZmien={onZmien} />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="konstrukcje" tytul="Konstrukcje" theme={theme} onLayout={zapamietaj}>
          <SekcjaKonstrukcje projekt={projekt} theme={theme} onZmien={onZmien} />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="przedmiar" tytul="Przedmiar" theme={theme} onLayout={zapamietaj}>
          <SekcjaPrzedmiar
            projekt={projekt}
            theme={theme}
            kodBudowy={budowa.kodBudowy}
            onZmien={onZmien}
          />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="raporty" tytul="Raporty" theme={theme} onLayout={zapamietaj}>
          <Placeholder />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="liniowka" tytul="Liniówka" theme={theme} onLayout={zapamietaj}>
          <Placeholder />
        </SekcjaEkranu>
        <SekcjaEkranu idSekcji="zaawansowanie" tytul="Zaawansowanie" theme={theme} onLayout={zapamietaj}>
          <Placeholder />
        </SekcjaEkranu>
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
          <TouchableOpacity
            key={p.id}
            onPress={() => onPress(p.id)}
            accessibilityLabel={p.nazwa}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SekcjaEkranu({
  idSekcji,
  tytul,
  theme,
  onLayout,
  children,
}: {
  idSekcji: string;
  tytul: string;
  theme: AppTheme;
  onLayout: (id: string, y: number) => void;
  children: React.ReactNode;
}) {
  return (
    <View
      onLayout={(e) => onLayout(idSekcji, e.nativeEvent.layout.y)}
      style={styles.sekcja}
    >
      <Text style={[styles.sekcjaTytul, { color: theme.colors.text }]}>{tytul}</Text>
      {children}
    </View>
  );
}

function Placeholder() {
  const colorScheme = useColorScheme();
  const t = colorScheme === 'dark' ? darkTheme : lightTheme;
  return (
    <View style={[styles.placeholder, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
      <Text style={{ color: t.colors.textSecondary, fontSize: 13 }}>W przygotowaniu.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menu: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 6,
    zIndex: 10,
  },
  grupa: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  rzad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  guzik: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sekcja: { marginBottom: 22 },
  sekcjaTytul: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  placeholder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
});
