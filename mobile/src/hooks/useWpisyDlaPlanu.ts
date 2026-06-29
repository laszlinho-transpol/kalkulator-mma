import { useMemo } from 'react';
import { useLiveStore } from '../stores/liveStore';
import type { WpisLive } from '../types';

/**
 * NIGDY nie używaj useLiveStore((s) => s.wpisyDlaPlanu(id)) –
 * filter() zwraca nową tablicę przy każdym wywołaniu i powoduje
 * „Maximum update depth exceeded”.
 */
export function useWpisyDlaPlanu(planId: string | undefined): WpisLive[] {
  const wpisy = useLiveStore((s) => s.wpisy);
  return useMemo(
    () => (planId ? wpisy.filter((w) => w.planId === planId) : []),
    [wpisy, planId],
  );
}
