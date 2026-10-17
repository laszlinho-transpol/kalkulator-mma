// ============================================================
// BUDOWY – lista inwestycji + tworzenie szablonu projektu
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Pole, Wiersz } from '../../src/components/common/Formularz';
import { SafeModal } from '../../src/components/common/SafeModal';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { Karta, TYPOGRAFIA } from '../../src/components/ui';
import { pokazKomunikat, potwierdzAkcje } from '../../src/utils/dialog';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { pustyProjektBudowy } from '../../src/utils/projektBudowy';
import type { Budowa } from '../../src/types';

export default function BudowaListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { budowy, dodajBudowe, usunBudowe, przywrocBudowe } = useBudowyStore();
  const aktywne = budowy.filter((b) => b.status !== 'archiwalna');
  const archiwalne = budowy.filter((b) => b.status === 'archiwalna');

  const [modal, setModal] = useState(false);
  const [nazwa, setNazwa] = useState('');
  const [kod, setKod] = useState('');

  const utworz = async () => {
    if (!nazwa.trim()) { pokazKomunikat('Budowa', 'Podaj nazwę inwestycji.'); return; }
    if (!kod.trim()) { pokazKomunikat('Budowa', 'Podaj kod budowy (np. B128).'); return; }
    const id = await dodajBudowe({
      nazwaInwestycji: nazwa.trim(),
      kodBudowy: kod.trim().toUpperCase(),
      projekt: pustyProjektBudowy(),
    });
    setModal(false);
    setNazwa('');
    setKod('');
    router.push(`/budowa/${id}` as any);
  };

  const potwierdzUsun = (b: Budowa) => potwierdzAkcje(
    'Usuń budowę',
    `Usunąć „${b.kodBudowy} – ${b.nazwaInwestycji}”?`,
    () => { void usunBudowe(b.id); },
  );

  const kartaBudowy = (b: Budowa) => {
    const ark = b.projekt?.arkusze.length ?? 0;
    const archiwum = b.status === 'archiwalna';
    return (
      <Karta
        key={b.id}
        tytul={b.kodBudowy}
        podtytul={b.nazwaInwestycji}
        znaczek={archiwum ? { tekst: 'Archiwum', kolor: theme.colors.textSecondary } : undefined}
        podsumowanie={`Arkusze PZT: ${ark}`}
        accessibilityLabel={`Budowa ${b.kodBudowy}`}
        onPress={() => router.push(`/budowa/${b.id}` as never)}
        akcje={[
          archiwum
            ? { tekst: 'Przywróć', rodzaj: 'glowna', onPress: () => { void przywrocBudowe(b.id); } }
            : { tekst: 'Otwórz', rodzaj: 'glowna', onPress: () => router.push(`/budowa/${b.id}` as never) },
          { tekst: 'Usuń', rodzaj: 'niebezpieczna', accessibilityLabel: `Usuń budowę ${b.kodBudowy}`, onPress: () => potwierdzUsun(b) },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Budowa"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: '+ Nowa', onPress: () => setModal(true), kolor: theme.colors.primary }}
      />
      {aktywne.length === 0 && archiwalne.length === 0 ? (
        <EmptyState
          ikona="🏗️"
          tytul="Brak budów"
          opis="Załóż budowę (nazwa + kod, np. B128). Powstanie szablon: PZT, legenda, konstrukcje, przedmiar."
          przyciskTekst="+ Nowa budowa"
          onPrzycisk={() => setModal(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}>
          {aktywne.map(kartaBudowy)}
          {archiwalne.length > 0 ? (
            <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, marginTop: 8 }]}>Archiwum · {archiwalne.length}</Text>
          ) : null}
          {archiwalne.map(kartaBudowy)}
        </ScrollView>
      )}

      <SafeModal
        visible={modal}
        tytul="Nowa budowa"
        theme={theme}
        onClose={() => setModal(false)}
        prawy={{ tekst: 'Utwórz', onPress: utworz, kolor: theme.colors.primary }}
      >
        <View style={{ padding: 16 }}>
          <Wiersz proporcje={[1, 2.4]}>
            <Pole etykieta="Kod" value={kod} onChangeText={(t) => setKod(t.toUpperCase())} placeholder="B128" accessibilityLabel="Kod budowy" />
            <Pole etykieta="Nazwa inwestycji" value={nazwa} onChangeText={setNazwa} placeholder="np. DK25 Mąkowarsko" accessibilityLabel="Nazwa inwestycji" />
          </Wiersz>
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: 10 },
});
