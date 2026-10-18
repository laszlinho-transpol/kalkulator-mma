import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, InfoTooltip, Pole, PozycjaListy, Przycisk, stylFormularza, useMotyw, TYPOGRAFIA } from '../../../src/components/ui';
import { SafeModal } from '../../../src/components/common/SafeModal';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useFirmyStore } from '../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

export default function FirmyScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const firmy = useFirmyStore((s) => s.firmy);
  const sprzet = useSprzetStore((s) => s.sprzet);
  const znajdzLubDodaj = useFirmyStore((s) => s.znajdzLubDodaj);
  const [nowa, setNowa] = useState(false);
  const [nazwa, setNazwa] = useState('');
  const [blad, setBlad] = useState('');

  const otworzNowa = () => { setNazwa(''); setBlad(''); setNowa(true); };
  const utworz = async () => {
    const czysta = nazwa.trim();
    if (!czysta) { setBlad('Podaj nazwę firmy.'); return; }
    const byla = firmy.find((f) => f.nazwa.toLowerCase() === czysta.replace(/\s+/g, ' ').toLowerCase());
    if (byla) { setBlad(`Firma „${byla.nazwa}” jest już w bazie.`); return; }
    const id = await znajdzLubDodaj(czysta);
    setNowa(false);
    if (id) router.push({ pathname: '/budzet/firmy/[id]', params: { id, nowa: '1' } } as never);
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Firmy"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
        prawy={{ tekst: '+ Nowa', onPress: otworzNowa }}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.naglowek}>
          <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]}>Firmy w bazie · {firmy.length}</Text>
          <InfoTooltip tresc="Dodaj firmę przyciskiem „+ Nowa” albo wpisz ją przy sprzęcie, transporcie lub materiale w raporcie dnia. Firmy z bazy podpowiadają się w tych polach. Na karcie firmy uzupełnisz dane kontaktowe i zobaczysz jej sprzęt." />
        </View>
        {firmy.length === 0 ? (
          <Przycisk tekst="Dodaj pierwszą firmę" ikona="plus" onPress={otworzNowa} />
        ) : firmy.map((firma) => {
          const ile = sprzet.filter((m) => m.firmaId === firma.id).length;
          const telefony = firma.kontakty?.length ?? 0;
          const opis = [`sprzęt: ${ile}`, telefony ? `kontakty: ${telefony}` : '', firma.adres ?? ''].filter(Boolean).join(' · ');
          return (
            <PozycjaListy
              key={firma.id}
              ikona="🏢"
              tytul={firma.nazwa}
              podtytul={opis}
              accessibilityLabel={`Firma ${firma.nazwa}`}
              onPress={() => router.push(`/budzet/firmy/${firma.id}` as never)}
            />
          );
        })}
      </ScrollView>
      <SafeModal
        visible={nowa}
        tytul="Nowa firma"
        theme={theme}
        onClose={() => setNowa(false)}
        prawy={{ tekst: 'Dodaj', onPress: () => { void utworz(); }, kolor: theme.colors.primary }}
      >
        <View style={stylFormularza.tresc}>
          <Pole etykieta="Nazwa firmy" value={nazwa} onChangeText={setNazwa} placeholder="np. Transbud Sp. z o.o." accessibilityLabel="Nazwa nowej firmy" />
          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 8 },
  naglowek: { flexDirection: 'row', alignItems: 'center' },
});
