// ============================================================
// EKRAN: MIESZANKI – wytwórnie + mieszanki (zwijane)
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, useColorScheme, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../src/stores/wytwornieStore';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import type { Mieszanka, Wytwornia } from '../../src/types';

const PUSTA_MIESZANKA = { rodzaj: '', nrRecepty: '', ciezarObjetosciowy: '', wytworniaId: '' };

export default function MieszankiScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  const { mieszanki, dodajMieszanke, edytujMieszanke, usunMieszanke } = useMieszankiStore();
  const { wytwornie, dodajWytwornie, edytujWytwornie, usunWytwornie } = useWytwornieStore();

  const [modalMieszanka, setModalMieszanka] = useState(false);
  const [modalWytwornia, setModalWytwornia] = useState(false);
  const [edytowanaMieszanka, setEdytowanaMieszanka] = useState<Mieszanka | null>(null);
  const [edytowanaWytwornia, setEdytowanaWytwornia] = useState<Wytwornia | null>(null);
  const [formMieszanka, setFormMieszanka] = useState(PUSTA_MIESZANKA);
  const [nazwaWytw, setNazwaWytw] = useState('');
  const [linkMaps, setLinkMaps] = useState('');
  const [blad, setBlad] = useState('');

  const mieszankiBezWytworni = useMemo(
    () => mieszanki.filter((m) => !m.wytworniaId && !m.wytwórnia),
    [mieszanki],
  );

  const mieszankiDlaWytworni = (wytworniaId: string) =>
    mieszanki.filter((m) => m.wytworniaId === wytworniaId);

  const otworzDodajMieszanke = () => {
    setEdytowanaMieszanka(null);
    setFormMieszanka(PUSTA_MIESZANKA);
    setBlad('');
    setModalMieszanka(true);
  };

  const otworzEdytujMieszanke = (m: Mieszanka) => {
    setEdytowanaMieszanka(m);
    setFormMieszanka({
      rodzaj: m.rodzaj,
      nrRecepty: m.nrRecepty ?? '',
      ciezarObjetosciowy: String(m.ciezarObjetosciowy),
      wytworniaId: m.wytworniaId ?? '',
    });
    setBlad('');
    setModalMieszanka(true);
  };

  const otworzDodajWytwornie = () => {
    setEdytowanaWytwornia(null);
    setNazwaWytw('');
    setLinkMaps('');
    setBlad('');
    setModalWytwornia(true);
  };

  const otworzEdytujWytwornie = (w: Wytwornia) => {
    setEdytowanaWytwornia(w);
    setNazwaWytw(w.nazwa);
    setLinkMaps(w.linkGoogleMaps ?? '');
    setBlad('');
    setModalWytwornia(true);
  };

  const walidujMieszanke = () => {
    if (!formMieszanka.rodzaj.trim()) { setBlad('Podaj rodzaj mieszanki (np. AC22P).'); return false; }
    const c = parseFloat(formMieszanka.ciezarObjetosciowy.replace(',', '.'));
    if (isNaN(c) || c <= 0 || c > 5) { setBlad('Podaj prawidłowy ciężar objętościowy (np. 2.455).'); return false; }
    setBlad('');
    return true;
  };

  const zapiszMieszanke = async () => {
    if (!walidujMieszanke()) return;
    const c = parseFloat(formMieszanka.ciezarObjetosciowy.replace(',', '.'));
    const wytw = wytwornie.find((w) => w.id === formMieszanka.wytworniaId);
    const dane = {
      rodzaj: formMieszanka.rodzaj.trim().toUpperCase(),
      nrRecepty: formMieszanka.nrRecepty.trim() || undefined,
      ciezarObjetosciowy: Math.round(c * 1000) / 1000,
      wytworniaId: formMieszanka.wytworniaId || undefined,
      wytwórnia: wytw?.nazwa,
    };
    if (edytowanaMieszanka) await edytujMieszanke(edytowanaMieszanka.id, dane);
    else await dodajMieszanke(dane);
    setModalMieszanka(false);
  };

  const zapiszWytwornie = async () => {
    if (!nazwaWytw.trim()) { setBlad('Podaj nazwę wytwórni.'); return; }
    const dane = { nazwa: nazwaWytw.trim(), linkGoogleMaps: linkMaps.trim() || undefined };
    if (edytowanaWytwornia) await edytujWytwornie(edytowanaWytwornia.id, dane);
    else await dodajWytwornie(dane);
    setModalWytwornia(false);
  };

  const kopiujLink = async () => {
    if (!linkMaps.trim()) return;
    await Clipboard.setStringAsync(linkMaps.trim());
    Alert.alert('Skopiowano', 'Link do lokalizacji w schowku.');
  };

  const otworzMaps = () => {
    if (!linkMaps.trim()) return;
    Linking.openURL(linkMaps.trim()).catch(() => Alert.alert('Błąd', 'Nie udało się otworzyć mapy.'));
  };

  const potwierdzUsunMieszanke = (m: Mieszanka) => Alert.alert('Usuń mieszankę', `Usunąć "${m.rodzaj}"?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunMieszanke(m.id) },
  ]);

  const potwierdzUsunWytwornie = (w: Wytwornia) => {
    const liczba = mieszankiDlaWytworni(w.id).length;
    Alert.alert('Usuń wytwórnię', `Usunąć "${w.nazwa}"?${liczba > 0 ? ` (${liczba} mieszanek trafi do „Bez wytwórni”)` : ''}`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          for (const m of mieszankiDlaWytworni(w.id)) {
            await edytujMieszanke(m.id, { wytworniaId: undefined, wytwórnia: undefined });
          }
          await usunWytwornie(w.id);
        },
      },
    ]);
  };

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
        <TouchableOpacity style={[styles.btnAkcji, { backgroundColor: `${theme.colors.info}20` }]} onPress={() => otworzEdytujMieszanke(item)}>
          <Text style={[styles.btnAkcjiTekst, { color: theme.colors.info }]}>Edytuj</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAkcji, { backgroundColor: `${theme.colors.danger}15` }]} onPress={() => potwierdzUsunMieszanke(item)}>
          <Text style={[styles.btnAkcjiTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const pusto = mieszanki.length === 0 && wytwornie.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Mieszanki"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '+ Dodaj wytwórnię', onPress: otworzDodajWytwornie, kolor: theme.colors.secondary },
          { tekst: '+ Dodaj mieszankę', onPress: otworzDodajMieszanke, kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {pusto ? (
        <EmptyState
          ikona="🏭"
          tytul="Brak mieszanek"
          opis="Dodaj wytwórnię i pierwszą recepturę asfaltu, aby móc tworzyć plany wbudowywania."
          przyciskTekst="+ Dodaj pierwszą mieszankę"
          onPrzycisk={otworzDodajMieszanke}
          drugPrzyciskTekst="+ Dodaj wytwórnię"
          onDrugPrzycisk={otworzDodajWytwornie}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {wytwornie.map((w) => (
            <CollapsibleSection
              key={w.id}
              tytul={w.nazwa}
              liczba={mieszankiDlaWytworni(w.id).length}
              theme={theme}
              ikona="🏭"
              akcjaEtykieta="Edytuj"
              onAkcja={() => otworzEdytujWytwornie(w)}
            >
              {w.linkGoogleMaps ? (
                <TouchableOpacity onPress={otworzMaps} style={{ marginBottom: 6 }}>
                  <Text style={{ color: theme.colors.info, fontSize: 13, fontWeight: '600' }}>📍 Lokalizacja wytwórni</Text>
                </TouchableOpacity>
              ) : null}
              {mieszankiDlaWytworni(w.id).length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>Brak mieszanek w tej wytwórni</Text>
              ) : (
                mieszankiDlaWytworni(w.id).map(renderujMieszanke)
              )}
              <TouchableOpacity onPress={() => potwierdzUsunWytwornie(w)} style={{ marginTop: 4 }}>
                <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '600' }}>Usuń wytwórnię</Text>
              </TouchableOpacity>
            </CollapsibleSection>
          ))}
          {mieszankiBezWytworni.length > 0 && (
            <CollapsibleSection tytul="Bez wytwórni" liczba={mieszankiBezWytworni.length} theme={theme} ikona="📦" plaski>
              {mieszankiBezWytworni.map(renderujMieszanke)}
            </CollapsibleSection>
          )}
        </ScrollView>
      )}

      {/* Modal mieszanki */}
      <SafeModal
        visible={modalMieszanka}
        tytul={edytowanaMieszanka ? 'Edytuj mieszankę' : 'Nowa mieszanka'}
        theme={theme}
        onClose={() => setModalMieszanka(false)}
        prawy={{ tekst: 'Zapisz', onPress: zapiszMieszanke, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grupaFormularza}>
          <EtykietaZTooltip label="Wytwórnia" tooltip="Wybierz wytwórnię z listy lub zostaw puste – mieszanka trafi do „Bez wytwórni”." theme={theme} />
          <View style={styles.wytwPicker}>
            <TouchableOpacity
              style={[styles.wytwOpcja, { borderColor: !formMieszanka.wytworniaId ? theme.colors.primary : theme.colors.border, backgroundColor: !formMieszanka.wytworniaId ? `${theme.colors.primary}12` : theme.colors.inputBackground }]}
              onPress={() => setFormMieszanka((f) => ({ ...f, wytworniaId: '' }))}
            >
              <Text style={{ color: theme.colors.text, fontSize: 13 }}>Bez wytwórni</Text>
            </TouchableOpacity>
            {wytwornie.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.wytwOpcja, { borderColor: formMieszanka.wytworniaId === w.id ? theme.colors.primary : theme.colors.border, backgroundColor: formMieszanka.wytworniaId === w.id ? `${theme.colors.primary}12` : theme.colors.inputBackground }]}
                onPress={() => setFormMieszanka((f) => ({ ...f, wytworniaId: w.id }))}
              >
                <Text style={{ color: theme.colors.text, fontSize: 13 }}>{w.nazwa}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <EtykietaZTooltip label="Rodzaj mieszanki *" tooltip="Typ mieszanki, np. AC22P." theme={theme} />
          <TextInput style={[styles.input, inp(theme)]} value={formMieszanka.rodzaj} onChangeText={(t) => setFormMieszanka((f) => ({ ...f, rodzaj: t }))} placeholder="np. AC22P" placeholderTextColor={theme.colors.textSecondary} autoCapitalize="characters" />
          <EtykietaZTooltip label="Nr recepty" tooltip="Numer recepty wytwórni." theme={theme} />
          <TextInput style={[styles.input, inp(theme)]} value={formMieszanka.nrRecepty} onChangeText={(t) => setFormMieszanka((f) => ({ ...f, nrRecepty: t }))} placeholder="opcjonalne" placeholderTextColor={theme.colors.textSecondary} />
          <EtykietaZTooltip label="Ciężar objętościowy [t/m³] *" tooltip="Masa po zagęszczeniu, np. 2.455." theme={theme} />
          <TextInput style={[styles.input, inp(theme)]} value={formMieszanka.ciezarObjetosciowy} onChangeText={(t) => setFormMieszanka((f) => ({ ...f, ciezarObjetosciowy: t }))} placeholder="2.455" placeholderTextColor={theme.colors.textSecondary} keyboardType="decimal-pad" />
          {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>

      {/* Modal wytwórni */}
      <SafeModal
        visible={modalWytwornia}
        tytul={edytowanaWytwornia ? 'Edytuj wytwórnię' : 'Dodaj wytwórnię'}
        theme={theme}
        onClose={() => setModalWytwornia(false)}
        prawy={{ tekst: 'Zapisz', onPress: zapiszWytwornie, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grupaFormularza}>
          <EtykietaZTooltip label="Nazwa wytwórni *" tooltip="Nazwa zakładu produkcyjnego MMA." theme={theme} />
          <TextInput style={[styles.input, inp(theme)]} value={nazwaWytw} onChangeText={setNazwaWytw} placeholder="np. Wytwórnia Kraków" placeholderTextColor={theme.colors.textSecondary} />
          <EtykietaZTooltip label="Lokalizacja (Google Maps)" tooltip="Wklej link z Google Maps (maps.app.goo.gl/...). Po dodaniu zobaczysz podgląd mapy." theme={theme} />
          <TextInput style={[styles.input, inp(theme)]} value={linkMaps} onChangeText={setLinkMaps} placeholder="https://maps.app.goo.gl/..." placeholderTextColor={theme.colors.textSecondary} autoCapitalize="none" keyboardType="url" />
          {linkMaps.trim().length > 10 && (
            <View style={[styles.mapPreview, { borderColor: theme.colors.border }]}>
              <TouchableOpacity onPress={otworzMaps} activeOpacity={0.9}>
                <WebView
                  source={{ uri: linkMaps.trim() }}
                  style={{ height: 160, borderRadius: 10 }}
                  scrollEnabled={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 6 }}>
                Dotknij mapy, aby otworzyć w Google Maps
              </Text>
              <View style={styles.mapAkcje}>
                <TouchableOpacity style={[styles.mapBtn, { backgroundColor: theme.colors.primary }]} onPress={otworzMaps}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Otwórz w Maps</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapBtn, { backgroundColor: `${theme.colors.info}20`, borderColor: theme.colors.info, borderWidth: 1 }]} onPress={kopiujLink}>
                  <Text style={{ color: theme.colors.info, fontWeight: '700', fontSize: 13 }}>Kopiuj link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>
    </View>
  );
}

function inp(theme: AppTheme) {
  return { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text };
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
  grupaFormularza: { padding: 18, gap: 2, paddingBottom: 32 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  blad: { fontSize: 14, marginTop: 10, fontWeight: '500' },
  wytwPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  wytwOpcja: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  mapPreview: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8, overflow: 'hidden' },
  mapAkcje: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mapBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
});
