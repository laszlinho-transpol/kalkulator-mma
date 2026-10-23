// Okienko „Zasada działania” na górze strony: slajdy krok po kroku (rysunek / wycinek formularza + opis),
// przesuwane palcem. Chowa się przyciskiem „i” w nagłówku (AppHeader `zasada`), stan jest zapamiętany.

import React, { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { ODSTEP, PROMIEN, TYPOGRAFIA, cien } from '../../constants/styl';
import { useZasadaWidoczna } from '../../stores/zasadyStore';
import { Ikona } from './Ikona';
import { Naciskany } from './Naciskany';

export interface SlajdZasady {
  tytul: string;
  /** Rysunek SVG albo wycinek formularza (WycinekPola, WycinekPrzycisku…). */
  rysunek?: ReactNode;
  /** Opis kroku; fragmenty w **gwiazdkach** są pogrubione (nazwy przycisków i pól). */
  opis: string;
}

export function ZasadaDzialania({ klucz, slajdy }: { klucz: string; slajdy: SlajdZasady[] }) {
  const theme = useMotyw();
  const { widoczna, przelacz } = useZasadaWidoczna(klucz);
  const [szer, setSzer] = useState(0);
  const [idx, setIdx] = useState(0);
  const przewijanie = useRef<ScrollView>(null);
  if (!widoczna) return null;

  const idzDo = (i: number) => {
    const n = Math.max(0, Math.min(slajdy.length - 1, i));
    przewijanie.current?.scrollTo({ x: n * szer, animated: true });
    setIdx(n);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!szer) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / szer);
    if (i !== idx && i >= 0 && i < slajdy.length) setIdx(i);
  };
  const strzalka = (kierunek: -1 | 1) => {
    const nieaktywna = kierunek < 0 ? idx === 0 : idx === slajdy.length - 1;
    return (
      <Naciskany
        accessibilityRole="button"
        accessibilityLabel={kierunek < 0 ? 'Poprzedni krok' : 'Następny krok'}
        disabled={nieaktywna}
        onPress={() => idzDo(idx + kierunek)}
        hitSlop={8}
        style={[styles.strzalka, { backgroundColor: `${theme.colors.primary}${nieaktywna ? '0A' : '22'}` }]}
      >
        <Ikona nazwa={kierunek < 0 ? 'wstecz' : 'dalej'} kolor={nieaktywna ? theme.colors.border : theme.colors.primary} rozmiar={18} />
      </Naciskany>
    );
  };

  return (
    <View
      accessibilityLabel="Zasada działania"
      style={[styles.karta, cien(theme), { backgroundColor: theme.colors.card, borderColor: `${theme.colors.primary}66` }]}
    >
      <View style={styles.naglowek}>
        <View style={[styles.znakInfo, { backgroundColor: theme.colors.primary }]}>
          <Ikona nazwa="info" kolor="#1A1A1A" rozmiar={14} grubosc={2.6} />
        </View>
        <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]} numberOfLines={1}>Zasada działania</Text>
        <Text style={[styles.licznik, { color: theme.colors.textSecondary }]}>{idx + 1} / {slajdy.length}</Text>
        <Naciskany accessibilityRole="button" accessibilityLabel="Schowaj zasadę działania" onPress={przelacz} hitSlop={8} style={styles.schowaj}>
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>Schowaj</Text>
        </Naciskany>
      </View>

      <View onLayout={(e) => setSzer(Math.round(e.nativeEvent.layout.width))}>
        {szer > 0 ? (
          <ScrollView
            ref={przewijanie}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: idx * szer, y: 0 }}
            nestedScrollEnabled
          >
            {slajdy.map((s, i) => (
              <View key={s.tytul} style={{ width: szer }} accessibilityLabel={`Krok ${i + 1}: ${s.tytul}`}>
                {s.rysunek ? (
                  <View style={[styles.rysunek, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    {s.rysunek}
                  </View>
                ) : null}
                <View style={styles.tytulKroku}>
                  <View style={[styles.numer, { borderColor: theme.colors.primary }]}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12 }}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.tytul, { color: theme.colors.text }]}>{s.tytul}</Text>
                </View>
                <TekstZPogrubieniem tekst={s.opis} kolor={theme.colors.textSecondary} mocny={theme.colors.text} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {slajdy.length > 1 ? (
        <View style={styles.stopka}>
          {strzalka(-1)}
          <View style={styles.kropki}>
            {slajdy.map((s, i) => (
              <Naciskany key={s.tytul} accessibilityRole="button" accessibilityLabel={`Krok ${i + 1}`} onPress={() => idzDo(i)} hitSlop={4}>
                <View style={[styles.kropka, { width: i === idx ? 22 : 8, backgroundColor: i === idx ? theme.colors.primary : theme.colors.border }]} />
              </Naciskany>
            ))}
          </View>
          {strzalka(1)}
        </View>
      ) : null}
    </View>
  );
}

