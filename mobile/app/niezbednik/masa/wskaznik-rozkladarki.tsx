import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { PoleNumeryczne, WynikKafelek } from '../../../src/components/niezbednik/KalkulatorPola';
import { obliczWskaznikRozkladarki } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function WskaznikRozkladarkiScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const [wBaza, setWBaza] = useState('2.50');
  const [poszLIlo, setPoszLIlo] = useState('1');
  const [poszLSzer, setPoszLSzer] = useState('0.75');
  const [poszPIlo, setPoszPIlo] = useState('0');
  const [poszPSzer, setPoszPSzer] = useState('0');
  const [wDocL, setWDocL] = useState('2.00');
  const [wDocP, setWDocP] = useState('1.50');
  const [strona, setStrona] = useState<'lewa' | 'prawa'>('lewa');
  const [lLinka, setLLinka] = useState('0.50');

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const wynik = obliczWskaznikRozkladarki({
    wBaza: p(wBaza), poszLeweIlosc: p(poszLIlo), poszLeweSzer: p(poszLSzer),
    poszPraweIlosc: p(poszPIlo), poszPraweSzer: p(poszPSzer),
    wDocelowaL: p(wDocL), wDocelowaP: p(wDocP), strona, lLinka: p(lLinka),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Wskaźnik rozkładarki" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <Text style={[styles.sekcja, { color: theme.colors.primary }]}>Parametry maszyny</Text>
        <PoleNumeryczne label="Szerokość podstawowa ciągnika [m]" value={wBaza} onChange={setWBaza} theme={theme} />
        <PoleNumeryczne label="Poszerzenia LEWA – ilość" value={poszLIlo} onChange={setPoszLIlo} theme={theme} />
        <PoleNumeryczne label="Poszerzenia LEWA – szer. [m]" value={poszLSzer} onChange={setPoszLSzer} theme={theme} />
        <PoleNumeryczne label="Poszerzenia PRAWA – ilość" value={poszPIlo} onChange={setPoszPIlo} theme={theme} />
        <PoleNumeryczne label="Poszerzenia PRAWA – szer. [m]" value={poszPSzer} onChange={setPoszPSzer} theme={theme} />

        <Text style={[styles.sekcja, { color: theme.colors.primary }]}>Parametry układania</Text>
        <PoleNumeryczne label="Docelowa szer. LEWA [m]" value={wDocL} onChange={setWDocL} theme={theme} />
        <PoleNumeryczne label="Docelowa szer. PRAWA [m]" value={wDocP} onChange={setWDocP} theme={theme} />
        <PoleNumeryczne label="Odległość linki od krawędzi [m]" value={lLinka} onChange={setLLinka} theme={theme} />
        <View style={styles.stronaRow}>
          {(['lewa', 'prawa'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.stronaBtn, { borderColor: strona === s ? theme.colors.primary : theme.colors.border, backgroundColor: strona === s ? `${theme.colors.primary}20` : theme.colors.card }]} onPress={() => setStrona(s)}>
              <Text style={{ color: strona === s ? theme.colors.primary : theme.colors.text, fontWeight: '600' }}>{s === 'lewa' ? 'Lewa' : 'Prawa'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!wynik.ok ? (
          <View style={[styles.blad, { backgroundColor: `${theme.colors.danger}15`, borderColor: theme.colors.danger }]}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Błąd: {wynik.blad}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sekcja, { color: theme.colors.text }]}>Wymiary dla wskaźnika: {wynik.wynik.strona.toUpperCase()} STRONA</Text>
            <WynikKafelek etykieta="Od osi maszyny" wartosc={`${wynik.wynik.odOsiCm} cm`} theme={theme} />
            <WynikKafelek etykieta="Od boku ciągnika (gąsienicy)" wartosc={`${wynik.wynik.odGasiennicyCm} cm`} theme={theme} />
            <WynikKafelek etykieta="Od zewnętrznej płozy stołu" wartosc={`${wynik.wynik.odPlozyCm} cm`} theme={theme} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Całkowita szerokość układanego pasa: {wynik.wynik.sumaSzerokosciM.toFixed(2)} m
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.secondary }]} onPress={() => dodaj(`Wskaźnik ${wynik.wynik.strona}: oś ${wynik.wynik.odOsiCm} cm`, 'Masa i sprzęt')}>
              <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sekcja: { fontSize: 14, fontWeight: '800', marginTop: 8, textTransform: 'uppercase' },
  stronaRow: { flexDirection: 'row', gap: 10 },
  stronaBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  blad: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
