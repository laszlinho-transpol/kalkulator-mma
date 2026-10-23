import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, KafelekMenu, useMotyw } from '../../../src/components/ui';
import { RysunekKafelkaMasy, type RodzajRysunkuMasy } from '../../../src/components/niezbednik/RysunkiMasy';

const KALKULATORY: { tytul: string; podtytul: string; rysunek: RodzajRysunkuMasy; sciezka: string; kolor: string }[] = [
  { tytul: 'Wydajność powierzchniowa', podtytul: 'Metry z tony', rysunek: 'powierzchnia', sciezka: '/niezbednik/masa/wydajnosc-powierzchniowa', kolor: '#2E86AB' },
  { tytul: 'Wydajność grubościowa', podtytul: 'Średnia grubość', rysunek: 'grubosc', sciezka: '/niezbednik/masa/wydajnosc-grubosciowa', kolor: '#15803D' },
  { tytul: 'Ustawianie wskaźnika rozkładarki', podtytul: 'Stół, poszerzenia i wymiary', rysunek: 'wskaznik', sciezka: '/niezbednik/masa/wskaznik-rozkladarki', kolor: '#E8A020' },
];

export default function MasaISprzetScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Masa i sprzęt" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.siatka, { paddingBottom: insets.bottom + 16 }]}>
        {KALKULATORY.map((k, i) => (
          <KafelekMenu
            key={k.sciezka}
            tytul={k.tytul}
            podtytul={k.podtytul}
            kolor={k.kolor}
            rysunek={<RysunekKafelkaMasy rodzaj={k.rysunek} kolor={k.kolor} tusz={theme.colors.text} />}
            opoznienie={i * 60}
            onPress={() => router.push(k.sciezka as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  siatka: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
