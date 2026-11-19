// Kalkulator spadków: spadek z dwóch rzędnych albo odczyt łaty w punkcie B.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, Zakladki, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { CZCIONKA } from '../../../src/components/geodezja/RysunkiGeodezji';
import { RysSpadek } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu, zeZnakiem } from '../../../src/geodezja/geometria';
import { kalkulatorSpadkow, odczytLatyZeSpadku } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/spadki';
type Tryb = 'rzedne' | 'lata';

export default function SpadkiScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [tryb, setTryb] = useState<Tryb>('rzedne');
  const [start, setStart] = useState('100,00');
  const [koniec, setKoniec] = useState('99,50');
  const [odleglosc, setOdleglosc] = useState('50');
  const [odczytA, setOdczytA] = useState('1500');
  const [odlegloscLaty, setOdlegloscLaty] = useState('5');
  const [spadek, setSpadek] = useState('-2');
  const [swiatlo, setSwiatlo] = useState('0');

  const a = liczbaZTekstu(start);
  const b = liczbaZTekstu(koniec);
  const l = liczbaZTekstu(odleglosc);
  const bladRzednych = l != null && l <= 0 ? 'Odległość musi być większa od zera.' : null;
  const wynik = a != null && b != null && l != null && l > 0 ? kalkulatorSpadkow(a, b, l) : null;
  const roznicaCm = a != null && b != null ? (b - a) * 100 : null;
  const kierunek = !wynik || wynik.procent === 0 ? 'poziomo' : wynik.procent < 0 ? 'opada od A do B' : 'wznosi się od A do B';
  const procent = wynik ? `${zeZnakiem(wynik.procent, 2)} %` : '—';

  const odczytAMm = liczbaZTekstu(odczytA);
  const lLaty = liczbaZTekstu(odlegloscLaty);
  const spadekProc = liczbaZTekstu(spadek);
  const swiatloCm = liczbaZTekstu(swiatlo) ?? 0;
  const bladLaty = lLaty != null && lLaty <= 0 ? 'Odległość musi być większa od zera.' : null;
  const lata = odczytAMm != null && lLaty != null && lLaty > 0 && spadekProc != null
    ? odczytLatyZeSpadku(odczytAMm, lLaty, spadekProc, swiatloCm)
    : null;
  const odczytB = lata ? `${fm(lata.odczytBMm, 0)} mm` : '—';
  const kierunekLaty = opisKierunkuLaty(spadekProc);

  const zapisz = () => {
    if (tryb === 'lata') {
      if (lata && odczytAMm != null && lLaty != null && spadekProc != null) {
        dodaj(
          `Odczyt łaty: A ${fm(odczytAMm, 0)} mm, L ${fm(lLaty, 2)} m, spadek ${zeZnakiem(spadekProc, 2)}%, światło ${zeZnakiem(swiatloCm, 1)} cm → B ${fm(lata.odczytBMm, 0)} mm`,
          'Geodezja',
        );
      }
      return;
    }
    if (wynik && a != null && b != null && l != null) {
      dodaj(`Spadek: A ${fm(a, 3)} m → B ${fm(b, 3)} m na ${fm(l, 2)} m = ${procent} (${fm(wynik.promile, 1)} ‰)`, 'Geodezja');
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Kalkulator spadków" podtytul="Rzędne i odczyt łaty" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
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
            {
              tytul: 'Odczyt łaty w punkcie B',
              rysunek: <WycinekWyniku etykieta="Odczyt B" wartosc="1210 mm" />,
              opis: 'Na zakładce **Łata** wpisz odczyt w A, odległość do B i spadek. **Strzałka** pokazuje, czy teren jest malejący, czy rosnący. Stuknij ją, żeby odwrócić kierunek — odczyt w B przeliczy się od razu. **Światło +12 cm** podnosi punkt B i odczyt maleje o 120 mm.',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Zakladki
                theme={theme}
                aktywna={tryb}
                onZmien={setTryb}
                zakladki={[['rzedne', 'Rzędne'], ['lata', 'Łata']]}
              />
              {tryb === 'rzedne' ? (
                <>
                  <Wiersz>
                    <PoleLiczby etykieta="Rzędna A" value={start} onChangeText={setStart} jednostka="m" accessibilityLabel="Rzędna startowa [m]" />
                    <PoleLiczby etykieta="Rzędna B" value={koniec} onChangeText={setKoniec} jednostka="m" accessibilityLabel="Rzędna końcowa [m]" />
                  </Wiersz>
                  <PoleLiczby etykieta="Odległość L" value={odleglosc} onChangeText={setOdleglosc} jednostka="m" accessibilityLabel="Odległość [m]" />
                  {bladRzednych ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{bladRzednych}</Text> : null}
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
                </>
              ) : (
                <>
                  <Wiersz>
                    <PoleLiczby etykieta="Odczyt A" value={odczytA} onChangeText={setOdczytA} jednostka="mm" accessibilityLabel="Odczyt łaty w punkcie A [mm]" />
                    <PoleLiczby etykieta="Odległość L" value={odlegloscLaty} onChangeText={setOdlegloscLaty} jednostka="m" accessibilityLabel="Odległość do punktu B [m]" />
                  </Wiersz>
                  <Wiersz>
                    <PoleLiczby
                      etykieta="Spadek"
                      value={spadek}
                      onChangeText={setSpadek}
                      jednostka="%"
                      info="Minus: teren opada od A do B i odczyt rośnie. Plus: teren się wznosi."
                      accessibilityLabel="Spadek [%]"
                    />
                    <PoleLiczby
                      etykieta="Światło"
                      value={swiatlo}
                      onChangeText={setSwiatlo}
                      jednostka="cm"
                      info="Plus podnosi punkt B, np. +12 cm na krawężnik, i zmniejsza odczyt. Zero, gdy nie dodajesz światła."
                      accessibilityLabel="Światło [cm]"
                    />
                  </Wiersz>
                  {bladLaty ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{bladLaty}</Text> : null}
                  <StrzalkaSpadku
                    spadek={spadekProc}
                    odczytA={odczytAMm != null ? `${fm(odczytAMm, 0)} mm` : '—'}
                    odczytB={odczytB}
                    onOdwroc={() => setSpadek((teraz) => odwrocZnakSpadku(teraz))}
                  />
                  <RamkaWyniku etykieta="Odczyt B" accessibilityLabel="Odczyt łaty w punkcie B" wartosc={odczytB} />
                  {lata ? (
                    <SiatkaDanych
                      pozycje={[
                        { etykieta: 'W metrach', wartosc: `${fm(lata.odczytBMm / 1000, 3)} m` },
                        { etykieta: 'Ze spadku', wartosc: `${zeZnakiem(lata.zeSpadkuMm, 0)} mm` },
                        { etykieta: 'Ze światła', wartosc: `${zeZnakiem(lata.zeSwiatlaMm, 0)} mm` },
                        { etykieta: 'Kierunek', wartosc: kierunekLaty },
                      ]}
                    />
                  ) : null}
                </>
              )}
              <KlawiaturaLiczb />
            </Sekcja>
          </View>
        </StrefaKlawiatury>

        <Przycisk wariant="drugi" tekst="Zapisz do Notatnika" onPress={zapisz} />
      </ScrollView>
    </View>
  );
}

function opisKierunkuLaty(spadek: number | null | undefined): string {
  if (spadek == null || spadek === 0) return 'poziomo';
  return spadek < 0 ? 'malejący' : 'rosnący';
}

/** Zostawia zapis liczby, zmienia tylko znak. Zero i puste pole zostają bez zmian. */
function odwrocZnakSpadku(tekst: string): string {
  const n = liczbaZTekstu(tekst);
  if (n == null || n === 0) return tekst;
  const t = tekst.trim().replace(/^[−–]/, '-');
  return t.startsWith('-') ? t.slice(1) : `-${t}`;
}

function StrzalkaSpadku({ spadek, odczytA, odczytB, onOdwroc }: {
  spadek: number | null | undefined;
  odczytA: string;
  odczytB: string;
  onOdwroc: () => void;
}) {
  const theme = useMotyw();
  const opada = spadek != null && spadek < 0;
  const wGore = spadek != null && spadek > 0;
  const yA = opada ? 26 : wGore ? 70 : 48;
  const yB = opada ? 70 : wGore ? 26 : 48;
  const yNapisA = yA < 48 ? 14 : 98;
  const yNapisB = yB < 48 ? 14 : 98;
  const xA = 36;
  const xB = 284;
  const kat = Math.atan2(yB - yA, xB - xA);
  const grotX = xB - Math.cos(kat) * 9;
  const grotY = yB - Math.sin(kat) * 9;
  const koniecX = grotX - Math.cos(kat) * 14;
  const koniecY = grotY - Math.sin(kat) * 14;
  const bok = (znak: number) => ({
    x: grotX - Math.cos(kat) * 16 + Math.cos(kat + znak * Math.PI / 2) * 8,
    y: grotY - Math.sin(kat) * 16 + Math.sin(kat + znak * Math.PI / 2) * 8,
  });
  const lewy = bok(1);
  const prawy = bok(-1);
  const napis = opada
    ? 'Malejący: teren opada, odczyt w B rośnie'
    : wGore
      ? 'Rosnący: teren się wznosi, odczyt w B maleje'
      : 'Wpisz spadek. Strzałka pokaże, czy jest malejący, czy rosnący';
  const etykieta = opada
    ? 'Strzałka spadku malejącego. Stuknij, aby odwrócić kierunek'
    : wGore
      ? 'Strzałka spadku rosnącego. Stuknij, aby odwrócić kierunek'
      : 'Strzałka spadku. Wpisz spadek, a stuknięcie odwróci kierunek';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etykieta}
      onPress={onOdwroc}
      style={[styles.strzalka, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
    >
      <Svg width="100%" height={108} viewBox="0 0 320 108">
        <G fontFamily={CZCIONKA}>
          {yA !== yB ? <Line x1={xA} y1={48} x2={xB} y2={48} stroke={theme.colors.border} strokeWidth={1.4} strokeDasharray="5 4" /> : null}
          <Line x1={xA} y1={yA} x2={koniecX} y2={koniecY} stroke={theme.colors.primary} strokeWidth={4} strokeLinecap="round" />
          <Polygon points={`${grotX},${grotY} ${lewy.x},${lewy.y} ${prawy.x},${prawy.y}`} fill={theme.colors.primary} />
          <Circle cx={xA} cy={yA} r={7} fill={theme.colors.card} stroke={theme.colors.text} strokeWidth={2} />
          <Circle cx={xB} cy={yB} r={7} fill={theme.colors.primary} stroke={theme.colors.text} strokeWidth={2} />
          <SvgText x={xA} y={yNapisA} fontSize={14} fontWeight="800" fill={theme.colors.text} textAnchor="middle">A</SvgText>
          <SvgText x={xB} y={yNapisB} fontSize={14} fontWeight="800" fill={theme.colors.text} textAnchor="middle">B</SvgText>
        </G>
      </Svg>
      <View style={styles.odczyty}>
        <Text style={[styles.odczyt, { color: theme.colors.text }]}>A {odczytA}</Text>
        <Text style={[styles.odczyt, { color: theme.colors.text, textAlign: 'right' }]}>B {odczytB}</Text>
      </View>
      <Text style={[styles.kierunek, { color: theme.colors.text }]}>{napis}</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }}>Stuknij strzałkę, żeby odwrócić kierunek</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
  strzalka: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10, gap: 2 },
  odczyty: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  odczyt: { flex: 1, fontSize: 15, fontWeight: '800' },
  kierunek: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
