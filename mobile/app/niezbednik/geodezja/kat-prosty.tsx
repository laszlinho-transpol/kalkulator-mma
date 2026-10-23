// Tyczenie kąta prostego metodą 3-4-5 (trójkąt egipski) – wpisany dowolny bok przelicza pozostałe dwa.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysTrojkat345, RysTyczenie345 } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { trojkat345, type BokTrojkata345 } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/kat-prosty';

export default function KatProstyScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [zrodlo, setZrodlo] = useState<{ bok: BokTrojkata345; tekst: string }>({ bok: 'a', tekst: '3' });
  const d = liczbaZTekstu(zrodlo.tekst);
  const w = trojkat345(d != null && d > 0 ? d : 0, zrodlo.bok);
  const m = (v: number) => `${fm(v, 2)} m`;
  const pole = (bok: BokTrojkata345, wartosc: number) => ({
    value: zrodlo.bok === bok ? zrodlo.tekst : fm(wartosc, 2),
    onChangeText: (tekst: string) => setZrodlo({ bok, tekst }),
  });

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Kąt prosty" podtytul="Metoda 3-4-5" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Trójkąt 3-4-5',
              rysunek: <RysTrojkat345 a={m(w.bokA)} b={m(w.bokB)} c={m(w.przeciwprostokatna)} />,
              opis: 'Trójkąt o bokach w proporcji **3 : 4 : 5** zawsze ma kąt prosty między krótszymi bokami. Wystarczą dwie taśmy – bez kątownika i instrumentu.',
            },
            {
              tytul: 'Wpisz dowolny bok',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Bok a (3×)" wartosc="6,00" jednostka="m" />
                    <WycinekPola etykieta="Bok b (4×)" wartosc="8" jednostka="m" aktywne />
                  </WycinekWiersz>
                  <WycinekWyniku etykieta="Przekątna c (5×)" wartosc="10,00 m" />
                </>
              ),
              opis: 'Stuknij pole boku, który znasz albo który mieści się na budowie – **Bok a**, **Bok b** albo **Przekątna c** – i wpisz długość klawiaturą pod danymi. Pozostałe dwa boki i **mnożnik** przeliczą się same (np. b = 8 m → a = 6 m, c = 10 m). **Im dłuższe boki, tym dokładniejszy kąt.**',
            },
            {
              tytul: 'Wytycz w terenie',
              rysunek: <RysTyczenie345 a={m(w.bokA)} b={m(w.bokB)} c={m(w.przeciwprostokatna)} />,
              opis: 'Wbij szpilkę **A** w wierzchołku kąta. Wzdłuż istniejącej linii odmierz **b** i wbij **B**. Zaczep taśmę **a** w A, a przekątną **c** w B – gdzie się spotkają, wbij **C**. Linia A–C jest prostopadła.',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Bok a (3×)" jednostka="m" accessibilityLabel="Bok a" {...pole('a', w.bokA)} />
                <PoleLiczby etykieta="Bok b (4×)" jednostka="m" accessibilityLabel="Bok b" {...pole('b', w.bokB)} />
              </Wiersz>
              <PoleLiczby etykieta="Przekątna c (5×)" jednostka="m" accessibilityLabel="Przekątna c" {...pole('c', w.przeciwprostokatna)} />
              <RamkaWyniku
                etykieta="Boki a · b · c"
                accessibilityLabel="Wynik boki"
                wartosc={`${fm(w.bokA, 2)} · ${fm(w.bokB, 2)} · ${m(w.przeciwprostokatna)}`}
              />
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Mnożnik', wartosc: `${fm(w.mnoznik, 3).replace(/,?0+$/, '')}×` },
                  { etykieta: 'Taśma a + b + c', wartosc: m(w.bokA + w.bokB + w.przeciwprostokatna) },
                ]}
              />
              <KlawiaturaLiczb />
            </Sekcja>
          </View>
        </StrefaKlawiatury>

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={() => dodaj(`Kąt prosty 3-4-5 (mnożnik ${fm(w.mnoznik, 3).replace(/,?0+$/, '')}): a = ${m(w.bokA)}, b = ${m(w.bokB)}, przekątna c = ${m(w.przeciwprostokatna)}`, 'Geodezja')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
});
