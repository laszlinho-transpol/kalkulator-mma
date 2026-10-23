// Wydajność grubościowa: średnia grubość warstwy z wbudowanej masy na przejechanym odcinku.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysSredniaGrubosc } from '../../../src/components/niezbednik/RysunkiMasy';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { wydajnoscGrubosciowa } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'masa/wydajnosc-grubosciowa';

export default function WydajnoscGrubosciowaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [masa, setMasa] = useState('25,5');
  const [dlugosc, setDlugosc] = useState('100');
  const [szerokosc, setSzerokosc] = useState('3,65');
  const [gestosc, setGestosc] = useState('2,455');
  const m = liczbaZTekstu(masa);
  const l = liczbaZTekstu(dlugosc);
  const s = liczbaZTekstu(szerokosc);
  const r = liczbaZTekstu(gestosc);
  const cm = m != null && l != null && s != null && r != null ? wydajnoscGrubosciowa(m, l, s, r) : 0;
  const ok = cm > 0 && Number.isFinite(cm);
  const mWynik = ok ? `${fm(cm, 2)} cm` : '…';

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Średnia grubość" podtytul="Wydajność grubościowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co liczy ten kalkulator',
              rysunek: <RysSredniaGrubosc wynik={mWynik} />,
              opis: 'Sprawdza, jaką **średnią grubość** warstwy faktycznie ułożyłeś: z wbudowanej masy, przejechanej długości i szerokości pasa. Szybka kontrola, czy rozkładarka nie „zjada” albo nie oszczędza masy.',
            },
            {
              tytul: 'Wpisz masę i odcinek',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Wbudowana masa M" wartosc="25,5" jednostka="Mg" aktywne />
                    <WycinekPola etykieta="Długość L" wartosc="100" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Szerokość s" wartosc="3,65" jednostka="m" />
                    <WycinekPola etykieta="Gęstość ρ" wartosc="2,455" jednostka="t/m³" />
                  </WycinekWiersz>
                </>
              ),
              opis: 'Zsumuj tonaż z **WZ** aut wbudowanych na odcinku, zmierz **przejechaną długość** i wpisz szerokość pasa oraz gęstość z recepty. Stuknij pole, a pod danymi pojawi się klawiatura liczbowa.',
            },
            {
              tytul: 'Porównaj z projektem',
              rysunek: <WycinekWyniku etykieta="Średnia grubość" wartosc={ok ? mWynik : '—'} />,
              opis: 'Wzór: g = M / (L × s × ρ). Porównaj wynik z grubością z projektu – pod spodem masz też **powierzchnię** odcinka i **zużycie** masy na 1 m².',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Wbudowana masa M" value={masa} onChangeText={setMasa} jednostka="Mg" accessibilityLabel="Wbudowany tonaż M [Mg]" />
                <PoleLiczby etykieta="Długość L" value={dlugosc} onChangeText={setDlugosc} jednostka="m" accessibilityLabel="Przejechana długość L [m]" />
              </Wiersz>
              <Wiersz>
                <PoleLiczby etykieta="Szerokość s" value={szerokosc} onChangeText={setSzerokosc} jednostka="m" accessibilityLabel="Szerokość układania s [m]" />
                <PoleLiczby etykieta="Gęstość ρ" value={gestosc} onChangeText={setGestosc} jednostka="t/m³" accessibilityLabel="Gęstość ρ [t/m³]" />
              </Wiersz>
              <RamkaWyniku etykieta="Średnia grubość" accessibilityLabel="Wynik średnia grubość" wartosc={ok ? mWynik : '—'} />
              {ok && m != null && l != null && s != null ? (
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Powierzchnia L × s', wartosc: `${fm(l * s, 1)} m²` },
                    { etykieta: 'Zużycie masy', wartosc: `${fm((m * 1000) / (l * s), 1)} kg/m²` },
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
            if (ok && m != null && l != null) {
              dodaj(`Wydajność grubościowa: ${fm(cm, 2)} cm (${fm(m, 1)} Mg na ${fm(l, 1)} m)`, 'Masa i sprzęt');
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
