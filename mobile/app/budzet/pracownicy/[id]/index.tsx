import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { HistoriaStawek } from '../../../../src/components/budzet/HistoriaStawek';
import { Gwiazdka, Zakladki, type ZakladkaKarty } from '../../../../src/components/budzet/Zakladki';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { formatLiczby } from '../../../../src/utils/calculations';
import {
  POLA_WYNAGRODZENIA, dojazdRaportu, kwotaPracownika, liniePodsumowania, linieStawekPola, nazwaPracownika,
} from '../../../../src/budzet/pracownicy';
import type { StawkiPracownika } from '../../../../src/budzet/pracownicy';
import { dataKrotko } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { useGrupyPracownikowStore } from '../../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { AkcjeTelefonu, Przycisk, Sekcja, SiatkaDanych, WierszDanych } from '../../../../src/components/ui';

const linieWynagrodzenia = (stawki: StawkiPracownika) => linieStawekPola(POLA_WYNAGRODZENIA, stawki);
const liniaNaKafelek = (linia: string) => {
  const i = linia.indexOf(': ');
  return i < 0 ? { etykieta: linia, wartosc: '' } : { etykieta: linia.slice(0, i), wartosc: linia.slice(i + 2) };
};

export default function KartaPracownikaScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [szukaj, setSzukaj] = useState('');
  const [zakladka, setZakladka] = useState<ZakladkaKarty>(startowa === 'raporty' || startowa === 'historia' ? startowa : 'dane');
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const raporty = usePracownicyStore((s) => s.raporty);
  const przelaczUlubiony = usePracownicyStore((s) => s.przelaczUlubiony);
  const dodajOkres = usePracownicyStore((s) => s.dodajOkresStawek);
  const zmienOkres = usePracownicyStore((s) => s.zmienOkresStawek);
  const usunOkres = usePracownicyStore((s) => s.usunOkresStawek);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);
  const budowy = useBudowyStore((s) => s.budowy);

  const wszystkie = useMemo(
    () => raporty
      .filter((r) => r.pracownikId === id)
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)),
    [raporty, id],
  );
  const lista = useMemo(() => {
    const fraza = szukaj.trim().toLowerCase();
    if (!fraza) return wszystkie;
    return wszystkie.filter((r) => {
      const budowa = budowy.find((b) => b.id === r.budowaId);
      const tekst = [
        r.data, dataKrotko(r.data), r.uwagi ?? '',
        formatLiczby(r.kwota).replace(/\u00A0/g, ''),
        String(r.kwota).replace('.', ','),
        budowa?.kodBudowy ?? '', budowa?.nazwaInwestycji ?? '',
      ].join(' ').toLowerCase();
      return tekst.includes(fraza);
    });
  }, [wszystkie, szukaj, budowy]);

  const grupa = grupy.find((g) => g.id === pracownik?.grupaId);
  const edytuj = () => { if (pracownik) router.push(`/budzet/pracownicy/${pracownik.id}/edytuj` as never); };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={pracownik ? nazwaPracownika(pracownik) : 'Pracownik'}
        podtytul={grupa?.nazwa ?? 'Bez grupy'}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/pracownicy') }}
        prawy={pracownik ? { tekst: 'Edytuj', onPress: edytuj } : undefined}
      />
      {!pracownik ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono pracownika.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <Zakladki theme={theme} aktywna={zakladka} onZmien={setZakladka} />
          {zakladka === 'dane' ? (
            <>
              <Sekcja
                tytul="Dane"
                prawy={(
                  <View style={styles.akcjeSekcji}>
                    <Gwiazdka
                      theme={theme}
                      wlaczona={pracownik.ulubiony}
                      onPress={() => { void przelaczUlubiony(pracownik.id); }}
                      accessibilityLabel={`${pracownik.ulubiony ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} ${nazwaPracownika(pracownik)}`}
                    />
                  </View>
                )}
              >
                <WierszDanych etykieta="Nazwisko" wartosc={pracownik.nazwisko || '—'} />
                <WierszDanych etykieta="Imię" wartosc={pracownik.imie || '—'} />
                <WierszDanych etykieta="Grupa" wartosc={grupa?.nazwa ?? '—'} />
              </Sekcja>
              <Sekcja tytul="Telefon" info="Zadzwoń, skopiuj numer albo udostępnij kontakt pracownika (SMS, komunikator, e-mail).">
                {pracownik.telefon ? (
                  <>
                    <Text style={[styles.numer, { color: theme.colors.text }]} selectable>{pracownik.telefon}</Text>
                    <AkcjeTelefonu
                      telefon={pracownik.telefon}
                      nazwa={nazwaPracownika(pracownik)}
                      opisDoUdostepnienia={`${nazwaPracownika(pracownik)}${grupa ? ` (${grupa.nazwa})` : ''}: ${pracownik.telefon}`}
                    />
                  </>
                ) : (
                  <Przycisk wariant="drugi" ikona="plus" tekst="Dodaj numer telefonu" onPress={edytuj} />
                )}
              </Sekcja>
              <Sekcja tytul="Wynagrodzenie" info="Stawki z karty. Okresy z innymi stawkami ustawisz w zakładce Historia stawek.">
                {linieWynagrodzenia(pracownik.stawki).length === 0 ? (
                  <Text style={{ color: theme.colors.textSecondary }}>Brak stawek.</Text>
                ) : (
                  <SiatkaDanych pozycje={linieWynagrodzenia(pracownik.stawki).map(liniaNaKafelek)} />
                )}
              </Sekcja>
            </>
          ) : null}
          {zakladka === 'historia' ? (
            <HistoriaStawek
              theme={theme}
              pola={POLA_WYNAGRODZENIA}
              bazowe={pracownik.stawki}
              historia={pracownik.historiaStawek}
              linie={linieWynagrodzenia}
              onDodaj={(okres) => dodajOkres(pracownik.id, okres)}
              onZmien={(okres) => zmienOkres(pracownik.id, okres)}
              onUsun={(okresId) => usunOkres(pracownik.id, okresId)}
            />
          ) : null}
          {zakladka === 'raporty' ? (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sekcja, { color: theme.colors.text }]}>Raporty</Text>
              <TouchableOpacity
                accessibilityLabel="Dodaj raport"
                onPress={() => router.push(`/budzet/pracownicy/${pracownik.id}/raport` as never)}
                style={[styles.dodaj, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.dodajTekst}>Dodaj raport</Text>
              </TouchableOpacity>
              <TextInput
                value={szukaj}
                onChangeText={setSzukaj}
                placeholder="Szukaj"
                placeholderTextColor={theme.colors.textSecondary}
                accessibilityLabel="Szukaj raportów"
                style={[styles.szukaj, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              />
              {lista.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary }}>
                  {wszystkie.length > 0 ? 'Nic nie pasuje do szukania.' : 'Brak raportów.'}
                </Text>
              ) : lista.map((raport) => {
                const budowa = budowy.find((b) => b.id === raport.budowaId);
                const dojazd = dojazdRaportu(raport);
                const wynik = kwotaPracownika(raport.stawki, raport.godzinyPodstawowe, raport.nadgodziny, dojazd);
                return (
                  <View key={raport.id} style={[styles.raport, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.data, { color: theme.colors.text }]}>{dataKrotko(raport.data)} · {formatLiczby(raport.godziny)} h</Text>
                    <Text style={{ color: theme.colors.textSecondary }}>
                      {budowa ? `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}` : 'Budowa usunięta'}
                    </Text>
                    {liniePodsumowania(raport.stawki, raport.godzinyPodstawowe, raport.nadgodziny, dojazd, wynik).map((linia) => (
                      <Text key={linia} style={{ color: theme.colors.text, marginTop: 2 }}>{linia}</Text>
                    ))}
                    <Text style={[styles.kwota, { color: theme.colors.text }]}>Koszt: {formatLiczby(raport.kwota)} zł</Text>
                    {raport.uwagi ? <Text style={{ color: theme.colors.textSecondary }}>{raport.uwagi}</Text> : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 16, gap: 12 },
  karta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  sekcja: { fontSize: 18, fontWeight: '800' },
  akcjeSekcji: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numer: { fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  szukaj: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  raport: { borderTopWidth: 1, paddingTop: 10, gap: 2 },
  data: { fontSize: 16, fontWeight: '800' },
  kwota: { fontSize: 16, fontWeight: '800', marginTop: 4 },
});
