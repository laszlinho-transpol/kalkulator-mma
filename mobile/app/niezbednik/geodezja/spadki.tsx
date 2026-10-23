// Kalkulator spadków: spadek między dwiema rzędnymi na znanej odległości poziomej.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysSpadek } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu, zeZnakiem } from '../../../src/geodezja/geometria';
import { kalkulatorSpadkow } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/spadki';

export default function SpadkiScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [start, setStart] = useState('100,00');
  const [koniec, setKoniec] = useState('99,50');
  const [odleglosc, setOdleglosc] = useState('50');
  const a = liczbaZTekstu(start);
  const b = liczbaZTekstu(koniec);
  const l = liczbaZTekstu(odleglosc);
  const blad = l != null && l <= 0 ? 'Odległość musi być większa od zera.' : null;
  const wynik = a != null && b != null && l != null && l > 0 ? kalkulatorSpadkow(a, b, l) : null;
  const roznicaCm = a != null && b != null ? (b - a) * 100 : null;
  const kierunek = !wynik || wynik.procent === 0 ? 'poziomo' : wynik.procent < 0 ? 'opada od A do B' : 'wznosi się od A do B';
  const procent = wynik ? `${zeZnakiem(wynik.procent, 2)} %` : '—';

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Kalkulator spadków" podtytul="Spadek z dwóch rzędnych" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co to jest spadek',
              rysunek: <RysSpadek />,
              opis: 'Spadek to różnica wysokości **Δh** między punktami A i B podzielona przez odległość poziomą **L**, razy 100%. **1% to 1 cm na każdy metr**, 2% na 5 m to 10 cm.',
            },
            {
              tytul: 'Wpisz rzędne i odległość',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Rzędna A" wartosc="100,00" jednostka="m" aktywne />
                    <WycinekPola etykieta="Rzędna B" wartosc="99,50" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekPola etykieta="Odległość L" wartosc="50" jednostka="m" />
                </>
              ),
              opis: 'Wpisz **rzędną punktu początkowego A** i **końcowego B** w metrach (z projektu albo niwelatora) oraz **odległość poziomą** między nimi. Pola wypełniasz klawiaturą liczbową pod danymi.',
            },
            {
              tytul: 'Odczytaj wynik',
              rysunek: <WycinekWyniku etykieta="Spadek" wartosc="-1,00 %" />,
              opis: '**Minus** – teren opada od A do B, **plus** – wznosi się. Pod wynikiem są promile (‰) i różnica wysokości w centymetrach. **Zapisz do Notatnika** zachowa wynik.',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Rzędna A" value={start} onChangeText={setStart} jednostka="m" accessibilityLabel="Rzędna startowa [m]" />
                <PoleLiczby etykieta="Rzędna B" value={koniec} onChangeText={setKoniec} jednostka="m" accessibilityLabel="Rzędna końcowa [m]" />
              </Wiersz>
              <PoleLiczby etykieta="Odległość L" value={odleglosc} onChangeText={setOdleglosc} jednostka="m" accessibilityLabel="Odległość [m]" />
              {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
              <RamkaWyniku etykieta="Spadek" accessibilityLabel="Wynik spadek" wartosc={procent} />
              {wynik ? (
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Promile', wartosc: `${fm(wynik.promile, 1)} ‰` },
                    { etykieta: 'Różnica Δh', wartosc: `${zeZnakiem(roznicaCm ?? 0, 1)} cm` },
                    { etykieta: 'Kierunek', wartosc: kierunek },
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
            if (wynik && a != null && b != null && l != null) {
              dodaj(`Spadek: A ${fm(a, 3)} m → B ${fm(b, 3)} m na ${fm(l, 2)} m = ${procent} (${fm(wynik.promile, 1)} ‰)`, 'Geodezja');
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
