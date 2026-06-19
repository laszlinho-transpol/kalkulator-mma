// ============================================================
// EKRAN: NOWY PLAN – cienki wrapper nad PlanForm
// ============================================================

import React from 'react';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { PlanForm } from '../../src/components/plan/PlanForm';
import type { Plan } from '../../src/types';

export default function NowyPlanScreen() {
  const { dodajPlan } = usePlanyStore();

  const handleZapisz = async (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const planId = await dodajPlan(dane);
    router.replace(`/plan/${planId}` as any);
  };

  return <PlanForm tytul="Nowy Plan" onZapisz={handleZapisz} />;
}
