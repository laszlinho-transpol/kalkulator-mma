// ============================================================
// EKRAN: ARCHIWUM – zakończone roboty i raporty WZ po budowach
// ============================================================

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { KalendarzZakresu } from '../../src/components/common/KalendarzZakresu';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import { formatLiczby } from '../../src/utils/calculations';
import { formatujKmM } from '../../src/utils/projektBudowy';
import { dzienWZakresie, dzienZIso, dzisIso } from '../../src/utils/zakresDat';
import type { Plan, SesjaObmiaruDnia } from '../../src/types';

type PozycjaArchiwum =
  | { rodzaj: 'plan'; id: string; dataSort: number; budowaId?: string; plan: Plan }
  | { rodzaj: 'obmiar'; id: string; dataSort: number; budowaId?: string; sesja: SesjaObmiaruDnia };

export default function ArchiwumScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany } = usePlanyStore();
  const { budowy } = useBudowyStore();
  const { wpisyDlaPlanu } = useLiveStore();
  const sesjeObmiaru = useObmiarStore((s) => s.sesje);
  const dzisiaj = dzisIso();
  const [zakresOd, setZakresOd] = useState(dzisiaj);
  const [zakresDo, setZakresDo] = useState(dzisiaj);
  const archiwalne = plany.filter((p) => p.status === 'archiwalny');
  const obmiarArchiwum = sesjeObmiaru.filter((s) => s.status === 'archiwalna');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const wszystkie = useMemo<PozycjaArchiwum[]>(() => {
    const zPlanow: PozycjaArchiwum[] = archiwalne.map((p) => ({
      rodzaj: 'plan',
      id: p.id,
      dataSort: new Date(p.dataWbudowywania).getTime(),
      budowaId: p.budowaId,
      plan: p,
    }));
    const zObmiaru: PozycjaArchiwum[] = obmiarArchiwum.map((s) => ({
      rodzaj: 'obmiar',
      id: s.id,
      dataSort: new Date(s.zakonczonoAt ?? s.updatedAt ?? s.data).getTime(),
      budowaId: s.budowaId,
      sesja: s,
    }));
    return [...zPlanow, ...zObmiaru].sort((a, b) => a.dataSort - b.dataSort);
  }, [archiwalne, obmiarArchiwum]);

  const pozycje = useMemo(() => wszystkie.filter((p) => {
    const iso = p.rodzaj === 'plan'
      ? p.plan.dataWbudowywania
      : (p.sesja.zakonczonoAt ?? p.sesja.updatedAt ?? p.sesja.data);
    return dzienWZakresie(dzienZIso(iso), zakresOd, zakresDo);
  }), [wszystkie, zakresOd, zakresDo]);

  const nazwaBudowy = (budowaId?: string) => {
    const b = budowaId ? budowy.find((x) => x.id === budowaId) : undefined;
    return b ? `${b.kodBudowy} – ${b.nazwaInwestycji}` : 'Archiwum bez budowy';
  };

  const renderujPlan = (item: Plan) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);

    return (
      <TouchableOpacity
        key={`plan-${item.id}`}
        style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/archiwum/${item.id}` as any)}
      >
        <View style={styles.kartaNaglowek}>
          <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
            {formatujDate(item.dataWbudowywania)}
          </Text>
          <View style={[styles.znaczekZakonczone, { backgroundColor: `${theme.colors.textSecondary}20` }]}>
            <Text style={[styles.znaczekTekst, { color: theme.colors.textSecondary }]}>✓ Plan</Text>
          </View>
        </View>
        {wpisy.length > 0 && (
          <Text style={[styles.kartaSuma, { color: theme.colors.primary }]}>
            {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
          </Text>
        )}
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {nazwaBudowy(item.budowaId)}
        </Text>
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={3}>
          {opisPlanu(item)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderujObmiar = (sesja: SesjaObmiaruDnia) => {
    const wpisy = sesja.obszary.flatMap((o) => o.wpisyWz ?? []);
    const sumaTon = wpisy.reduce((s, w) => s + w.tony, 0);
    const sumaPow = sesja.obszary.reduce((a, o) => a + o.powierzchniaM2, 0);
    return (
      <TouchableOpacity
        key={`obmiar-${sesja.id}`}
        style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/archiwum/obmiar/${sesja.id}` as any)}
      >
        <View style={styles.kartaNaglowek}>
          <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
            {sesja.nazwa}
          </Text>
          <View style={[styles.znaczekZakonczone, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Text style={[styles.znaczekTekst, { color: theme.colors.primary }]}>Obmiar PZT</Text>
          </View>
        </View>
        <Text style={[styles.kartaSuma, { color: theme.colors.primary }]}>
          {wpisy.length} aut • {formatLiczby(sumaTon, 1)} Mg • {formatLiczby(sumaPow)} m²
        </Text>
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {nazwaBudowy(sesja.budowaId)} • {formatujDate(sesja.data)} • {sesja.obszary.length} obszar(ów)
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Archiwum" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />

      <View style={styles.szukajWrap}>
        <KalendarzZakresu
          od={zakresOd}
          doDnia={zakresDo}
          theme={theme}
          onZatwierdz={(od, doDnia) => { setZakresOd(od); setZakresDo(doDnia); }}
        />
      </View>

      {wszystkie.length === 0 ? (
        <EmptyState
          ikona="📁"
          tytul="Archiwum jest puste"
          opis="Po „Zakończ” w planie dnia dniówka trafi tutaj. Stąd otworzysz plan i wyślesz PDF mailem."
        />
      ) : pozycje.length === 0 ? (
        <EmptyState
          ikona="📅"
          tytul="Brak raportów w wybranym okresie"
          opis={zakresOd === zakresDo ? 'W tym dniu nie ma zakończonych dniówek.' : 'W tym zakresie dat nie ma zakończonych dniówek.'}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {pozycje.map((el) => (el.rodzaj === 'plan' ? renderujPlan(el.plan) : renderujObmiar(el.sesja)))}
        </ScrollView>
      )}
    </View>
  );
}

function opisPlanu(plan: Plan): string {
  const czesci: string[] = [];
  if (plan.warstwaNazwa) czesci.push(plan.warstwaNazwa);
  if (plan.obszarNazwa) czesci.push(plan.obszarNazwa);
  if (plan.kilometrazOdM != null && plan.kilometrazDoM != null) {
    czesci.push(`${formatujKmM(plan.kilometrazOdM)} – ${formatujKmM(plan.kilometrazDoM)}`);
  }
  const n = plan.dzialki.length;
  czesci.push(`${n} ${n === 1 ? 'działka' : 'działki'}`);
  czesci.push('Podgląd i PDF na maila');
  return czesci.join(' · ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  szukajWrap: { paddingHorizontal: 14, paddingTop: 12 },
  lista: { padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  znaczekZakonczone: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  znaczekTekst: { fontSize: 11, fontWeight: '600' },
  kartaSuma: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
});
