// Wierzchołek łuku: strzałka X w środku cięciwy między skrajnymi szpilkami przy znanym promieniu.

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Przycisk, Sekcja, SiatkaDanych, Wiersz, useMotyw } from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, useKlawiaturaOtwarta } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { SchematWierzcholka } from '../../../src/components/geodezja/RysunkiGeodezji';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { wierzcholekLuku } from '../../../src/geodezja/luk';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const KOLOR = '#E8A020';

export default function WierzcholekLukuScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const przewijanie = useRef<ScrollView>(null);
  const yDanych = useRef(0);
  const klawiatura = useKlawiaturaOtwarta();
  useEffect(() => {
    if (klawiatura) przewijanie.current?.scrollTo({ y: yDanych.current, animated: true });
  }, [klawiatura]);
  const [c, setC] = useState('20');
  const [r, setR] = useState('100');
  const cn = liczbaZTekstu(c);
  const rn = liczbaZTekstu(r);
  const w = cn != null && rn != null ? wierzcholekLuku(cn, rn) : null;
  const blad = cn != null && rn != null && cn > 0 && rn > 0 && !w
    ? `Cięciwa nie może być dłuższa niż średnica łuku (2R = ${fm(2 * rn, 2)} m).`
    : null;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Wierzchołek łuku" podtytul="Strzałka X z cięciwy i promienia" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <Sekcja tytul="Na czym to polega">
          <SchematWierzcholka
            tusz={theme.colors.text}
            drugi={theme.colors.textSecondary}
            akcent={KOLOR}
            c={cn != null ? `${fm(cn, 2)} m` : '…'}
            r={rn != null ? `${fm(rn, 2)} m` : '…'}
            x={w ? `${fm(w.x, 3)} m` : '…'}
          />
          <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
            Zmierz cięciwę c między skrajnymi szpilkami. W połowie cięciwy (c/2 od każdej szpilki) odłóż prostopadle
            odcinek X w stronę łuku – tam wbij szpilkę wierzchołka.
          </Text>
          <Text style={[styles.wzor, { color: theme.colors.text }]}>X = R − √(R² − (c/2)²)</Text>
        </Sekcja>

        <StrefaKlawiatury>
          <View onLayout={(e) => { yDanych.current = e.nativeEvent.layout.y - 8; }}>
          <Sekcja tytul="Dane">
            <Wiersz>
              <PoleLiczby etykieta="Cięciwa c" value={c} onChangeText={setC} jednostka="m" accessibilityLabel="Cięciwa c [m]" />
              <PoleLiczby etykieta="Promień R" value={r} onChangeText={setR} jednostka="m" accessibilityLabel="Promień R [m]" />
            </Wiersz>
            {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
            <View
              accessibilityLabel="Wynik X"
              style={[styles.wynik, { borderColor: KOLOR, backgroundColor: `${KOLOR}18` }]}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Strzałka X (środek łuku)</Text>
              <Text style={[styles.wynikLiczba, { color: theme.colors.text }]}>{w ? `${fm(w.x, 3)} m` : '—'}</Text>
            </View>
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
  opis: { fontSize: 14, lineHeight: 20 },
  wzor: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  wynik: { borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center', gap: 2 },
  wynikLiczba: { fontSize: 30, fontWeight: '800' },
});
