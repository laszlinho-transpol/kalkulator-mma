import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import type { AppTheme } from '../../constants/theme';
import { parsujLiczbePola, tekstZapisanejStawki } from '../../budzet/rozliczenie';
import { POLA_WYNAGRODZENIA, type PoleWynagrodzenia, type StawkiPracownika } from '../../budzet/pracownicy';
import { wstecz } from '../../budzet/nawigacja';
import { useGrupyPracownikowStore } from '../../stores/grupyPracownikowStore';

export interface DanePracownikaFormularza {
  nazwisko: string;
  imie: string;
  grupaNazwa: string;
  stawki: StawkiPracownika;
}

const PRZYKLADY: Record<PoleWynagrodzenia, string> = {
  stawka8h: 'np. 280',
  nadgodzina: 'np. 45',
  kierowca: 'np. 30',
  pasazer: 'np. 20',
  zus: 'np. 1,2',
};

interface Props {
  theme: AppTheme;
  tytul: string;
  wsteczDo: string;
  poczatek?: { nazwisko: string; imie: string; grupa?: string; stawki: StawkiPracownika };
  onZapisz: (dane: DanePracownikaFormularza) => Promise<void>;
}

export function FormularzPracownika({ theme, tytul, wsteczDo, poczatek, onZapisz }: Props) {
  const insets = useSafeAreaInsets();
  const grupy = useGrupyPracownikowStore((s) => s.grupy);
  const [nazwisko, setNazwisko] = useState(poczatek?.nazwisko ?? '');
  const [imie, setImie] = useState(poczatek?.imie ?? '');
  const [grupa, setGrupa] = useState(poczatek?.grupa ?? '');
  const [stawkiTekst, setStawkiTekst] = useState<Record<PoleWynagrodzenia, string>>(() => ({
    stawka8h: tekstZapisanejStawki(poczatek?.stawki.stawka8h),
    nadgodzina: tekstZapisanejStawki(poczatek?.stawki.nadgodzina),
    kierowca: tekstZapisanejStawki(poczatek?.stawki.kierowca),
    pasazer: tekstZapisanejStawki(poczatek?.stawki.pasazer),
    zus: tekstZapisanejStawki(poczatek?.stawki.zus),
  }));
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);

  const fraza = grupa.trim().toLowerCase();
  const podpowiedzi = fraza
    ? grupy.filter((g) => g.nazwa.toLowerCase().includes(fraza) && g.nazwa.toLowerCase() !== fraza).slice(0, 6)
    : grupy.slice(0, 8);

  const zapisz = async () => {
    if (!nazwisko.trim()) {
      setBlad('Wpisz nazwisko.');
      return;
    }
    if (!imie.trim()) {
      setBlad('Wpisz imię.');
      return;
    }
    const stawki: StawkiPracownika = {};
    for (const pole of POLA_WYNAGRODZENIA) {
      const tekst = stawkiTekst[pole.id].trim();
      if (!tekst) continue;
      const liczba = parsujLiczbePola(tekst);
      if (liczba == null || liczba <= 0) {
        setBlad(`Pole „${pole.nazwa}” przyjmuje liczbę większą od zera.`);
        return;
      }
      stawki[pole.id] = liczba;
    }
    setBlad('');
    setZapis(true);
    try {
      await onZapisz({
        nazwisko: nazwisko.trim().replace(/\s+/g, ' '),
        imie: imie.trim().replace(/\s+/g, ' '),
        grupaNazwa: grupa,
        stawki,
      });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul={tytul} lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(wsteczDo) }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.formularz, { paddingBottom: insets.bottom + 28 }]}
      >
        <Pole theme={theme} etykieta="Nazwisko" value={nazwisko} onChangeText={setNazwisko} placeholder="np. Kowalski" accessibilityLabel="Nazwisko" />
        <Pole theme={theme} etykieta="Imię" value={imie} onChangeText={setImie} placeholder="np. Jan" accessibilityLabel="Imię" />
        <Pole theme={theme} etykieta="Grupa" opcjonalne value={grupa} onChangeText={setGrupa} placeholder="np. Brygada asfaltowa" accessibilityLabel="Grupa" />
        <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary }]}>
          Nowa nazwa tworzy grupę w bazie. Istniejącą wybierzesz z listy.
        </Text>
        {podpowiedzi.length > 0 ? (
          <View style={styles.chipy}>
            {podpowiedzi.map((g) => {
              const on = g.nazwa.toLowerCase() === fraza;
              return (
                <TouchableOpacity
                  key={g.id}
                  accessibilityLabel={`Podpowiedź grupy ${g.nazwa}`}
                  onPress={() => setGrupa(g.nazwa)}
                  style={[styles.chip, {
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                    backgroundColor: on ? `${theme.colors.primary}22` : theme.colors.card,
                  }]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: on ? '800' : '600' }}>{g.ulubiona ? '★ ' : ''}{g.nazwa}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.etykieta, { color: theme.colors.textSecondary, marginTop: 8 }]}>Wynagrodzenie</Text>
        <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary }]}>
          Okres obowiązywania stawek ustawisz w historii stawek.
        </Text>
        {POLA_WYNAGRODZENIA.map((pole, i) => (
          <View key={pole.id}>
            <Pole
              theme={theme}
              etykieta={`${i + 1}) ${pole.nazwa} (${pole.jednostka})`}
              opcjonalne
              value={stawkiTekst[pole.id]}
              onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [pole.id]: tekst }))}
              placeholder={PRZYKLADY[pole.id]}
              accessibilityLabel={pole.nazwa}
              klawiatura
            />
            {pole.podpowiedz ? (
              <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary, marginTop: 4 }]}>{pole.podpowiedz}</Text>
            ) : null}
          </View>
        ))}

        {blad ? <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="Zapisz pracownika"
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
  pole: { gap: 6, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  podpowiedz: { fontSize: 13, lineHeight: 18 },
  chipy: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  blad: { fontWeight: '700', marginTop: 8 },
  zapisz: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  zapiszTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
});
