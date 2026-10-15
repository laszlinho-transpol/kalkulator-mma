import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { KalendarzDnia } from '../../../../src/components/common/KalendarzDnia';
import { etykietaZakresu } from '../../../../src/components/common/KalendarzZakresu';
import { lightTheme, darkTheme, type AppTheme } from '../../../../src/constants/theme';
import { formatLiczby, round2 } from '../../../../src/utils/calculations';
import { rodzajPoId } from '../../../../src/budzet/rodzajeSprzetu';
import {
  dniRoboczeMiesiaca, dostepneRozliczenia, kwotaRozliczenia, okresNaDzien, opisRozliczenia,
  parsujLiczbePola, stawkiObowiazujace, wczorajIso, type RodzajRozliczenia, type StawkiSprzetu,
} from '../../../../src/budzet/rozliczenie';
import { etykietaSprzetu } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { useSprzetStore } from '../../../../src/stores/sprzetStore';
import type { PozycjaRaportuSprzetu } from '../../../../src/budzet/typy';

const MIESIACE = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export default function RaportSprzetuScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const maszyna = useSprzetStore((s) => s.sprzet.find((pozycja) => pozycja.id === id));
  const dodajRaport = useSprzetStore((s) => s.dodajRaport);
  const budowy = useBudowyStore((s) => s.budowy);
  const pracownicy = usePracownicyStore((s) => s.pracownicy);

  const [data, setData] = useState(wczorajIso);
  const [budowaId, setBudowaId] = useState('');
  const [pracownikId, setPracownikId] = useState('');
  const [zaznaczone, setZaznaczone] = useState<RodzajRozliczenia[]>([]);
  const [stawkiTekst, setStawkiTekst] = useState<Partial<Record<RodzajRozliczenia, string>>>({});
  const [ilosciTekst, setIlosciTekst] = useState<Partial<Record<RodzajRozliczenia, string>>>({});
  const [uwagi, setUwagi] = useState('');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);
  const dotknieteStawki = useRef(new Set<RodzajRozliczenia>());
  const dniReczne = useRef(false);
  const sugerowaneDni = dniRoboczeMiesiaca(data);
  const [dniTekst, setDniTekst] = useState(() => String(dniRoboczeMiesiaca(wczorajIso())));

  const obowiazujace = useMemo(
    () => (maszyna ? stawkiObowiazujace(maszyna.stawki, maszyna.historiaStawek, data) : {} as StawkiSprzetu),
    [maszyna, data],
  );
  const dostepne = useMemo(() => dostepneRozliczenia(obowiazujace), [obowiazujace]);
  const okres = maszyna ? okresNaDzien(maszyna.historiaStawek, data) : undefined;

  useEffect(() => {
    if (!dniReczne.current) setDniTekst(String(sugerowaneDni));
  }, [sugerowaneDni]);

  useEffect(() => {
    setStawkiTekst((prev) => {
      const next = { ...prev };
      (['miesieczny', 'dzienny', 'godzinowy', 'kilometr'] as RodzajRozliczenia[]).forEach((rodzaj) => {
        if (dotknieteStawki.current.has(rodzaj)) return;
        const stawka = obowiazujace[rodzaj];
        next[rodzaj] = stawka ? String(stawka).replace('.', ',') : '';
      });
      return next;
    });
    setZaznaczone((prev) => prev.filter((rodzaj) => (obowiazujace[rodzaj] ?? 0) > 0));
  }, [obowiazujace]);

  const dni = parsujLiczbePola(dniTekst) ?? 0;
  const miesiac = MIESIACE[(Number(data.split('-')[1]) || 1) - 1];
  const budowyKolejnosc = [...budowy].sort((a, b) => {
    const archiwum = (status?: string) => (status === 'archiwalna' ? 1 : 0);
    return archiwum(a.status) - archiwum(b.status) || a.kodBudowy.localeCompare(b.kodBudowy, 'pl');
  });

  const pozycje: PozycjaRaportuSprzetu[] = zaznaczone.map((rodzaj) => {
    const stawka = parsujLiczbePola(stawkiTekst[rodzaj] ?? '') ?? 0;
    const ilosc = parsujLiczbePola(ilosciTekst[rodzaj] ?? '') ?? 0;
    return {
      rodzaj,
      stawka,
      ilosc,
      kwota: kwotaRozliczenia(rodzaj, stawka, ilosc, dni),
      ...(rodzaj === 'miesieczny' ? { dniRobocze: dni } : {}),
    };
  });
  const suma = round2(pozycje.reduce((s, p) => s + p.kwota, 0));

  const przelacz = (rodzaj: RodzajRozliczenia) => {
    setZaznaczone((prev) => (
      prev.includes(rodzaj) ? prev.filter((x) => x !== rodzaj) : [...prev, rodzaj]
    ));
    setIlosciTekst((prev) => {
      if (prev[rodzaj]) return prev;
      if (rodzaj === 'miesieczny' || rodzaj === 'dzienny') return { ...prev, [rodzaj]: '1' };
      return prev;
    });
  };

  const zapisz = async () => {
    if (!maszyna) return;
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    if (!pracownikId) { setBlad('Wybierz pracownika.'); return; }
    if (zaznaczone.length === 0) { setBlad('Zaznacz choć jeden rodzaj rozliczenia.'); return; }
    for (const pozycja of pozycje) {
      const opis = opisRozliczenia(pozycja.rodzaj);
      if (!(pozycja.stawka > 0)) { setBlad(`Podaj stawkę: ${opis.nazwa}.`); return; }
      if (!(pozycja.ilosc > 0)) { setBlad(`Podaj ilość: ${opis.etykietaIlosci.toLowerCase()}.`); return; }
      if (pozycja.rodzaj === 'miesieczny' && !(dni > 0)) { setBlad('Podaj ilość dni pracujących.'); return; }
    }
    if (!(suma > 0)) { setBlad('Kwota raportu wyszła zerowa.'); return; }
    setBlad('');
    setZapis(true);
    try {
      await dodajRaport({
        sprzetId: maszyna.id,
        data,
        budowaId,
        pracownikId,
        pozycje,
        uwagi: uwagi.trim() || undefined,
      });
      router.replace(`/budzet/sprzet/${maszyna.id}` as never);
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Dodaj raport"
        podtytul={maszyna ? `${rodzajPoId(maszyna.rodzajId)?.nazwa ?? ''} ${etykietaSprzetu(maszyna.numer)}`.trim() : ''}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(id ? `/budzet/sprzet/${id}` : '/budzet/sprzet') }}
      />
      {!maszyna ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono sprzętu.</Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.formularz, { paddingBottom: insets.bottom + 28 }]}
        >
          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Data</Text>
          <KalendarzDnia wartosc={data} theme={theme} onZatwierdz={setData} />
          <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Domyślnie dzień poprzedni. Data zapisuje się po OK.</Text>

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Budowa</Text>
          {budowyKolejnosc.length === 0 ? (
            <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj budowę w menu Budowa.</Text>
          ) : budowyKolejnosc.map((budowa) => (
            <Wybor
              key={budowa.id}
              theme={theme}
              zaznaczony={budowa.id === budowaId}
              etykieta={`${budowa.kodBudowy} · ${budowa.nazwaInwestycji}`}
              accessibilityLabel={`Budowa ${budowa.kodBudowy}`}
              onPress={() => setBudowaId(budowa.id)}
            />
          ))}

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Pracownik</Text>
          {pracownicy.length === 0 ? (
            <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj pracownika w menu Pracownicy.</Text>
          ) : pracownicy.map((pracownik) => (
            <Wybor
              key={pracownik.id}
              theme={theme}
              zaznaczony={pracownik.id === pracownikId}
              etykieta={pracownik.imieNazwisko}
              accessibilityLabel={`Pracownik ${pracownik.imieNazwisko}`}
              onPress={() => setPracownikId(pracownik.id)}
            />
          ))}
          <TouchableOpacity onPress={() => router.push('/budzet/pracownicy' as never)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Nowy pracownik</Text>
          </TouchableOpacity>

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Rozliczenie</Text>
          <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
            {okres
              ? `Stawki z okresu ${etykietaZakresu(okres.od, okres.do)}. Można je zmienić w tym raporcie.`
              : 'Kwota z karty maszyny. Można ją zmienić. Zaznacz jedną albo więcej pozycji.'}
          </Text>
          {dostepne.length === 0 ? (
            <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Ta maszyna nie ma stawek.</Text>
          ) : dostepne.map((rodzaj) => {
            const opis = opisRozliczenia(rodzaj);
            const on = zaznaczone.includes(rodzaj);
            const pozycja = pozycje.find((p) => p.rodzaj === rodzaj);
            return (
              <View key={rodzaj} style={[styles.blok, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <TouchableOpacity accessibilityLabel={`Rozliczenie ${opis.nazwa}`} onPress={() => przelacz(rodzaj)} style={styles.check}>
                  <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>{on ? '☑' : '☐'}</Text>
                  <Text style={[styles.checkTekst, { color: theme.colors.text }]}>{opis.nazwa}</Text>
                </TouchableOpacity>
                {on ? (
                  <View style={styles.pola}>
                    <PoleLiczby
                      theme={theme}
                      etykieta={`Stawka (${opis.jednostkaStawki})`}
                      value={stawkiTekst[rodzaj] ?? ''}
                      onChangeText={(tekst) => {
                        dotknieteStawki.current.add(rodzaj);
                        setStawkiTekst((prev) => ({ ...prev, [rodzaj]: tekst }));
                      }}
                      accessibilityLabel={`Stawka ${opis.nazwa}`}
                    />
                    <PoleLiczby
                      theme={theme}
                      etykieta={`${opis.etykietaIlosci} (${opis.jednostkaIlosci})`}
                      value={ilosciTekst[rodzaj] ?? ''}
                      onChangeText={(tekst) => setIlosciTekst((prev) => ({ ...prev, [rodzaj]: tekst }))}
                      accessibilityLabel={`Ilość ${opis.nazwa}`}
                    />
                    {rodzaj === 'miesieczny' ? (
                      <>
                        <PoleLiczby
                          theme={theme}
                          etykieta="Ilość dni pracujących"
                          value={dniTekst}
                          onChangeText={(tekst) => { dniReczne.current = true; setDniTekst(tekst); }}
                          accessibilityLabel="Ilość dni pracujących"
                        />
                        <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
                          Podpowiedź na {miesiac}: {sugerowaneDni} dni robocze (pn–pt). Można wpisać inną liczbę.
                        </Text>
                        <TouchableOpacity
                          accessibilityLabel="Przywróć dni robocze"
                          onPress={() => { dniReczne.current = false; setDniTekst(String(sugerowaneDni)); }}
                        >
                          <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Użyj {sugerowaneDni} dni roboczych</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    <Text style={[styles.opis, { color: theme.colors.text }]}>
                      {tekstFormuly(rodzaj, pozycja?.stawka ?? 0, pozycja?.ilosc ?? 0, dni, pozycja?.kwota ?? 0)}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Uwagi (opcjonalnie)</Text>
          <TextInput
            value={uwagi}
            onChangeText={setUwagi}
            placeholder="Komentarz"
            placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel="Uwagi"
            multiline
            style={[styles.uwagi, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />

          <View style={[styles.kwotaKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Kwota</Text>
            <Text accessibilityLabel="Kwota raportu" style={[styles.kwota, { color: theme.colors.text }]}>{formatLiczby(suma)} zł</Text>
          </View>

          {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
          <TouchableOpacity
            accessibilityLabel="Zapisz raport"
            disabled={zapis}
            onPress={zapisz}
            style={[styles.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
          >
            <Text style={styles.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function tekstFormuly(rodzaj: RodzajRozliczenia, stawka: number, ilosc: number, dni: number, kwota: number): string {
  const wynik = `${formatLiczby(kwota)} zł`;
  if (rodzaj === 'miesieczny') {
    return `${formatLiczby(stawka)} zł ÷ ${dni} dni pracujących × ${formatLiczby(ilosc)} = ${wynik}`;
  }
  return `${formatLiczby(stawka)} zł × ${formatLiczby(ilosc)} = ${wynik}`;
}

function Wybor({
  theme, zaznaczony, etykieta, accessibilityLabel, onPress,
}: {
  theme: AppTheme;
  zaznaczony: boolean;
  etykieta: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.wybor, {
        borderColor: zaznaczony ? theme.colors.primary : theme.colors.border,
        backgroundColor: zaznaczony ? `${theme.colors.primary}22` : theme.colors.card,
      }]}
    >
      <Text style={{ color: theme.colors.text, fontWeight: zaznaczony ? '800' : '600' }}>{etykieta}</Text>
    </TouchableOpacity>
  );
}

function PoleLiczby({
  theme, etykieta, value, onChangeText, accessibilityLabel,
}: {
  theme: AppTheme;
  etykieta: string;
  value: string;
  onChangeText: (tekst: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>{etykieta}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  formularz: { padding: 16, gap: 8 },
  etykieta: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  opis: { fontSize: 13, lineHeight: 18 },
  wybor: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  blok: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ptaszek: { fontSize: 20, fontWeight: '800' },
  checkTekst: { fontSize: 16, fontWeight: '700', flex: 1 },
  pola: { gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  uwagi: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  kwotaKarta: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
  kwota: { fontSize: 28, fontWeight: '800' },
  zapisz: { marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  zapiszTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
});
