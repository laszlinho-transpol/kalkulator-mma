import React from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PozycjaListy } from '../../../src/components/ui/Karta';

const KALKULATORY = [
  { tytul: 'Wydajność powierzchniowa', opis: 'Metry z tony', sciezka: '/niezbednik/masa/wydajnosc-powierzchniowa' },
  { tytul: 'Wydajność grubościowa', opis: 'Średnia grubość', sciezka: '/niezbednik/masa/wydajnosc-grubosciowa' },
  { tytul: 'Ustawianie wskaźnika rozkładarki', opis: 'Stół, poszerzenia i wymiary', sciezka: '/niezbednik/masa/wskaznik-rozkladarki' },
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
          <PozycjaListy key={k.sciezka} tytul={k.tytul} podtytul={k.opis} onPress={() => router.push(k.sciezka as never)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