function TekstZPogrubieniem({ tekst, kolor, mocny }: { tekst: string; kolor: string; mocny: string }) {
  const czesci = tekst.split('**');
  return (
    <Text style={[styles.opis, { color: kolor }]}>
      {czesci.map((c, i) => (i % 2 ? <Text key={i} style={{ color: mocny, fontWeight: '800' }}>{c}</Text> : c))}
    </Text>
  );
}

/** Nieaktywny wycinek pola formularza – wygląda jak prawdziwe pole z wpisaną wartością. */
export function WycinekPola({ etykieta, wartosc, jednostka, aktywne }: { etykieta: string; wartosc: string; jednostka?: string; aktywne?: boolean }) {
  const theme = useMotyw();
  return (
    <View style={styles.wycinekPola}>
      <Text style={[styles.etykieta, { color: theme.colors.text }]} numberOfLines={1}>{etykieta}</Text>
      <View style={[styles.ramka, {
        borderColor: aktywne ? theme.colors.primary : theme.colors.border,
        borderWidth: aktywne ? 2 : 1,
        backgroundColor: theme.colors.inputBackground,
      }]}>
        <Text style={{ flex: 1, color: theme.colors.text, fontSize: 15 }} numberOfLines={1}>{wartosc}</Text>
        {jednostka ? <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{jednostka}</Text> : null}
      </View>
    </View>
  );
}

/** Wiersz wycinków obok siebie (jak `Wiersz` w formularzu). */
export function WycinekWiersz({ children }: { children: ReactNode }) {
  return <View style={styles.wiersz}>{children}</View>;
}

export function WycinekPrzycisku({ tekst, plus, drugi }: { tekst: string; plus?: boolean; drugi?: boolean }) {
  const theme = useMotyw();
  const kolor = drugi ? theme.colors.info : '#1A1A1A';
  return (
    <View style={[styles.przycisk, {
      backgroundColor: drugi ? `${theme.colors.info}12` : theme.colors.primary,
      borderColor: drugi ? theme.colors.info : theme.colors.primary,
    }]}>
      {plus ? <Ikona nazwa="plus" kolor={kolor} rozmiar={16} /> : null}
      <Text style={{ color: kolor, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{tekst}</Text>
    </View>
  );
}

/** Wycinek ramki wyniku (jak na stronie kalkulatora). */
export function WycinekWyniku({ etykieta, wartosc, kolor }: { etykieta: string; wartosc: string; kolor?: string }) {
  const theme = useMotyw();
  const k = kolor ?? theme.colors.primary;
  return (
    <View style={[styles.wynik, { borderColor: k, backgroundColor: `${k}18` }]}>
      <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{etykieta}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 22 }}>{wartosc}</Text>
    </View>
  );
}

/** Wycinek zakładek / pasków przycisków: pierwszy aktywny. */
export function WycinekZakladek({ zakladki, aktywna = 0 }: { zakladki: string[]; aktywna?: number }) {
  const theme = useMotyw();
  return (
    <View style={[styles.zakladki, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
      {zakladki.map((z, i) => (
        <View key={z} style={[styles.zakladka, i === aktywna && { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
          <Text style={{ color: i === aktywna ? theme.colors.text : theme.colors.textSecondary, fontWeight: '800', fontSize: 12 }} numberOfLines={1}>{z}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  karta: { borderWidth: 1.5, borderRadius: PROMIEN.l, padding: ODSTEP.m + 2, gap: ODSTEP.s },
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, minHeight: 24 },
  znakInfo: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  licznik: { fontSize: 12, fontWeight: '700' },
  schowaj: { marginLeft: 'auto', paddingHorizontal: 4 },
  rysunek: { borderWidth: 1, borderStyle: 'dashed', borderRadius: PROMIEN.m, padding: ODSTEP.s + 2, gap: ODSTEP.s, marginBottom: ODSTEP.s },
  tytulKroku: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, marginBottom: 4 },
  numer: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tytul: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  opis: { fontSize: 14, lineHeight: 20 },
  stopka: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  strzalka: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  kropki: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kropka: { height: 8, borderRadius: 4 },
  wycinekPola: { flex: 1, minWidth: 0 },
  etykieta: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  ramka: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, gap: 4 },
  wiersz: { flexDirection: 'row', gap: 8 },
  przycisk: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: PROMIEN.m, paddingVertical: 9 },
  wynik: { borderWidth: 1.5, borderRadius: 12, padding: 8, alignItems: 'center' },
  zakladki: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3, gap: 3 },
  zakladka: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
});
