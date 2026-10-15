import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { KalendarzDnia } from '../../../../src/components/common/KalendarzDnia';
import { etykietaZakresu } from '../../../../src/components/common/KalendarzZakresu';
import { lightTheme, darkTheme, type AppTheme } from '../../../../src/constants/theme';
import { formatLiczby } from '../../../../src/utils/calculations';
import { okresNaDzien, parsujLiczbePola, stawkiObowiazujace, wczorajIso } from '../../../../src/budzet/rozliczenie';
import { opisDnia } from '../../../../src/budzet/kalendarzPracy';
import {
  POLA_WYNAGRODZENIA, kwotaPracownika, liniePodsumowania, nazwaPracownika, podzialGodzin,
  type Dojazd, type PoleWynagrodzenia, type StawkiPracownika,
} from '../../../../src/budzet/pracownicy';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';

const DOJAZDY: [Dojazd, string][] = [['brak', 'Brak'], ['kierowca', 'Kierowca'], ['pasazer', 'Pasażer']];

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
  const [godzinyTekst, setGodzinyTekst] = useState('8');
  const [dojazd, setDojazd] = useState<Dojazd>('brak');
  const [stawkiTekst, setStawkiTekst] = useState<Partial<Record<PoleWynagrodzenia, string>>>({});
  const [uwagi, setUwagi] = useState('');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);
  const dotkniete = useRef(new Set<PoleWynagrodzenia>());

  const obowiazujace = useMemo(
    () => (pracownik ? stawkiObowiazujace(pracownik.stawki, pracownik.historiaStawek, data) : {} as StawkiPracownika),
    [pracownik, data],
  );
  const okres = pracownik ? okresNaDzien(pracownik.historiaStawek, data) : undefined;

  useEffect(() => {
    setStawkiTekst((prev) => {
      const next = { ...prev };
      for (const pole of POLA_WYNAGRODZENIA) {
        if (dotkniete.current.has(pole.id)) continue;
        const stawka = obowiazujace[pole.id];
        next[pole.id] = stawka ? String(stawka).replace('.', ',') : '';
      }
      return next;
    });
  }, [obowiazujace]);

  const stawki: StawkiPracownika = {};
  for (const pole of POLA_WYNAGRODZENIA) {
    const liczba = parsujLiczbePola(stawkiTekst[pole.id] ?? '');
    if (liczba != null && liczba > 0) stawki[pole.id] = liczba;
  }
  const godziny = parsujLiczbePola(godzinyTekst) ?? 0;
  const podzial = podzialGodzin(data, godziny);
  const wynik = kwotaPracownika(stawki, podzial.podstawowe, podzial.nadgodziny, dojazd);

  const budowyKolejnosc = [...budowy].sort((a, b) => {
    const archiwum = (status?: string) => (status === 'archiwalna' ? 1 : 0);
    return archiwum(a.status) - archiwum(b.status) || a.kodBudowy.localeCompare(b.kodBudowy, 'pl');
  });

  const zapisz = async () => {
    if (!pracownik) return;
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    if (!(godziny > 0) || godziny > 24) { setBlad('Podaj godziny pracy od 0 do 24.'); return; }
    if (podzial.podstawowe > 0 && !stawki.stawka8h) { setBlad('Podaj stawkę 8h.'); return; }
    if (podzial.nadgodziny > 0 && !stawki.nadgodzina) { setBlad('Podaj stawkę za nadgodzinę.'); return; }
    if (dojazd !== 'brak' && !stawki[dojazd]) { setBlad(`Podaj stawkę: ${dojazd === 'kierowca' ? 'kierowca' : 'pasażer'}.`); return; }
    for (const pole of POLA_WYNAGRODZENIA) {
      const tekst = (stawkiTekst[pole.id] ?? '').trim();
      if (tekst && !stawki[pole.id]) { setBlad(`Pole „${pole.nazwa}” przyjmuje liczbę większą od zera.`); return; }
    }
    setBlad('');
    setZapis(true);
    try {
      await dodajRaport({
        pracownikId: pracownik.id,
        data,
        budowaId,
        godziny,
        godzinyPodstawowe: podzial.podstawowe,
        nadgodziny: podzial.nadgodziny,
        dojazd,
        stawki,
        wynagrodzenie: wynik.wynagrodzenie,
        kwota: wynik.koszt,
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
          contentContainerStyle={[styles.formularz, { paddingBottom: insets.bottom + 28 }]}
        >
          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Data</Text>
          <KalendarzDnia wartosc={data} theme={theme} onZatwierdz={setData} />
          <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
            Domyślnie dzień poprzedni. Data zapisuje się po OK. {opisDnia(data)}.
          </Text>

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Budowa</Text>
          {budowyKolejnosc.length === 0 ? (
            <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj budowę w menu Budowa.</Text>
          ) : budowyKolejnosc.map((budowa) => (
            <Wybor
              key={budowa.id}
              theme={theme}
              zaznaczony={budowa.id === budowaId}
              etykieta={`${budowa.kodBudowy} · ${budowa.nazwaInwestycji}`}
              accessibilityLabel={`Budowa ${budowa.kodBudowy}`}
              onPress={() => setBudowaId(budowa.id)}
            />
          ))}

          <PoleLiczby theme={theme} etykieta="Godziny pracy (h)" value={godzinyTekst} onChangeText={setGodzinyTekst} accessibilityLabel="Godziny pracy" />
          <Text style={[styles.opis, { color: theme.colors.text }]}>
            {podzial.wolny
              ? `${opisDnia(data)}: ${formatLiczby(podzial.nadgodziny)} h nadgodzin.`
              : `W stawce 8h: ${formatLiczby(podzial.podstawowe)} h · nadgodziny: ${formatLiczby(podzial.nadgodziny)} h.`}
          </Text>

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Dojazd</Text>
          <View style={styles.wiersz}>
            {DOJAZDY.map(([wartosc, nazwa]) => (
              <View key={wartosc} style={{ flex: 1 }}>
                <Wybor
                  theme={theme}
                  zaznaczony={dojazd === wartosc}
                  etykieta={nazwa}
                  accessibilityLabel={`Dojazd ${nazwa}`}
                  onPress={() => setDojazd(wartosc)}
                />
              </View>
            ))}
          </View>

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Stawki</Text>
          <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
            {okres
              ? `Stawki z okresu ${etykietaZakresu(okres.od, okres.do)}. Można je zmienić w tym raporcie.`
              : 'Stawki z karty pracownika. Można je zmienić w tym raporcie.'}
          </Text>
          {POLA_WYNAGRODZENIA.map((pole) => (
            <PoleLiczby
              key={pole.id}
              theme={theme}
              etykieta={`${pole.nazwa} (${pole.jednostka})`}
              value={stawkiTekst[pole.id] ?? ''}
              onChangeText={(tekst) => {
                dotkniete.current.add(pole.id);
                setStawkiTekst((prev) => ({ ...prev, [pole.id]: tekst }));
              }}
              accessibilityLabel={`Stawka ${pole.nazwa}`}
            />
          ))}

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Uwagi (opcjonalnie)</Text>
          <TextInput
            value={uwagi}
            onChangeText={setUwagi}
            placeholder="Komentarz"
            placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel="Uwagi"
            multiline
            style={[styles.uwagi, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />

          <View style={[styles.kwotaKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {liniePodsumowania(stawki, podzial.podstawowe, podzial.nadgodziny, dojazd, wynik).map((linia) => (
              <Text key={linia} style={[styles.opis, { color: theme.colors.text }]}>{linia}</Text>
            ))}
            <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Koszt pracodawcy</Text>
            <Text accessibilityLabel="Kwota raportu" style={[styles.kwota, { color: theme.colors.text }]}>{formatLiczby(wynik.koszt)} zł</Text>
          </View>

          {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
          <TouchableOpacity
            accessibilityLabel="Zapisz raport"
            disabled={zapis}
            onPress={zapisz}
            style={[styles.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
          >
            <Text style={styles.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Wybor({
  theme, zaznaczony, etykieta, accessibilityLabel, onPress,
}: {
  theme: AppTheme;
  zaznaczony: boolean;
  etykieta: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.wybor, {
        borderColor: zaznaczony ? theme.colors.primary : theme.colors.border,
        backgroundColor: zaznaczony ? `${theme.colors.primary}22` : theme.colors.card,
      }]}
    >
      <Text style={{ color: theme.colors.text, fontWeight: zaznaczony ? '800' : '600', textAlign: 'center' }}>{etykieta}</Text>
    </TouchableOpacity>
  );
}

function PoleLiczby({
  theme, etykieta, value, onChangeText, accessibilityLabel,
}: {
  theme: AppTheme;
  etykieta: string;
  value: string;
  onChangeText: (tekst: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>{etykieta}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  formularz: { padding: 16, gap: 8 },
  etykieta: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  opis: { fontSize: 13, lineHeight: 18 },
  wiersz: { flexDirection: 'row', gap: 8 },
  wybor: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  uwagi: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  kwotaKarta: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8, gap: 2 },
  kwota: { fontSize: 28, fontWeight: '800' },
  zapisz: { marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  zapiszTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
});
