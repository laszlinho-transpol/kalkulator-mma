import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pole, Wybor, Naciskany, stylFormularza, useMotyw, ODSTEP, PROMIEN, TYPOGRAFIA } from '../ui';
import { useFirmyStore } from '../../stores/firmyStore';

/** Nazwa firmy z podpowiedziami z bazy firm (te same, co przy sprzęcie). */
export function PoleFirmy({ value, onChangeText, etykieta = 'Firma' }: {
  value: string;
  onChangeText: (t: string) => void;
  etykieta?: string;
}) {
  const firmy = useFirmyStore((s) => s.firmy);
  const szukane = value.trim().toLowerCase();
  const podpowiedzi = firmy
    .filter((f) => f.nazwa.toLowerCase() !== szukane && (!szukane || f.nazwa.toLowerCase().includes(szukane)))
    .slice(0, 6);
  return (
    <View style={{ gap: ODSTEP.xs }}>
      <Pole etykieta={etykieta} value={value} onChangeText={onChangeText} placeholder="Nazwa firmy" accessibilityLabel={etykieta} />
      {podpowiedzi.length > 0 ? (
        <View style={stylFormularza.chipy}>
          {podpowiedzi.map((f) => (
            <Wybor key={f.id} zaznaczony={false} etykieta={f.nazwa} accessibilityLabel={`Firma ${f.nazwa}`} onPress={() => onChangeText(f.nazwa)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface KolumnaTabeli {
  tytul: string;
  flex: number;
  prawo?: boolean;
}

/** Prosta tabela: nagłówek, wiersze (dotknięcie = edycja), wiersz sumy. */
export function Tabela({ kolumny, wiersze, suma, onWiersz }: {
  kolumny: KolumnaTabeli[];
  wiersze: { klucz: string; komorki: string[]; dopisek?: string; etykieta?: string }[];
  suma?: string[];
  onWiersz?: (klucz: string) => void;
}) {
  const theme = useMotyw();
  const wiersz = (komorki: string[], gruby?: boolean) => (
    <View style={styles.wiersz}>
      {kolumny.map((k, i) => (
        <Text
          key={k.tytul}
          style={[
            gruby ? TYPOGRAFIA.wartosc : TYPOGRAFIA.opis,
            { flex: k.flex, textAlign: k.prawo ? 'right' : 'left', color: theme.colors.text, fontSize: 13 },
          ]}
          numberOfLines={2}
        >
          {komorki[i] ?? ''}
        </Text>
      ))}
    </View>
  );
  return (
    <View style={[styles.tabela, { borderColor: theme.colors.border }]}>
      <View style={[styles.wiersz, styles.naglowek, { backgroundColor: theme.colors.inputBackground, borderBottomColor: theme.colors.border }]}>
        {kolumny.map((k) => (
          <Text key={k.tytul} style={[TYPOGRAFIA.sekcja, { flex: k.flex, textAlign: k.prawo ? 'right' : 'left', color: theme.colors.textSecondary, fontSize: 11 }]} numberOfLines={1}>
            {k.tytul}
          </Text>
        ))}
      </View>
      {wiersze.map((w) => {
        const tresc = (
          <>
            {wiersz(w.komorki)}
            {w.dopisek ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, fontSize: 12 }]}>{w.dopisek}</Text> : null}
          </>
        );
        const styl = [styles.komorkaWiersza, { borderBottomColor: theme.colors.border }];
        return onWiersz ? (
          <Naciskany key={w.klucz} onPress={() => onWiersz(w.klucz)} accessibilityLabel={w.etykieta ?? w.komorki[0]} style={styl}>
            {tresc}
          </Naciskany>
        ) : <View key={w.klucz} style={styl}>{tresc}</View>;
      })}
      {suma ? <View style={[styles.komorkaWiersza, { backgroundColor: `${theme.colors.primary}14` }]}>{wiersz(suma, true)}</View> : null}
    </View>
  );
}

/** Wiersz z polem wyboru ☑/☐ – zatwierdzanie raportów. */
export function WierszWyboru({ zaznaczony, tytul, opis, prawy, onPress, accessibilityLabel }: {
  zaznaczony: boolean;
  tytul: string;
  opis?: string;
  prawy?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useMotyw();
  return (
    <Naciskany
      accessibilityRole="checkbox"
      accessibilityState={{ checked: zaznaczony }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.wybor, {
        borderColor: zaznaczony ? theme.colors.success : theme.colors.border,
        backgroundColor: zaznaczony ? `${theme.colors.success}14` : theme.colors.inputBackground,
      }]}
    >
      <Text style={{ fontSize: 22, color: zaznaczony ? theme.colors.success : theme.colors.textSecondary, fontWeight: '800' }}>
        {zaznaczony ? '☑' : '☐'}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>{tytul}</Text>
        {opis ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]} numberOfLines={2}>{opis}</Text> : null}
      </View>
      {prawy ? <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]}>{prawy}</Text> : null}
    </Naciskany>
  );
}

const styles = StyleSheet.create({
  tabela: { borderWidth: 1, borderRadius: PROMIEN.m, overflow: 'hidden' },
  naglowek: { paddingHorizontal: ODSTEP.s, paddingVertical: ODSTEP.s, borderBottomWidth: StyleSheet.hairlineWidth },
  wiersz: { flexDirection: 'row', gap: ODSTEP.xs, alignItems: 'center' },
  komorkaWiersza: { paddingHorizontal: ODSTEP.s, paddingVertical: ODSTEP.s, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  wybor: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.m, borderWidth: 1, borderRadius: PROMIEN.m, padding: ODSTEP.m },
});
