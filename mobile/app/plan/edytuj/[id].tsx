// ============================================================
// EKRAN: EDYTUJ PLAN – PlanZBudowyForm albo klasyczny PlanForm
// ============================================================

import React from 'react';
import { Text, SafeAreaView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { usePlanyStore } from '../../../src/stores/planyStore';
import { useRouteId } from '../../../src/hooks/useRouteId';
import { usePlanPoId } from '../../../src/hooks/usePlanPoId';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { PlanForm } from '../../../src/components/plan/PlanForm';
import { PlanZBudowyForm } from '../../../src/components/plan/PlanZBudowyForm';
import type { Plan } from '../../../src/types';

export default function EdytujPlanScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const id = useRouteId();

  const plan = usePlanPoId(id);
  const { edytujPlan } = usePlanyStore();

  if (!id || !plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.danger, fontSize: 16 }}>Plan nie znaleziony.</Text>
      </SafeAreaView>
    );
  }

  const handleZapisz = async (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    await edytujPlan(id, { ...dane, status: plan.status });
    router.back();
  };

  if (plan.zrodlo === 'budowa' && plan.budowaId) {
    return (
      <PlanZBudowyForm
        tytul="Edytuj plan"
        budowaId={plan.budowaId}
        initialPlan={plan}
        onZapisz={handleZapisz}
      />
    );
  }

  return (
    <PlanForm
      tytul="Edytuj Plan"
      initialPlan={plan}
      onZapisz={handleZapisz}
    />
  );
}
