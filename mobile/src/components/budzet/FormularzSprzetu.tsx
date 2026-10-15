import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { Etykieta, Pole as PoleF, Wiersz, Wybor, stylFormularza } from '../common/Formularz';
import type { AppTheme } from '../../constants/theme';
import { GRUPY_SPRZETU, rodzajPoId } from '../../budzet/rodzajeSprzetu';
import {
  OPISY_ROZLICZENIA, parsujLiczbePola, tekstZapisanejStawki, type RodzajRozliczenia, type StawkiSprzetu,
} from '../../budzet/rozliczenie';
import { wstecz } from '../../budzet/nawigacja';
import { useFirmyStore } from '../../stores/firmyStore';

export interface DaneSprzetuFormularza {
  rodzajId: string;
  numer?: string;
  firmaNazwa: string;
  stawki: StawkiSprzetu;
  spalanieLnaMth?: number;
}

interface Props {
  theme: AppTheme;
  tytul: string;
  wsteczDo: string;
  etykietaZapisu: string;
  poczatek?: {
    rodzajId: string;
    numer?: string;
    firma?: string;
    stawki: StawkiSprzetu;
    spalanieLnaMth?: number;
  };
  onZapisz: (dane: DaneSprzetuFormularza) => Promise<void>;
}

export function FormularzSprzetu({ theme, tytul, wsteczDo, etykietaZapisu, poczatek, onZapisz }: Props) {
  const insets = useSafeAreaInsets();
  const firmy = useFirmyStore((s) => s.firmy);
  const [rodzajId, setRodzajId] = useState(rodzajPoId(poczatek?.rodzajId ?? '') ? poczatek!.rodzajId : '');
  const [numer, setNumer] = useState(poczatek?.numer ?? '');
  const [firma, setFirma] = useState(poczatek?.firma ?? '');
  const [stawkiTekst, setStawkiTekst] = useState<Record<RodzajRozliczenia, string>>({
    miesieczny: tekstZapisanejStawki(poczatek?.stawki.miesieczny),
    dzienny: tekstZapisanejStawki(poczatek?.stawki.dzienny),
    godzinowy: tekstZapisanejStawki(poczatek?.stawki.godzinowy),
    kilometr: tekstZapisanejStawki(poczatek?.stawki.kilometr),
  });
  const [spalanie, setSpalanie] = useState(tekstZapisanejStawki(poczatek?.spalanieLnaMth));
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
      await onZapisz({
        rodzajId,
        numer: numer.trim() || undefined,
        firmaNazwa: firma,
        stawki,
        spalanieLnaMth,
      });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={tytul}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(wsteczDo) }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}
      >
        <Etykieta tekst="Rodzaj sprzętu" wymagane />
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

        <Wiersz>
          <PoleF etykieta="Numer" value={numer} onChangeText={setNumer} placeholder="np. R-12" accessibilityLabel="Numer sprzętu" />
          <PoleF etykieta="Spalanie" jednostka="l/mth" value={spalanie} onChangeText={setSpalanie} placeholder="np. 4" accessibilityLabel="Spalanie" liczba />
        </Wiersz>
        <PoleF
          etykieta="Firma"
          info="Firma trafi do bazy firm i będzie podpowiadana przy kolejnym sprzęcie."
          value={firma}
          onChangeText={setFirma}
          placeholder="Nazwa firmy"
          accessibilityLabel="Firma"
        />
        {podpowiedzi.length > 0 ? (
          <View style={stylFormularza.chipy}>
            {podpowiedzi.map((f) => (
              <Wybor key={f.id} zaznaczony={false} etykieta={f.nazwa} accessibilityLabel={`Podpowiedź firmy ${f.nazwa}`} onPress={() => setFirma(f.nazwa)} />
            ))}
          </View>
        ) : null}

        <Etykieta
          tekst="ROZLICZENIE"
          info="Można uzupełnić każdy rodzaj albo tylko jeden. Okres obowiązywania stawek ustawisz w zakładce Historia stawek."
          wymagane
        />
        {[OPISY_ROZLICZENIA.slice(0, 2), OPISY_ROZLICZENIA.slice(2)].map((para) => (
          <Wiersz key={para[0].id}>
            {para.map((opis) => (
              <PoleF
                key={opis.id}
                etykieta={opis.nazwa}
                jednostka={opis.jednostkaStawki.replace(' / ', '/')}
                value={stawkiTekst[opis.id]}
                onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [opis.id]: tekst }))}
                placeholder={opis.id === 'kilometr' ? '3,5' : opis.id === 'miesieczny' ? '22300' : opis.id === 'dzienny' ? '350' : '150'}
                accessibilityLabel={opis.nazwa}
                liczba
              />
            ))}
          </Wiersz>
        ))}

        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel={etykietaZapisu}
          disabled={zapis}
          onPress={zapisz}
          style={[stylFormularza.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
        >
          <Text style={stylFormularza.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  grupa: { gap: 6 },
  grupaTytul: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  rodzaje: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rodzaj: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
