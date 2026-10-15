// ============================================================
// EKRAN: MIESZANKI – wytwórnie i ich recepty (zwijane)
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../src/stores/wytwornieStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader } from '../../src/components/common/AppHeader';
import { CollapsibleSection } from '../../src/components/common/CollapsibleSection';
import { karta, tekstTytul, tekstPodtytul } from '../../src/constants/layout';
import { cenaReceptyNaDzien, receptyWytworni } from '../../src/mieszanki/recepty';
import { formatLiczby } from '../../src/utils/calculations';
import { dzisIso } from '../../src/utils/zakresDat';
import type { Mieszanka } from '../../src/types';

export default function MieszankiScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const dzis = dzisIso();

  const bezWytworni = useMemo(
    () => mieszanki.filter((m) => !m.wytworniaId || !wytwornie.some((w) => w.id === m.wytworniaId)),
    [mieszanki, wytwornie],
  );

  const nowaWytwornia = () => router.push('/mieszanki/wytwornia/nowa' as never);
  const nowaRecepta = (wytworniaId?: string) => router.push(
    (wytworniaId ? `/mieszanki/recepta/nowa?wytwornia=${wytworniaId}` : '/mieszanki/recepta/nowa') as never,
  );

  const renderujRecepte = (item: Mieszanka) => {
    const cena = cenaReceptyNaDzien(item, dzis);
    return (
      <TouchableOpacity
        key={item.id}
        accessibilityLabel={`Recepta ${item.rodzaj}`}
        onPress={() => router.push(`/mieszanki/recepta/${item.id}` as never)}
        style={[karta, styles.recepta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[tekstTytul, { color: theme.colors.text }]} numberOfLines={1}>
            {item.rodzaj}{item.nrRecepty ? ` · ${item.nrRecepty}` : ''}
          </Text>
          <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³
          </Text>
        </View>
        <Text style={[styles.cena, { color: cena ? theme.colors.text : theme.colors.textSecondary }]}>
          {cena ? `${formatLiczby(cena)} zł/t` : 'bez ceny'}
        </Text>
        <Text style={[styles.strzalka, { color: theme.colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
    );
  };

  const pusto = mieszanki.length === 0 && wytwornie.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Mieszanki"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '+ Dodaj wytwórnię', onPress: nowaWytwornia, kolor: theme.colors.secondary },
          { tekst: '+ Dodaj receptę', onPress: () => nowaRecepta(), kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {pusto ? (
        <EmptyState
          ikona="🏭"
          tytul="Brak mieszanek"
          opis="Dodaj wytwórnię i pierwszą receptę asfaltu, aby móc tworzyć plany wbudowywania."
          przyciskTekst="+ Dodaj pierwszą receptę"
          onPrzycisk={() => nowaRecepta()}
          drugPrzyciskTekst="+ Dodaj wytwórnię"
          onDrugPrzycisk={nowaWytwornia}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {wytwornie.map((w) => {
            const recepty = receptyWytworni(mieszanki, w.id);
            return (
              <CollapsibleSection
                key={w.id}
                tytul={w.nazwa}
                liczba={recepty.length}
                theme={theme}
                ikona="🏭"
                akcjaEtykieta="Edytuj"
                onAkcja={() => router.push(`/mieszanki/wytwornia/${w.id}/edytuj` as never)}
              >
                <View style={styles.linki}>
                  <TouchableOpacity accessibilityLabel={`Karta wytwórni ${w.nazwa}`} onPress={() => router.push(`/mieszanki/wytwornia/${w.id}` as never)}>
                    <Text style={[styles.link, { color: theme.colors.info }]}>
                      Info, mapa i kontakty{w.kontakty?.length ? ` (${w.kontakty.length})` : ''} ›
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel={`Dodaj receptę do ${w.nazwa}`} onPress={() => nowaRecepta(w.id)}>
                    <Text style={[styles.link, { color: theme.colors.primary }]}>+ Recepta</Text>
                  </TouchableOpacity>
                </View>
                {recepty.length === 0 ? (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>Brak recept w tej wytwórni</Text>
                ) : recepty.map(renderujRecepte)}
              </CollapsibleSection>
            );
          })}
          {bezWytworni.length > 0 && (
            <CollapsibleSection tytul="Bez wytwórni" liczba={bezWytworni.length} theme={theme} ikona="📦" plaski>
              {bezWytworni.map(renderujRecepte)}
            </CollapsibleSection>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14 },
  recepta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cena: { fontSize: 14, fontWeight: '800' },
  strzalka: { fontSize: 20 },
  linki: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  link: { fontSize: 13, fontWeight: '700' },
});
