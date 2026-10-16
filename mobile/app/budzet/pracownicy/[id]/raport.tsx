import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { Etykieta, Pole, Wybor, stylFormularza } from '../../../../src/components/common/Formularz';
import { KalendarzDnia } from '../../../../src/components/common/KalendarzDnia';
import { PolaPracyPracownika, usePracaPracownika } from '../../../../src/components/budzet/PracaPracownika';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { wczorajIso } from '../../../../src/budzet/rozliczenie';
import { opisDnia } from '../../../../src/budzet/kalendarzPracy';
import { nazwaPracownika } from '../../../../src/budzet/pracownicy';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';

export default function RaportPracownikaScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const dodajRaport = usePracownicyStore((s) => s.dodajRaport);
  const budowy = useBudowyStore((s) => s.budowy);

  const [data, setData] = useState(wczorajIso);
  const [budowaId, setBudowaId] = useState('');
  const [uwagi, setUwagi] = useState('');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);
  const praca = usePracaPracownika(pracownik, data);

  const budowyKolejnosc = [...budowy].sort((a, b) => {
    const archiwum = (status?: string) => (status === 'archiwalna' ? 1 : 0);
    return archiwum(a.status) - archiwum(b.status) || a.kodBudowy.localeCompare(b.kodBudowy, 'pl');
  });

  const zapisz = async () => {
    if (!pracownik) return;
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    const bladPracy = praca.blad();
    if (bladPracy) { setBlad(bladPracy); return; }
    setBlad('');
    setZapis(true);
    try {
      await dodajRaport({
        ...praca.daneRaportu(),
        pracownikId: pracownik.id,
        data,
        budowaId,
        uwagi: uwagi.trim() || undefined,
      });
      router.replace(`/budzet/pracownicy/${pracownik.id}?zakladka=raporty` as never);
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Dodaj raport"
        podtytul={pracownik ? nazwaPracownika(pracownik) : ''}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(id ? `/budzet/pracownicy/${id}` : '/budzet/pracownicy') }}
      />
      {!pracownik ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono pracownika.</Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}
        >
          <View>
            <Etykieta
              tekst="Data"
              info="Domyślnie dzień poprzedni. Data zapisuje się po OK w kalendarzu."
              prawy={<Text style={[styles.typDnia, { color: praca.podzial.wolny ? theme.colors.primary : theme.colors.textSecondary }]}>{opisDnia(data)}</Text>}
            />
            <KalendarzDnia wartosc={data} theme={theme} onZatwierdz={setData} />
          </View>

          <View>
            <Etykieta tekst="Budowa" wymagane />
            {budowyKolejnosc.length === 0 ? (
              <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj budowę w menu Budowa.</Text>
            ) : (
              <View style={stylFormularza.chipy}>
                {budowyKolejnosc.map((budowa) => (
                  <Wybor
                    key={budowa.id}
                    zaznaczony={budowa.id === budowaId}
                    etykieta={`${budowa.kodBudowy} · ${budowa.nazwaInwestycji}`}
                    accessibilityLabel={`Budowa ${budowa.kodBudowy}`}
                    onPress={() => setBudowaId(budowa.id)}
                  />
                ))}
              </View>
            )}
          </View>

          <PolaPracyPracownika praca={praca} theme={theme} />

          <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Komentarz" accessibilityLabel="Uwagi" />

          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
          <TouchableOpacity
            accessibilityLabel="Zapisz raport"
            disabled={zapis}
            onPress={zapisz}
            style={[stylFormularza.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
          >
            <Text style={stylFormularza.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  opis: { fontSize: 13, lineHeight: 18 },
  typDnia: { fontSize: 13, fontWeight: '800' },
});
