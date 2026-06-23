// ============================================================
// IMPORT PLANU – wczytanie z JSON + podgląd + potwierdzenie
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  useColorScheme, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { importujJSON, type DaneImportu } from '../../src/utils/jsonImporter';
import { importujHTML, type DaneImportuHTML } from '../../src/utils/htmlImporter';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { formatujDatePl } from '../../src/utils/dates';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';

export default function ImportPlanScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const { dodajPlan } = usePlanyStore();
  const { mieszanki: istniejaceMieszanki, dodajMieszanke } = useMieszankiStore();
  const { importujWpisyPlanu } = useLiveStore();

  const [ladowanie, setLadowanie] = useState(false);
  const [podglad, setPodglad] = useState<DaneImportu | null>(null);
  const [podgladHtml, setPodgladHtml] = useState<DaneImportuHTML | null>(null);
  const [zapisywanie, setZapisywanie] = useState(false);

  const wybierzPlikJSON = async () => {
    setLadowanie(true);
    setPodglad(null);
    setPodgladHtml(null);
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

  const wybierzPlikHTML = async () => {
    setLadowanie(true);
    setPodglad(null);
    setPodgladHtml(null);
    const wynik = await importujHTML();
    setLadowanie(false);

    if (!wynik.sukces) {
      if (wynik.blad !== 'Anulowano wybór pliku.') {
        Alert.alert('Błąd importu', wynik.blad);
      }
      return;
    }

    setPodgladHtml(wynik.dane);
  };

  const importujMieszanki = async (mieszanki: Array<{ rodzaj: string; ciezarObjetosciowy: number; nrRecepty?: string; wytwórnia?: string }>) => {
    let importowane = 0;
    for (const mie of mieszanki) {
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
        importowane++;
      }
    }
    return importowane;
  };

  const zatwierdzJSON = async () => {
    if (!podglad) return;
    setZapisywanie(true);

    try {
      const importowaneMieszanki = await importujMieszanki(podglad.mieszanki);

      const planId = await dodajPlan({
        dataWbudowywania: podglad.plan.dataWbudowywania,
        budowaId: podglad.plan.budowaId,
        iloscDzialek: podglad.plan.iloscDzialek,
        dzialki: podglad.plan.dzialki,
        tonazAuta: podglad.plan.tonazAuta,
        rzuty: podglad.plan.rzuty,
        zalaczniki: podglad.plan.zalaczniki,
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

  const zatwierdzHTML = async () => {
    if (!podgladHtml) return;
    setZapisywanie(true);

    try {
      const importowaneMieszanki = await importujMieszanki(podgladHtml.mieszanki);

      const planId = await dodajPlan({
        dataWbudowywania: podgladHtml.plan.dataWbudowywania,
        budowaId: podgladHtml.plan.budowaId,
        iloscDzialek: podgladHtml.plan.iloscDzialek,
        dzialki: podgladHtml.plan.dzialki,
        tonazAuta: podgladHtml.plan.tonazAuta,
        rzuty: podgladHtml.plan.rzuty,
        status: 'aktywny',
      });

      if (podgladHtml.wpisyLive.length > 0) {
        await importujWpisyPlanu(planId, podgladHtml.wpisyLive);
      }

      setZapisywanie(false);
      const autorInfo = podgladHtml.autorRaportu ? `\nAutor raportu: ${podgladHtml.autorRaportu}` : '';
      const liveInfo = podgladHtml.wpisyLive.length > 0 ? `\nZaimportowano ${podgladHtml.wpisyLive.length} wpisów Live.` : '';
      Alert.alert(
        'Import HTML zakończony',
        `Plan został zaimportowany z raportu HTML.${autorInfo}${liveInfo}${importowaneMieszanki > 0 ? `\nDodano ${importowaneMieszanki} mieszanek.` : ''}`,
        [{ text: 'Przejdź do planu', onPress: () => router.replace(`/plan/${planId}` as any) }],
      );
    } catch {
      setZapisywanie(false);
      Alert.alert('Błąd', 'Nie udało się zapisać importowanych danych HTML.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Import planu</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.zawartosc} showsVerticalScrollIndicator={false}>

        {/* Strefa importu */}
        <AnimatedCard delay={0}>
          <View style={[styles.strefaImportu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.ikonaImportu}>📦</Text>
            <Text style={[styles.tytulImportu, { color: theme.colors.text }]}>
              Importuj plan
            </Text>
            <Text style={[styles.opisImportu, { color: theme.colors.textSecondary }]}>
              Wybierz plik JSON (z aplikacji) lub HTML (raport z budowy z uzupełnionym trybem Live).
            </Text>
            <TouchableOpacity
              style={[styles.btnWybierz, { backgroundColor: theme.colors.primary }]}
              onPress={wybierzPlikJSON}
              disabled={ladowanie}
            >
              {ladowanie
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnWybierzTekst}>Wybierz plik JSON</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnWybierz, { backgroundColor: theme.colors.secondary, marginTop: 10 }]}
              onPress={wybierzPlikHTML}
              disabled={ladowanie}
            >
              {ladowanie
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnWybierzTekst}>Wybierz raport HTML</Text>
              }
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Podgląd importu */}
        {podglad && (
          <AnimatedCard delay={100}>
            <View style={[styles.podglad, { backgroundColor: theme.colors.card, borderColor: theme.colors.success }]}>
              <Text style={[styles.podgladTytul, { color: theme.colors.success }]}>✓ Plik JSON wczytany</Text>

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
                onPress={zatwierdzJSON}
                disabled={zapisywanie}
              >
                {zapisywanie
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnZatwierdzTekst}>Importuj plan JSON</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPodglad(null)} style={styles.btnAnuluj}>
                <Text style={[styles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Wybierz inny plik</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        )}

        {podgladHtml && (
          <AnimatedCard delay={100}>
            <View style={[styles.podglad, { backgroundColor: theme.colors.card, borderColor: theme.colors.info }]}>
              <Text style={[styles.podgladTytul, { color: theme.colors.info }]}>✓ Raport HTML wczytany</Text>

              <WierszInfo label="Data wbudowywania" v={formatujDatePl(podgladHtml.plan.dataWbudowywania)} theme={theme} />
              <WierszInfo label="Działki" v={`${podgladHtml.plan.dzialki.length}`} theme={theme} />
              {podgladHtml.autorRaportu && (
                <WierszInfo label="Autor raportu" v={podgladHtml.autorRaportu} theme={theme} />
              )}
              <WierszInfo label="Wpisy Live" v={`${podgladHtml.wpisyLive.length}`} theme={theme} />

              <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.podgladOpis, { color: theme.colors.textSecondary }]}>
                Plan i dane Live zostaną zaimportowane do aplikacji. Możesz też zapisać raport jako PDF z przeglądarki.
              </Text>

              <TouchableOpacity
                style={[styles.btnZatwierdz, { backgroundColor: theme.colors.info }]}
                onPress={zatwierdzHTML}
                disabled={zapisywanie}
              >
                {zapisywanie
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnZatwierdzTekst}>Importuj raport HTML</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPodgladHtml(null)} style={styles.btnAnuluj}>
                <Text style={[styles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Wybierz inny plik</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
