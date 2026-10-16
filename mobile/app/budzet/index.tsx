import React from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { wstecz } from '../../src/budzet/nawigacja';
import { KafelekMenu } from '../../src/components/ui/KafelekMenu';

const KAFELKI = [
  { tytul: 'Sprzęt', podtytul: 'Maszyny i raporty', ikona: '🚜', sciezka: '/budzet/sprzet', kolor: '#B45309' },
  { tytul: 'Pracownicy', podtytul: 'Osoby do raportów', ikona: '👷', sciezka: '/budzet/pracownicy', kolor: '#2E86AB' },
  { tytul: 'Firmy', podtytul: 'Z kart sprzętu', ikona: '🏢', sciezka: '/budzet/firmy', kolor: '#0D9488' },
  { tytul: 'Grupa bitumiczna', podtytul: 'W kolejnym kroku', ikona: '🛣️', sciezka: '/budzet/grupa-bitumiczna', kolor: '#8B5CF6' },
];

export default function BudzetScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Budżet"
        podtytul="Sprzęt, ludzie i firmy"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/') }}
      />
      <ScrollView contentContainerStyle={[styles.siatka, { paddingBottom: insets.bottom + 24 }]}>
        {KAFELKI.map((k, i) => (
          <KafelekMenu
            key={k.tytul}
            tytul={k.tytul}
            podtytul={k.podtytul}
            ikona={k.ikona}
            kolor={k.kolor}
            opoznienie={i * 70}
            onPress={() => router.push(k.sciezka as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  siatka: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 12 },
});
