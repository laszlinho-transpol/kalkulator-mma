import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { ODSTEP, PROMIEN, TYPOGRAFIA, cien } from '../../constants/styl';
import { InfoTooltip } from '../common/InfoTooltip';
import { Ikona } from './Ikona';
import { Naciskany } from './Naciskany';

export interface AkcjaKarty {
  tekst: string;
  onPress: () => void;
  rodzaj?: 'info' | 'niebezpieczna' | 'glowna';
  accessibilityLabel?: string;
}

interface PropsKarty {
  tytul?: string;
  podtytul?: string;
  /** Plakietka w prawym górnym rogu, np. „● Aktywny”. */
  znaczek?: { tekst: string; kolor: string };
  /** Wyróżniona linia z liczbami (kolor główny). */
  podsumowanie?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Akcje pod kreską na dole karty (Edytuj, Usuń…). */
  akcje?: AkcjaKarty[];
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Karta jak w planach dnia „Wbudowywania”: tytuł + plakietka, opis, podsumowanie, kreska, akcje. */
export function Karta({ tytul, podtytul, znaczek, podsumowanie, onPress, accessibilityLabel, akcje, children, style }: PropsKarty) {
  const theme = useMotyw();
  const tresc = (
    <>
      {tytul || znaczek ? (
        <View style={styles.naglowek}>
          {tytul ? <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>{tytul}</Text> : <View style={{ flex: 1 }} />}
          {znaczek ? (
            <View style={[styles.znaczek, { backgroundColor: `${znaczek.kolor}20` }]}>
              <Text style={{ color: znaczek.kolor, fontSize: 11, fontWeight: '800' }}>{znaczek.tekst}</Text>
            </View>
          ) : null}
          {onPress ? <Ikona nazwa="dalej" kolor={theme.colors.textSecondary} rozmiar={18} /> : null}
        </View>
      ) : null}
      {podtytul ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]} numberOfLines={4}>{podtytul}</Text> : null}
      {podsumowanie ? <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.primary, marginTop: 2 }]}>{podsumowanie}</Text> : null}
      {children}
    </>
  );
  const ramka = [styles.karta, cien(theme), { backgroundColor: theme.colors.card, borderColor: theme.colors.border }];

  return (
    <View style={[ramka, style]}>
      {onPress ? (
        <Naciskany accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? tytul} onPress={onPress} style={styles.wnetrze}>
          {tresc}
        </Naciskany>
      ) : <View style={styles.wnetrze}>{tresc}</View>}
      {akcje && akcje.length > 0 ? (
        <View style={[styles.akcje, { borderTopColor: theme.colors.border }]}>
          {akcje.map((a) => (
            <Naciskany key={a.tekst} accessibilityRole="button" accessibilityLabel={a.accessibilityLabel ?? a.tekst} onPress={a.onPress} hitSlop={8}>
              <Text style={{
                color: a.rodzaj === 'niebezpieczna' ? theme.colors.danger : a.rodzaj === 'glowna' ? theme.colors.primary : theme.colors.info,
                fontWeight: '800',
                fontSize: 13,
              }}
              >
                {a.tekst}
              </Text>
            </Naciskany>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Sekcja treści: nagłówek wersalikami + „i” + element po prawej, poniżej zawartość. */
export function Sekcja({ tytul, info, prawy, children, style }: {
  tytul: string;
  info?: string;
  prawy?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useMotyw();
  return (
    <View style={[styles.karta, cien(theme), { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}>
      <View style={styles.naglowekSekcji}>
        <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]} numberOfLines={1}>{tytul}</Text>
        {info ? <InfoTooltip tresc={info} /> : null}
        {prawy ? <View style={styles.prawy}>{prawy}</View> : null}
      </View>
      <View style={styles.wnetrze}>{children}</View>
    </View>
  );
}

/** Wiersz-przycisk przenoszący na inną stronę (wytwórnia, pracownik, recepta…). */
export function PozycjaListy({ tytul, podtytul, ikona, prawy, onPress, accessibilityLabel, plaska, kolor }: {
  tytul: string;
  /** Kolor działu: tło ikony i podpis (np. kafelki Niezbędnika). */
  kolor?: string;
  /** Wewnątrz Sekcji/Karty – bez cienia, tło pola. */
  plaska?: boolean;
  podtytul?: string;
  /** Emoji albo krótki tekst w kolorowym kółku. */
  ikona?: string;
  /** Wartość po prawej (np. cena, liczba). */
  prawy?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useMotyw();
  return (
    <Naciskany
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? tytul}
      onPress={onPress}
      style={[
        styles.pozycja,
        !plaska && cien(theme),
        { backgroundColor: plaska ? theme.colors.inputBackground : theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      {ikona ? (
        <View style={[styles.ikonaTlo, { backgroundColor: `${kolor ?? theme.colors.primary}${kolor ? '20' : '18'}` }]}>
          <Text style={styles.ikona}>{ikona}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]} numberOfLines={1}>{tytul}</Text>
        {podtytul ? <Text style={[TYPOGRAFIA.opis, { color: kolor ?? theme.colors.textSecondary }, kolor ? { fontWeight: '600' } : null]} numberOfLines={1}>{podtytul}</Text> : null}
      </View>
      {prawy ? <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>{prawy}</Text> : null}
      <Ikona nazwa="dalej" kolor={theme.colors.textSecondary} rozmiar={18} />
    </Naciskany>
  );
}

/** Etykieta po lewej, wartość po prawej – dane w karcie. */
export function WierszDanych({ etykieta, wartosc, kolor }: { etykieta: string; wartosc: string; kolor?: string }) {
  const theme = useMotyw();
  return (
    <View style={styles.wierszDanych}>
      <Text style={[TYPOGRAFIA.etykieta, styles.etykietaDanych, { color: theme.colors.textSecondary }]} numberOfLines={1}>{etykieta}</Text>
      <Text style={[TYPOGRAFIA.wartosc, styles.wartosc, { color: kolor ?? theme.colors.text }]} numberOfLines={2}>{wartosc}</Text>
    </View>
  );
}

/** Kafelki „etykieta nad wartością” w dwóch kolumnach (stawki, ceny, liczby). `dopisek` – np. odchyłka od planu. */
export function SiatkaDanych({ pozycje }: { pozycje: Array<{ etykieta: string; wartosc: string; dopisek?: string; kolor?: string }> }) {
  const theme = useMotyw();
  return (
    <View style={styles.siatka}>
      {pozycje.map((p) => (
        <View key={p.etykieta} style={[styles.kafelekDanych, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]} numberOfLines={1}>{p.etykieta}</Text>
          <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>{p.wartosc}</Text>
          {p.dopisek ? <Text style={[TYPOGRAFIA.opis, { color: p.kolor ?? theme.colors.textSecondary, fontWeight: '800' }]} numberOfLines={1}>{p.dopisek}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  karta: { borderWidth: 1, borderRadius: PROMIEN.l, padding: ODSTEP.m + 2 },
  wnetrze: { gap: ODSTEP.s },
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s },
  znaczek: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: PROMIEN.s },
  akcje: { flexDirection: 'row', gap: ODSTEP.l, marginTop: ODSTEP.m, paddingTop: ODSTEP.s + 2, borderTopWidth: StyleSheet.hairlineWidth },
  naglowekSekcji: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, marginBottom: ODSTEP.s + 2, minHeight: 24 },
  prawy: { marginLeft: 'auto' },
  pozycja: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.m, borderWidth: 1, borderRadius: PROMIEN.l, paddingVertical: ODSTEP.m, paddingHorizontal: ODSTEP.m + 2 },
  ikonaTlo: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ikona: { fontSize: 20 },
  wierszDanych: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: ODSTEP.m, minHeight: 26 },
  etykietaDanych: { flexShrink: 0 },
  wartosc: { flexShrink: 1, textAlign: 'right' },
  siatka: { flexDirection: 'row', flexWrap: 'wrap', gap: ODSTEP.s },
  kafelekDanych: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: PROMIEN.m, paddingVertical: ODSTEP.s, paddingHorizontal: ODSTEP.m, gap: 2 },
});
