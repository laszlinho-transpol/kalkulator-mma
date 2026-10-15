import React from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { karta } from '../../../src/constants/layout';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useFirmyStore } from '../../../src/stores/firmyStore';

export default function FirmyScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const firmy = useFirmyStore((s) => s.firmy);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Firmy"
        podtytul="Baza z kart sprzętu"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={{ color: theme.colors.textSecondary, lineHeight: 20 }}>
          Firma dopisuje się tutaj, gdy zapiszesz ją przy sprzęcie. Ta sama nazwa wskazuje jedną firmę i podpowiada się na kolejnej karcie.
        </Text>
        {firmy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary }}>Brak firm.</Text>
        ) : firmy.map((firma) => (
          <View key={firma.id} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.nazwa, { color: theme.colors.text }]}>{firma.nazwa}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 16, gap: 10 },
  nazwa: { fontSize: 16, fontWeight: '700' },
});
