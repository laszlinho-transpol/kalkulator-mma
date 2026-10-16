// ============================================================
// EKRAN: MIESZANKI – wytwórnie jako przyciski do ich kart (Info | Mieszanki)
// ============================================================

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../src/stores/wytwornieStore';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AppHeader, PozycjaListy, Sekcja, ODSTEP, useMotyw } from '../../src/components/ui';
import { cenaReceptyNaDzien, receptyWytworni } from '../../src/mieszanki/recepty';
import { formatLiczby } from '../../src/utils/calculations';
import { dzisIso } from '../../src/utils/zakresDat';

const odmianaMieszanek = (n: number) => (n === 1 ? 'mieszanka' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'mieszanki' : 'mieszanek');

export default function MieszankiScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const dzis = dzisIso();

  const bezWytworni = useMemo(
    () => mieszanki.filter((m) => !m.wytworniaId || !wytwornie.some((w) => w.id === m.wytworniaId)),
    [mieszanki, wytwornie],
  );

  const nowaWytwornia = () => router.push('/mieszanki/wytwornia/nowa' as never);
  const nowaRecepta = () => router.push('/mieszanki/recepta/nowa' as never);

  const pusto = mieszanki.length === 0 && wytwornie.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Mieszanki"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        przyciski={[
          { tekst: '+ Dodaj wytwórnię', onPress: nowaWytwornia, kolor: theme.colors.secondary },
          { tekst: '+ Dodaj receptę', onPress: nowaRecepta, kolor: '#fff', tlo: theme.colors.primary },
        ]}
      />

      {pusto ? (
        <EmptyState
          ikona="🏭"
          tytul="Brak mieszanek"
          opis="Dodaj wytwórnię i pierwszą receptę asfaltu, aby móc tworzyć plany wbudowywania."
          przyciskTekst="+ Dodaj pierwszą receptę"
          onPrzycisk={nowaRecepta}
          drugPrzyciskTekst="+ Dodaj wytwórnię"
          onDrugPrzycisk={nowaWytwornia}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          {wytwornie.map((w) => {
            const ile = receptyWytworni(mieszanki, w.id).length;
            const kontakty = w.kontakty?.length ?? 0;
            const opis = [`${ile} ${odmianaMieszanek(ile)}`, kontakty ? `kontakty: ${kontakty}` : '', w.adresMapy ?? ''].filter(Boolean).join(' · ');
            return (
              <PozycjaListy
                key={w.id}
                ikona="🏭"
                tytul={w.nazwa}
                podtytul={opis}
                accessibilityLabel={`Wytwórnia ${w.nazwa}`}
                onPress={() => router.push(`/mieszanki/wytwornia/${w.id}` as never)}
              />
            );
          })}
          {bezWytworni.length > 0 && (
            <Sekcja tytul={`Bez wytwórni · ${bezWytworni.length}`} info="Recepty bez przypisanej wytwórni. Przypisz ją w edycji recepty, aby pojawiła się na karcie wytwórni.">
              {bezWytworni.map((m) => {
                const cena = cenaReceptyNaDzien(m, dzis);
                return (
                  <PozycjaListy
                    key={m.id}
                    plaska
                    tytul={`${m.rodzaj}${m.nrRecepty ? ` · ${m.nrRecepty}` : ''}`}
                    podtytul={`ρ = ${m.ciezarObjetosciowy.toFixed(3)} t/m³`}
                    prawy={cena ? `${formatLiczby(cena)} zł/t` : 'bez ceny'}
                    accessibilityLabel={`Recepta ${m.rodzaj}`}
                    onPress={() => router.push(`/mieszanki/recepta/${m.id}` as never)}
                  />
                );
              })}
            </Sekcja>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 14, gap: ODSTEP.s + 2 },
});
