import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { DOMYSLNA_SZER_POSZERZENIA, MAX_POSZERZEN_STRONA } from '../../utils/kalkulatoryMasiarza';

const P1 = '#A67C52';
const P1_TEXT = '#fff';
const SZARY = '#D9D4CC';
const SZARY_CIEMNY = '#6B6560';
const ZOLTY = '#F5E27A';
const ZOLTY_CIEMNY = '#8A6A10';
const ZIELONY = '#22C55E';

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

function KoloAkcji({ znak, onPress, disabled }: { znak: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.kolo, { backgroundColor: disabled ? '#9CA3AF' : ZIELONY }]}
    >
      <Text style={styles.koloZnak}>{znak}</Text>
    </TouchableOpacity>
  );
}

function PoleMetrow({
  value, onChange, theme, szer = 78,
}: {
  value: string;
  onChange: (v: string) => void;
  theme: AppTheme;
  szer?: number;
}) {
  return (
    <View style={[styles.poleM, { width: szer, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={[styles.poleMInput, { color: theme.colors.text }]}
      />
      <Text style={[styles.poleMJedn, { color: theme.colors.textSecondary }]}>m</Text>
    </View>
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

function KolumnaPoszerzen({
  tytul, strona, wartosci, onZmien, onDodaj, onUsun, theme,
}: {
  tytul: string;
  strona: 'L' | 'P';
  wartosci: string[];
  onZmien: (i: number, v: string) => void;
  onDodaj: () => void;
  onUsun: (i: number) => void;
  theme: AppTheme;
}) {
  const nastepny = wartosci.length + 1;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={[styles.kolTytul, { color: theme.colors.textSecondary }]}>{tytul}</Text>
      {wartosci.map((v, i) => (
        <View key={`${strona}${i}`} style={styles.poszRow}>
          <Text style={[styles.poszNr, { color: theme.colors.text }]}>P{i + 1}</Text>
          <KoloAkcji znak="−" onPress={() => onUsun(i)} />
          <View style={[styles.poszPole, { backgroundColor: P1 }]}>
            <TextInput
              value={v}
              onChangeText={(t) => onZmien(i, t)}
              keyboardType="decimal-pad"
              style={styles.poszInput}
            />
            <Text style={styles.poszJedn}>m</Text>
          </View>
        </View>
      ))}
      {wartosci.length < MAX_POSZERZEN_STRONA ? (
        <View style={styles.poszRow}>
          <Text style={[styles.poszNr, { color: theme.colors.text }]}>P{nastepny}</Text>
          <KoloAkcji znak="+" onPress={onDodaj} />
          <TouchableOpacity onPress={onDodaj} style={styles.dodajBtn}>
            <Text style={[styles.dodajTekst, { color: theme.colors.textSecondary }]}>
              DODAJ POSZERZENIE {nastepny} ({strona})
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export function EdytorPoszerzen({
  lewe, prawe, onZmienLewe, onZmienPrawe, theme,
}: {
  lewe: string[];
  prawe: string[];
  onZmienLewe: (nastepne: string[]) => void;
  onZmienPrawe: (nastepne: string[]) => void;
  theme: AppTheme;
}) {
  const dodaj = (lista: string[], set: (n: string[]) => void) => {
    if (lista.length >= MAX_POSZERZEN_STRONA) return;
    set([...lista, String(DOMYSLNA_SZER_POSZERZENIA)]);
  };
  return (
    <View style={styles.dwieKol}>
      <KolumnaPoszerzen
        tytul="Poszerzenia strona L"
        strona="L"
        wartosci={lewe}
        theme={theme}
        onZmien={(i, v) => onZmienLewe(lewe.map((x, idx) => (idx === i ? v : x)))}
        onDodaj={() => dodaj(lewe, onZmienLewe)}
        onUsun={(i) => onZmienLewe(lewe.filter((_, idx) => idx !== i))}
      />
      <KolumnaPoszerzen
        tytul="Poszerzenia strona P"
        strona="P"
        wartosci={prawe}
        theme={theme}
        onZmien={(i, v) => onZmienPrawe(prawe.map((x, idx) => (idx === i ? v : x)))}
        onDodaj={() => dodaj(prawe, onZmienPrawe)}
        onUsun={(i) => onZmienPrawe(prawe.filter((_, idx) => idx !== i))}
      />
    </View>
  );
}

export function PoleWiersz({
  label, value, onChange, theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: AppTheme;
}) {
  return (
    <View style={styles.wiersz}>
      <Text style={[styles.wierszLabel, { color: theme.colors.text }]}>{label}</Text>
      <PoleMetrow value={value} onChange={onChange} theme={theme} />
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
  dwieKol: { flexDirection: 'row', gap: 12 },
  kolTytul: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  poszRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poszNr: { width: 22, fontWeight: '800', fontSize: 13 },
  poszPole: { flex: 1, borderRadius: 14, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  poszInput: { color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center', minWidth: 36, paddingVertical: 6 },
  poszJedn: { color: '#fff', fontWeight: '700', marginLeft: 2, fontSize: 12 },
  dodajBtn: { flex: 1, justifyContent: 'center' },
  dodajTekst: { fontSize: 10, fontWeight: '800' },
  kolo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  koloZnak: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 18, marginTop: -1 },
  wiersz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 40 },
  wierszLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  poleM: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  poleMInput: { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 2, minWidth: 36 },
  poleMJedn: { fontSize: 12, fontWeight: '700' },
});
