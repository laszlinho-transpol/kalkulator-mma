import React from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { InfoTooltip } from '../../../src/components/common/InfoTooltip';
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
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.naglowek}>
          <Text style={[styles.sekcja, { color: theme.colors.textSecondary }]}>Firmy w bazie · {firmy.length}</Text>
          <InfoTooltip tresc="Firma dopisuje się tutaj, gdy zapiszesz ją przy sprzęcie. Ta sama nazwa wskazuje jedną firmę i podpowiada się na kolejnej karcie." />
        </View>
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
  tresc: { padding: 14, gap: 8 },
  naglowek: { flexDirection: 'row', alignItems: 'center' },
  sekcja: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  nazwa: { fontSize: 16, fontWeight: '700' },
});
