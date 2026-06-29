import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PoleNumeryczne, SchematInfo } from '../../../src/components/niezbednik/KalkulatorPola';
import { tyczenieLukow } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function LukiScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [promien, setPromien] = useState('100');
  const [krok, setKrok] = useState('1');

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const tabela = tyczenieLukow(p(promien), p(krok) || 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Tyczenie łuków" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <SchematInfo tekst="Rzędne od stycznej: mierz prostopadłe odsunięcie y od stycznej co x metrów wzdłuż łuku. Wzór: y = R − √(R² − x²)" theme={theme} />
        <PoleNumeryczne label="Promień łuku R [m]" value={promien} onChange={setPromien} theme={theme} />
        <PoleNumeryczne label="Krok pomiarowy [m]" value={krok} onChange={setKrok} theme={theme} />
        <View style={[styles.tabela, { borderColor: theme.colors.border }]}>
          <View style={[styles.nagl, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Text style={[styles.kom, { color: theme.colors.textSecondary, fontWeight: '700' }]}>x [m]</Text>
            <Text style={[styles.kom, { color: theme.colors.textSecondary, fontWeight: '700' }]}>y [m]</Text>
          </View>
          {tabela.map((w) => (
            <View key={w.x} style={[styles.wiersz, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.kom, { color: theme.colors.text }]}>{w.x}</Text>
              <Text style={[styles.kom, { color: theme.colors.primary, fontWeight: '600' }]}>{w.y.toFixed(3)}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Tyczenie łuku R=${promien}m: ${tabela.length} punktów`, 'Geodezja')}>
          <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabela: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  nagl: { flexDirection: 'row', padding: 10 },
  wiersz: { flexDirection: 'row', padding: 10, borderBottomWidth: 1 },
  kom: { flex: 1, textAlign: 'center', fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
