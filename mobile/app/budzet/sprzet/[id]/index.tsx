import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { formatLiczby } from '../../../../src/utils/calculations';
import { rodzajPoId } from '../../../../src/budzet/rodzajeSprzetu';
import { opisRozliczenia } from '../../../../src/budzet/rozliczenie';
import { dataKrotko, etykietaSprzetu, linieStawek } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { useFirmyStore } from '../../../../src/stores/firmyStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { useSprzetStore } from '../../../../src/stores/sprzetStore';

export default function KartaSprzetuScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [szukaj, setSzukaj] = useState('');
  const maszyna = useSprzetStore((s) => s.sprzet.find((pozycja) => pozycja.id === id));
  const raporty = useSprzetStore((s) => s.raporty);
  const firmy = useFirmyStore((s) => s.firmy);
  const budowy = useBudowyStore((s) => s.budowy);
  const pracownicy = usePracownicyStore((s) => s.pracownicy);

  const lista = useMemo(() => {
    const fraza = szukaj.trim().toLowerCase();
    return raporty
      .filter((r) => r.sprzetId === id)
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt))
      .filter((r) => {
        if (!fraza) return true;
        const budowa = budowy.find((b) => b.id === r.budowaId);
        const pracownik = pracownicy.find((p) => p.id === r.pracownikId);
        const tekst = [
          r.data, dataKrotko(r.data), r.uwagi ?? '',
          formatLiczby(r.kwota).replace(/\u00A0/g, ''),
          String(r.kwota).replace('.', ','),
          budowa?.kodBudowy ?? '', budowa?.nazwaInwestycji ?? '',
          pracownik?.imieNazwisko ?? '',
        ].join(' ').toLowerCase();
        return tekst.includes(fraza);
      });
  }, [raporty, id, szukaj, budowy, pracownicy]);

  const firma = firmy.find((f) => f.id === maszyna?.firmaId);
  const rodzaj = rodzajPoId(maszyna?.rodzajId ?? '');

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={rodzaj?.nazwa ?? 'Sprzęt'}
        podtytul={maszyna ? etykietaSprzetu(maszyna.numer) : ''}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(maszyna ? `/budzet/sprzet/rodzaj/${maszyna.rodzajId}` : '/budzet/sprzet') }}
      />
      {!maszyna ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono sprzętu.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Wiersz etykieta="Rodzaj" wartosc={rodzaj?.nazwa ?? maszyna.rodzajId} kolor={theme.colors.text} etykietaKolor={theme.colors.textSecondary} />
            <Wiersz etykieta="Numer" wartosc={etykietaSprzetu(maszyna.numer)} kolor={theme.colors.text} etykietaKolor={theme.colors.textSecondary} />
            <Wiersz etykieta="Firma" wartosc={firma?.nazwa ?? '—'} kolor={theme.colors.text} etykietaKolor={theme.colors.textSecondary} />
            {linieStawek(maszyna.stawki).map((linia) => (
              <Text key={linia} style={[styles.stawka, { color: theme.colors.text }]}>{linia}</Text>
            ))}
            <Wiersz
              etykieta="Spalanie"
              wartosc={maszyna.spalanieLnaMth ? `${formatLiczby(maszyna.spalanieLnaMth)} l/mth` : '—'}
              kolor={theme.colors.text}
              etykietaKolor={theme.colors.textSecondary}
            />
          </View>

          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sekcja, { color: theme.colors.text }]}>Raporty</Text>
            <TouchableOpacity
              accessibilityLabel="Dodaj raport"
              onPress={() => router.push(`/budzet/sprzet/${maszyna.id}/raport` as never)}
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
                {raporty.some((r) => r.sprzetId === id) ? 'Nic nie pasuje do szukania.' : 'Brak raportów.'}
              </Text>
            ) : lista.map((raport) => {
              const budowa = budowy.find((b) => b.id === raport.budowaId);
              const pracownik = pracownicy.find((p) => p.id === raport.pracownikId);
              return (
                <View key={raport.id} style={[styles.raport, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.data, { color: theme.colors.text }]}>{dataKrotko(raport.data)}</Text>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    {budowa ? `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}` : 'Budowa usunięta'}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary }}>{pracownik?.imieNazwisko ?? 'Pracownik usunięty'}</Text>
                  {raport.pozycje.map((pozycja) => (
                    <Text key={pozycja.rodzaj} style={{ color: theme.colors.text, marginTop: 4 }}>
                      {opisRozliczenia(pozycja.rodzaj).nazwa}: {formatLiczby(pozycja.ilosc)} × {formatLiczby(pozycja.stawka)} zł = {formatLiczby(pozycja.kwota)} zł
                    </Text>
                  ))}
                  <Text style={[styles.kwota, { color: theme.colors.text }]}>Kwota: {formatLiczby(raport.kwota)} zł</Text>
                  {raport.uwagi ? <Text style={{ color: theme.colors.textSecondary }}>{raport.uwagi}</Text> : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Wiersz({ etykieta, wartosc, kolor, etykietaKolor }: { etykieta: string; wartosc: string; kolor: string; etykietaKolor: string }) {
  return (
    <View style={styles.wiersz}>
      <Text style={[styles.wierszEtykieta, { color: etykietaKolor }]}>{etykieta}</Text>
      <Text style={[styles.wierszWartosc, { color: kolor }]}>{wartosc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 16, gap: 12 },
  karta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  sekcja: { fontSize: 18, fontWeight: '800' },
  wiersz: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  wierszEtykieta: { fontSize: 14 },
  wierszWartosc: { fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  stawka: { fontSize: 15, fontWeight: '600' },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  szukaj: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  raport: { borderTopWidth: 1, paddingTop: 10, gap: 2 },
  data: { fontSize: 16, fontWeight: '800' },
  kwota: { fontSize: 16, fontWeight: '800', marginTop: 4 },
});
