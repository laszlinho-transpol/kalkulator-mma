import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { GRUPY_SPRZETU } from '../../../src/budzet/rodzajeSprzetu';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

export default function SprzetMenuScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const sprzet = useSprzetStore((s) => s.sprzet);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Sprzęt"
        podtytul="Wybierz rodzaj"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
        prawy={{ tekst: 'Dodaj nowy', onPress: () => router.push('/budzet/sprzet/nowy' as never) }}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}>
        {GRUPY_SPRZETU.map((grupa) => (
          <View key={grupa.id} style={styles.grupa}>
            <Text style={[styles.grupaTytul, { color: theme.colors.textSecondary }]}>{grupa.nazwa}</Text>
            {grupa.rodzaje.map((rodzaj) => {
              const ile = sprzet.filter((s) => s.rodzajId === rodzaj.id).length;
              return (
                <TouchableOpacity
                  key={`${grupa.id}-${rodzaj.id}`}
                  accessibilityLabel={`Rodzaj ${rodzaj.nazwa}`}
                  style={[styles.przycisk, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => router.push(`/budzet/sprzet/rodzaj/${rodzaj.id}` as never)}
                >
                  <Text style={[styles.nazwa, { color: theme.colors.text }]}>{rodzaj.nazwa}</Text>
                  <Text style={[styles.liczba, { color: theme.colors.primary }]}>{ile}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 16, gap: 18 },
  grupa: { gap: 8 },
  grupaTytul: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  przycisk: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nazwa: { fontSize: 16, fontWeight: '700', flex: 1 },
  liczba: { fontSize: 16, fontWeight: '800', marginLeft: 12 },
});
