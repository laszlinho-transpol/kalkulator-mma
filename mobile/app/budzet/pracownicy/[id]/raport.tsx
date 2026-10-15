import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { Etykieta, Pole, Wiersz, Wybor, stylFormularza } from '../../../../src/components/common/Formularz';
import { KalendarzDnia } from '../../../../src/components/common/KalendarzDnia';
import { etykietaZakresu } from '../../../../src/components/common/KalendarzZakresu';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
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
  const [kierowcaTekst, setKierowcaTekst] = useState('');
  const [pasazerTekst, setPasazerTekst] = useState('');
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
  const dojazd: Dojazd = {
    kierowca: parsujLiczbePola(kierowcaTekst) ?? 0,
    pasazer: parsujLiczbePola(pasazerTekst) ?? 0,
  };
  const wynik = kwotaPracownika(stawki, podzial.podstawowe, podzial.nadgodziny, dojazd);

  const budowyKolejnosc = [...budowy].sort((a, b) => {
    const archiwum = (status?: string) => (status === 'archiwalna' ? 1 : 0);
    return archiwum(a.status) - archiwum(b.status) || a.kodBudowy.localeCompare(b.kodBudowy, 'pl');
  });

  const zapisz = async () => {
    if (!pracownik) return;
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    if (godziny < 0 || godziny > 24) { setBlad('Godziny pracy: od 0 do 24.'); return; }
    if ((kierowcaTekst.trim() && parsujLiczbePola(kierowcaTekst) == null) || (pasazerTekst.trim() && parsujLiczbePola(pasazerTekst) == null) || dojazd.kierowca < 0 || dojazd.pasazer < 0) {
      setBlad('Godziny kierowcy i pasażera to liczba, np. 1,5.');
      return;
    }
    if (!(godziny > 0) && !(dojazd.kierowca > 0) && !(dojazd.pasazer > 0)) { setBlad('Podaj godziny pracy albo jazdy.'); return; }
    if (podzial.podstawowe > 0 && !stawki.stawka8h) { setBlad('Podaj stawkę 8h.'); return; }
    if (podzial.nadgodziny > 0 && !stawki.nadgodzina) { setBlad('Podaj stawkę za nadgodzinę.'); return; }
    if (dojazd.kierowca > 0 && !stawki.kierowca) { setBlad('Podaj stawkę: kierowca.'); return; }
    if (dojazd.pasazer > 0 && !stawki.pasazer) { setBlad('Podaj stawkę: pasażer.'); return; }
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
        godzinyKierowca: dojazd.kierowca || undefined,
        godzinyPasazer: dojazd.pasazer || undefined,
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
          contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}
        >
          <View>
            <Etykieta
              tekst="Data"
              info="Domyślnie dzień poprzedni. Data zapisuje się po OK w kalendarzu."
              prawy={<Text style={[styles.typDnia, { color: podzial.wolny ? theme.colors.primary : theme.colors.textSecondary }]}>{opisDnia(data)}</Text>}
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

          <Wiersz>
            <Pole
              etykieta="Praca"
              info="Pn–pt do 8 h liczy się stawką 8h, każda godzina ponad 8 h to nadgodzina. W soboty, niedziele i święta każda godzina to nadgodzina."
              jednostka="h"
              value={godzinyTekst}
              onChangeText={setGodzinyTekst}
              accessibilityLabel="Godziny pracy"
              liczba
            />
            <Pole
              etykieta="Kierowca"
              info="Godziny jazdy w tym dniu. Można wpisać kierowcę i pasażera naraz, gdy pracownik prowadził w jedną stronę, a jechał jako pasażer w drugą."
              jednostka="h"
              value={kierowcaTekst}
              onChangeText={setKierowcaTekst}
              accessibilityLabel="Godziny kierowcy"
              placeholder="0"
              liczba
            />
            <Pole
              etykieta="Pasażer"
              jednostka="h"
              value={pasazerTekst}
              onChangeText={setPasazerTekst}
              accessibilityLabel="Godziny pasażera"
              placeholder="0"
              liczba
            />
          </Wiersz>
          <Text style={[styles.opis, { color: theme.colors.text }]}>
            Stawka 8h: {formatLiczby(podzial.podstawowe)} h · nadgodziny: {formatLiczby(podzial.nadgodziny)} h
          </Text>

          <Etykieta
            tekst="STAWKI"
            info={okres
              ? `Stawki z okresu ${etykietaZakresu(okres.od, okres.do)}. Można je zmienić tylko w tym raporcie.`
              : 'Stawki z karty pracownika. Można je zmienić tylko w tym raporcie.'}
          />
          {[['stawka8h', 'nadgodzina'], ['kierowca', 'pasazer'], ['zus']].map((ids) => (
            <Wiersz key={ids.join()}>
              {[...ids.map((pid) => {
                const pole = POLA_WYNAGRODZENIA.find((p) => p.id === pid)!;
                return (
                  <Pole
                    key={pid}
                    etykieta={pole.nazwa}
                    jednostka={pole.mnoznik ? '×' : pole.jednostka}
                    value={stawkiTekst[pole.id] ?? ''}
                    onChangeText={(tekst) => {
                      dotkniete.current.add(pole.id);
                      setStawkiTekst((prev) => ({ ...prev, [pole.id]: tekst }));
                    }}
                    accessibilityLabel={`Stawka ${pole.nazwa}`}
                    liczba
                  />
                );
              }), ids.length === 1 ? <View key="pusto" /> : null]}
            </Wiersz>
          ))}

          <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Komentarz" accessibilityLabel="Uwagi" />

          <View style={[styles.kwotaKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {liniePodsumowania(stawki, podzial.podstawowe, podzial.nadgodziny, dojazd, wynik).map((linia) => (
              <Text key={linia} style={[styles.opis, { color: theme.colors.text }]}>{linia}</Text>
            ))}
            <View style={styles.kosztWiersz}>
              <Text style={[styles.kosztEtykieta, { color: theme.colors.textSecondary }]}>Koszt pracodawcy</Text>
              <Text accessibilityLabel="Kwota raportu" style={[styles.kwota, { color: theme.colors.text }]}>{formatLiczby(wynik.koszt)} zł</Text>
            </View>
          </View>

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
  kwotaKarta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  kosztWiersz: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  kosztEtykieta: { fontSize: 13, fontWeight: '700' },
  kwota: { fontSize: 24, fontWeight: '800' },
});
