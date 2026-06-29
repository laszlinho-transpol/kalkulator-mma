import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PoleNumeryczne, SchematInfo } from '../../../src/components/niezbednik/KalkulatorPola';
import { tyczenieKataProstego } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function KatProstyScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [skala, setSkala] = useState('1');

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 1;
  const w = tyczenieKataProstego(p(skala));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Kąt prosty" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <SchematInfo tekst="Trójkąt 3-4-5: zmierz 3×skala i 4×skala prostopadle, przeciwprostokątna zamykająca = 5×skala." theme={theme} />
        <PoleNumeryczne label="Mnożnik skali" value={skala} onChange={setSkala} theme={theme} />
        <View style={[styles.instrukcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 8 }}>Instrukcja pomiaru:</Text>
          <Text style={{ color: theme.colors.text, lineHeight: 22 }}>Bok A: {w.bokA} m</Text>
          <Text style={{ color: theme.colors.text, lineHeight: 22 }}>Bok B: {w.bokB} m</Text>
          <Text style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 8 }}>Przeciwprostokątna: {w.przeciwprostokatna} m</Text>
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Kąt prosty: ${w.bokA}×${w.bokB} m, przeciw. ${w.przeciwprostokatna} m`, 'Geodezja')}>
          <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  instrukcja: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
