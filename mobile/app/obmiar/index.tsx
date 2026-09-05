// ============================================================
// OBMIAR PZT – lista sesji dnia
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { formatujDatePl } from '../../src/utils/dates';
import { formatLiczby } from '../../src/utils/calculations';
import { SafeModal } from '../../src/components/common/SafeModal';

export default function ObmiarIndexScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { sesje, zaladuj, utworzSesje, usunSesje } = useObmiarStore();
  const [modalNowa, setModalNowa] = useState(false);
  const [nazwa, setNazwa] = useState('');

  useEffect(() => { zaladuj(); }, []);

  const utworz = async () => {
    const n = nazwa.trim() || `Obmiar ${formatujDatePl(new Date().toISOString()).split(',')[0]}`;
    const sesja = await utworzSesje(n, new Date().toISOString().slice(0, 10));
    setModalNowa(false);
    setNazwa('');
    router.push(`/obmiar/${sesja.id}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Obmiar PZT"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Nowy', onPress: () => setModalNowa(true), kolor: theme.colors.primary }}
      />
      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 20 }]}>
        {sesje.length === 0 ? (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Brak sesji obmiaru. Naciśnij „Nowy” i zaimportuj XFDF.
            </Text>
          </View>
        ) : (
          sesje.map((s) => {
            const sumaPow = s.obszary.reduce((a, o) => a + o.powierzchniaM2, 0);
            const zrodla = [...new Set(s.obszary.map((o) => o.zrodloNazwa))];
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push(`/obmiar/${s.id}` as any)}
                onLongPress={() => Alert.alert('Usuń sesję', `Usunąć „${s.nazwa}”?`, [
                  { text: 'Anuluj', style: 'cancel' },
                  { text: 'Usuń', style: 'destructive', onPress: () => usunSesje(s.id) },
                ])}
              >
                <Text style={[styles.tytul, { color: theme.colors.primary }]}>{s.nazwa}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                  {s.data} · {s.obszary.length} obszar(ów) · {formatLiczby(sumaPow)} m²
                </Text>
                {zrodla.length > 0 && (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                    PDF: {zrodla.join(', ')}
                  </Text>
                )}
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Skala 1:{s.skala.mianownik} ({s.skala.metryNaCm} m / cm)
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <SafeModal
        visible={modalNowa}
        tytul="Nowa sesja obmiaru"
        theme={theme}
        onClose={() => setModalNowa(false)}
        lewy={{ tekst: 'Anuluj', onPress: () => setModalNowa(false), kolor: theme.colors.textSecondary }}
        prawy={{ tekst: 'Utwórz', onPress: utworz, kolor: theme.colors.primary }}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>Nazwa (opcjonalnie)</Text>
          <TextInput
            value={nazwa}
            onChangeText={setNazwa}
            placeholder="np. Różniaty – dzień 1"
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16,
              borderColor: theme.colors.border, color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
            }}
          />
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  tytul: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
});
