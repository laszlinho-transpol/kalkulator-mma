// ============================================================
// EKRAN: NOWY PLAN – z projektu budowy
// ============================================================

import React from 'react';
import { Alert, View, Text, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { PlanZBudowyForm } from '../../src/components/plan/PlanZBudowyForm';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import type { Plan } from '../../src/types';

export default function NowyPlanScreen() {
  const { budowaId } = useLocalSearchParams<{ budowaId?: string }>();
  const { dodajPlan } = usePlanyStore();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const handleZapisz = async (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const planId = await dodajPlan(dane);
      router.replace(`/wbudowywanie/${planId}` as any);
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać planu. Spróbuj ponownie.');
    }
  };

  if (!budowaId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader tytul="Nowy plan" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 24 }}>
          Wybierz budowę z listy Zaplanuj masę. Nowe budowy tworzysz w menu Budowa.
        </Text>
      </View>
    );
  }

  return <PlanZBudowyForm tytul="Nowy plan" budowaId={budowaId} onZapisz={handleZapisz} />;
}
