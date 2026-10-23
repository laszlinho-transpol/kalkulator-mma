import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MAX_POSZERZEN_STRONA } from '../../utils/kalkulatoryMasiarza';

const P1 = '#A67C52';
const P1_TEXT = '#fff';
const SZARY = '#D9D4CC';
const SZARY_CIEMNY = '#6B6560';
const ZOLTY = '#F5E27A';
const ZOLTY_CIEMNY = '#8A6A10';

function fmtM(n: number): string {
  if (!Number.isFinite(n)) return '–';
  return n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

function parsuj(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

function Blok({
  etykieta, wartosc, kolor, kolorTekstu, dashed, onPress, flex = 1, minHeight = 56,
}: {
  etykieta: string;
  wartosc: string;
  kolor: string;
  kolorTekstu: string;
  dashed?: boolean;
  onPress?: () => void;
  flex?: number;
  minHeight?: number;
}) {
  const inner = (
    <View
      style={[
        styles.blok,
        {
          backgroundColor: dashed ? 'transparent' : kolor,
          borderColor: dashed ? kolor : 'transparent',
          borderStyle: dashed ? 'dashed' : 'solid',
          minHeight,
          flex: onPress ? 1 : flex,
          alignSelf: 'stretch',
        },
      ]}
    >
      <Text style={[styles.blokEtykieta, { color: kolorTekstu }]} numberOfLines={2}>{etykieta}</Text>
      <Text style={[styles.blokWartosc, { color: kolorTekstu }]} numberOfLines={1}>{wartosc}</Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity onPress={onPress} style={{ flex, alignSelf: 'stretch' }} activeOpacity={0.75}>
      {inner}
    </TouchableOpacity>
  );
}

export function SchematStolu({
  wPodstawa, wMaxStolu, poszerzeniaL, poszerzeniaP, onDodajL, onDodajP,
}: {
  wPodstawa: number;
  wMaxStolu: number;
  poszerzeniaL: number[];
  poszerzeniaP: number[];
  onDodajL: () => void;
  onDodajP: () => void;
}) {
  const poszL = poszerzeniaL.reduce((a, b) => a + b, 0);
  const poszP = poszerzeniaP.reduce((a, b) => a + b, 0);
  const szerMin = wPodstawa + poszL + poszP;
  const szerMax = wMaxStolu + poszL + poszP;
  const moznaL = poszerzeniaL.length < MAX_POSZERZEN_STRONA;
  const moznaP = poszerzeniaP.length < MAX_POSZERZEN_STRONA;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: '42%' }}>
          <Blok
            etykieta="Min. szerokość"
            wartosc={`${fmtM(wPodstawa)} m`}
            kolor={SZARY}
            kolorTekstu={SZARY_CIEMNY}
            minHeight={48}
          />
        </View>
        <View style={styles.osPion} />
      </View>

      <View style={styles.rzadStolu}>
        {moznaL ? (
          <Blok
            etykieta={`P${poszerzeniaL.length + 1}`}
            wartosc="+"
            kolor={P1}
            kolorTekstu={P1}
            dashed
            onPress={onDodajL}
            flex={0.95}
            minHeight={64}
          />
        ) : null}
        {[...poszerzeniaL].reverse().map((w, iOdKonca) => {
          const nr = poszerzeniaL.length - iOdKonca;
          return (
            <Blok
              key={`L${nr}`}
              etykieta={`P${nr} (L)`}
              wartosc={`${fmtM(w)} m`}
              kolor={P1}
              kolorTekstu={P1_TEXT}
              flex={1.15}
              minHeight={64}
            />
          );
        })}
        <Blok
          etykieta="Max. szerokość"
          wartosc={`${fmtM(wMaxStolu)} m`}
          kolor={SZARY}
          kolorTekstu={SZARY_CIEMNY}
          flex={2.4}
          minHeight={64}
        />
        {poszerzeniaP.map((w, i) => (
          <Blok
            key={`P${i + 1}`}
            etykieta={`P${i + 1} (P)`}
            wartosc={`${fmtM(w)} m`}
            kolor={P1}
            kolorTekstu={P1_TEXT}
            flex={1.15}
            minHeight={64}
          />
        ))}
        {moznaP ? (
          <Blok
            etykieta={`P${poszerzeniaP.length + 1}`}
            wartosc="+"
            kolor={P1}
            kolorTekstu={P1}
            dashed
            onPress={onDodajP}
            flex={0.95}
            minHeight={64}
          />
        ) : null}
      </View>

      <View style={styles.rzadPodsum}>
        <View style={[styles.chip, { backgroundColor: SZARY }]}>
          <Text style={[styles.chipEtykieta, { color: SZARY_CIEMNY }]}>Stół podstawowy</Text>
          <Text style={[styles.chipWartosc, { color: SZARY_CIEMNY }]}>{fmtM(wPodstawa)} m</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: ZOLTY }]}>
          <Text style={[styles.chipEtykieta, { color: ZOLTY_CIEMNY }]}>Szerokość minimalna</Text>
          <Text style={[styles.chipWartosc, { color: ZOLTY_CIEMNY }]}>{fmtM(szerMin)} m</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: ZOLTY }]}>
          <Text style={[styles.chipEtykieta, { color: ZOLTY_CIEMNY }]}>Szerokość maksymalna</Text>
          <Text style={[styles.chipWartosc, { color: ZOLTY_CIEMNY }]}>{fmtM(szerMax)} m</Text>
        </View>
      </View>
    </View>
  );
}

export { parsuj as parsujMetry, fmtM };

const styles = StyleSheet.create({
  blok: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blokEtykieta: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  blokWartosc: { fontSize: 13, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  osPion: { width: 1, height: 10, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#9CA3AF' },
  rzadStolu: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
  rzadPodsum: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  chipEtykieta: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  chipWartosc: { fontSize: 13, fontWeight: '800', marginTop: 2 },
});
