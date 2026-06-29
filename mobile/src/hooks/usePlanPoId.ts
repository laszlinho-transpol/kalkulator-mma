import { useMemo } from 'react';
import { usePlanyStore } from '../stores/planyStore';
import type { Plan } from '../types';

export function usePlanPoId(planId: string | undefined): Plan | undefined {
  const plany = usePlanyStore((s) => s.plany);
  return useMemo(
    () => (planId ? plany.find((p) => p.id === planId) : undefined),
    [plany, planId],
  );
}
