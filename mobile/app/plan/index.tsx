// ============================================================
// EKRAN: ZAPLANUJ MASĘ – plany pogrupowane po budowach (zwijane)
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { ZalacznikiViewer } from '../../src/components/common/ZalacznikiViewer';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { wybierzIZapiszZalacznikBudowy } from '../../src/utils/zalaczniki';
import { eksportujJSON, generujInteraktywnyHTML } from '../../src/utils/htmlGenerator';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import type { Plan, ZalacznikPlanu, Budowa } from '../../src/types';

export default function PlanListaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { plany, usunPlan } = usePlanyStore();
  const { budowy, dodajBudowe, edytujBudowe, usunBudowe, archiwizujBudowe, przywrocBudowe } = useBudowyStore();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wpisy = useLiveStore((s) => s.wpisy);
  const aktywne = plany.filter((p) => p.status === 'aktywny');
  const budowyAktywne = budowy.filter((b) => b.status !== 'archiwalna');
  const budowyArchiwalne = budowy.filter((b) => b.status === 'archiwalna');

  const [modalBudowa, setModalBudowa] = useState(false);
  const [edytowanaBudowaId, setEdytowanaBudowaId] = useState<string | null>(null);
  const [nazwaInv, setNazwaInv] = useState('');
  const [kodBudowy, setKodBudowy] = useState('');
  const [zalacznikiBudowy, setZalacznikiBudowy] = useState<ZalacznikPlanu[]>([]);
  const [viewerZal, setViewerZal] = useState(false);

  const formatujDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  const grupyPlanow = useMemo(() => {
    const posortowane = [...aktywne].sort(
      (a, b) => new Date(a.dataWbudowywania).getTime() - new Date(b.dataWbudowywania).getTime(),
    );

    const planyMapa = new Map<string, Plan[]>();
    for (const b of budowyAktywne) planyMapa.set(b.id, []);
    const bezBudowy: Plan[] = [];

    for (const p of posortowane) {
      if (p.budowaId && planyMapa.has(p.budowaId)) {
        planyMapa.get(p.budowaId)!.push(p);
      } else {
        bezBudowy.push(p);
      }
    }

    const zBudowa = budowyAktywne.map((b) => ({
      budowa: b,
      tytul: `${b.kodBudowy} – ${b.nazwaInwestycji}`,
      elementy: planyMapa.get(b.id) ?? [],
      bezPrzypisania: false,
    }));

    return {
      zBudowa,
      bezBudowy: bezBudowy.length > 0 ? [{
        tytul: 'Plany bez budowy',
        elementy: bezBudowy,
        bezPrzypisania: true,
        budowa: undefined as Budowa | undefined,
      }] : [],
    };
  }, [aktywne, budowyAktywne]);

  const potwierdźUsunięcie = (plan: Plan) => Alert.alert('Usuń plan', `Usunąć plan z ${formatujDate(plan.dataWbudowywania)}?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: () => usunPlan(plan.id) },
  ]);

  const otworzNowaBudowa = () => {
    setEdytowanaBudowaId(null);
    setNazwaInv('');
    setKodBudowy('');
    setZalacznikiBudowy([]);
    setModalBudowa(true);
  };

  const otworzEdycjeBudowy = (budowaId: string) => {
    const b = budowy.find((x) => x.id === budowaId);
    if (!b) return;
    setEdytowanaBudowaId(budowaId);
    setNazwaInv(b.nazwaInwestycji);
    setKodBudowy(b.kodBudowy);
    setZalacznikiBudowy(b.zalaczniki ?? []);
    setModalBudowa(true);
  };

  const zapiszBudowe = async () => {
    if (!nazwaInv.trim()) { Alert.alert('Błąd', 'Podaj nazwę inwestycji.'); return; }
    if (!kodBudowy.trim()) { Alert.alert('Błąd', 'Podaj kod budowy.'); return; }
    const dane = {
      nazwaInwestycji: nazwaInv.trim(),
      kodBudowy: kodBudowy.trim().toUpperCase(),
      zalaczniki: zalacznikiBudowy,
    };
    if (edytowanaBudowaId) {
      await edytujBudowe(edytowanaBudowaId, dane);
    } else {
      await dodajBudowe(dane);
    }
    setNazwaInv(''); setKodBudowy(''); setZalacznikiBudowy([]);
    setEdytowanaBudowaId(null);
    setModalBudowa(false);
  };

  const udostepnijPlan = (plan: Plan) => {
    Alert.alert('Udostępnij plan', 'Wybierz format pliku', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'JSON', onPress: async () => { try { await eksportujJSON(plan, mieszanki, wpisy.filter((w) => w.planId === plan.id)); } catch {} } },
      { text: 'HTML', onPress: async () => { try { await generujInteraktywnyHTML(plan, mieszanki, { autor: 'Kalkulator MMA', wpisyLive: wpisy.filter((w) => w.planId === plan.id) }); } catch {} } },
    ]);
  };

  const potwierdzArchiwizujBudowe = (b: Budowa) => Alert.alert(
    'Archiwizuj budowę',
    `Przenieść „${b.kodBudowy}” do archiwum? Budowa zniknie z listy planowania, ale plany pozostaną w systemie.`,
    [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Archiwizuj', onPress: () => archiwizujBudowe(b.id) },
    ],
  );

  const potwierdzUsunBudowe = (b: Budowa) => {
    const liczbaPlanow = aktywne.filter((p) => p.budowaId === b.id).length;
    Alert.alert(
      'Usuń budowę',
      liczbaPlanow > 0
        ? `Budowa ma ${liczbaPlanow} aktywnych planów. Usunąć budowę z listy? (Plany pozostaną bez przypisania budowy.)`
        : `Usunąć budowę „${b.kodBudowy}”?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń', style: 'destructive', onPress: () => usunBudowe(b.id) },
      ],
    );
  };

  const renderujPlan = (item: Plan) => (
    <TouchableOpacity
      key={item.id}
      style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/plan/${item.id}` as any)}
    >
      <View style={styles.kartaNaglowek}>
        <Text style={[tekstTytul, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
          {formatujDate(item.dataWbudowywania)}
        </Text>
        <TouchableOpacity onPress={() => potwierdźUsunięcie(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.usunTekst, { color: theme.colors.danger }]}>Usuń</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => udostepnijPlan(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.usunTekst, { color: theme.colors.secondary }]}>↗</Text>
        </TouchableOpacity>
      </View>
      <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {item.dzialki.length} {item.dzialki.length === 1 ? 'działka' : 'działki'} • Tonaż: {item.tonazAuta} t
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Zaplanuj Masę"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '+ Budowa', onPress: otworzNowaBudowa, kolor: theme.colors.secondary },
          { tekst: '↓ Import', onPress: () => router.push('/plan/import' as any), kolor: theme.colors.info },
          { tekst: '+ Plan', onPress: () => router.push('/plan/nowy' as any), kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {budowyAktywne.length === 0 && aktywne.length === 0 ? (
        <EmptyState
          ikona="📋"
          tytul="Brak aktywnych planów"
          opis="Dodaj budowę i utwórz plan wbudowywania lub zaimportuj z JSON."
          przyciskTekst="+ Utwórz nowy plan"
          onPrzycisk={() => router.push('/plan/nowy' as any)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {[...grupyPlanow.zBudowa, ...grupyPlanow.bezBudowy].map((grupa) => (
            <CollapsibleSection
              key={grupa.tytul}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏗️"
              plaski={grupa.bezPrzypisania}
              akcjaEtykieta={grupa.budowa ? 'Edytuj' : undefined}
              onAkcja={grupa.budowa ? () => otworzEdycjeBudowy(grupa.budowa!.id) : undefined}
            >
              {grupa.budowa && (
                <View style={styles.akcjeBudowy}>
                  <TouchableOpacity onPress={() => potwierdzArchiwizujBudowe(grupa.budowa!)}>
                    <Text style={{ color: theme.colors.warning, fontWeight: '600', fontSize: 13 }}>Archiwizuj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => potwierdzUsunBudowe(grupa.budowa!)}>
                    <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 13 }}>Usuń budowę</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/plan/nowy', params: { budowaId: grupa.budowa!.id } } as any)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>+ Plan</Text>
                  </TouchableOpacity>
                </View>
              )}
              {grupa.elementy.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
                  Brak planów – kliknij „+ Plan”, aby dodać.
                </Text>
              ) : (
                grupa.elementy.map(renderujPlan)
              )}
            </CollapsibleSection>
          ))}
          {budowyArchiwalne.length > 0 && (
            <CollapsibleSection tytul="Budowy w archiwum" liczba={budowyArchiwalne.length} theme={theme} ikona="📦" domyslnieRozwinieta={false}>
              {budowyArchiwalne.map((b) => (
                <View key={b.id} style={[styles.kartaArch, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{b.kodBudowy} – {b.nazwaInwestycji}</Text>
                  <TouchableOpacity onPress={() => przywrocBudowe(b.id)} style={{ marginTop: 8 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>↩ Przywróć do planowania</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </CollapsibleSection>
          )}
        </ScrollView>
      )}

      <SafeModal
        visible={modalBudowa}
        tytul={edytowanaBudowaId ? 'Edytuj budowę' : 'Dodaj budowę'}
        theme={theme}
        onClose={() => setModalBudowa(false)}
        prawy={{ tekst: 'Zapisz', onPress: zapiszBudowe, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 24 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Nazwa inwestycji</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
            value={nazwaInv}
            onChangeText={setNazwaInv}
            placeholder="np. DK25 Mąkowarsko"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Kod budowy</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
            value={kodBudowy}
            onChangeText={setKodBudowy}
            placeholder="np. B128"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
          />
          <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 8 }}>Plan sytuacyjny / PZT (PDF)</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            Załączniki przypisane do budowy – dostępne w zakładce PZT podczas wbudowywania.
          </Text>
          {zalacznikiBudowy.map((z) => (
            <View key={z.id} style={[styles.zalRow, { borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.text, flex: 1 }} numberOfLines={1}>📎 {z.nazwa}</Text>
              <TouchableOpacity onPress={() => setZalacznikiBudowy((p) => p.filter((x) => x.id !== z.id))}>
                <Text style={{ color: theme.colors.danger }}>Usuń</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.btnZal, { borderColor: theme.colors.info, backgroundColor: `${theme.colors.info}12` }]}
            onPress={async () => {
              const id = edytowanaBudowaId ?? 'nowa';
              const z = await wybierzIZapiszZalacznikBudowy(id);
              if (z) setZalacznikiBudowy((p) => [...p, z]);
            }}
          >
            <Text style={{ color: theme.colors.info, fontWeight: '700' }}>+ Dodaj plik PDF</Text>
          </TouchableOpacity>
          {zalacznikiBudowy.length > 0 && (
            <TouchableOpacity onPress={() => setViewerZal(true)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>👁 Podgląd załączników</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeModal>

      <ZalacznikiViewer visible={viewerZal} zalaczniki={zalacznikiBudowy} theme={theme} onClose={() => setViewerZal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  kartaNaglowek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8, alignItems: 'center' },
  akcjeBudowy: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingBottom: 10, paddingHorizontal: 4 },
  usunTekst: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  zalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  btnZal: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  kartaArch: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
