// ============================================================
// EKRAN: USTAWIENIA – tonaż domyślny, onboarding, o aplikacji
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  useColorScheme, ScrollView, Switch, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type AppTheme } from '../src/constants/theme';
import { AnimatedCard } from '../src/components/common/AnimatedCard';
import { GrafikaMaszynSekcja } from '../src/components/ustawienia/GrafikaMaszynSekcja';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useLiveStore } from '../src/stores/liveStore';
import { WERSJA_APLIKACJI, CHANGELOG } from '../src/constants/version';
import { pobierzUstawienia, zapiszUstawienia } from '../src/utils/ustawieniaAplikacji';

const KLUCZ_ONBOARDING = '@mma:onboardingComplete';
const KLUCZ_USTAWIEN = '@mma:settings';

export { pobierzUstawienia, zapiszUstawienia };

export default function UstawieniaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  const [tonazStr, setTonazStr] = useState('25.5');
  const [zapisano, setZapisano] = useState(false);

  const { mieszanki } = useMieszankiStore();
  const { plany } = usePlanyStore();
  const { wpisy } = useLiveStore();

  useEffect(() => {
    pobierzUstawienia().then((u) => setTonazStr(String(u.tonazDomyslny)));
  }, []);

  const zapiszTonaz = async () => {
    const tonaz = parseFloat(tonazStr.replace(',', '.'));
    if (isNaN(tonaz) || tonaz <= 0 || tonaz > 100) {
      Alert.alert('Błąd', 'Podaj prawidłowy tonaż (np. 25.5).');
      return;
    }
    await zapiszUstawienia({ tonazDomyslny: tonaz });
    setZapisano(true);
    setTimeout(() => setZapisano(false), 2000);
  };

  const resetujOnboarding = () => {
    Alert.alert(
      'Resetuj onboarding',
      'Przy następnym uruchomieniu aplikacja pokaże ponownie ekran powitalny.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Resetuj',
          onPress: async () => {
            await AsyncStorage.removeItem(KLUCZ_ONBOARDING);
            Alert.alert('Gotowe', 'Przy następnym uruchomieniu zobaczysz ekran powitalny.');
          },
        },
      ],
    );
  };

  const wyczyscDane = () => {
    Alert.alert(
      'Wyczyść wszystkie dane',
      `Zostanie usunięte:\n• ${mieszanki.length} mieszanek\n• ${plany.length} planów\n• ${wpisy.length} wpisów Live\n\nTa operacja jest nieodwracalna!`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyczyść',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              '@mma:mieszanki',
              '@mma:plany',
              '@mma:live',
              KLUCZ_USTAWIEN,
            ]);
            Alert.alert('Gotowe', 'Wszystkie dane zostały wyczyszczone. Uruchom aplikację ponownie.', [
              { text: 'OK', onPress: () => router.replace('/') },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Ustawienia</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

        {/* Statystyki bazy */}
        <AnimatedCard delay={0}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>TWOJA BAZA DANYCH</Text>
            <StatRow ikona="🧱" label="Mieszanek" wartosc={mieszanki.length} theme={theme} />
            <StatRow ikona="📋" label="Planów" wartosc={plany.length} theme={theme} />
            <StatRow ikona="✓" label="Archiwalnych" wartosc={plany.filter(p => p.status === 'archiwalny').length} theme={theme} />
            <StatRow ikona="🚚" label="Wpisów Live" wartosc={wpisy.length} theme={theme} />
          </View>
        </AnimatedCard>

        {/* Domyślny tonaż */}
        <AnimatedCard delay={80}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>DOMYŚLNY TONAŻ AUTA</Text>
            <Text style={[styles.opisSekcji, { color: theme.colors.textSecondary }]}>
              Tonaż wstępnie wpisywany w każdym nowym planie. Możesz go zmienić przy tworzeniu planu.
            </Text>
            <View style={styles.tonazRow}>
              <TextInput
                style={[styles.tonazInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={tonazStr}
                onChangeText={(t) => setTonazStr(t.replace(',', '.'))}
                keyboardType="decimal-pad"
                placeholder="25.5"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={[styles.tonazJednostka, { color: theme.colors.textSecondary }]}>t</Text>
              <TouchableOpacity
                style={[styles.btnZapisz, { backgroundColor: zapisano ? theme.colors.success : theme.colors.primary }]}
                onPress={zapiszTonaz}
              >
                <Text style={styles.btnZapiszTekst}>{zapisano ? '✓ Zapisano' : 'Zapisz'}</Text>
              </TouchableOpacity>
            </View>
            <GrafikaMaszynSekcja theme={theme} />
          </View>
        </AnimatedCard>

        {/* Aplikacja */}
        <AnimatedCard delay={160}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>APLIKACJA</Text>

            <AkcjaRow
              ikona="🎬"
              label="Pokaż ponownie wstęp"
              opis="Reset ekranu powitalnego"
              theme={theme}
              onPress={resetujOnboarding}
              kolor={theme.colors.info}
            />

            <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />

            <AkcjaRow
              ikona="🗑"
              label="Wyczyść wszystkie dane"
              opis="Usuwa mieszanki, plany i wpisy Live"
              theme={theme}
              onPress={wyczyscDane}
              kolor={theme.colors.danger}
            />
          </View>
        </AnimatedCard>

        {/* Co nowego */}
        <AnimatedCard delay={200}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>CO NOWEGO</Text>
            {CHANGELOG.slice(0, 2).map((wpis) => (
              <View key={wpis.wersja} style={[styles.changelogWpis, { borderColor: theme.colors.border }]}>
                <Text style={[styles.changelogWersja, { color: theme.colors.primary }]}>
                  v{wpis.wersja} · {wpis.data}
                </Text>
                <Text style={[styles.changelogTytul, { color: theme.colors.text }]}>{wpis.tytul}</Text>
                {wpis.zmiany.map((z) => (
                  <Text key={z} style={[styles.changelogPunkt, { color: theme.colors.textSecondary }]}>
                    • {z}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </AnimatedCard>

        {/* O aplikacji */}
        <AnimatedCard delay={280}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>O APLIKACJI</Text>

            <View style={[styles.appInfo, { backgroundColor: theme.colors.background, borderRadius: 12 }]}>
              <Text style={[styles.appNazwa, { color: theme.colors.primary }]}>⬛ Kalkulator MMA</Text>
              <Text style={[styles.appWersja, { color: theme.colors.textSecondary }]}>Wersja {WERSJA_APLIKACJI}</Text>
              <Text style={[styles.appOpis, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Co nowego w {CHANGELOG[0].wersja}:
              </Text>
              {CHANGELOG[0].zmiany.map((z, i) => (
                <Text key={i} style={[styles.changelogPunkt, { color: theme.colors.textSecondary }]}>• {z}</Text>
              ))}
              <Text style={[styles.appOpis, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Aplikacja mobilna do planowania i kontrolowania wbudowywania mieszanek mineralno-asfaltowych na budowach drogowych.
              </Text>
              <View style={[styles.techRow, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.techLabel, { color: theme.colors.textSecondary }]}>React Native + Expo SDK 56</Text>
                <Text style={[styles.techLabel, { color: theme.colors.textSecondary }]}>TypeScript · Zustand</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function StatRow({ ikona, label, wartosc, theme }: { ikona: string; label: string; wartosc: number; theme: AppTheme }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statIkona}>{ikona}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.statWartosc, { color: theme.colors.primary }]}>{wartosc}</Text>
    </View>
  );
}

function AkcjaRow({ ikona, label, opis, theme, onPress, kolor }: {
  ikona: string; label: string; opis: string; theme: AppTheme;
  onPress: () => void; kolor: string;
}) {
  return (
    <TouchableOpacity style={styles.akcjaRow} onPress={onPress}>
      <View style={[styles.akcjaIkonaTlo, { backgroundColor: `${kolor}15` }]}>
        <Text style={styles.akcjaIkona}>{ikona}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.akcjaLabel, { color: kolor }]}>{label}</Text>
        <Text style={[styles.akcjaOpis, { color: theme.colors.textSecondary }]}>{opis}</Text>
      </View>
      <Text style={[styles.strzalka, { color: theme.colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  wstecz: { fontSize: 17, minWidth: 60 },
  tytul: { fontSize: 17, fontWeight: '700' },
  zawartosc: { padding: 16, gap: 12 },
  sekcja: { borderRadius: 14, padding: 16, borderWidth: 1 },
  sekcjaTytul: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  opisSekcji: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  statIkona: { fontSize: 20, width: 28 },
  statLabel: { flex: 1, fontSize: 15 },
  statWartosc: { fontSize: 20, fontWeight: '800' },
  tonazRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tonazInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, textAlign: 'center' },
  tonazJednostka: { fontSize: 15 },
  btnZapisz: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnZapiszTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sep: { height: 1, marginVertical: 4 },
  akcjaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  akcjaIkonaTlo: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  akcjaIkona: { fontSize: 20 },
  akcjaLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  akcjaOpis: { fontSize: 12 },
  strzalka: { fontSize: 20 },
  changelogWpis: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 4 },
  changelogWersja: { fontSize: 12, fontWeight: '700' },
  changelogTytul: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  changelogPunkt: { fontSize: 12, lineHeight: 18, paddingLeft: 4 },
  appInfo: { padding: 16, gap: 8 },
  appNazwa: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  appWersja: { fontSize: 13 },
  appOpis: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  techRow: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 4 },
  techLabel: { fontSize: 11 },
});
