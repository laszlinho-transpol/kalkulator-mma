// ============================================================
// EKRAN: ARCHIWUM – zakończone roboty i raporty WZ po budowach
// ============================================================

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
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
import { Karta } from '../../src/components/ui';
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
      <Karta
        key={`plan-${item.id}`}
        tytul={formatujDate(item.dataWbudowywania)}
        znaczek={{ tekst: '✓ Plan', kolor: theme.colors.textSecondary }}
        podsumowanie={wpisy.length > 0 ? `${wpisy.length} aut • ${sumaTon.toFixed(1)} Mg • ${sumaMetrow.toFixed(0)} m` : undefined}
        podtytul={`${nazwaBudowy(item.budowaId)}\n${opisPlanu(item)}`}
        onPress={() => router.push(`/archiwum/${item.id}` as never)}
      />
    );
  };

  const renderujObmiar = (sesja: SesjaObmiaruDnia) => {
    const wpisy = sesja.obszary.flatMap((o) => o.wpisyWz ?? []);
    const sumaTon = wpisy.reduce((s, w) => s + w.tony, 0);
    const sumaPow = sesja.obszary.reduce((a, o) => a + o.powierzchniaM2, 0);
    return (
      <Karta
        key={`obmiar-${sesja.id}`}
        tytul={sesja.nazwa}
        znaczek={{ tekst: 'Obmiar PZT', kolor: theme.colors.primary }}
        podsumowanie={`${wpisy.length} aut • ${formatLiczby(sumaTon, 1)} Mg • ${formatLiczby(sumaPow)} m²`}
        podtytul={`${nazwaBudowy(sesja.budowaId)} • ${formatujDate(sesja.data)} • ${sesja.obszary.length} obszar(ów)`}
        onPress={() => router.push(`/archiwum/obmiar/${sesja.id}` as never)}
      />
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
  return czesci.join(' · ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  szukajWrap: { paddingHorizontal: 14, paddingTop: 12 },
  lista: { padding: 14, gap: 10 },
});
