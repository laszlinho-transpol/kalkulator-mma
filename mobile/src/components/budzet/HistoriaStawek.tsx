import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { KalendarzZakresu, etykietaZakresu } from '../common/KalendarzZakresu';
import {
  OPISY_ROZLICZENIA, parsujLiczbePola, tekstZapisanejStawki, zakresNachodzi,
  type RodzajRozliczenia, type StawkiSprzetu,
} from '../../budzet/rozliczenie';
import { linieStawek } from '../../budzet/wyswietlanie';
import type { OkresStawek, Sprzet } from '../../budzet/typy';
import { potwierdzAkcje } from '../../utils/dialog';
import { dzisIso } from '../../utils/zakresDat';
import { useSprzetStore } from '../../stores/sprzetStore';

function zakresMiesiaca(iso: string): { od: string; do: string } {
  const [rok, miesiac] = iso.split('-').map(Number);
  const ostatni = new Date(rok, miesiac, 0).getDate();
  const mm = String(miesiac).padStart(2, '0');
  return { od: `${rok}-${mm}-01`, do: `${rok}-${mm}-${String(ostatni).padStart(2, '0')}` };
}

interface Props {
  maszyna: Sprzet;
  theme: AppTheme;
}

export function HistoriaStawek({ maszyna, theme }: Props) {
  const dodajOkres = useSprzetStore((s) => s.dodajOkresStawek);
  const zmienOkres = useSprzetStore((s) => s.zmienOkresStawek);
  const usunOkres = useSprzetStore((s) => s.usunOkresStawek);
  const [formularz, setFormularz] = useState<string | null>(null);
  const historia = [...(maszyna.historiaStawek ?? [])].sort((a, b) => b.od.localeCompare(a.od));

  return (
    <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.sekcja, { color: theme.colors.text }]}>Historia stawek</Text>
      <Text style={{ color: theme.colors.textSecondary, lineHeight: 18 }}>
        Każdy okres ma własne stawki. Raport z daty w zakresie bierze je z tego okresu. Poza zakresami zostają stawki z karty.
      </Text>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Stawki z karty</Text>
      {linieStawek(maszyna.stawki).map((linia) => (
        <Text key={linia} style={{ color: theme.colors.textSecondary }}>{linia}</Text>
      ))}

      {historia.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>Brak okresów. Stawki z karty obowiązują cały czas.</Text>
      ) : historia.map((okres) => (
        <View key={okres.id} style={[styles.okres, { borderColor: theme.colors.border }]}>
          <Text style={[styles.zakres, { color: theme.colors.text }]}>{etykietaZakresu(okres.od, okres.do)}</Text>
          {linieStawek(okres.stawki).map((linia) => (
            <Text key={linia} style={{ color: theme.colors.text }}>{linia}</Text>
          ))}
          <View style={styles.akcje}>
            <TouchableOpacity accessibilityLabel={`Edytuj okres ${okres.od}`} onPress={() => setFormularz(okres.id)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Zmień okres</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Usuń okres ${okres.od}`}
              onPress={() => potwierdzAkcje(
                'Usuń okres stawek',
                `Usunąć stawki z zakresu ${etykietaZakresu(okres.od, okres.do)}?`,
                () => { void usunOkres(maszyna.id, okres.id); },
              )}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Usuń</Text>
            </TouchableOpacity>
          </View>
          {formularz === okres.id ? (
            <FormularzOkresu
              theme={theme}
              historia={maszyna.historiaStawek}
              pominId={okres.id}
              poczatek={okres}
              onAnuluj={() => setFormularz(null)}
              onZapisz={async (dane) => {
                await zmienOkres(maszyna.id, { ...dane, id: okres.id });
                setFormularz(null);
              }}
            />
          ) : null}
        </View>
      ))}

      {formularz === 'nowy' ? (
        <FormularzOkresu
          theme={theme}
          historia={maszyna.historiaStawek}
          poczatek={{ ...zakresMiesiaca(dzisIso()), stawki: maszyna.stawki }}
          onAnuluj={() => setFormularz(null)}
          onZapisz={async (dane) => {
            await dodajOkres(maszyna.id, dane);
            setFormularz(null);
          }}
        />
      ) : (
        <TouchableOpacity
          accessibilityLabel="Dodaj okres stawek"
          onPress={() => setFormularz('nowy')}
          style={[styles.dodaj, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.dodajTekst}>Dodaj okres</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FormularzOkresu({
  theme, historia, pominId, poczatek, onAnuluj, onZapisz,
}: {
  theme: AppTheme;
  historia?: OkresStawek[];
  pominId?: string;
  poczatek: { od: string; do: string; stawki: StawkiSprzetu };
  onAnuluj: () => void;
  onZapisz: (dane: Omit<OkresStawek, 'id'>) => Promise<void>;
}) {
  const [od, setOd] = useState(poczatek.od);
  const [doDnia, setDoDnia] = useState(poczatek.do);
  const [stawkiTekst, setStawkiTekst] = useState<Record<RodzajRozliczenia, string>>({
    miesieczny: tekstZapisanejStawki(poczatek.stawki.miesieczny),
    dzienny: tekstZapisanejStawki(poczatek.stawki.dzienny),
    godzinowy: tekstZapisanejStawki(poczatek.stawki.godzinowy),
    kilometr: tekstZapisanejStawki(poczatek.stawki.kilometr),
  });
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);

  const zapisz = async () => {
    const poczatekZakresu = od <= doDnia ? od : doDnia;
    const koniec = od <= doDnia ? doDnia : od;
    if (zakresNachodzi(historia, poczatekZakresu, koniec, pominId)) {
      setBlad('Ten zakres nachodzi na inny okres stawek.');
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
      setBlad('Podaj choć jedną stawkę w tym okresie.');
      return;
    }
    setBlad('');
    setZapis(true);
    try {
      await onZapisz({ od: poczatekZakresu, do: koniec, stawki });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={styles.formularz}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Zakres dat</Text>
      <KalendarzZakresu od={od} doDnia={doDnia} theme={theme} onZatwierdz={(a, b) => { setOd(a); setDoDnia(b); }} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Najpierw początek, potem koniec. Zapis po OK.</Text>
      {OPISY_ROZLICZENIA.map((opis) => (
        <View key={opis.id} style={{ gap: 4 }}>
          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>{opis.nazwa} (opcjonalnie)</Text>
          <TextInput
            value={stawkiTekst[opis.id]}
            onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [opis.id]: tekst }))}
            placeholder={opis.jednostkaStawki}
            placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel={`Okres ${opis.nazwa}`}
            keyboardType="decimal-pad"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />
        </View>
      ))}
      {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
      <View style={styles.akcje}>
        <TouchableOpacity onPress={onAnuluj} style={[styles.btn, { borderColor: theme.colors.border, borderWidth: 1 }]}>
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Anuluj</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Zapisz okres stawek"
          disabled={zapis}
          onPress={zapisz}
          style={[styles.btn, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
        >
          <Text style={{ color: '#1A1A1A', fontWeight: '800' }}>Zapisz okres</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  karta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  sekcja: { fontSize: 18, fontWeight: '800' },
  okres: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  zakres: { fontSize: 16, fontWeight: '800' },
  akcje: { flexDirection: 'row', gap: 16, marginTop: 4 },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  formularz: { gap: 8, marginTop: 8 },
  etykieta: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});
