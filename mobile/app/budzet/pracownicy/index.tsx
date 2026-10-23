import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Naciskany, ODSTEP, PROMIEN, Sekcja as SekcjaUi, TYPOGRAFIA, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { ZASADA_PRACOWNIKOW } from '../../../src/components/ZasadyDzialow';
import { Gwiazdka } from '../../../src/components/budzet/Zakladki';
import type { AppTheme } from '../../../src/constants/theme';
import { formatLiczby } from '../../../src/utils/calculations';
import { wstecz } from '../../../src/budzet/nawigacja';
import { nazwaPracownika, sekcjePracownikow, type SekcjaPracownikow } from '../../../src/budzet/pracownicy';
import { useGrupyPracownikowStore } from '../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../src/stores/pracownicyStore';

const ZASADA = 'budzet/pracownicy';

export default function PracownicyScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const pracownicy = usePracownicyStore((s) => s.pracownicy);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);
  const { ulubione, pozostale } = useMemo(() => sekcjePracownikow(pracownicy, grupy), [pracownicy, grupy]);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Pracownicy"
        podtytul={`${pracownicy.length} w bazie`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
        przyciski={[{ tekst: 'Dodaj nowy', onPress: () => router.push('/budzet/pracownicy/nowy' as never), tlo: theme.colors.primary, kolor: '#1A1A1A' }]}
        zasada={ZASADA}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}>
        <ZasadaDzialania klucz={ZASADA} slajdy={ZASADA_PRACOWNIKOW} />
        {pracownicy.length === 0 && grupy.length === 0 ? (
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
            Brak pracowników. Dodaj pierwszą osobę przyciskiem „Dodaj nowy”.
          </Text>
        ) : null}
        {ulubione.map((sekcja) => <Sekcja key={sekcja.grupa!.id} sekcja={sekcja} theme={theme} />)}
        {ulubione.length > 0 && pozostale.length > 0 ? (
          <View accessibilityLabel="Oddzielenie ulubionych grup" style={[styles.kreska, { backgroundColor: theme.colors.border }]} />
        ) : null}
        {pozostale.map((sekcja) => <Sekcja key={sekcja.grupa?.id ?? 'bez-grupy'} sekcja={sekcja} theme={theme} />)}
      </ScrollView>
    </View>
  );
}

function Sekcja({ sekcja, theme }: { sekcja: SekcjaPracownikow; theme: AppTheme }) {
  const przelaczGrupe = useGrupyPracownikowStore((s) => s.przelaczUlubiona);
  const przelaczPracownika = usePracownicyStore((s) => s.przelaczUlubiony);
  const { grupa } = sekcja;

  return (
    <SekcjaUi
      tytul={`${grupa?.nazwa ?? 'Bez grupy'} · ${sekcja.pracownicy.length}`}
      prawy={grupa ? (
        <Gwiazdka
          theme={theme}
          wlaczona={grupa.ulubiona}
          onPress={() => { void przelaczGrupe(grupa.id); }}
          accessibilityLabel={`${grupa.ulubiona ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} grupę ${grupa.nazwa}`}
        />
      ) : undefined}
    >
      {sekcja.pracownicy.length === 0 ? (
        <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Brak pracowników w grupie.</Text>
      ) : sekcja.pracownicy.map((p) => {
        const nazwa = nazwaPracownika(p);
        return (
          <Naciskany
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`Pracownik ${nazwa}`}
            onPress={() => router.push(`/budzet/pracownicy/${p.id}` as never)}
            style={[styles.pozycja, { backgroundColor: theme.colors.inputBackground, borderColor: p.ulubiony ? theme.colors.primary : theme.colors.border }]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]} numberOfLines={1}>{nazwa}</Text>
              {p.stawki.stawka8h ? (
                <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Stawka 8h: {formatLiczby(p.stawki.stawka8h)} zł</Text>
              ) : null}
            </View>
            <Gwiazdka
              theme={theme}
              wlaczona={p.ulubiony}
              onPress={() => { void przelaczPracownika(p.id); }}
              accessibilityLabel={`${p.ulubiony ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} ${nazwa}`}
            />
          </Naciskany>
        );
      })}
    </SekcjaUi>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 14, gap: 12 },
  kreska: { height: 2, borderRadius: 1 },
  pozycja: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, borderWidth: 1, borderRadius: PROMIEN.m, paddingHorizontal: ODSTEP.m + 2, paddingVertical: ODSTEP.m },
});
