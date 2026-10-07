// ============================================================
// IMPORT PLANU – wczytanie z JSON + podgląd + potwierdzenie
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  useColorScheme, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { importujJSON, type DaneImportu } from '../../src/utils/jsonImporter';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { formatujDatePl } from '../../src/utils/dates';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import { AppHeader } from '../../src/components/common/AppHeader';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';

export default function ImportPlanScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
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
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back(), kolor: theme.colors.primary }}
      />

      <ScrollView
        contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedCard delay={0}>
          <View style={[styles.strefaImportu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.ikonaImportu}>📦</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[styles.tytulImportu, { color: theme.colors.text }]}>
                Importuj plan z pliku JSON
              </Text>
              <InfoTooltip tresc="Wybierz plik .json wyeksportowany z Kalkulatora MMA na innym urządzeniu." />
            </View>
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

        {podglad && (
          <AnimatedCard delay={100}>
            <View style={[styles.podglad, { backgroundColor: theme.colors.card, borderColor: theme.colors.success }]}>
              <Text style={[styles.podgladTytul, { color: theme.colors.success }]}>✓ Plik wczytany – podgląd</Text>
              <WierszInfo label="Data wbudowywania" v={formatujDatePl(podglad.plan.dataWbudowywania)} theme={theme} />
              <WierszInfo label="Działki" v={`${podglad.plan.dzialki.length}`} theme={theme} />
              <WierszInfo label="Tonaż auta" v={`${podglad.plan.tonazAuta} t`} theme={theme} />
              <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
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
  btnZatwierdz: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnZatwierdzTekst: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnAnuluj: { paddingVertical: 10, alignItems: 'center' },
  btnAnulujTekst: { fontSize: 14 },
});
