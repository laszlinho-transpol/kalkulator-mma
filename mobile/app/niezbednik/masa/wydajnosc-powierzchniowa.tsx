// Wydajność powierzchniowa: ile metrów pasa o zadanej grubości i szerokości ułoży się z jednego auta.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysMetryZAuta } from '../../../src/components/niezbednik/RysunkiMasy';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { wydajnoscPowierzchniowa } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'masa/wydajnosc-powierzchniowa';

export default function WydajnoscPowierzchniowaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [tonaz, setTonaz] = useState('25,5');
  const [grubosc, setGrubosc] = useState('4');
  const [szerokosc, setSzerokosc] = useState('3,65');
  const [gestosc, setGestosc] = useState('2,455');
  const t = liczbaZTekstu(tonaz);
  const g = liczbaZTekstu(grubosc);
  const s = liczbaZTekstu(szerokosc);
  const r = liczbaZTekstu(gestosc);
  const metry = t != null && g != null && s != null && r != null ? wydajnoscPowierzchniowa(t, g, s, r) : 0;
  const ok = metry > 0 && Number.isFinite(metry);
  const mMetry = ok ? `${fm(metry, 1)} m` : '…';

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Metry z tony" podtytul="Wydajność powierzchniowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co liczy ten kalkulator',
              rysunek: <RysMetryZAuta tonaz={t != null ? `${fm(t, 1)} t` : '? t'} metry={mMetry} />,
              opis: 'Podaje, ile **metrów bieżących** pasa ułożysz z masy na jednym aucie – przy zadanej grubości i szerokości układania. Przydaje się do planowania, gdzie podstawić następne auto.',
            },
            {
              tytul: 'Wpisz auto i warstwę',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Tonaż na aucie" wartosc="25,5" jednostka="t" aktywne />
                    <WycinekPola etykieta="Grubość" wartosc="4" jednostka="cm" />
                  </WycinekWiersz>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Szerokość" wartosc="3,65" jednostka="m" />
                    <WycinekPola etykieta="Gęstość" wartosc="2,455" jednostka="t/m³" />
                  </WycinekWiersz>
                </>
              ),
              opis: 'Tonaż odczytaj z **WZ** auta, grubość i szerokość weź z projektu, a **gęstość** z recepty mieszanki. Stuknij pole – pod danymi pojawi się klawiatura liczbowa; **OK** ją zamyka.',
            },
            {
              tytul: 'Odczytaj wynik',
              rysunek: <WycinekWyniku etykieta="Metry z auta" wartosc={ok ? mMetry : '—'} />,
              opis: 'Wynik to **długość pasa** z jednego auta. Wzór: L = tonaż / (grubość × szerokość × gęstość). Pod spodem zobaczysz też powierzchnię z auta i masę na 1 m².',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Tonaż na aucie" value={tonaz} onChangeText={setTonaz} jednostka="t" accessibilityLabel="Tonaż na aucie [t]" />
                <PoleLiczby etykieta="Grubość" value={grubosc} onChangeText={setGrubosc} jednostka="cm" accessibilityLabel="Grubość [cm]" />
              </Wiersz>
              <Wiersz>
                <PoleLiczby etykieta="Szerokość" value={szerokosc} onChangeText={setSzerokosc} jednostka="m" accessibilityLabel="Szerokość układania [m]" />
                <PoleLiczby etykieta="Gęstość" value={gestosc} onChangeText={setGestosc} jednostka="t/m³" accessibilityLabel="Gęstość [t/m³]" />
              </Wiersz>
              <RamkaWyniku etykieta="Metry z auta" accessibilityLabel="Wynik metry z auta" wartosc={ok ? mMetry : '—'} />
              {ok && s != null && g != null && r != null ? (
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Powierzchnia z auta', wartosc: `${fm(metry * s, 1)} m²` },
                    { etykieta: 'Masa na 1 m²', wartosc: `${fm((g / 100) * r * 1000, 1)} kg/m²` },
                  ]}
                />
              ) : null}
              <KlawiaturaLiczb />
            </Sekcja>
          </View>
        </StrefaKlawiatury>

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={() => {
            if (ok && t != null && g != null && s != null) {
              dodaj(`Wydajność powierzchniowa: ${fm(metry, 1)} m (${fm(t, 1)} t, ${fm(g, 1)} cm × ${fm(s, 2)} m)`, 'Masa i sprzęt');
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
});
