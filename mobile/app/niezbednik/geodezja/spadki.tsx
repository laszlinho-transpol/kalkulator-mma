import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PoleNumeryczne, WynikKafelek, SchematInfo } from '../../../src/components/niezbednik/KalkulatorPola';
import { kalkulatorSpadkow } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function SpadkiScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [start, setStart] = useState('100.00');
  const [koniec, setKoniec] = useState('99.50');
  const [odleglosc, setOdleglosc] = useState('50');

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const wynik = kalkulatorSpadkow(p(start), p(koniec), p(odleglosc));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Kalkulator spadków" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <SchematInfo tekst="Schemat: linia pozioma (styczna) łączy rzędną startową i końcową. Spadek = różnica rzędnych / odległość × 100%." theme={theme} />
        <PoleNumeryczne label="Rzędna startowa [m]" value={start} onChange={setStart} theme={theme} />
        <PoleNumeryczne label="Rzędna końcowa [m]" value={koniec} onChange={setKoniec} theme={theme} />
        <PoleNumeryczne label="Odległość [m]" value={odleglosc} onChange={setOdleglosc} theme={theme} />
        <WynikKafelek etykieta="Spadek:" wartosc={`${wynik.procent} % (${wynik.promile} ‰)`} theme={theme} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Spadek: ${wynik.procent}% (${wynik.promile}‰)`, 'Geodezja')}>
          <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
