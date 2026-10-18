// ============================================================
// EKRAN: WBUDOWYWANIE – listy budów z planami do realizacji
// ============================================================

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Karta, ODSTEP, TYPOGRAFIA } from '../../src/components/ui';
import { komentarzPlanuBudowy, tytulPlanuBudowy } from '../../src/utils/planZBudowy';
import { potwierdzAkcje } from '../../src/utils/dialog';
import type { Plan, Budowa } from '../../src/types';
import { budowaWToku } from '../../src/utils/statusBudowy';

export default function WbudowywanieScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany, usunPlan } = usePlanyStore();
  const { budowy } = useBudowyStore();
  const { wpisyDlaPlanu, wyczyścWpisyPlanu } = useLiveStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const budowyAktywne = budowy.filter((b) => budowaWToku(b));

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

  const potwierdzUsuniecie = (plan: Plan) => potwierdzAkcje(
    'Usuń plan',
    `Usunąć plan z ${formatujDate(plan.dataWbudowywania)}? Wpisane auta LIVE też znikną.`,
    () => {
      void (async () => {
        await wyczyścWpisyPlanu(plan.id);
        await usunPlan(plan.id);
      })();
    },
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
      <Karta
        key={item.id}
        tytul={tytul}
        podtytul={komentarz || undefined}
        znaczek={{ tekst: '● Aktywny', kolor: theme.colors.success }}
        podsumowanie={wpisy.length > 0 ? `${wpisy.length} aut • ${sumaTon.toFixed(1)} Mg • ${sumaMetrow.toFixed(0)} m` : undefined}
        onPress={() => router.push(`/wbudowywanie/${item.id}` as never)}
        akcje={[
          { tekst: 'Edytuj', onPress: () => edytujPlan(item), accessibilityLabel: `Edytuj plan ${tytul}` },
          { tekst: 'Usuń', rodzaj: 'niebezpieczna', onPress: () => potwierdzUsuniecie(item), accessibilityLabel: `Usuń plan ${tytul}` },
        ]}
      />
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
            <View key={grupa.tytul} style={styles.grupa}>
              <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {grupa.bezPrzypisania ? '' : '🏗️ '}{grupa.tytul} · {grupa.elementy.length}
              </Text>
              {grupa.elementy.map(renderujPlan)}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: ODSTEP.l },
  grupa: { gap: ODSTEP.s + 2 },
});
