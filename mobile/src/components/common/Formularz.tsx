// Wspólne klocki formularzy: etykieta z ikonką „i”, pole z jednostką, wiersz dwukolumnowy, wybór.

import React from 'react';
import {
  StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View, type StyleProp, type ViewStyle,
} from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';
import { InfoTooltip } from './InfoTooltip';

function useMotyw() {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/** Pola obok siebie – domyślnie równe kolumny, `proporcje` zmienia ich szerokość. */
export function Wiersz({ children, style, proporcje }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  proporcje?: number[];
}) {
  return (
    <View style={[styles.wiersz, style]}>
      {React.Children.toArray(children).filter(Boolean).map((dziecko, i) => (
        <View key={i} style={[styles.kolumna, proporcje?.[i] ? { flex: proporcje[i] } : null]}>{dziecko}</View>
      ))}
    </View>
  );
}

export function Etykieta({ tekst, info, wymagane, prawy }: {
  tekst: string;
  info?: string;
  wymagane?: boolean;
  prawy?: React.ReactNode;
}) {
  const theme = useMotyw();
  return (
    <View style={styles.etykietaWiersz}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {tekst}
        {wymagane ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
      </Text>
      {info ? <InfoTooltip tresc={info} /> : null}
      {prawy ? <View style={styles.etykietaPrawy}>{prawy}</View> : null}
    </View>
  );
}

export function Pole({
  etykieta, value, onChangeText, placeholder, accessibilityLabel, liczba, info, jednostka, wymagane, multiline, klawiatura,
}: {
  etykieta?: string;
  value: string;
  onChangeText: (tekst: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  liczba?: boolean;
  info?: string;
  jednostka?: string;
  wymagane?: boolean;
  multiline?: boolean;
  klawiatura?: 'url' | 'phone-pad' | 'email-address' | 'numbers-and-punctuation';
}) {
  const theme = useMotyw();
  return (
    <View style={styles.pole}>
      {etykieta ? <Etykieta tekst={etykieta} info={info} wymagane={wymagane} /> : null}
      <View style={[styles.ramka, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel={accessibilityLabel ?? etykieta}
          keyboardType={klawiatura ?? (liczba ? 'decimal-pad' : 'default')}
          autoCapitalize={klawiatura === 'url' || klawiatura === 'email-address' ? 'none' : undefined}
          autoCorrect={klawiatura ? false : undefined}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputWiele, { color: theme.colors.text }]}
        />
        {jednostka ? <Text style={[styles.jednostka, { color: theme.colors.textSecondary }]}>{jednostka}</Text> : null}
      </View>
    </View>
  );
}

export function Wybor({ zaznaczony, etykieta, accessibilityLabel, onPress, wysrodkuj }: {
  zaznaczony: boolean;
  etykieta: string;
  accessibilityLabel?: string;
  onPress: () => void;
  wysrodkuj?: boolean;
}) {
  const theme = useMotyw();
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel ?? etykieta}
      accessibilityState={{ selected: zaznaczony }}
      onPress={onPress}
      style={[styles.wybor, {
        borderColor: zaznaczony ? theme.colors.primary : theme.colors.border,
        backgroundColor: zaznaczony ? `${theme.colors.primary}22` : theme.colors.card,
      }]}
    >
      <Text
        numberOfLines={2}
        style={{ color: theme.colors.text, fontWeight: zaznaczony ? '800' : '600', textAlign: wysrodkuj ? 'center' : 'left' }}
      >
        {etykieta}
      </Text>
    </TouchableOpacity>
  );
}

export const stylFormularza = StyleSheet.create({
  tresc: { padding: 14, gap: 10 },
  sekcja: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  blad: { fontWeight: '700' },
  zapisz: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  zapiszTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
  chipy: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

const styles = StyleSheet.create({
  wiersz: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  kolumna: { flex: 1, minWidth: 0 },
  etykietaWiersz: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, minHeight: 20 },
  etykieta: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  etykietaPrawy: { marginLeft: 'auto' },
  pole: { minWidth: 0 },
  ramka: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 10 },
  inputWiele: { minHeight: 64, textAlignVertical: 'top' },
  jednostka: { fontSize: 13, marginLeft: 6 },
  wybor: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
});
