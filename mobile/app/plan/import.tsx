// ============================================================
// IMPORT PLANU – wczytanie z JSON + podgląd + potwierdzenie
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/context/ThemeContext';
import { AppHeader } from '../../src/components/common/AppHeader';
import type { AppTheme } from '../../src/constants/theme';
import { importujJSON, type DaneImportu } from '../../src/utils/jsonImporter';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { formatujDatePl } from '../../src/utils/dates';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';

export default function ImportPlanScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const { dodajPlan } = usePlanyStore();
  const { mieszanki: istniejaceMieszanki, dodajMieszanke } = useMieszankiStore();

  const [ladowanie, setLadowanie] = useState(false);
  const [podglad, setPodglad] = useState<DaneImportu | null>(null);
  const [zapisywanie, setZapisywanie] = useState(false);

  const wybierzPlik = async () => {
    setLadowanie(true);
    setPodglad(null);
    const wynik = await importujJSON();
    setLadowanie(false);

    if (!wynik.sukces) {
      if (wynik.blad !== 'Anulowano wybór pliku.') {
        Alert.alert('Błąd importu', wynik.blad);
      }
      return;
    }

    setPodglad(wynik.dane);
  };

  const zatwierdz = async () => {
    if (!podglad) return;
    setZapisywanie(true);

    try {
      // Importuj brakujące mieszanki
      let importowaneMieszanki = 0;
      for (const mie of podglad.mieszanki) {
        const istnieje = istniejaceMieszanki.some(
          (m) => m.rodzaj === mie.rodzaj && m.ciezarObjetosciowy === mie.ciezarObjetosciowy,
        );
        if (!istnieje) {
          await dodajMieszanke({
            rodzaj: mie.rodzaj,
            nrRecepty: mie.nrRecepty,
            ciezarObjetosciowy: mie.ciezarObjetosciowy,
            wytwórnia: mie.wytwórnia,
          });
          importowaneMieszanki++;
        }
      }

      // Importuj plan
      const planId = await dodajPlan({
        dataWbudowywania: podglad.plan.dataWbudowywania,
        iloscDzialek: podglad.plan.iloscDzialek,
        dzialki: podglad.plan.dzialki,
        tonazAuta: podglad.plan.tonazAuta,
        rzuty: podglad.plan.rzuty,
        status: 'aktywny',
      });

      setZapisywanie(false);
      Alert.alert(
        'Import zakończony',
        `Plan został zaimportowany.${importowaneMieszanki > 0 ? `\nDodano ${importowaneMieszanki} nowych mieszanek.` : ''}`,
        [{ text: 'Przejdź do planu', onPress: () => router.replace(`/plan/${planId}` as any) }],
      );
    } catch {
      setZapisywanie(false);
      Alert.alert('Błąd', 'Nie udało się zapisać importowanych danych.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Import planu"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />

      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Strefa importu */}
        <AnimatedCard delay={0}>
          <View style={[styles.strefaImportu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.ikonaImportu}>📦</Text>
            <Text style={[styles.tytulImportu, { color: theme.colors.text }]}>
              Importuj plan z pliku JSON
            </Text>
            <Text style={[styles.opisImportu, { color: theme.colors.textSecondary }]}>
              Wybierz plik .json wyeksportowany z Kalkulatora MMA na innym urządzeniu.
              Plany z mieszankami zostaną automatycznie dodane do Twojej bazy.
            </Text>
            <TouchableOpacity
              style={[styles.btnWybierz, { backgroundColor: theme.colors.primary }]}
              onPress={wybierzPlik}
              disabled={ladowanie}
            >
              {ladowanie
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnWybierzTekst}>Wybierz plik JSON</Text>
              }
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Podgląd importu */}
        {podglad && (
          <AnimatedCard delay={100}>
            <View style={[styles.podglad, { backgroundColor: theme.colors.card, borderColor: theme.colors.success }]}>
              <Text style={[styles.podgladTytul, { color: theme.colors.success }]}>✓ Plik wczytany – podgląd</Text>

              <WierszInfo label="Data wbudowywania" v={formatujDatePl(podglad.plan.dataWbudowywania)} theme={theme} />
              <WierszInfo label="Działki" v={`${podglad.plan.dzialki.length}`} theme={theme} />
              <WierszInfo label="Tonaż auta" v={`${podglad.plan.tonazAuta} t`} theme={theme} />
              {podglad.mieszanki.length > 0 && (
                <WierszInfo
                  label="Mieszanki w pliku"
                  v={podglad.mieszanki.map((m) => m.rodzaj).join(', ')}
                  theme={theme}
                />
              )}

              <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.podgladOpis, { color: theme.colors.textSecondary }]}>
                Plan zostanie dodany jako "aktywny". Mieszanki, których jeszcze nie masz, zostaną dodane automatycznie.
              </Text>

              <TouchableOpacity
                style={[styles.btnZatwierdz, { backgroundColor: theme.colors.success }]}
                onPress={zatwierdz}
                disabled={zapisywanie}
              >
                {zapisywanie
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnZatwierdzTekst}>Importuj plan</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPodglad(null)} style={styles.btnAnuluj}>
                <Text style={[styles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Wybierz inny plik</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function WierszInfo({ label, v, theme }: { label: string; v: string; theme: AppTheme }) {
  return (
    <View style={styles.wiersz}>
      <Text style={[styles.wierszLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.wierszVal, { color: theme.colors.text }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  wstecz: { fontSize: 17, minWidth: 60 },
  tytul: { fontSize: 17, fontWeight: '700' },
  zawartosc: { padding: 16, gap: 16 },
  strefaImportu: { borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center', gap: 12 },
  ikonaImportu: { fontSize: 52, marginBottom: 8 },
  tytulImportu: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  opisImportu: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  btnWybierz: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8, minWidth: 200, alignItems: 'center' },
  btnWybierzTekst: { color: '#fff', fontSize: 16, fontWeight: '700' },
  podglad: { borderRadius: 16, padding: 20, borderWidth: 2, gap: 2 },
  podgladTytul: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  wiersz: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  wierszLabel: { fontSize: 14 },
  wierszVal: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  sep: { height: 1, marginVertical: 10 },
  podgladOpis: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  btnZatwierdz: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnZatwierdzTekst: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnAnuluj: { paddingVertical: 10, alignItems: 'center' },
  btnAnulujTekst: { fontSize: 14 },
});
