import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { Gwiazdka } from '../../../src/components/budzet/Zakladki';
import { lightTheme, darkTheme, type AppTheme } from '../../../src/constants/theme';
import { formatLiczby } from '../../../src/utils/calculations';
import { wstecz } from '../../../src/budzet/nawigacja';
import { nazwaPracownika, sekcjePracownikow, type SekcjaPracownikow } from '../../../src/budzet/pracownicy';
import { useGrupyPracownikowStore } from '../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../src/stores/pracownicyStore';

export default function PracownicyScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
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
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}>
        {pracownicy.length === 0 && grupy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
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
    <View style={styles.grupa}>
      <View style={styles.grupaNaglowek}>
        <Text style={[styles.grupaTytul, { color: theme.colors.textSecondary }]}>
          {grupa?.nazwa ?? 'Bez grupy'} · {sekcja.pracownicy.length}
        </Text>
        {grupa ? (
          <Gwiazdka
            theme={theme}
            wlaczona={grupa.ulubiona}
            onPress={() => { void przelaczGrupe(grupa.id); }}
            accessibilityLabel={`${grupa.ulubiona ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} grupę ${grupa.nazwa}`}
          />
        ) : null}
      </View>
      {sekcja.pracownicy.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>Brak pracowników w grupie.</Text>
      ) : sekcja.pracownicy.map((p) => {
        const nazwa = nazwaPracownika(p);
        return (
          <TouchableOpacity
            key={p.id}
            accessibilityLabel={`Pracownik ${nazwa}`}
            onPress={() => router.push(`/budzet/pracownicy/${p.id}` as never)}
            style={[styles.przycisk, { backgroundColor: theme.colors.card, borderColor: p.ulubiony ? theme.colors.primary : theme.colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.nazwa, { color: theme.colors.text }]}>{nazwa}</Text>
              {p.stawki.stawka8h ? (
                <Text style={{ color: theme.colors.textSecondary, marginTop: 2 }}>Stawka 8h: {formatLiczby(p.stawki.stawka8h)} zł</Text>
              ) : null}
            </View>
            <Gwiazdka
              theme={theme}
              wlaczona={p.ulubiony}
              onPress={() => { void przelaczPracownika(p.id); }}
              accessibilityLabel={`${p.ulubiony ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} ${nazwa}`}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 16, gap: 18 },
  grupa: { gap: 8 },
  grupaNaglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grupaTytul: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 },
  kreska: { height: 2, borderRadius: 1 },
  przycisk: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nazwa: { fontSize: 16, fontWeight: '700' },
});
