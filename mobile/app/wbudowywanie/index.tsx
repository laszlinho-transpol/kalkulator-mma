// ============================================================
// EKRAN: WBUDOWYWANIE – lista aktywnych planów (realizacja)
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import type { Plan } from '../../src/types';

export default function WbudowywanieScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { plany } = usePlanyStore();
  const { wpisyDlaPlanu } = useLiveStore();
  const aktywne = plany.filter((p) => p.status === 'aktywny');

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });

  const renderujPlan = ({ item }: { item: Plan }) => {
    const wpisy = wpisyDlaPlanu(item.id);
    const sumaMetrow = wpisy.reduce((s, w) => s + w.przejechaneMetry, 0);
    const sumaTon = wpisy.reduce((s, w) => s + w.tonazPrzywieziony, 0);

    return (
      <TouchableOpacity
        style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/wbudowywanie/${item.id}` as any)}
      >
        <View style={[styles.pasekStatusu, { backgroundColor: theme.colors.success }]} />
        <View style={styles.kartaZawartosc}>
          <View style={styles.kartaNaglowek}>
            <Text style={[styles.kartaData, { color: theme.colors.text }]}>
              {formatujDate(item.dataWbudowywania)}
            </Text>
            <View style={[styles.znaczekAktywny, { backgroundColor: `${theme.colors.success}20` }]}>
              <Text style={[styles.znaczekTekst, { color: theme.colors.success }]}>● Aktywny</Text>
            </View>
          </View>
          <Text style={[styles.kartaInfo, { color: theme.colors.textSecondary }]}>
            {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'}
          </Text>
          {wpisy.length > 0 && (
            <View style={styles.postepRzad}>
              <Text style={[styles.postepTekst, { color: theme.colors.primary }]}>
                {wpisy.length} aut • {sumaTon.toFixed(1)} Mg • {sumaMetrow.toFixed(0)} m
              </Text>
            </View>
          )}
          <Text style={[styles.strzalka, { color: theme.colors.textSecondary }]}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Wbudowywanie</Text>
        <View style={{ width: 60 }} />
      </View>

      {aktywne.length === 0 ? (
        <View style={styles.puste}>
          <Text style={styles.pusteIkona}>🚧</Text>
          <Text style={[styles.pusteTytul, { color: theme.colors.text }]}>Brak aktywnych planów</Text>
          <Text style={[styles.pusteOpis, { color: theme.colors.textSecondary }]}>
            Najpierw utwórz plan w sekcji "Zaplanuj Masę".
          </Text>
          <TouchableOpacity
            style={[styles.przyciskGo, { backgroundColor: theme.colors.secondary }]}
            onPress={() => router.push('/plan')}
          >
            <Text style={styles.przyciskGoTekst}>Przejdź do planowania</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={aktywne}
          keyExtractor={(item) => item.id}
          renderItem={renderujPlan}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  wstecz: { fontSize: 17 },
  tytul: { fontSize: 17, fontWeight: '700' },
  lista: { padding: 16, gap: 12 },
  karta: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pasekStatusu: { width: 4 },
  kartaZawartosc: { flex: 1, padding: 16 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kartaData: { fontSize: 16, fontWeight: '700', flex: 1 },
  znaczekAktywny: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  znaczekTekst: { fontSize: 12, fontWeight: '600' },
  kartaInfo: { fontSize: 13, marginBottom: 6 },
  postepRzad: { marginTop: 4 },
  postepTekst: { fontSize: 13, fontWeight: '600' },
  strzalka: { position: 'absolute', right: 16, top: '50%', fontSize: 22 },
  puste: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pusteIkona: { fontSize: 56, marginBottom: 16 },
  pusteTytul: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  pusteOpis: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  przyciskGo: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  przyciskGoTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
