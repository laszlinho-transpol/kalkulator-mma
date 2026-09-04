// ============================================================
// OBMIAR PZT – szczegóły sesji: import XFDF, kolejność, podgląd
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, Alert, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { WielokatPodglad } from '../../src/components/obmiar/WielokatPodglad';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { wybierzIParsujXfdf } from '../../src/utils/xfdfImport';
import { formatLiczby } from '../../src/utils/calculations';
import { DOMYSLNA_SKALA_PZT } from '../../src/types';

const SCREEN_W = Dimensions.get('window').width;

export default function ObmiarDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId() ?? '';
  const {
    sesjaPoId, dodajObszaryZXfdf, przesunObszar, usunObszar, zmienSkale,
  } = useObmiarStore();
  const sesja = id ? sesjaPoId(id) : undefined;
  const [podgladId, setPodgladId] = useState<string | null>(null);

  const sumaPow = useMemo(
    () => sesja?.obszary.reduce((a, o) => a + o.powierzchniaM2, 0) ?? 0,
    [sesja],
  );
  const zrodla = useMemo(
    () => [...new Set(sesja?.obszary.map((o) => o.zrodloNazwa) ?? [])],
    [sesja],
  );
  const obszarPodgladu = sesja?.obszary.find((o) => o.id === podgladId) ?? sesja?.obszary[0];

  if (!sesja) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Obmiar" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 40 }}>Sesja nie znaleziona.</Text>
      </View>
    );
  }

  const importuj = async () => {
    const wynik = await wybierzIParsujXfdf();
    if (!wynik.sukces) {
      if (wynik.blad !== 'Anulowano wybór pliku.') Alert.alert('Import XFDF', wynik.blad);
      return;
    }
    await dodajObszaryZXfdf(sesja.id, wynik.wynik);
    Alert.alert(
      'Zaimportowano',
      `Dodano ${wynik.wynik.polygony.length} obszar(ów) z pliku „${wynik.wynik.zrodloNazwa}”.\nUstaw kolejność strzałkami ↑↓.`,
    );
  };

  const ustawSkale500 = () => {
    Alert.alert('Skala 1:500', 'Ustawić skalę 1 cm = 5 m (jak PZT Różniaty)?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Ustaw', onPress: () => zmienSkale(sesja.id, DOMYSLNA_SKALA_PZT) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={sesja.nazwa}
        podtytul={`${sesja.obszary.length} obszarów · ${formatLiczby(sumaPow)} m²`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: '+ XFDF', onPress: importuj, kolor: '#fff', tlo: theme.colors.success }}
      />

      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.karta, { backgroundColor: `${theme.colors.primary}10`, borderColor: theme.colors.primary }]}>
          <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>Sesja dnia</Text>
          <Row label="Data" v={sesja.data} theme={theme} />
          <Row label="Skala" v={`1:${sesja.skala.mianownik} (${sesja.skala.metryNaCm} m / cm)`} theme={theme} />
          <Row label="Łączna powierzchnia" v={`${formatLiczby(sumaPow)} m²`} theme={theme} bold />
          {zrodla.length > 0 && (
            <Row label="Źródła PDF / XFDF" v={zrodla.join(' · ')} theme={theme} />
          )}
          <TouchableOpacity style={[styles.btnSek, { borderColor: theme.colors.border }]} onPress={ustawSkale500}>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Ustaw skalę 1:500</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.info, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
          <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18 }}>
            Obszary z <Text style={{ fontWeight: '700' }}>różnych PDF</Text> dodajesz kolejnymi importami XFDF.
            Kolejność 1 → 2 → 3 to kolejność układania (jak działki w LIVE).
          </Text>
        </View>

        {obszarPodgladu && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Podgląd obszaru</Text>
            <WielokatPodglad
              obszar={obszarPodgladu}
              szerokosc={SCREEN_W - 56}
              wysokosc={240}
            />
          </View>
        )}

        <Text style={[styles.kartaTytul, { color: theme.colors.text, marginLeft: 4 }]}>
          Kolejność układania
        </Text>

        {sesja.obszary.length === 0 ? (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Brak obszarów. Naciśnij „+ XFDF” i wybierz plik eksportu komentarzy z PDF-XChange.
            </Text>
          </View>
        ) : (
          [...sesja.obszary].sort((a, b) => a.kolejnosc - b.kolejnosc).map((o) => (
            <View
              key={o.id}
              style={[
                styles.karta,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: obszarPodgladu?.id === o.id ? theme.colors.success : theme.colors.border,
                  borderWidth: obszarPodgladu?.id === o.id ? 2 : 1,
                },
              ]}
            >
              <TouchableOpacity onPress={() => setPodgladId(o.id)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 14 }}>
                  {o.kolejnosc}. {o.nazwa}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {formatLiczby(o.powierzchniaM2)} m² · obwód {formatLiczby(o.obwodM)} m · {o.wierzcholkiPdf.length} węzłów
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  📄 {o.zrodloNazwa}
                </Text>
              </TouchableOpacity>
              <View style={styles.rzadAkcji}>
                <TouchableOpacity
                  style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]}
                  onPress={() => przesunObszar(sesja.id, o.id, -1)}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]}
                  onPress={() => przesunObszar(sesja.id, o.id, 1)}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnMini, { backgroundColor: `${theme.colors.danger}20` }]}
                  onPress={() => Alert.alert('Usuń obszar', `Usunąć „${o.nazwa}”?`, [
                    { text: 'Anuluj', style: 'cancel' },
                    { text: 'Usuń', style: 'destructive', onPress: () => usunObszar(sesja.id, o.id) },
                  ])}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.btnImport, { backgroundColor: theme.colors.success }]}
          onPress={importuj}
        >
          <Text style={styles.btnImportTekst}>+ Importuj kolejny XFDF (inny PDF)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({
  label, v, theme, bold,
}: {
  label: string; v: string; theme: AppTheme; bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: bold ? '700' : '400', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  kartaTytul: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  info: { borderWidth: 1, borderRadius: 12, padding: 12 },
  rzadAkcji: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnMini: { width: 40, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnSek: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnImport: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnImportTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
