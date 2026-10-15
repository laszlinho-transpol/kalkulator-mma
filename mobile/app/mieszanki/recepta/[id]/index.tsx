import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { HistoriaStawek } from '../../../../src/components/budzet/HistoriaStawek';
import { Zakladki } from '../../../../src/components/budzet/Zakladki';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useMieszankiStore } from '../../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../../src/stores/wytwornieStore';
import { POLA_CENY, cenaReceptyNaDzien, linieCeny } from '../../../../src/mieszanki/recepty';
import { formatLiczby } from '../../../../src/utils/calculations';
import { dzisIso } from '../../../../src/utils/zakresDat';
import { potwierdzAkcje } from '../../../../src/utils/dialog';

type ZakladkaRecepty = 'dane' | 'historia';

export default function KartaReceptyScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [zakladka, setZakladka] = useState<ZakladkaRecepty>(startowa === 'historia' ? 'historia' : 'dane');
  const recepta = useMieszankiStore((s) => s.mieszanki.find((m) => m.id === id));
  const usunMieszanke = useMieszankiStore((s) => s.usunMieszanke);
  const dodajOkres = useMieszankiStore((s) => s.dodajOkresCeny);
  const zmienOkres = useMieszankiStore((s) => s.zmienOkresCeny);
  const usunOkres = useMieszankiStore((s) => s.usunOkresCeny);
  const wytwornia = useWytwornieStore((s) => s.wytwornie.find((w) => w.id === recepta?.wytworniaId));
  const powrot = wytwornia ? `/mieszanki/wytwornia/${wytwornia.id}?zakladka=recepty` : '/mieszanki';
  const cenaDzis = recepta ? cenaReceptyNaDzien(recepta, dzisIso()) : undefined;

  const wiersz = (etykieta: string, wartosc: string) => (
    <View style={styles.wiersz}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>{etykieta}</Text>
      <Text style={[styles.wartosc, { color: theme.colors.text }]}>{wartosc}</Text>
    </View>
  );

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={recepta ? `${recepta.rodzaj}${recepta.nrRecepty ? ` · ${recepta.nrRecepty}` : ''}` : 'Recepta'}
        podtytul={wytwornia?.nazwa ?? 'Bez wytwórni'}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
        prawy={recepta ? { tekst: 'Edytuj', onPress: () => router.push(`/mieszanki/recepta/${recepta.id}/edytuj` as never) } : undefined}
      />
      {!recepta ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono recepty.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <Zakladki<ZakladkaRecepty>
            theme={theme}
            aktywna={zakladka}
            onZmien={setZakladka}
            zakladki={[['dane', 'Dane'], ['historia', 'Historia ceny']]}
          />
          {zakladka === 'dane' ? (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {wiersz('Wytwórnia', wytwornia?.nazwa ?? '—')}
              {wiersz('Rodzaj', recepta.rodzaj)}
              {wiersz('Nr recepty', recepta.nrRecepty || '—')}
              {wiersz('Ciężar obj.', `${recepta.ciezarObjetosciowy.toFixed(3)} t/m³`)}
              {wiersz('Cena dziś', cenaDzis ? `${formatLiczby(cenaDzis)} zł/t` : '—')}
              {recepta.cena && cenaDzis !== recepta.cena ? wiersz('Cena z karty', `${formatLiczby(recepta.cena)} zł/t`) : null}
              <TouchableOpacity
                accessibilityLabel="Edytuj receptę"
                onPress={() => router.push(`/mieszanki/recepta/${recepta.id}/edytuj` as never)}
                style={[styles.dodaj, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.dodajTekst}>Edytuj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Usuń receptę"
                style={styles.usun}
                onPress={() => potwierdzAkcje('Usuń receptę', `Usunąć „${recepta.rodzaj}”?`, async () => {
                  await usunMieszanke(recepta.id);
                  router.replace(powrot as never);
                })}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń receptę</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <HistoriaStawek
              theme={theme}
              pola={POLA_CENY}
              bazowe={{ cena: recepta.cena }}
              historia={recepta.historiaCen}
              linie={linieCeny}
              onDodaj={(okres) => dodajOkres(recepta.id, okres)}
              onZmien={(okres) => zmienOkres(recepta.id, okres)}
              onUsun={(okresId) => usunOkres(recepta.id, okresId)}
              tytul="Historia ceny"
              info="Każdy okres ma własną cenę. W dniach z zakresu obowiązuje cena okresu, poza zakresami – cena z karty recepty."
              etykietaBazowych="Cena z karty"
              brakOkresow="Brak okresów. Cena z karty obowiązuje cały czas."
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 14, gap: 12 },
  karta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  wiersz: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  etykieta: { fontSize: 14 },
  wartosc: { fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  usun: { alignItems: 'center', paddingVertical: 6 },
});
