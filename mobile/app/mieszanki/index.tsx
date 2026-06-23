// ============================================================
// EKRAN: MIESZANKI – lista zwijana po wytwórni
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { grupujPoKluczu } from '../../src/utils/grouping';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import type { Mieszanka } from '../../src/types';

const PUSTE_DANE = { rodzaj: '', nrRecepty: '', ciezarObjetosciowy: '', wytwórnia: '' };

export default function MieszankiScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  const { mieszanki, dodajMieszanke, edytujMieszanke, usunMieszanke } = useMieszankiStore();
  const [modalWidoczny, setModalWidoczny] = useState(false);
  const [edytowanaMieszanka, setEdytowanaMieszanka] = useState<Mieszanka | null>(null);
  const [formularz, setFormularz] = useState(PUSTE_DANE);
  const [blad, setBlad] = useState('');

  const grupy = useMemo(
    () => grupujPoKluczu(mieszanki, (m) => m.wytwórnia, 'Bez wytwórni'),
    [mieszanki],
  );

  const otworzDodaj = () => { setEdytowanaMieszanka(null); setFormularz(PUSTE_DANE); setBlad(''); setModalWidoczny(true); };
  const otworzEdytuj = (m: Mieszanka) => {
    setEdytowanaMieszanka(m);
    setFormularz({ rodzaj: m.rodzaj, nrRecepty: m.nrRecepty ?? '', ciezarObjetosciowy: String(m.ciezarObjetosciowy), wytwórnia: m.wytwórnia ?? '' });
    setBlad(''); setModalWidoczny(true);
  };

  const waliduj = () => {
    if (!formularz.rodzaj.trim()) { setBlad('Podaj rodzaj mieszanki (np. AC22P).'); return false; }
    const c = parseFloat(formularz.ciezarObjetosciowy.replace(',', '.'));
    if (isNaN(c) || c <= 0 || c > 5) { setBlad('Podaj prawidłowy ciężar objętościowy (np. 2.455).'); return false; }
    setBlad(''); return true;
  };

  const zapisz = async () => {
    if (!waliduj()) return;
    const c = parseFloat(formularz.ciezarObjetosciowy.replace(',', '.'));
    const dane = { rodzaj: formularz.rodzaj.trim().toUpperCase(), nrRecepty: formularz.nrRecepty.trim() || undefined, ciezarObjetosciowy: Math.round(c * 1000) / 1000, wytwórnia: formularz.wytwórnia.trim() || undefined };
    if (edytowanaMieszanka) await edytujMieszanke(edytowanaMieszanka.id, dane);
    else await dodajMieszanke(dane);
    setModalWidoczny(false);
  };

  const potwierdźUsunięcie = (m: Mieszanka) => Alert.alert('Usuń mieszankę', `Czy na pewno chcesz usunąć "${m.rodzaj}"?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunMieszanke(m.id) },
  ]);

  const renderujMieszanke = (item: Mieszanka) => (
    <View key={item.id} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[tekstTytul, { color: theme.colors.text }]} numberOfLines={1}>{item.rodzaj}</Text>
        <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³
        </Text>
        {item.nrRecepty ? <Text style={[styles.recepta, { color: theme.colors.textSecondary }]} numberOfLines={1}>Recepta: {item.nrRecepty}</Text> : null}
      </View>
      <View style={styles.pozycjaPrzyciski}>
        <TouchableOpacity style={[styles.btnAkcji, { backgroundColor: `${theme.colors.info}20` }]} onPress={() => otworzEdytuj(item)}>
          <Text style={[styles.btnAkcjiTekst, { color: theme.colors.info }]}>Edytuj</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAkcji, { backgroundColor: `${theme.colors.danger}15` }]} onPress={() => potwierdźUsunięcie(item)}>
          <Text style={[styles.btnAkcjiTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Mieszanki"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[{ tekst: '+ Dodaj mieszankę', onPress: otworzDodaj, kolor: '#fff', tlo: theme.colors.primary }]}
      />

      {mieszanki.length === 0 ? (
        <EmptyState ikona="🏭" tytul="Brak mieszanek" opis="Dodaj pierwszą recepturę asfaltu, aby móc tworzyć plany wbudowywania." przyciskTekst="+ Dodaj pierwszą mieszankę" onPrzycisk={otworzDodaj} />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {grupy.map((grupa) => (
            <CollapsibleSection
              key={grupa.klucz}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏭"
              plaski={grupa.bezPrzypisania}
            >
              {grupa.elementy.map(renderujMieszanke)}
            </CollapsibleSection>
          ))}
        </ScrollView>
      )}

      <SafeModal
        visible={modalWidoczny}
        tytul={edytowanaMieszanka ? 'Edytuj mieszankę' : 'Nowa mieszanka'}
        theme={theme}
        onClose={() => setModalWidoczny(false)}
        prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grupaFormularza}>
          <EtykietaZTooltip label="Rodzaj mieszanki *" tooltip="Typ mieszanki, np. AC22P." theme={theme} />
          <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.rodzaj} onChangeText={(t) => setFormularz((f) => ({ ...f, rodzaj: t }))} placeholder="np. AC22P" placeholderTextColor={theme.colors.textSecondary} autoCapitalize="characters" />
          <EtykietaZTooltip label="Nr recepty" tooltip="Numer recepty wytwórni." theme={theme} />
          <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.nrRecepty} onChangeText={(t) => setFormularz((f) => ({ ...f, nrRecepty: t }))} placeholder="opcjonalne" placeholderTextColor={theme.colors.textSecondary} />
          <EtykietaZTooltip label="Ciężar objętościowy [t/m³] *" tooltip="Masa po zagęszczeniu, np. 2.455." theme={theme} />
          <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.ciezarObjetosciowy} onChangeText={(t) => setFormularz((f) => ({ ...f, ciezarObjetosciowy: t }))} placeholder="2.455" placeholderTextColor={theme.colors.textSecondary} keyboardType="decimal-pad" />
          <EtykietaZTooltip label="Wytwórnia" tooltip="Zakład produkcyjny – grupuje mieszanki na liście." theme={theme} />
          <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.wytwórnia} onChangeText={(t) => setFormularz((f) => ({ ...f, wytwórnia: t }))} placeholder="opcjonalne" placeholderTextColor={theme.colors.textSecondary} />
          {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>
    </View>
  );
}

function EtykietaZTooltip({ label, tooltip, theme }: { label: string; tooltip: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 6, gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{label}</Text>
      <InfoTooltip tresc={tooltip} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  recepta: { fontSize: 12, marginTop: 2 },
  pozycjaPrzyciski: { flexDirection: 'row', gap: 6 },
  btnAkcji: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  btnAkcjiTekst: { fontSize: 12, fontWeight: '600' },
  grupaFormularza: { padding: 18, gap: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  blad: { fontSize: 14, marginTop: 10, fontWeight: '500' },
});
