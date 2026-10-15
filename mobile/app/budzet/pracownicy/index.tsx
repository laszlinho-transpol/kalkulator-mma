import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { karta } from '../../../src/constants/layout';
import { wstecz } from '../../../src/budzet/nawigacja';
import { usePracownicyStore } from '../../../src/stores/pracownicyStore';

export default function PracownicyScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const pracownicy = usePracownicyStore((s) => s.pracownicy);
  const dodaj = usePracownicyStore((s) => s.dodaj);
  const [nazwa, setNazwa] = useState('');
  const [blad, setBlad] = useState('');

  const zapisz = async () => {
    if (!nazwa.trim()) {
      setBlad('Wpisz imię i nazwisko.');
      return;
    }
    setBlad('');
    await dodaj(nazwa);
    setNazwa('');
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Pracownicy"
        podtytul="Do raportów sprzętu"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Imię i nazwisko</Text>
        <TextInput
          value={nazwa}
          onChangeText={setNazwa}
          placeholder="np. Jan Kowalski"
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel="Imię i nazwisko"
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
        />
        {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
        <TouchableOpacity accessibilityLabel="Dodaj pracownika" onPress={zapisz} style={[styles.dodaj, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.dodajTekst}>Dodaj</Text>
        </TouchableOpacity>
        {pracownicy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary }}>Brak pracowników. Dodana osoba pojawi się na raporcie sprzętu.</Text>
        ) : pracownicy.map((pracownik) => (
          <View key={pracownik.id} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.nazwa, { color: theme.colors.text }]}>{pracownik.imieNazwisko}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 16, gap: 10 },
  etykieta: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  nazwa: { fontSize: 16, fontWeight: '700' },
});
