import React from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PozycjaListy } from '../../../src/components/ui/Karta';

const KALKULATORY = [
  { tytul: 'Szkic geodezyjny – rzut z góry', sciezka: '/niezbednik/geodezja/szkice' },
  { tytul: 'Przekrój poprzeczny', sciezka: '/niezbednik/geodezja/przekroje' },
  { tytul: 'Kalkulator spadków', sciezka: '/niezbednik/geodezja/spadki' },
  { tytul: 'Tyczenie łuków', sciezka: '/niezbednik/geodezja/luki' },
  { tytul: 'Tyczenie kąta prostego', sciezka: '/niezbednik/geodezja/kat-prosty' },
];

export default function GeodezjaScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Geodezja i pomiary" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        {KALKULATORY.map((k) => (
          <PozycjaListy key={k.sciezka} tytul={k.tytul} onPress={() => router.push(k.sciezka as never)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
