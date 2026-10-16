import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
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
import { POLA_CENY, cenaReceptyNaDzien, linieCeny, numerDnia, punktyHistoriiCeny } from '../../../../src/mieszanki/recepty';
import { Przycisk, Sekcja, SiatkaDanych, WierszDanych, WykresLiniowy } from '../../../../src/components/ui';
import type { Mieszanka } from '../../../../src/types';
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
  const powrot = wytwornia ? `/mieszanki/wytwornia/${wytwornia.id}?zakladka=mieszanki` : '/mieszanki';
  const cenaDzis = recepta ? cenaReceptyNaDzien(recepta, dzisIso()) : undefined;

  const edytuj = () => { if (recepta) router.push(`/mieszanki/recepta/${recepta.id}/edytuj` as never); };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={recepta ? `${recepta.rodzaj}${recepta.nrRecepty ? ` · ${recepta.nrRecepty}` : ''}` : 'Recepta'}
        podtytul={wytwornia?.nazwa ?? 'Bez wytwórni'}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
        prawy={recepta ? { tekst: 'Edytuj', onPress: edytuj } : undefined}
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
            <>
              <Sekcja tytul="Recepta">
                <WierszDanych etykieta="Wytwórnia" wartosc={wytwornia?.nazwa ?? '—'} />
                <WierszDanych etykieta="Rodzaj" wartosc={recepta.rodzaj} />
                <WierszDanych etykieta="Nr recepty" wartosc={recepta.nrRecepty || '—'} />
              </Sekcja>
              <Sekcja tytul="Parametry i cena">
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Ciężar obj.', wartosc: `${recepta.ciezarObjetosciowy.toFixed(3)} t/m³` },
                    { etykieta: 'Cena dziś', wartosc: cenaDzis ? `${formatLiczby(cenaDzis)} zł/t` : '—' },
                    ...(recepta.cena && cenaDzis !== recepta.cena ? [{ etykieta: 'Cena z karty', wartosc: `${formatLiczby(recepta.cena)} zł/t` }] : []),
                  ]}
                />
              </Sekcja>
              <Przycisk
                wariant="niebezpieczny"
                ikona="usun"
                tekst="Usuń receptę"
                onPress={() => potwierdzAkcje('Usuń receptę', `Usunąć „${recepta.rodzaj}”?`, async () => {
                  await usunMieszanke(recepta.id);
                  router.replace(powrot as never);
                })}
              />
            </>
          ) : (
            <>
              <WykresCeny historia={recepta.historiaCen} cenaKarty={recepta.cena} />
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
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const krotkaData = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;

function WykresCeny({ historia, cenaKarty }: { historia: Mieszanka['historiaCen']; cenaKarty?: number }) {
  const punkty = punktyHistoriiCeny(historia);
  if (punkty.length === 0) return null;
  const pierwszy = punkty[0];
  const ostatni = punkty[punkty.length - 1];
  return (
    <Sekcja tytul="Wykres ceny" info="Linia pokazuje cenę w kolejnych okresach historii. Przerywana linia to cena z karty recepty, obowiązująca poza okresami.">
      <WykresLiniowy
        opis="Wykres historii ceny"
        punkty={punkty.map((p) => ({ x: numerDnia(p.iso), y: p.cena, znacznik: p.poczatek }))}
        formatY={(y) => `${formatLiczby(y)} zł`}
        etykietyX={[
          { x: numerDnia(pierwszy.iso), tekst: krotkaData(pierwszy.iso) },
          ...(ostatni.iso !== pierwszy.iso ? [{ x: numerDnia(ostatni.iso), tekst: krotkaData(ostatni.iso) }] : []),
        ]}
        odniesienie={cenaKarty ? { y: cenaKarty, etykieta: `karta ${formatLiczby(cenaKarty)} zł` } : undefined}
      />
    </Sekcja>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 14, gap: 12 },
});
