import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { karta } from '../../../../src/constants/layout';
import { rodzajPoId } from '../../../../src/budzet/rodzajeSprzetu';
import { etykietaSprzetu, linieStawek } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useFirmyStore } from '../../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../../src/stores/sprzetStore';

export default function ListaRodzajuScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const rodzaj = rodzajPoId(id ?? '');
  const firmy = useFirmyStore((s) => s.firmy);
  const sprzet = useSprzetStore((s) => s.sprzet);
  const lista = useMemo(
    () => sprzet.filter((s) => s.rodzajId === id).sort((a, b) => etykietaSprzetu(a.numer).localeCompare(etykietaSprzetu(b.numer), 'pl')),
    [sprzet, id],
  );

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={rodzaj?.nazwa ?? 'Sprzęt'}
        podtytul="Lista"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/sprzet') }}
        przyciski={[{
          tekst: 'Dodaj nowy',
          onPress: () => router.push(`/budzet/sprzet/nowy?rodzaj=${id ?? ''}` as never),
          tlo: theme.colors.primary,
          kolor: '#1A1A1A',
        }]}
      />
      {!rodzaj ? (
        <EmptyState ikona="🚜" tytul="Nieznany rodzaj" opis="Wróć do menu sprzętu i wybierz rodzaj z listy." />
      ) : lista.length === 0 ? (
        <EmptyState
          ikona="🚜"
          tytul="Brak sprzętu"
          opis={`Nie ma jeszcze pozycji „${rodzaj.nazwa}”. Dodaj maszynę do bazy.`}
          przyciskTekst="Dodaj nowy"
          onPrzycisk={() => router.push(`/budzet/sprzet/nowy?rodzaj=${rodzaj.id}` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}>
          {lista.map((maszyna) => {
            const firma = firmy.find((f) => f.id === maszyna.firmaId);
            return (
              <TouchableOpacity
                key={maszyna.id}
                accessibilityLabel={`Sprzęt ${etykietaSprzetu(maszyna.numer)}`}
                style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push(`/budzet/sprzet/${maszyna.id}` as never)}
              >
                <Text style={[styles.numer, { color: theme.colors.text }]}>{etykietaSprzetu(maszyna.numer)}</Text>
                <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{firma?.nazwa ?? 'Bez firmy'}</Text>
                {linieStawek(maszyna.stawki).map((linia) => (
                  <Text key={linia} style={{ color: theme.colors.text, marginTop: 4 }}>{linia}</Text>
                ))}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 16, gap: 10 },
  numer: { fontSize: 18, fontWeight: '800' },
});
