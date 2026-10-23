// Tyczenie kąta prostego metodą 3-4-5 (trójkąt egipski) z mnożnikiem długości boków.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, WycinekPola, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysTrojkat345, RysTyczenie345 } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { tyczenieKataProstego } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/kat-prosty';

export default function KatProstyScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [skala, setSkala] = useState('1');
  const s = liczbaZTekstu(skala);
  const w = tyczenieKataProstego(s != null && s > 0 ? s : 1);
  const m = (v: number) => `${fm(v, 2)} m`;

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
              tytul: 'Wpisz mnożnik',
              rysunek: (
                <>
                  <WycinekPola etykieta="Mnożnik boków" wartosc="2" aktywne />
                  <WycinekWyniku etykieta="Boki a · b · c" wartosc="6 · 8 · 10 m" />
                </>
              ),
              opis: 'Mnożnik wydłuża boki: 1 → 3, 4 i 5 m; 2 → 6, 8 i 10 m. **Im dłuższe boki, tym dokładniejszy kąt** – dobierz je do miejsca na budowie. Pole wypełniasz klawiaturą liczbową pod danymi.',
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
              <PoleLiczby etykieta="Mnożnik boków" value={skala} onChangeText={setSkala} accessibilityLabel="Mnożnik boków" />
              <RamkaWyniku etykieta="Przekątna c (5×)" accessibilityLabel="Wynik przekątna" wartosc={m(w.przeciwprostokatna)} />
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Bok a (3×)', wartosc: m(w.bokA) },
                  { etykieta: 'Bok b (4×)', wartosc: m(w.bokB) },
                ]}
              />
              <KlawiaturaLiczb />
            </Sekcja>
          </View>
        </StrefaKlawiatury>

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={() => dodaj(`Kąt prosty 3-4-5: a = ${m(w.bokA)}, b = ${m(w.bokB)}, przekątna c = ${m(w.przeciwprostokatna)}`, 'Geodezja')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
});
