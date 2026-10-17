import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { SekcjaRaportyPracownika } from '../../../../src/components/budzet/SekcjaRaportyPracownika';
import { HistoriaStawek } from '../../../../src/components/budzet/HistoriaStawek';
import { Gwiazdka, Zakladki, type ZakladkaKarty } from '../../../../src/components/budzet/Zakladki';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { formatLiczby } from '../../../../src/utils/calculations';
import { POLA_WYNAGRODZENIA, linieStawekPola, nazwaPracownika } from '../../../../src/budzet/pracownicy';
import type { StawkiPracownika } from '../../../../src/budzet/pracownicy';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useGrupyPracownikowStore } from '../../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { AkcjeTelefonu, Przycisk, Sekcja, SiatkaDanych, WierszDanych } from '../../../../src/components/ui';

const linieWynagrodzenia = (stawki: StawkiPracownika) => linieStawekPola(POLA_WYNAGRODZENIA, stawki);

export default function KartaPracownikaScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [zakladka, setZakladka] = useState<ZakladkaKarty>(startowa === 'raporty' || startowa === 'historia' ? startowa : 'dane');
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const raporty = usePracownicyStore((s) => s.raporty);
  const przelaczUlubiony = usePracownicyStore((s) => s.przelaczUlubiony);
  const dodajOkres = usePracownicyStore((s) => s.dodajOkresStawek);
  const zmienOkres = usePracownicyStore((s) => s.zmienOkresStawek);
  const usunOkres = usePracownicyStore((s) => s.usunOkresStawek);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);

  const wszystkie = useMemo(
    () => raporty
      .filter((r) => r.pracownikId === id)
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)),
    [raporty, id],
  );
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
                <SiatkaDanych
                  pozycje={POLA_WYNAGRODZENIA.map((pole) => {
                    const wartosc = pracownik.stawki[pole.id];
                    return {
                      etykieta: pole.nazwa,
                      wartosc: !wartosc ? '—' : pole.mnoznik ? `× ${formatLiczby(wartosc)}` : `${formatLiczby(wartosc)} ${pole.jednostka}`,
                    };
                  })}
                />
                {!pracownik.stawki.delegacja ? (
                  <Przycisk maly wariant="tekst" tekst="Uzupełnij stawkę delegacji" accessibilityLabel="Uzupełnij delegację" onPress={edytuj} />
                ) : null}
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
          {zakladka === 'raporty' ? <SekcjaRaportyPracownika pracownik={pracownik} raporty={wszystkie} /> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 16, gap: 12 },
  akcjeSekcji: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numer: { fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
});
