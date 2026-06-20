// ============================================================
// EKRAN: MIESZANKI – lista i CRUD receptur asfaltowych
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput,
  Alert, useColorScheme, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
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

  const otworzDodaj = () => { setEdytowanaMieszanka(null); setFormularz(PUSTE_DANE); setBlad(''); setModalWidoczny(true); };
  const otworzEdytuj = (m: Mieszanka) => {
    setEdytowanaMieszanka(m);
    setFormularz({ rodzaj: m.rodzaj, nrRecepty: m.nrRecepty ?? '', ciezarObjetosciowy: String(m.ciezarObjetosciowy), wytwórnia: m.wytwórnia ?? '' });
    setBlad(''); setModalWidoczny(true);
  };
  const zamknijModal = () => { setModalWidoczny(false); setEdytowanaMieszanka(null); };

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
    zamknijModal();
  };

  const potwierdźUsunięcie = (m: Mieszanka) => Alert.alert('Usuń mieszankę', `Czy na pewno chcesz usunąć "${m.rodzaj}"?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunMieszanke(m.id) },
  ]);

  const renderujMieszanke = ({ item, index }: { item: Mieszanka; index: number }) => (
    <AnimatedCard delay={index * 60}>
      <View style={[styles.pozycja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.pozycjaLewo}>
          <Text style={[styles.rodzaj, { color: theme.colors.text }]}>{item.rodzaj}</Text>
          <Text style={[styles.szczegoły, { color: theme.colors.textSecondary }]}>
            ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³{item.wytwórnia ? `  •  ${item.wytwórnia}` : ''}
          </Text>
          {item.nrRecepty ? <Text style={[styles.recepta, { color: theme.colors.textSecondary }]}>Recepta: {item.nrRecepty}</Text> : null}
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
    </AnimatedCard>
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
        <FlatList
          data={mieszanki}
          keyExtractor={(item) => item.id}
          renderItem={renderujMieszanke}
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalWidoczny} animationType="slide" presentationStyle="pageSheet" onRequestClose={zamknijModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: theme.colors.modalBackground }]}>
            <AppHeader
              tytul={edytowanaMieszanka ? 'Edytuj mieszankę' : 'Nowa mieszanka'}
              lewy={{ tekst: 'Anuluj', onPress: zamknijModal, kolor: theme.colors.danger }}
              prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.grupaFormularza}>
                <EtykietaZTooltip label="Rodzaj mieszanki *" tooltip="Typ mieszanki, np. AC22P (beton asfaltowy) lub SMA11 (mastyks grysowy)." theme={theme} />
                <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.rodzaj} onChangeText={(t) => setFormularz((f) => ({ ...f, rodzaj: t }))} placeholder="np. AC22P, SMA11" placeholderTextColor={theme.colors.textSecondary} autoCapitalize="characters" />

                <EtykietaZTooltip label="Nr recepty" tooltip="Numer laboratoryjnej recepty wytwórni. Pole opcjonalne." theme={theme} />
                <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.nrRecepty} onChangeText={(t) => setFormularz((f) => ({ ...f, nrRecepty: t }))} placeholder="opcjonalne" placeholderTextColor={theme.colors.textSecondary} />

                <EtykietaZTooltip label="Ciężar objętościowy [t/m³] *" tooltip="Masa jednostkowa po zagęszczeniu, np. 2.455. Wpływa bezpośrednio na obliczaną ilość ton." theme={theme} />
                <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.ciezarObjetosciowy} onChangeText={(t) => setFormularz((f) => ({ ...f, ciezarObjetosciowy: t }))} placeholder="np. 2.455" placeholderTextColor={theme.colors.textSecondary} keyboardType="decimal-pad" />

                <EtykietaZTooltip label="Wytwórnia" tooltip="Zakład produkcyjny. Pole opcjonalne." theme={theme} />
                <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={formularz.wytwórnia} onChangeText={(t) => setFormularz((f) => ({ ...f, wytwórnia: t }))} placeholder="opcjonalne" placeholderTextColor={theme.colors.textSecondary} />

                {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  lista: { padding: 14, gap: 10 },
  pozycja: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pozycjaLewo: { flex: 1 },
  rodzaj: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  szczegoły: { fontSize: 13 },
  recepta: { fontSize: 12, marginTop: 2 },
  pozycjaPrzyciski: { flexDirection: 'row', gap: 8 },
  btnAkcji: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  btnAkcjiTekst: { fontSize: 13, fontWeight: '600' },
  modal: { flex: 1 },
  grupaFormularza: { padding: 18, gap: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  blad: { fontSize: 14, marginTop: 10, fontWeight: '500' },
});
