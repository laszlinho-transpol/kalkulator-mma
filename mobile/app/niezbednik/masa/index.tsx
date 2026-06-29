import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';

const KALKULATORY = [
  { tytul: 'Wydajność powierzchniowa', opis: 'Metry z tony', sciezka: '/niezbednik/masa/wydajnosc-powierzchniowa' },
  { tytul: 'Wydajność grubościowa', opis: 'Średnia grubość', sciezka: '/niezbednik/masa/wydajnosc-grubosciowa' },
  { tytul: 'Ustawianie wskaźnika rozkładarki', opis: 'Wymiary asymetryczne', sciezka: '/niezbednik/masa/wskaznik-rozkladarki' },
];

export default function MasaISprzetScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Masa i sprzęt" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        {KALKULATORY.map((k) => (
          <TouchableOpacity key={k.sciezka} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => router.push(k.sciezka as any)}>
            <Text style={[styles.tytul, { color: theme.colors.text }]}>{k.tytul}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{k.opis}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  karta: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  tytul: { fontSize: 15, fontWeight: '700' },
});
