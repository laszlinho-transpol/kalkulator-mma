import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { PoleNumeryczne } from '../../../src/components/niezbednik/KalkulatorPola';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { wydajnoscPowierzchniowa } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function WydajnoscPowierzchniowaScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [tonaz, setTonaz] = useState('25.5');
  const [grubosc, setGrubosc] = useState('4');
  const [szerokosc, setSzerokosc] = useState('3.65');
  const [gestosc, setGestosc] = useState('2.455');

  const wynik = wydajnoscPowierzchniowa(
    parseFloat(tonaz.replace(',', '.')) || 0,
    parseFloat(grubosc.replace(',', '.')) || 0,
    parseFloat(szerokosc.replace(',', '.')) || 0,
    parseFloat(gestosc.replace(',', '.')) || 0,
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Metry z tony" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <PoleNumeryczne label="Tonaż na aucie [t]" value={tonaz} onChange={setTonaz} theme={theme} />
        <PoleNumeryczne label="Grubość [cm]" value={grubosc} onChange={setGrubosc} theme={theme} />
        <PoleNumeryczne label="Szerokość układania [m]" value={szerokosc} onChange={setSzerokosc} theme={theme} />
        <PoleNumeryczne label="Gęstość [t/m³]" value={gestosc} onChange={setGestosc} theme={theme} />
        <View style={[styles.wynik, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]}>
          <Text style={{ color: theme.colors.textSecondary }}>Metrów bieżących z ciężarówki:</Text>
          <Text style={{ color: theme.colors.primary, fontSize: 28, fontWeight: '800' }}>{wynik > 0 ? wynik.toFixed(1) : '–'} m</Text>
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Wydajność powierzchniowa: ${wynik.toFixed(1)} m`, 'Masa i sprzęt')}>
          <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  wynik: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8, gap: 6 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
