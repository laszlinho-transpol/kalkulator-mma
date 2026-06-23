// ============================================================
// EKRAN: ZAPLANUJ MASĘ – plany pogrupowane po budowach (zwijane)
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { grupujPoKluczu } from '../../src/utils/grouping';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import type { Plan } from '../../src/types';

export default function PlanListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany, usunPlan } = usePlanyStore();
  const { budowy, dodajBudowe } = useBudowyStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');

  const [modalBudowa, setModalBudowa] = useState(false);
  const [nazwaInv, setNazwaInv] = useState('');
  const [kodBudowy, setKodBudowy] = useState('');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  const grupyPlanow = useMemo(() => {
    const posortowane = [...aktywne].sort(
      (a, b) => new Date(a.dataWbudowywania).getTime() - new Date(b.dataWbudowywania).getTime(),
    );
    const zKluczem = posortowane.map((p) => {
      const b = p.budowaId ? budowy.find((x) => x.id === p.budowaId) : undefined;
      const klucz = b ? `${b.kodBudowy} – ${b.nazwaInwestycji}` : undefined;
      return { plan: p, kluczGrupy: klucz };
    });
    const grupy = grupujPoKluczu(zKluczem, (x) => x.kluczGrupy, 'Plany bez budowy');
    return grupy.map((g) => ({
      ...g,
      elementy: g.elementy.map((x) => x.plan).sort(
        (a, b) => new Date(a.dataWbudowywania).getTime() - new Date(b.dataWbudowywania).getTime(),
      ),
    }));
  }, [aktywne, budowy]);

  const potwierdźUsunięcie = (plan: Plan) => Alert.alert('Usuń plan', `Usunąć plan z ${formatujDate(plan.dataWbudowywania)}?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunPlan(plan.id) },
  ]);

  const zapiszBudowe = async () => {
    if (!nazwaInv.trim()) { Alert.alert('Błąd', 'Podaj nazwę inwestycji.'); return; }
    if (!kodBudowy.trim()) { Alert.alert('Błąd', 'Podaj kod budowy.'); return; }
    await dodajBudowe({ nazwaInwestycji: nazwaInv.trim(), kodBudowy: kodBudowy.trim().toUpperCase() });
    setNazwaInv(''); setKodBudowy(''); setModalBudowa(false);
    Alert.alert('Gotowe', 'Budowa została dodana.');
  };

  const renderujPlan = (item: Plan) => (
    <TouchableOpacity
      key={item.id}
      style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/plan/${item.id}` as any)}
    >
      <View style={styles.kartaNaglowek}>
        <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
          {formatujDate(item.dataWbudowywania)}
        </Text>
        <TouchableOpacity onPress={() => potwierdźUsunięcie(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.usunTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
      </View>
      <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'} • Tonaż: {item.tonazAuta} t
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Zaplanuj Masę"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '+ Budowa', onPress: () => setModalBudowa(true), kolor: theme.colors.secondary },
          { tekst: '↓ Import', onPress: () => router.push('/plan/import' as any), kolor: theme.colors.info },
          { tekst: '+ Plan', onPress: () => router.push('/plan/nowy' as any), kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {aktywne.length === 0 ? (
        <EmptyState
          ikona="📋"
          tytul="Brak aktywnych planów"
          opis="Dodaj budowę i utwórz plan wbudowywania lub zaimportuj z JSON."
          przyciskTekst="+ Utwórz nowy plan"
          onPrzycisk={() => router.push('/plan/nowy' as any)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {grupyPlanow.map((grupa) => (
            <CollapsibleSection
              key={grupa.klucz}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏗️"
              plaski={grupa.bezPrzypisania}
            >
              {grupa.elementy.map(renderujPlan)}
            </CollapsibleSection>
          ))}
        </ScrollView>
      )}

      <SafeModal
        visible={modalBudowa}
        tytul="Dodaj budowę"
        theme={theme}
        onClose={() => setModalBudowa(false)}
        prawy={{ tekst: 'Zapisz', onPress: zapiszBudowe, kolor: theme.colors.primary }}
      >
        <View style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Nazwa inwestycji</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
            value={nazwaInv}
            onChangeText={setNazwaInv}
            placeholder="np. DK25 Mąkowarsko"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Kod budowy</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
            value={kodBudowy}
            onChangeText={setKodBudowy}
            placeholder="np. B128"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
          />
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  usunTekst: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
