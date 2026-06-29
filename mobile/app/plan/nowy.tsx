// ============================================================
// EKRAN: NOWY PLAN – cienki wrapper nad PlanForm
// ============================================================

import React from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { PlanForm } from '../../src/components/plan/PlanForm';
import type { Plan } from '../../src/types';

export default function NowyPlanScreen() {
  const { budowaId } = useLocalSearchParams<{ budowaId?: string }>();
  const { dodajPlan } = usePlanyStore();

  const handleZapisz = async (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const planId = await dodajPlan(dane);
      // replace zamiast push – unika podwójnego PlanForm na stosie nawigacji
      router.replace(`/plan/${planId}` as any);
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać planu. Spróbuj ponownie.');
    }
  };

  const initialPlan = budowaId ? ({ budowaId } as Plan) : undefined;

  return <PlanForm tytul="Nowy Plan" initialPlan={initialPlan} onZapisz={handleZapisz} />;
}
