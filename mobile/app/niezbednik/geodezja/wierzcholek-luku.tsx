// Wierzchołek łuku: strzałka X w środku cięciwy między skrajnymi szpilkami przy znanym promieniu.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { SchematWierzcholka } from '../../../src/components/geodezja/RysunkiGeodezji';
import { RysWierzcholekTyczenie } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { wierzcholekLuku } from '../../../src/geodezja/luk';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/wierzcholek-luku';

export default function WierzcholekLukuScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [c, setC] = useState('20');
  const [r, setR] = useState('100');
  const cn = liczbaZTekstu(c);
  const rn = liczbaZTekstu(r);
  const w = cn != null && rn != null ? wierzcholekLuku(cn, rn) : null;
  const blad = cn != null && rn != null && cn > 0 && rn > 0 && !w
    ? `Cięciwa nie może być dłuższa niż średnica łuku (2R = ${fm(2 * rn, 2)} m).`
    : null;
  const mC = cn != null ? `${fm(cn, 2)} m` : '…';
  const mR = rn != null ? `${fm(rn, 2)} m` : '…';
  const mX = w ? `${fm(w.x, 3)} m` : '…';

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Wierzchołek łuku" podtytul="Strzałka X z cięciwy i promienia" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co liczy ten kalkulator',
              rysunek: <SchematWierzcholka tusz={theme.colors.text} drugi={theme.colors.textSecondary} akcent={theme.colors.primary} c={mC} r={mR} x={mX} />,
              opis: 'Masz wbite dwie skrajne szpilki łuku i znasz jego promień z projektu. Kalkulator poda **strzałkę X** – o ile środek łuku (wierzchołek) jest odsunięty od prostej łączącej szpilki.',
            },
            {
              tytul: 'Wpisz cięciwę i promień',
              rysunek: (
                <WycinekWiersz>
                  <WycinekPola etykieta="Cięciwa c" wartosc="20" jednostka="m" aktywne />
                  <WycinekPola etykieta="Promień R" wartosc="100" jednostka="m" />
                </WycinekWiersz>
              ),
              opis: 'Zmierz taśmą **cięciwę c** – odległość w linii prostej między skrajnymi szpilkami – i wpisz ją razem z **promieniem R**. Stuknij pole, a pod danymi pojawi się klawiatura liczbowa; **OK** ją zamyka.',
            },
            {
              tytul: 'Wytycz wierzchołek',
              rysunek: (
                <>
                  <RysWierzcholekTyczenie polowa={w ? `${fm(w.polowa, 2)} m` : 'c/2'} x={mX} />
                  <WycinekWyniku etykieta="Strzałka X (środek łuku)" wartosc={w ? `${fm(w.x, 3)} m` : '—'} />
                </>
              ),
              opis: 'Od szpilki A odmierz wzdłuż cięciwy **c/2** (punkt M), postaw prostopadłą w stronę łuku i odmierz **X** – tam wbij szpilkę wierzchołka. Wzór: X = R − √(R² − (c/2)²).',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Cięciwa c" value={c} onChangeText={setC} jednostka="m" accessibilityLabel="Cięciwa c [m]" />
                <PoleLiczby etykieta="Promień R" value={r} onChangeText={setR} jednostka="m" accessibilityLabel="Promień R [m]" />
              </Wiersz>
              {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
              <RamkaWyniku etykieta="Strzałka X (środek łuku)" accessibilityLabel="Wynik X" wartosc={w ? `${fm(w.x, 3)} m` : '—'} />
              {w ? (
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Połowa cięciwy c/2', wartosc: `${fm(w.polowa, 3)} m` },
                    { etykieta: 'Długość łuku', wartosc: `${fm(w.dlugoscLuku, 3)} m` },
                    { etykieta: 'Kąt środkowy', wartosc: `${fm(w.kat, 2)}°` },
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
            if (w && cn != null && rn != null) {
              dodaj(`Wierzchołek łuku: c = ${fm(cn, 2)} m, R = ${fm(rn, 2)} m → X = ${fm(w.x, 3)} m (c/2 = ${fm(w.polowa, 3)} m)`, 'Geodezja');
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
