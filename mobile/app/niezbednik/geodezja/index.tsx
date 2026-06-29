import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';

const KALKULATORY = [
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
          <TouchableOpacity key={k.sciezka} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => router.push(k.sciezka as any)}>
            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{k.tytul}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, karta: { borderWidth: 1, borderRadius: 12, padding: 14 } });
