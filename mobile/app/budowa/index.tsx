// ============================================================
// BUDOWY – lista inwestycji + tworzenie szablonu projektu
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { FormularzBudowy } from '../../src/components/budowa/FormularzBudowy';
import { Karta, TYPOGRAFIA, ZasadaDzialania, useMotyw } from '../../src/components/ui';
import { ZASADA_BUDOWY } from '../../src/components/ZasadyDzialow';
import { potwierdzAkcje } from '../../src/utils/dialog';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { grupyBudow, opisStatusu, statusBudowy } from '../../src/utils/statusBudowy';
import type { Budowa } from '../../src/types';

const ZASADA = 'budowa';

export default function BudowaListaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { budowy, usunBudowe, edytujBudowe } = useBudowyStore();
  const grupy = grupyBudow(budowy);
  const [modal, setModal] = useState(false);
  const [edytowana, setEdytowana] = useState<Budowa | undefined>();

  const nowa = () => { setEdytowana(undefined); setModal(true); };
  const edytuj = (b: Budowa) => { setEdytowana(b); setModal(true); };

  const potwierdzUsun = (b: Budowa) => potwierdzAkcje(
    'Usuń budowę',
    `Usunąć „${b.kodBudowy} – ${b.nazwaInwestycji}”?`,
    () => { void usunBudowe(b.id); },
  );

  const kartaBudowy = (b: Budowa) => {
    const ark = b.projekt?.arkusze.length ?? 0;
    const status = statusBudowy(b);
    return (
      <Karta
        key={b.id}
        tytul={b.kodBudowy}
        podtytul={b.nazwaInwestycji}
        znaczek={status === 'aktywna' ? undefined : {
          tekst: opisStatusu(b),
          kolor: status === 'gwarancja' ? theme.colors.warning : theme.colors.textSecondary,
        }}
        podsumowanie={`Arkusze PZT: ${ark}`}
        accessibilityLabel={`Budowa ${b.kodBudowy}`}
        onPress={() => router.push(`/budowa/${b.id}` as never)}
        akcje={[
          status === 'zakonczona'
            ? { tekst: 'Przywróć', rodzaj: 'glowna', onPress: () => { void edytujBudowe(b.id, { status: 'aktywna', gwarancjaDo: undefined }); } }
            : { tekst: 'Otwórz', rodzaj: 'glowna', onPress: () => router.push(`/budowa/${b.id}` as never) },
          { tekst: 'Edytuj', accessibilityLabel: `Edytuj budowę ${b.kodBudowy}`, onPress: () => edytuj(b) },
          { tekst: 'Usuń', rodzaj: 'niebezpieczna', accessibilityLabel: `Usuń budowę ${b.kodBudowy}`, onPress: () => potwierdzUsun(b) },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Budowa"
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: '+ Nowa', onPress: nowa, kolor: theme.colors.primary }}
        zasada={ZASADA}
      />
      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}>
        <ZasadaDzialania klucz={ZASADA} slajdy={ZASADA_BUDOWY} />
        {budowy.length === 0 ? (
          <EmptyState
            ikona="🏗️"
            tytul="Brak budów"
            opis="Załóż budowę (nazwa + kod, np. B128). Powstanie szablon: PZT, legenda, konstrukcje, przedmiar."
            przyciskTekst="+ Nowa budowa"
            onPrzycisk={nowa}
          />
        ) : grupy.filter((g) => g.budowy.length > 0).map((g) => (
          <React.Fragment key={g.status}>
            <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, marginTop: 8 }]}>{g.nazwa} · {g.budowy.length}</Text>
            {g.budowy.map(kartaBudowy)}
          </React.Fragment>
        ))}
      </ScrollView>

      <FormularzBudowy
        widoczny={modal}
        budowa={edytowana}
        onZamknij={() => setModal(false)}
        onZapisano={(id) => {
          setModal(false);
          if (!edytowana) router.push(`/budowa/${id}` as never);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { flexGrow: 1, padding: 14, gap: 10 },
});
