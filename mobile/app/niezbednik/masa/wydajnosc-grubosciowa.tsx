import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PoleNumeryczne, WynikKafelek } from '../../../src/components/niezbednik/KalkulatorPola';
import { wydajnoscGrubosciowa } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function WydajnoscGrubosciowaScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [masa, setMasa] = useState('25.5');
  const [dlugosc, setDlugosc] = useState('100');
  const [szerokosc, setSzerokosc] = useState('3.65');
  const [gestosc, setGestosc] = useState('2.455');

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const wynik = wydajnoscGrubosciowa(p(masa), p(dlugosc), p(szerokosc), p(gestosc));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Średnia grubość" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <PoleNumeryczne label="Wbudowany tonaż M [Mg]" value={masa} onChange={setMasa} theme={theme} />
        <PoleNumeryczne label="Przejechana długość L [m]" value={dlugosc} onChange={setDlugosc} theme={theme} />
        <PoleNumeryczne label="Szerokość układania s [m]" value={szerokosc} onChange={setSzerokosc} theme={theme} />
        <PoleNumeryczne label="Gęstość ρ [t/m³]" value={gestosc} onChange={setGestosc} theme={theme} />
        <WynikKafelek etykieta="Osiągnięta średnia grubość:" wartosc={wynik > 0 ? `${wynik.toFixed(2)} cm` : '–'} theme={theme} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Wydajność grubościowa: ${wynik.toFixed(2)} cm`, 'Masa i sprzęt')}>
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
