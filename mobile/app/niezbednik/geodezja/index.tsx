import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { KafelekMenu } from '../../../src/components/ui/KafelekMenu';
import { useMotyw } from '../../../src/hooks/useMotyw';
import { RysunekKafelka, type RodzajRysunku } from '../../../src/components/geodezja/RysunkiGeodezji';

const KALKULATORY: { tytul: string; podtytul: string; rysunek: RodzajRysunku; sciezka: string; kolor: string }[] = [
  { tytul: 'Szkic geodezyjny', podtytul: 'Rzut z góry, odczyty, cel', rysunek: 'szkic', sciezka: '/niezbednik/geodezja/szkice', kolor: '#2E86AB' },
  { tytul: 'Przekrój poprzeczny', podtytul: 'Krawężniki, warstwy, łata', rysunek: 'przekroj', sciezka: '/niezbednik/geodezja/przekroje', kolor: '#C2410C' },
  { tytul: 'Kalkulator spadków', podtytul: 'Spadek z rzędnych', rysunek: 'spadki', sciezka: '/niezbednik/geodezja/spadki', kolor: '#15803D' },
  { tytul: 'Tyczenie łuków', podtytul: 'Rzędne od stycznej', rysunek: 'luki', sciezka: '/niezbednik/geodezja/luki', kolor: '#8B5CF6' },
  { tytul: 'Wierzchołek łuku', podtytul: 'Strzałka X z cięciwy i R', rysunek: 'wierzcholek', sciezka: '/niezbednik/geodezja/wierzcholek-luku', kolor: '#E8A020' },
  { tytul: 'Tyczenie kąta prostego', podtytul: 'Trójkąt 3-4-5', rysunek: 'katProsty', sciezka: '/niezbednik/geodezja/kat-prosty', kolor: '#DB2777' },
];

export default function GeodezjaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Geodezja i pomiary" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.siatka, { paddingBottom: insets.bottom + 16 }]}>
        {KALKULATORY.map((k, i) => (
          <KafelekMenu
            key={k.sciezka}
            tytul={k.tytul}
            podtytul={k.podtytul}
            kolor={k.kolor}
            rysunek={<RysunekKafelka rodzaj={k.rysunek} kolor={k.kolor} tusz={theme.colors.text} />}
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
