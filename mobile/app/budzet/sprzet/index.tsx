import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, PozycjaListy, Sekcja, ZasadaDzialania, useMotyw } from '../../../src/components/ui';
import { ZASADA_SPRZETU } from '../../../src/components/ZasadyDzialow';
import { GRUPY_SPRZETU } from '../../../src/budzet/rodzajeSprzetu';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

const ZASADA = 'budzet/sprzet';

export default function SprzetMenuScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const sprzet = useSprzetStore((s) => s.sprzet);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Sprzęt"
        podtytul="Wybierz rodzaj"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
        przyciski={[{ tekst: 'Dodaj nowy', onPress: () => router.push('/budzet/sprzet/nowy' as never), tlo: theme.colors.primary, kolor: '#1A1A1A' }]}
        zasada={ZASADA}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}>
        <ZasadaDzialania klucz={ZASADA} slajdy={ZASADA_SPRZETU} />
        {GRUPY_SPRZETU.map((grupa) => (
          <Sekcja key={grupa.id} tytul={grupa.nazwa}>
            {grupa.rodzaje.map((rodzaj) => (
              <PozycjaListy
                key={`${grupa.id}-${rodzaj.id}`}
                plaska
                tytul={rodzaj.nazwa}
                prawy={String(sprzet.filter((s) => s.rodzajId === rodzaj.id).length)}
                accessibilityLabel={`Rodzaj ${rodzaj.nazwa}`}
                onPress={() => router.push(`/budzet/sprzet/rodzaj/${rodzaj.id}` as never)}
              />
            ))}
          </Sekcja>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 14, gap: 12 },
});
