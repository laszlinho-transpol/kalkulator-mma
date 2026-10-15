import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme, type AppTheme } from '../../../src/constants/theme';
import { GRUPY_SPRZETU, rodzajPoId } from '../../../src/budzet/rodzajeSprzetu';
import { OPISY_ROZLICZENIA, parsujLiczbePola, type RodzajRozliczenia, type StawkiSprzetu } from '../../../src/budzet/rozliczenie';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useFirmyStore } from '../../../src/stores/firmyStore';
import { useSprzetStore } from '../../../src/stores/sprzetStore';

function parametr(wartosc?: string | string[]): string {
  if (Array.isArray(wartosc)) return wartosc[0] ?? '';
  return wartosc ?? '';
}

export default function NowySprzetScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const start = parametr(useLocalSearchParams<{ rodzaj?: string | string[] }>().rodzaj);
  const firmy = useFirmyStore((s) => s.firmy);
  const znajdzLubDodaj = useFirmyStore((s) => s.znajdzLubDodaj);
  const dodajSprzet = useSprzetStore((s) => s.dodajSprzet);

  const [rodzajId, setRodzajId] = useState(rodzajPoId(start) ? start : '');
  const [numer, setNumer] = useState('');
  const [firma, setFirma] = useState('');
  const [stawkiTekst, setStawkiTekst] = useState<Record<RodzajRozliczenia, string>>({
    miesieczny: '', dzienny: '', godzinowy: '', kilometr: '',
  });
  const [spalanie, setSpalanie] = useState('');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);

  const fraza = firma.trim().toLowerCase();
  const podpowiedzi = fraza
    ? firmy.filter((f) => f.nazwa.toLowerCase().includes(fraza) && f.nazwa.toLowerCase() !== fraza).slice(0, 6)
    : [];

  const zapisz = async () => {
    if (!rodzajPoId(rodzajId)) {
      setBlad('Wybierz rodzaj sprzętu.');
      return;
    }
    const stawki: StawkiSprzetu = {};
    for (const opis of OPISY_ROZLICZENIA) {
      const tekst = stawkiTekst[opis.id].trim();
      if (!tekst) continue;
      const liczba = parsujLiczbePola(tekst);
      if (liczba == null || liczba <= 0) {
        setBlad(`Pole „${opis.nazwa}” przyjmuje liczbę większą od zera.`);
        return;
      }
      stawki[opis.id] = liczba;
    }
    if (Object.keys(stawki).length === 0) {
      setBlad('Podaj choć jedną stawkę rozliczenia.');
      return;
    }
    let spalanieLnaMth: number | undefined;
    if (spalanie.trim()) {
      const liczba = parsujLiczbePola(spalanie);
      if (liczba == null || liczba <= 0) {
        setBlad('Spalanie przyjmuje liczbę większą od zera, np. 4.');
        return;
      }
      spalanieLnaMth = liczba;
    }
    setBlad('');
    setZapis(true);
    try {
      const firmaId = await znajdzLubDodaj(firma);
      const id = await dodajSprzet({
        rodzajId,
        numer: numer.trim() || undefined,
        firmaId,
        stawki,
        spalanieLnaMth,
      });
      router.replace(`/budzet/sprzet/${id}` as never);
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Nowy sprzęt"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/sprzet') }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.formularz, { paddingBottom: insets.bottom + 28 }]}
      >
        <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Rodzaj sprzętu</Text>
        {GRUPY_SPRZETU.map((grupa) => (
          <View key={grupa.id} style={styles.grupa}>
            <Text style={[styles.grupaTytul, { color: theme.colors.textSecondary }]}>{grupa.nazwa}</Text>
            <View style={styles.rodzaje}>
              {grupa.rodzaje.map((rodzaj) => {
                const on = rodzaj.id === rodzajId;
                return (
                  <TouchableOpacity
                    key={`${grupa.id}-${rodzaj.id}`}
                    accessibilityLabel={`Wybierz ${rodzaj.nazwa}`}
                    onPress={() => setRodzajId(rodzaj.id)}
                    style={[styles.rodzaj, {
                      borderColor: on ? theme.colors.primary : theme.colors.border,
                      backgroundColor: on ? `${theme.colors.primary}22` : theme.colors.card,
                    }]}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: on ? '800' : '600' }}>{rodzaj.nazwa}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Pole
          theme={theme}
          etykieta="Numer"
          opcjonalne
          value={numer}
          onChangeText={setNumer}
          placeholder="np. R-12"
          accessibilityLabel="Numer sprzętu"
        />
        <Pole
          theme={theme}
          etykieta="Firma"
          opcjonalne
          value={firma}
          onChangeText={setFirma}
          placeholder="Nazwa firmy"
          accessibilityLabel="Firma"
        />
        <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary }]}>
          Firma trafi do bazy firm i będzie podpowiadana przy kolejnym sprzęcie.
        </Text>
        {podpowiedzi.map((f) => (
          <TouchableOpacity
            key={f.id}
            accessibilityLabel={`Podpowiedź firmy ${f.nazwa}`}
            onPress={() => setFirma(f.nazwa)}
            style={[styles.podpowiedzBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{f.nazwa}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.etykieta, { color: theme.colors.textSecondary, marginTop: 8 }]}>Rozliczenie</Text>
        <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary }]}>
          Można uzupełnić każdy rodzaj albo tylko jeden.
        </Text>
        {OPISY_ROZLICZENIA.map((opis) => (
          <Pole
            key={opis.id}
            theme={theme}
            etykieta={`${opis.nazwa} (${opis.jednostkaStawki})`}
            opcjonalne
            value={stawkiTekst[opis.id]}
            onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [opis.id]: tekst }))}
            placeholder={opis.id === 'kilometr' ? 'np. 3,5' : opis.id === 'miesieczny' ? 'np. 22300' : opis.id === 'dzienny' ? 'np. 350' : 'np. 150'}
            accessibilityLabel={opis.nazwa}
            klawiatura
          />
        ))}
        <Pole
          theme={theme}
          etykieta="Spalanie (l/mth)"
          opcjonalne
          value={spalanie}
          onChangeText={setSpalanie}
          placeholder="np. 4"
          accessibilityLabel="Spalanie"
          klawiatura
        />

        {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="Zapisz sprzęt"
          disabled={zapis}
          onPress={zapisz}
          style={[styles.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
        >
          <Text style={styles.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Pole({
  theme, etykieta, opcjonalne, value, onChangeText, placeholder, accessibilityLabel, klawiatura,
}: {
  theme: AppTheme;
  etykieta: string;
  opcjonalne?: boolean;
  value: string;
  onChangeText: (tekst: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  klawiatura?: boolean;
}) {
  return (
    <View style={styles.pole}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>
        {etykieta}{opcjonalne ? ' (opcjonalnie)' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
        keyboardType={klawiatura ? 'decimal-pad' : 'default'}
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  formularz: { padding: 16, gap: 8 },
  etykieta: { fontSize: 13, fontWeight: '700' },
  grupa: { gap: 6, marginBottom: 4 },
  grupaTytul: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  rodzaje: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rodzaj: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pole: { gap: 6, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  podpowiedz: { fontSize: 13, lineHeight: 18 },
  podpowiedzBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  blad: { fontWeight: '700', marginTop: 8 },
  zapisz: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  zapiszTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
});
