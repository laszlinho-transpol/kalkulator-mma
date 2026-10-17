// ============================================================
// OBMIAR PZT – lista sesji dnia
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { formatujDatePl } from '../../src/utils/dates';
import { formatLiczby } from '../../src/utils/calculations';
import { SafeModal } from '../../src/components/common/SafeModal';
import { Karta, Pole, kolorDnia, rodzajDnia } from '../../src/components/ui';
import { dataKrotko } from '../../src/budzet/wyswietlanie';
import { potwierdzAkcje } from '../../src/utils/dialog';

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
        {sesje.filter((s) => s.status !== 'archiwalna').length === 0 ? (
          <Karta podtytul="Brak sesji obmiaru. Naciśnij „Nowy” i zaimportuj XFDF." />
        ) : (
          sesje.filter((s) => s.status !== 'archiwalna').map((s) => {
            const sumaPow = s.obszary.reduce((a, o) => a + o.powierzchniaM2, 0);
            const zrodla = [...new Set(s.obszary.map((o) => o.zrodloNazwa))];
            return (
              <Karta
                key={s.id}
                tytul={s.nazwa}
                podtytul={[`Skala 1:${s.skala.mianownik} (${s.skala.metryNaCm} m / cm)`, zrodla.length ? `PDF: ${zrodla.join(', ')}` : ''].filter(Boolean).join('\n')}
                znaczek={{ tekst: dataKrotko(s.data), kolor: rodzajDnia(s.data) === 'roboczy' ? theme.colors.info : kolorDnia(theme, s.data) }}
                podsumowanie={`${s.obszary.length} obszar(ów) · ${formatLiczby(sumaPow)} m²`}
                onPress={() => router.push(`/obmiar/${s.id}` as never)}
                akcje={[
                  { tekst: 'Otwórz', rodzaj: 'glowna', onPress: () => router.push(`/obmiar/${s.id}` as never) },
                  {
                    tekst: 'Usuń',
                    rodzaj: 'niebezpieczna',
                    accessibilityLabel: `Usuń sesję ${s.nazwa}`,
                    onPress: () => potwierdzAkcje('Usuń sesję', `Usunąć „${s.nazwa}”?`, () => { void usunSesje(s.id); }),
                  },
                ]}
              />
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
          <Pole
            etykieta="Nazwa"
            info="Bez nazwy sesja dostanie nazwę z dzisiejszą datą."
            value={nazwa}
            onChangeText={setNazwa}
            placeholder="np. Różniaty – dzień 1"
            accessibilityLabel="Nazwa sesji obmiaru"
          />
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
});
