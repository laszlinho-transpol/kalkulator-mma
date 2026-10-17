import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KontaktyWytworni } from '../../../src/components/mieszanki/KontaktyWytworni';
import { AppHeader, Karta, Pole, PozycjaListy, Przycisk, Sekcja, WierszDanych, stylFormularza, useMotyw, ODSTEP, TYPOGRAFIA } from '../../../src/components/ui';
import { rodzajPoId } from '../../../src/budzet/rodzajeSprzetu';
import { etykietaSprzetu, linieStawek } from '../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useRouteId } from '../../../src/hooks/useRouteId';
import { useFirmyStore } from '../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../src/stores/sprzetStore';
import type { Firma } from '../../../src/budzet/typy';

export default function KartaFirmyScreen() {
  const id = useRouteId();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const firma = useFirmyStore((s) => s.firmy.find((f) => f.id === id));
  const aktualizuj = useFirmyStore((s) => s.aktualizuj);
  const sprzet = useSprzetStore((s) => s.sprzet);
  const raporty = useSprzetStore((s) => s.raporty);
  const [edycja, setEdycja] = useState(false);

  const maszyny = useMemo(() => sprzet
    .filter((m) => m.firmaId === id)
    .map((m) => ({ m, nazwa: `${rodzajPoId(m.rodzajId)?.nazwa ?? 'Sprzęt'} ${etykietaSprzetu(m.numer)}`.trim() }))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl')), [sprzet, id]);

  const brakDanych = firma && !firma.adres && !firma.email && !firma.komentarz;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={firma?.nazwa ?? 'Firma'}
        podtytul={`Sprzęt: ${maszyny.length}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/firmy') }}
      />
      {!firma ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono firmy.</Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          {edycja ? (
            <FormularzFirmy
              firma={firma}
              onAnuluj={() => setEdycja(false)}
              onZapisz={async (zmiany) => { await aktualizuj(firma.id, zmiany); setEdycja(false); }}
            />
          ) : (
            <Sekcja
              tytul="Dane firmy"
              info="Wszystkie pola są opcjonalne. Adres otwiera mapę, e-mail – nową wiadomość."
              prawy={<Przycisk maly wariant="tekst" tekst="Edytuj" accessibilityLabel="Edytuj dane firmy" onPress={() => setEdycja(true)} />}
            >
              <WierszDanych etykieta="Nazwa" wartosc={firma.nazwa} />
              <WierszDanych etykieta="Adres siedziby" wartosc={firma.adres || '—'} />
              {firma.adres ? (
                <Przycisk
                  maly
                  wariant="drugi"
                  ikona="mapa"
                  tekst="Pokaż na mapie"
                  onPress={() => { void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firma.adres!)}`); }}
                />
              ) : null}
              <WierszDanych etykieta="E-mail" wartosc={firma.email || '—'} />
              {firma.email ? (
                <Przycisk maly wariant="drugi" tekst="Napisz e-mail" onPress={() => { void Linking.openURL(`mailto:${firma.email}`); }} />
              ) : null}
              {firma.komentarz ? (
                <View style={{ gap: ODSTEP.xs }}>
                  <Text style={[TYPOGRAFIA.etykieta, { color: theme.colors.textSecondary }]}>Komentarz</Text>
                  <Text style={[TYPOGRAFIA.opis, { color: theme.colors.text }]} selectable>{firma.komentarz}</Text>
                </View>
              ) : (
                <WierszDanych etykieta="Komentarz" wartosc="—" />
              )}
              {brakDanych ? (
                <Przycisk maly wariant="drugi" ikona="plus" tekst="Uzupełnij dane" onPress={() => setEdycja(true)} />
              ) : null}
            </Sekcja>
          )}

          <Karta>
            <KontaktyWytworni
              theme={theme}
              nazwaWytworni={firma.nazwa}
              kontakty={firma.kontakty ?? []}
              onZmien={(kontakty) => aktualizuj(firma.id, { kontakty })}
            />
          </Karta>

          <Sekcja tytul={`Sprzęt · ${maszyny.length}`} info="Sprzęt z tą firmą na karcie. Firmę przypiszesz w edycji sprzętu.">
            {maszyny.length === 0 ? (
              <Text style={{ color: theme.colors.textSecondary }}>Brak sprzętu tej firmy.</Text>
            ) : maszyny.map(({ m, nazwa }) => {
              const ile = raporty.filter((r) => r.sprzetId === m.id).length;
              return (
                <PozycjaListy
                  key={m.id}
                  plaska
                  tytul={nazwa}
                  podtytul={linieStawek(m.stawki).join(' · ') || 'Brak stawek'}
                  prawy={`raporty: ${ile}`}
                  accessibilityLabel={`Sprzęt ${nazwa}`}
                  onPress={() => router.push(`/budzet/sprzet/${m.id}` as never)}
                />
              );
            })}
          </Sekcja>
        </ScrollView>
      )}
    </View>
  );
}

function FormularzFirmy({ firma, onAnuluj, onZapisz }: {
  firma: Firma;
  onAnuluj: () => void;
  onZapisz: (zmiany: Partial<Firma>) => Promise<void>;
}) {
  const theme = useMotyw();
  const [nazwa, setNazwa] = useState(firma.nazwa);
  const [adres, setAdres] = useState(firma.adres ?? '');
  const [email, setEmail] = useState(firma.email ?? '');
  const [komentarz, setKomentarz] = useState(firma.komentarz ?? '');
  const [blad, setBlad] = useState('');

  const zapisz = async () => {
    if (!nazwa.trim()) { setBlad('Wpisz nazwę firmy.'); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setBlad('Adres e-mail wygląda na błędny.'); return; }
    setBlad('');
    await onZapisz({
      nazwa,
      adres: adres.trim() || undefined,
      email: email.trim() || undefined,
      komentarz: komentarz.trim() || undefined,
    });
  };

  return (
    <Sekcja tytul="Dane firmy">
      <Pole etykieta="Nazwa" wymagane value={nazwa} onChangeText={setNazwa} accessibilityLabel="Nazwa firmy" />
      <Pole etykieta="Adres siedziby" value={adres} onChangeText={setAdres} placeholder="ul. Przykładowa 1, 00-000 Miasto" accessibilityLabel="Adres siedziby" />
      <Pole etykieta="E-mail" value={email} onChangeText={setEmail} placeholder="biuro@firma.pl" accessibilityLabel="E-mail firmy" klawiatura="email-address" />
      <Pole etykieta="Komentarz" value={komentarz} onChangeText={setKomentarz} placeholder="np. warunki współpracy, NIP" accessibilityLabel="Komentarz" multiline />
      {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
      <View style={styles.przyciski}>
        <View style={{ flex: 1 }}><Przycisk wariant="drugi" tekst="Anuluj" onPress={onAnuluj} /></View>
        <View style={{ flex: 1 }}><Przycisk tekst="Zapisz" accessibilityLabel="Zapisz dane firmy" onPress={zapisz} /></View>
      </View>
    </Sekcja>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 16, gap: 12 },
  przyciski: { flexDirection: 'row', gap: ODSTEP.s },
});
