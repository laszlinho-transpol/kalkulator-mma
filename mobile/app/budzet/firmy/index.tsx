import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, InfoTooltip, PozycjaListy, useMotyw, TYPOGRAFIA } from '../../../src/components/ui';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useFirmyStore } from '../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

export default function FirmyScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const firmy = useFirmyStore((s) => s.firmy);
  const sprzet = useSprzetStore((s) => s.sprzet);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Firmy"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.naglowek}>
          <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]}>Firmy w bazie · {firmy.length}</Text>
          <InfoTooltip tresc="Firma dopisuje się tutaj, gdy zapiszesz ją przy sprzęcie. Ta sama nazwa wskazuje jedną firmę i podpowiada się na kolejnej karcie. Na karcie firmy uzupełnisz dane kontaktowe i zobaczysz jej sprzęt." />
        </View>
        {firmy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary }}>Brak firm.</Text>
        ) : firmy.map((firma) => {
          const ile = sprzet.filter((m) => m.firmaId === firma.id).length;
          const telefony = firma.kontakty?.length ?? 0;
          const opis = [`sprzęt: ${ile}`, telefony ? `kontakty: ${telefony}` : '', firma.adres ?? ''].filter(Boolean).join(' · ');
          return (
            <PozycjaListy
              key={firma.id}
              ikona="🏢"
              tytul={firma.nazwa}
              podtytul={opis}
              accessibilityLabel={`Firma ${firma.nazwa}`}
              onPress={() => router.push(`/budzet/firmy/${firma.id}` as never)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 8 },
  naglowek: { flexDirection: 'row', alignItems: 'center' },
});
