// ============================================================
// EKRAN: MIESZANKI – lista i CRUD receptur asfaltowych
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { AnimatedCard } from '../../src/components/common/AnimatedCard';
import type { Mieszanka } from '../../src/types';

const PUSTE_DANE = {
  rodzaj: '',
  nrRecepty: '',
  ciezarObjetosciowy: '',
  wytwórnia: '',
};

export default function MieszankiScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const { mieszanki, dodajMieszanke, edytujMieszanke, usunMieszanke } = useMieszankiStore();

  const [modalWidoczny, setModalWidoczny] = useState(false);
  const [edytowanaMieszanka, setEdytowanaMieszanka] = useState<Mieszanka | null>(null);
  const [formularz, setFormularz] = useState(PUSTE_DANE);
  const [blad, setBlad] = useState('');

  const otworzDodaj = () => {
    setEdytowanaMieszanka(null);
    setFormularz(PUSTE_DANE);
    setBlad('');
    setModalWidoczny(true);
  };

  const otworzEdytuj = (mieszanka: Mieszanka) => {
    setEdytowanaMieszanka(mieszanka);
    setFormularz({
      rodzaj: mieszanka.rodzaj,
      nrRecepty: mieszanka.nrRecepty ?? '',
      ciezarObjetosciowy: String(mieszanka.ciezarObjetosciowy),
      wytwórnia: mieszanka.wytwórnia ?? '',
    });
    setBlad('');
    setModalWidoczny(true);
  };

  const zamknijModal = () => {
    setModalWidoczny(false);
    setEdytowanaMieszanka(null);
  };

  const waliduj = (): boolean => {
    if (!formularz.rodzaj.trim()) {
      setBlad('Podaj rodzaj mieszanki (np. AC22P).');
      return false;
    }
    const ciezar = parseFloat(formularz.ciezarObjetosciowy.replace(',', '.'));
    if (isNaN(ciezar) || ciezar <= 0 || ciezar > 5) {
      setBlad('Podaj prawidłowy ciężar objętościowy (np. 2.455).');
      return false;
    }
    setBlad('');
    return true;
  };

  const zapisz = async () => {
    if (!waliduj()) return;
    const ciezar = parseFloat(formularz.ciezarObjetosciowy.replace(',', '.'));
    const dane = {
      rodzaj: formularz.rodzaj.trim().toUpperCase(),
      nrRecepty: formularz.nrRecepty.trim() || undefined,
      ciezarObjetosciowy: Math.round(ciezar * 1000) / 1000,
      wytwórnia: formularz.wytwórnia.trim() || undefined,
    };

    if (edytowanaMieszanka) {
      await edytujMieszanke(edytowanaMieszanka.id, dane);
    } else {
      await dodajMieszanke(dane);
    }
    zamknijModal();
  };

  const potwierdźUsunięcie = (mieszanka: Mieszanka) => {
    Alert.alert(
      'Usuń mieszankę',
      `Czy na pewno chcesz usunąć "${mieszanka.rodzaj}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => usunMieszanke(mieszanka.id),
        },
      ],
    );
  };

  const renderujMieszanke = ({ item, index }: { item: Mieszanka; index: number }) => (
    <AnimatedCard delay={index * 60}>
    <View style={[styles.pozycja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.pozycjaLewo}>
        <Text style={[styles.rodzaj, { color: theme.colors.text }]}>{item.rodzaj}</Text>
        <Text style={[styles.szczegoły, { color: theme.colors.textSecondary }]}>
          ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³
          {item.wytwórnia ? `  •  ${item.wytwórnia}` : ''}
        </Text>
        {item.nrRecepty ? (
          <Text style={[styles.recepta, { color: theme.colors.textSecondary }]}>
            Recepta: {item.nrRecepty}
          </Text>
        ) : null}
      </View>
      <View style={styles.pozycjaPrzyciski}>
        <TouchableOpacity
          style={[styles.przyciskAkcji, { backgroundColor: `${theme.colors.info}20` }]}
          onPress={() => otworzEdytuj(item)}
        >
          <Text style={[styles.przyciskAkcjiTekst, { color: theme.colors.info }]}>Edytuj</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.przyciskAkcji, { backgroundColor: `${theme.colors.danger}15` }]}
          onPress={() => potwierdźUsunięcie(item)}
        >
          <Text style={[styles.przyciskAkcjiTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
      </View>
    </View>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.przyciskWstecz}>
          <Text style={[styles.przyciskWsteczTekst, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytulNaglowka, { color: theme.colors.text }]}>Mieszanki</Text>
        <TouchableOpacity
          style={[styles.przyciskDodaj, { backgroundColor: theme.colors.primary }]}
          onPress={otworzDodaj}
        >
          <Text style={styles.przyciskDodajTekst}>+ Dodaj</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {mieszanki.length === 0 ? (
        <View style={styles.puste}>
          <Text style={styles.pusteIkona}>🧱</Text>
          <Text style={[styles.pusteTytul, { color: theme.colors.text }]}>Brak mieszanek</Text>
          <Text style={[styles.pusteOpis, { color: theme.colors.textSecondary }]}>
            Dodaj pierwszą mieszankę asfaltową, aby móc planować wbudowywanie.
          </Text>
        </View>
      ) : (
        <FlatList
          data={mieszanki}
          keyExtractor={(item) => item.id}
          renderItem={renderujMieszanke}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal – Dodaj / Edytuj */}
      <Modal
        visible={modalWidoczny}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={zamknijModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.modalBackground }]}>
            <View style={[styles.modalNaglowek, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={zamknijModal}>
                <Text style={[styles.anuluj, { color: theme.colors.danger }]}>Anuluj</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTytul, { color: theme.colors.text }]}>
                {edytowanaMieszanka ? 'Edytuj mieszankę' : 'Nowa mieszanka'}
              </Text>
              <TouchableOpacity onPress={zapisz}>
                <Text style={[styles.zapisz, { color: theme.colors.primary }]}>Zapisz</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalZawartosc} keyboardShouldPersistTaps="handled">
              <PolaFormularza
                formularz={formularz}
                setFormularz={setFormularz}
                theme={theme}
              />
              {blad ? (
                <Text style={[styles.komunikatBledu, { color: theme.colors.danger }]}>{blad}</Text>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function PolaFormularza({
  formularz,
  setFormularz,
  theme,
}: {
  formularz: typeof PUSTE_DANE;
  setFormularz: React.Dispatch<React.SetStateAction<typeof PUSTE_DANE>>;
  theme: typeof lightTheme | typeof darkTheme;
}) {
  const inputStyle = [styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }];
  const labelStyle = [styles.etykieta, { color: theme.colors.textSecondary }];

  return (
    <View style={styles.grupaFormularza}>
      <View style={styles.rzadEtykiety}>
        <Text style={labelStyle}>Rodzaj mieszanki *</Text>
        <InfoTooltip tresc="Typ mieszanki mineralno-asfaltowej, np. AC22P (beton asfaltowy 22mm do podbudowy), SMA11 (mastyks grysowy 11mm do nawierzchni)." />
      </View>
      <TextInput
        style={inputStyle}
        value={formularz.rodzaj}
        onChangeText={(t) => setFormularz((f) => ({ ...f, rodzaj: t }))}
        placeholder="np. AC22P, SMA11"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="characters"
        returnKeyType="next"
      />

      <View style={styles.rzadEtykiety}>
        <Text style={labelStyle}>Nr recepty</Text>
        <InfoTooltip tresc="Numer laboratoryjnej recepty wytwórni. Pole opcjonalne – służy do identyfikacji konkretnej partii mieszanki." />
      </View>
      <TextInput
        style={inputStyle}
        value={formularz.nrRecepty}
        onChangeText={(t) => setFormularz((f) => ({ ...f, nrRecepty: t }))}
        placeholder="opcjonalne"
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType="next"
      />

      <View style={styles.rzadEtykiety}>
        <Text style={labelStyle}>Ciężar objętościowy [t/m³] *</Text>
        <InfoTooltip tresc="Masa jednostkowa mieszanki po zagęszczeniu. Podawana w t/m³ z dokładnością do 3 miejsc po przecinku (np. 2.455). Wpływa bezpośrednio na obliczaną ilość ton." />
      </View>
      <TextInput
        style={inputStyle}
        value={formularz.ciezarObjetosciowy}
        onChangeText={(t) => setFormularz((f) => ({ ...f, ciezarObjetosciowy: t }))}
        placeholder="np. 2.455"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />

      <View style={styles.rzadEtykiety}>
        <Text style={labelStyle}>Wytwórnia</Text>
        <InfoTooltip tresc="Nazwa zakładu produkcyjnego (wytwórni mas bitumicznych), który produkuje tę mieszankę. Pole opcjonalne." />
      </View>
      <TextInput
        style={inputStyle}
        value={formularz.wytwórnia}
        onChangeText={(t) => setFormularz((f) => ({ ...f, wytwórnia: t }))}
        placeholder="opcjonalne"
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType="done"
      />
    </View>
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
  przyciskWstecz: { minWidth: 60 },
  przyciskWsteczTekst: { fontSize: 17 },
  tytulNaglowka: { fontSize: 17, fontWeight: '700' },
  przyciskDodaj: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  przyciskDodajTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
  lista: { padding: 16, gap: 10 },
  pozycja: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pozycjaLewo: { flex: 1 },
  rodzaj: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  szczegoły: { fontSize: 13 },
  recepta: { fontSize: 12, marginTop: 2 },
  pozycjaPrzyciski: { flexDirection: 'row', gap: 8 },
  przyciskAkcji: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  przyciskAkcjiTekst: { fontSize: 13, fontWeight: '600' },
  puste: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  pusteIkona: { fontSize: 56, marginBottom: 16 },
  pusteTytul: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  pusteOpis: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modal: { flex: 1 },
  modalNaglowek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTytul: { fontSize: 17, fontWeight: '700' },
  anuluj: { fontSize: 17 },
  zapisz: { fontSize: 17, fontWeight: '700' },
  modalZawartosc: { flex: 1 },
  grupaFormularza: { padding: 20, gap: 4 },
  rzadEtykiety: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 },
  etykieta: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  komunikatBledu: {
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
