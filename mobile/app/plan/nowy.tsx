// ============================================================
// EKRAN: NOWY PLAN – cienki wrapper nad PlanForm
// ============================================================

import React from 'react';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { PlanForm } from '../../src/components/plan/PlanForm';
import { kopiujZalacznikiDlaNowegoPlanu } from '../../src/utils/zalaczniki';
import type { Plan } from '../../src/types';

export default function NowyPlanScreen() {
  const { dodajPlan, edytujPlan } = usePlanyStore();

  const handleZapisz = async (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { zalaczniki, ...reszta } = dane;
    const planId = await dodajPlan(reszta);
    if (zalaczniki?.length) {
      const skopiowane = await kopiujZalacznikiDlaNowegoPlanu(zalaczniki, planId);
      if (skopiowane.length > 0) {
        await edytujPlan(planId, { zalaczniki: skopiowane });
      }
    }
    router.replace(`/plan/${planId}` as any);
  };

  return <PlanForm tytul="Nowy Plan" onZapisz={handleZapisz} />;
}
