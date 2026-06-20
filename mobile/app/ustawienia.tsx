// ============================================================
// EKRAN: USTAWIENIA – tonaż, motyw, onboarding, o aplikacji
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../src/context/ThemeContext';
import { AppHeader } from '../src/components/common/AppHeader';
import { AnimatedCard } from '../src/components/common/AnimatedCard';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useLiveStore } from '../src/stores/liveStore';
import {
  pobierzUstawienia, zapiszUstawienia,
  WERSJA_APLIKACJI, CHANGELOG, KLUCZ_USTAWIEN,
  type MotywPreferencja,
} from '../src/utils/settings';
import type { AppTheme } from '../src/constants/theme';

const KLUCZ_ONBOARDING = '@mma:onboardingComplete';

const IKONY_STAT: Record<string, string> = {
  mieszanki: '🏭',
  plany: '📋',
  archiwum: '📁',
  live: '🛣️',
};

const OPCJE_MOTYWU: { id: MotywPreferencja; label: string; ikona: string }[] = [
  { id: 'auto', label: 'Auto', ikona: '📱' },
  { id: 'dark', label: 'Ciemny', ikona: '🌙' },
  { id: 'light', label: 'Jasny', ikona: '☀️' },
];

export default function UstawieniaScreen() {
  const { theme, preferencja, ustawPreferencje } = useAppTheme();
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
    const u = await pobierzUstawienia();
    await zapiszUstawienia({ ...u, tonazDomyslny: tonaz });
    setZapisano(true);
    setTimeout(() => setZapisano(false), 2000);
  };

  const zmienMotyw = async (m: MotywPreferencja) => {
    await ustawPreferencje(m);
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
              '@mma:dzialkiZakonczone',
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

  const aktualnyChangelog = CHANGELOG[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Ustawienia"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
      />

      <ScrollView
        contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Statystyki bazy */}
        <AnimatedCard delay={0}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>TWOJA BAZA DANYCH</Text>
            <StatRow ikona={IKONY_STAT.mieszanki} label="Mieszanek" wartosc={mieszanki.length} theme={theme} />
            <StatRow ikona={IKONY_STAT.plany} label="Planów" wartosc={plany.length} theme={theme} />
            <StatRow ikona={IKONY_STAT.archiwum} label="Archiwalnych" wartosc={plany.filter(p => p.status === 'archiwalny').length} theme={theme} />
            <StatRow ikona={IKONY_STAT.live} label="Wpisów Live" wartosc={wpisy.length} theme={theme} />
          </View>
        </AnimatedCard>

        {/* Motyw */}
        <AnimatedCard delay={60}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>WYGLĄD APLIKACJI</Text>
            <Text style={[styles.opisSekcji, { color: theme.colors.textSecondary }]}>
              Wybierz motyw. „Auto" dopasowuje się do ustawień telefonu.
            </Text>
            <View style={styles.motywRow}>
              {OPCJE_MOTYWU.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.motywBtn,
                    {
                      borderColor: preferencja === op.id ? theme.colors.primary : theme.colors.border,
                      backgroundColor: preferencja === op.id ? `${theme.colors.primary}20` : theme.colors.background,
                    },
                  ]}
                  onPress={() => zmienMotyw(op.id)}
                >
                  <Text style={styles.motywIkona}>{op.ikona}</Text>
                  <Text style={[styles.motywLabel, { color: preferencja === op.id ? theme.colors.primary : theme.colors.text }]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Domyślny tonaż */}
        <AnimatedCard delay={120}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>DOMYŚLNY TONAŻ AUTA</Text>
            <Text style={[styles.opisSekcji, { color: theme.colors.textSecondary }]}>
              Tonaż wstępnie wpisywany w każdym nowym planie.
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
          </View>
        </AnimatedCard>

        {/* Aplikacja */}
        <AnimatedCard delay={180}>
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
              ikona="🗑️"
              label="Wyczyść wszystkie dane"
              opis="Usuwa mieszanki, plany i wpisy Live"
              theme={theme}
              onPress={wyczyscDane}
              kolor={theme.colors.danger}
            />
          </View>
        </AnimatedCard>

        {/* O aplikacji + changelog */}
        <AnimatedCard delay={240}>
          <View style={[styles.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>O APLIKACJI</Text>
            <View style={[styles.appInfo, { backgroundColor: theme.colors.background, borderRadius: 12 }]}>
              <Text style={[styles.appNazwa, { color: theme.colors.primary }]}>⬛ Kalkulator MMA</Text>
              <Text style={[styles.appWersja, { color: theme.colors.textSecondary }]}>Wersja {WERSJA_APLIKACJI}</Text>
              <Text style={[styles.appOpis, { color: theme.colors.textSecondary }]}>
                Aplikacja mobilna do planowania i kontrolowania wbudowywania mieszanek mineralno-asfaltowych.
              </Text>
            </View>

            {aktualnyChangelog && (
              <View style={[styles.changelogBox, { backgroundColor: `${theme.colors.primary}10`, borderColor: theme.colors.primary }]}>
                <Text style={[styles.changelogTytul, { color: theme.colors.primary }]}>
                  Nowości w v{aktualnyChangelog.wersja} ({aktualnyChangelog.data})
                </Text>
                {aktualnyChangelog.zmiany.map((z, i) => (
                  <Text key={i} style={[styles.changelogPunkt, { color: theme.colors.text }]}>
                    • {z}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </AnimatedCard>
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
  zawartosc: { padding: 16, gap: 12 },
  sekcja: { borderRadius: 14, padding: 16, borderWidth: 1 },
  sekcjaTytul: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  opisSekcji: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  motywRow: { flexDirection: 'row', gap: 10 },
  motywBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 4 },
  motywIkona: { fontSize: 22 },
  motywLabel: { fontSize: 13, fontWeight: '700' },
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
  appInfo: { padding: 16, gap: 8 },
  appNazwa: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  appWersja: { fontSize: 13 },
  appOpis: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  changelogBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, gap: 6 },
  changelogTytul: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  changelogPunkt: { fontSize: 12, lineHeight: 18 },
});
