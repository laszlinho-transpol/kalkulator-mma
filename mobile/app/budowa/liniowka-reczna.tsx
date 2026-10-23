// ============================================================
// EKRAN: LINIÓWKA – obszar dodany ręcznie (poza raportem)
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PlanZBudowyForm } from '../../src/components/plan/PlanZBudowyForm';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import type { Plan } from '../../src/types';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { zapiszWpisReczny } from '../../src/liniowka/liniowka';
import { pokazKomunikat } from '../../src/utils/dialog';
import { wstecz } from '../../src/budzet/nawigacja';

export default function LiniowkaRecznaScreen() {
  const { budowaId, wpisId } = useLocalSearchParams<{ budowaId?: string; wpisId?: string }>();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === budowaId));
  const zapiszProjekt = useBudowyStore((s) => s.zapiszProjekt);
  const wpis = budowa?.projekt?.liniowka?.reczne?.find((w) => w.id === wpisId);

  const planPoczatkowy = useMemo<Plan | undefined>(() => (wpis ? {
    id: wpis.id,
    dataWbudowywania: `${wpis.data}T12:00:00`,
    budowaId,
    iloscDzialek: wpis.zakladki.length,
    dzialki: [],
    tonazAuta: 25.5,
    rzuty: [],
    status: 'aktywny',
    zrodlo: 'budowa',
    zakladkiBudowy: wpis.zakladki,
    createdAt: wpis.createdAt,
    updatedAt: wpis.updatedAt,
  } : undefined), [wpis, budowaId]);

  if (!budowa?.projekt || !budowaId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader tytul="Dodaj ręcznie" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 24 }}>Nie znaleziono budowy.</Text>
      </View>
    );
  }

  return (
    <PlanZBudowyForm
      tytul={wpis ? 'Edytuj obszar ręczny' : 'Dodaj ręcznie'}
      budowaId={budowaId}
      initialPlan={planPoczatkowy}
      reczny={{
        komentarz: wpis?.komentarz,
        onZapisz: async (dane) => {
          const projekt = useBudowyStore.getState().budowy.find((b) => b.id === budowaId)?.projekt;
          if (!projekt) return;
          const teraz = new Date().toISOString();
          try {
            await zapiszProjekt(budowaId, zapiszWpisReczny(projekt, {
              id: wpis?.id ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
              data: dane.data,
              zakladki: dane.zakladki,
              powierzchnieM2: dane.powierzchnieM2,
              komentarz: dane.komentarz || undefined,
              createdAt: wpis?.createdAt ?? teraz,
              updatedAt: teraz,
            }));
            wstecz(`/budowa/${budowaId}?zakladka=liniowka`);
          } catch {
            pokazKomunikat('Błąd', 'Nie udało się zapisać obszaru. Spróbuj ponownie.');
          }
        },
      }}
    />
  );
}
