// ============================================================
// EKRAN: WBUDOWYWANIE – listy budów z planami do realizacji
// ============================================================

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import { komentarzPlanuBudowy, tytulPlanuBudowy } from '../../src/utils/planZBudowy';
import type { Plan, Budowa } from '../../src/types';

export default function WbudowywanieScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany, usunPlan } = usePlanyStore();
  const { budowy } = useBudowyStore();
  const { wpisyDlaPlanu, wyczyścWpisyPlanu } = useLiveStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const budowyAktywne = budowy.filter((b) => b.status !== 'archiwalna');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });

  const grupy = useMemo(() => {
    const posortowane = [...aktywne].sort(
      (a, b) => new Date(a.dataWbudowywania).getTime() - new Date(b.dataWbudowywania).getTime(),
    );
    const mapa = new Map<string, Plan[]>();
    for (const b of budowyAktywne) mapa.set(b.id, []);
    const bezBudowy: Plan[] = [];
    for (const p of posortowane) {
      if (p.budowaId && mapa.has(p.budowaId)) mapa.get(p.budowaId)!.push(p);
      else bezBudowy.push(p);
    }
    const zBudowa = budowyAktywne
      .map((b) => ({
        budowa: b as Budowa | undefined,
        tytul: `${b.kodBudowy} – ${b.nazwaInwestycji}`,
        elementy: mapa.get(b.id) ?? [],
        bezPrzypisania: false,
      }))
      .filter((g) => g.elementy.length > 0);
    return {
      zBudowa,
      bezBudowy: bezBudowy.length
        ? [{ tytul: 'Plany bez budowy', elementy: bezBudowy, bezPrzypisania: true, budowa: undefined as Budowa | undefined }]
        : [],
    };
  }, [aktywne, budowyAktywne]);

  const edytujPlan = (plan: Plan) => {
    if (plan.zrodlo === 'obmiar' && plan.sesjaObmiaruId) {
      router.push(`/obmiar/${plan.sesjaObmiaruId}` as any);
      return;
    }
    router.push(`/plan/edytuj/${plan.id}` as any);
  };

  const potwierdzUsuniecie = (plan: Plan) => Alert.alert(
    'Usuń plan',
    `Usunąć plan z ${formatujDate(plan.dataWbudowywania)}? Wpisane auta LIVE też znikną.`,
    [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await wyczyścWpisyPlanu(plan.id);
          await usunPlan(plan.id);
        },
      },
    ],
  );

  const renderujPlan = (item: Plan) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);
    const tytul = item.zrodlo === 'budowa' ? tytulPlanuBudowy(item) : formatujDate(item.dataWbudowywania);
    const komentarz = item.zrodlo === 'budowa'
      ? komentarzPlanuBudowy(item)
      : `${item.zrodlo === 'obmiar' ? 'Obmiar PZT' : 'Zaplanuj masę'} · ${item.dzialki.length} ${item.dzialki.length === 1 ? 'działka' : 'działki'}`;
    return (
      <View
        key={item.id}
        style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <TouchableOpacity onPress={() => router.push(`/wbudowywanie/${item.id}` as any)}>
          <View style={styles.kartaNaglowek}>
            <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
              {tytul}
            </Text>
            <View style={[styles.znaczek, { backgroundColor: `${theme.colors.success}20` }]}>
              <Text style={{ color: theme.colors.success, fontSize: 11, fontWeight: '700' }}>● Aktywny</Text>
            </View>
          </View>
          {!!komentarz && (
            <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {komentarz}
            </Text>
          )}
          {wpisy.length > 0 && (
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
              {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.akcjePlanu}>
          <TouchableOpacity onPress={() => edytujPlan(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: theme.colors.info, fontWeight: '700', fontSize: 13 }}>Edytuj</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => potwierdzUsuniecie(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 13 }}>Usuń</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const puste = grupy.zBudowa.length === 0 && grupy.bezBudowy.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Wbudowywanie"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />

      {puste ? (
        <EmptyState
          ikona="🛣️"
          tytul="Brak aktywnych planów"
          opis="Zapisz plan dnia z Obmiaru PZT albo utwórz plan w Zaplanuj masę. Pojawią się tutaj, pogrupowane po budowach."
          przyciskTekst="Przejdź do planowania"
          onPrzycisk={() => router.push('/plan')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {[...grupy.zBudowa, ...grupy.bezBudowy].map((grupa) => (
            <CollapsibleSection
              key={grupa.tytul}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏗️"
              plaski={grupa.bezPrzypisania}
              domyslnieRozwinieta
            >
              {grupa.elementy.map(renderujPlan)}
            </CollapsibleSection>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  znaczek: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  akcjePlanu: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
});
