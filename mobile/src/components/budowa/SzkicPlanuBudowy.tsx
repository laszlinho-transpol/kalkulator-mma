import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { Plan, ProjektBudowy, TloArkuszaPzt, WpisLive } from '../../types';
import { arkuszeSzkicuPlanu } from '../../utils/planZBudowy';
import { PztArkuszPodglad } from './PztArkuszPodglad';

interface Props {
  projekt: ProjektBudowy;
  plan: Plan;
  theme: AppTheme;
  wpisy?: WpisLive[];
  wysokosc?: number;
  blokadaPodgladu?: boolean;
  onBlokadaPodgladu?: (v: boolean) => void;
  onDotykZmiana?: (aktywny: boolean) => void;
  onPressAuto?: (id: string) => void;
}

export function SzkicPlanuBudowy({
  projekt,
  plan,
  theme,
  wpisy = [],
  wysokosc = 320,
  blokadaPodgladu,
  onBlokadaPodgladu,
  onDotykZmiana,
  onPressAuto,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [tloPatch, setTloPatch] = useState<Record<string, Partial<TloArkuszaPzt>>>({});

  const arkusze = useMemo(() => arkuszeSzkicuPlanu(projekt, plan), [projekt, plan]);
  const bazowy = arkusze[Math.min(idx, Math.max(0, arkusze.length - 1))];
  const arkusz = bazowy
    ? { ...bazowy, tlo: bazowy.tlo ? { ...bazowy.tlo, ...tloPatch[bazowy.id] } : bazowy.tlo }
    : undefined;

  const od = plan.kilometrazOdM ?? 0;
  const doM = plan.kilometrazDoM ?? 0;
  const maleje = od > doM;
  const metryCum: { id: string; numer: number; stacjaM: number }[] = [];
  let acc = 0;
  for (const w of [...wpisy].sort((a, b) => a.numerAuta - b.numerAuta || a.createdAt.localeCompare(b.createdAt))) {
    acc += w.przejechaneMetry;
    metryCum.push({
      id: w.id,
      numer: w.numerAuta,
      stacjaM: maleje ? od - acc : od + acc,
    });
  }
  const stacjaRozkladarki = acc > 0 ? (maleje ? od - acc : od + acc) : od;

  if (!arkusz) {
    return (
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
        Brak wycinka PZT dla tego kilometraża. Sprawdź oś trasy i obszary w menu Budowa.
      </Text>
    );
  }

  return (
    <View>
      {arkusze.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {arkusze.map((a, i) => {
            const on = i === Math.min(idx, arkusze.length - 1);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setIdx(i)}
                style={[styl.tab, {
                  borderColor: on ? theme.colors.primary : theme.colors.border,
                  backgroundColor: on ? `${theme.colors.primary}15` : theme.colors.inputBackground,
                }]}
              >
                <Text style={{ color: on ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                  {a.nazwa}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <PztArkuszPodglad
        arkusz={arkusz}
        theme={theme}
        wysokosc={wysokosc}
        blokadaPodgladu={blokadaPodgladu}
        onBlokadaPodgladu={onBlokadaPodgladu}
        onDotykZmiana={onDotykZmiana}
        liveStacjaM={stacjaRozkladarki}
        liveAuta={metryCum}
        onPressAuto={onPressAuto}
        onTloZmiana={(patch) => setTloPatch((p) => ({ ...p, [arkusz.id]: { ...p[arkusz.id], ...patch } }))}
      />
    </View>
  );
}

const styl = StyleSheet.create({
  tab: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
});
