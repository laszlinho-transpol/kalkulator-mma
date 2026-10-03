// ============================================================
// BUDOWY – lista inwestycji + tworzenie szablonu projektu
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { SafeModal } from '../../src/components/common/SafeModal';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
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
    if (!nazwa.trim()) { Alert.alert('Budowa', 'Podaj nazwę inwestycji.'); return; }
    if (!kod.trim()) { Alert.alert('Budowa', 'Podaj kod budowy (np. B128).'); return; }
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

  const potwierdzUsun = (b: Budowa) => Alert.alert(
    'Usuń budowę',
    `Usunąć „${b.kodBudowy} – ${b.nazwaInwestycji}”?`,
    [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => usunBudowe(b.id) },
    ],
  );

  const kartaBudowy = (b: Budowa) => {
    const ark = b.projekt?.arkusze.length ?? 0;
    return (
      <TouchableOpacity
        key={b.id}
        style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/budowa/${b.id}` as any)}
        onLongPress={() => potwierdzUsun(b)}
      >
        <Text style={[tekstTytul, { color: theme.colors.text }]}>{b.kodBudowy}</Text>
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {b.nazwaInwestycji}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
          {ark} arkusz(y) PZT
          {b.status === 'archiwalna' ? ' · archiwum' : ''}
        </Text>
      </TouchableOpacity>
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
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '800', marginTop: 8 }}>ARCHIWUM</Text>
          ) : null}
          {archiwalne.map((b) => (
            <View key={b.id} style={{ gap: 6 }}>
              {kartaBudowy(b)}
              <TouchableOpacity onPress={() => przywrocBudowe(b.id)}>
                <Text style={{ color: theme.colors.info, fontWeight: '700' }}>Przywróć</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <SafeModal
        visible={modal}
        tytul="Nowa budowa"
        theme={theme}
        onClose={() => setModal(false)}
        prawy={{ tekst: 'Utwórz', onPress: utworz, kolor: theme.colors.primary }}
      >
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary }}>Nazwa inwestycji</Text>
          <TextInput
            value={nazwa}
            onChangeText={setNazwa}
            placeholder="np. DK25 Mąkowarsko"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />
          <Text style={{ color: theme.colors.textSecondary }}>Kod budowy</Text>
          <TextInput
            value={kod}
            onChangeText={setKod}
            autoCapitalize="characters"
            placeholder="np. B128"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
});
