import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { KalendarzZakresu, etykietaZakresu } from '../common/KalendarzZakresu';
import { Etykieta, Pole, Wiersz } from '../common/Formularz';
import { InfoTooltip } from '../common/InfoTooltip';
import { parsujLiczbePola, tekstZapisanejStawki, zakresNachodzi } from '../../budzet/rozliczenie';
import type { OpisPolaStawki } from '../../budzet/pracownicy';
import type { OkresStawek } from '../../budzet/typy';
import { potwierdzAkcje } from '../../utils/dialog';
import { dzisIso } from '../../utils/zakresDat';

function zakresMiesiaca(iso: string): { od: string; do: string } {
  const [rok, miesiac] = iso.split('-').map(Number);
  const ostatni = new Date(rok, miesiac, 0).getDate();
  const mm = String(miesiac).padStart(2, '0');
  return { od: `${rok}-${mm}-01`, do: `${rok}-${mm}-${String(ostatni).padStart(2, '0')}` };
}

interface Props<T extends object> {
  theme: AppTheme;
  pola: OpisPolaStawki[];
  bazowe: T;
  historia?: OkresStawek<T>[];
  linie: (stawki: T) => string[];
  onDodaj: (okres: Omit<OkresStawek<T>, 'id'>) => Promise<unknown>;
  onZmien: (okres: OkresStawek<T>) => Promise<void>;
  onUsun: (okresId: string) => Promise<void>;
  tytul?: string;
  info?: string;
  etykietaBazowych?: string;
  brakOkresow?: string;
}

export function HistoriaStawek<T extends object>({
  theme, pola, bazowe, historia: zapisana, linie, onDodaj, onZmien, onUsun,
  tytul = 'Historia stawek',
  info = 'Każdy okres ma własne stawki. Raport z daty w zakresie bierze je z tego okresu. Poza zakresami zostają stawki z karty.',
  etykietaBazowych = 'Stawki z karty',
  brakOkresow = 'Brak okresów. Stawki z karty obowiązują cały czas.',
}: Props<T>) {
  const [formularz, setFormularz] = useState<string | null>(null);
  const historia = [...(zapisana ?? [])].sort((a, b) => b.od.localeCompare(a.od));

  return (
    <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.tytulWiersz}>
        <Text style={[styles.sekcja, { color: theme.colors.text }]}>{tytul}</Text>
        <InfoTooltip tresc={info} />
      </View>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{etykietaBazowych}</Text>
      {linie(bazowe).map((linia) => (
        <Text key={linia} style={{ color: theme.colors.textSecondary }}>{linia}</Text>
      ))}

      {historia.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>{brakOkresow}</Text>
      ) : historia.map((okres) => (
        <View key={okres.id} style={[styles.okres, { borderColor: theme.colors.border }]}>
          <Text style={[styles.zakres, { color: theme.colors.text }]}>{etykietaZakresu(okres.od, okres.do)}</Text>
          {linie(okres.stawki).map((linia) => (
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
                () => { void onUsun(okres.id); },
              )}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Usuń</Text>
            </TouchableOpacity>
          </View>
          {formularz === okres.id ? (
            <FormularzOkresu
              theme={theme}
              pola={pola}
              historia={zapisana}
              pominId={okres.id}
              poczatek={okres}
              onAnuluj={() => setFormularz(null)}
              onZapisz={async (dane) => {
                await onZmien({ ...dane, id: okres.id });
                setFormularz(null);
              }}
            />
          ) : null}
        </View>
      ))}

      {formularz === 'nowy' ? (
        <FormularzOkresu
          theme={theme}
          pola={pola}
          historia={zapisana}
          poczatek={{ ...zakresMiesiaca(dzisIso()), stawki: bazowe }}
          onAnuluj={() => setFormularz(null)}
          onZapisz={async (dane) => {
            await onDodaj(dane);
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

function FormularzOkresu<T extends object>({
  theme, pola, historia, pominId, poczatek, onAnuluj, onZapisz,
}: {
  theme: AppTheme;
  pola: OpisPolaStawki[];
  historia?: OkresStawek<T>[];
  pominId?: string;
  poczatek: { od: string; do: string; stawki: T };
  onAnuluj: () => void;
  onZapisz: (dane: Omit<OkresStawek<T>, 'id'>) => Promise<void>;
}) {
  const [od, setOd] = useState(poczatek.od);
  const [doDnia, setDoDnia] = useState(poczatek.do);
  const [stawkiTekst, setStawkiTekst] = useState<Record<string, string>>(() => {
    const wartosci = poczatek.stawki as Record<string, number | undefined>;
    return Object.fromEntries(pola.map((pole) => [pole.id, tekstZapisanejStawki(wartosci[pole.id])]));
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
    const stawki: Record<string, number> = {};
    for (const pole of pola) {
      const tekst = (stawkiTekst[pole.id] ?? '').trim();
      if (!tekst) continue;
      const liczba = parsujLiczbePola(tekst);
      if (liczba == null || liczba <= 0) {
        setBlad(`Pole „${pole.nazwa}” przyjmuje liczbę większą od zera.`);
        return;
      }
      stawki[pole.id] = liczba;
    }
    if (Object.keys(stawki).length === 0) {
      setBlad('Podaj choć jedną stawkę w tym okresie.');
      return;
    }
    setBlad('');
    setZapis(true);
    try {
      await onZapisz({ od: poczatekZakresu, do: koniec, stawki: stawki as T });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={styles.formularz}>
      <Etykieta tekst="Zakres dat" info="Najpierw wybierz początek, potem koniec. Zakres zapisuje się po OK." />
      <KalendarzZakresu od={od} doDnia={doDnia} theme={theme} onZatwierdz={(a, b) => { setOd(a); setDoDnia(b); }} />
      {Array.from({ length: Math.ceil(pola.length / 2) }, (_, i) => pola.slice(i * 2, i * 2 + 2)).map((para) => (
        <Wiersz key={para[0].id}>
          {[...para.map((pole) => (
            <Pole
              key={pole.id}
              etykieta={pole.nazwa}
              jednostka={pole.mnoznik ? '×' : pole.jednostka.replace(' / ', '/')}
              value={stawkiTekst[pole.id] ?? ''}
              onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [pole.id]: tekst }))}
              accessibilityLabel={`Okres ${pole.nazwa}`}
              liczba
            />
          )), para.length === 1 ? <View key="pusto" /> : null]}
        </Wiersz>
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
  tytulWiersz: { flexDirection: 'row', alignItems: 'center' },
  okres: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  zakres: { fontSize: 16, fontWeight: '800' },
  akcje: { flexDirection: 'row', gap: 16, marginTop: 4 },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  formularz: { gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});
