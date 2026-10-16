import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { Etykieta, Pole, Wiersz, Wybor, stylFormularza } from '../../../../src/components/common/Formularz';
import { KalendarzDnia } from '../../../../src/components/common/KalendarzDnia';
import { etykietaZakresu } from '../../../../src/components/common/KalendarzZakresu';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
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
import { nazwaPracownika, pracownicyAlfabetycznie } from '../../../../src/budzet/pracownicy';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { useSprzetStore } from '../../../../src/stores/sprzetStore';
import type { PozycjaRaportuSprzetu } from '../../../../src/budzet/typy';
import { PolaPracyPracownika, usePracaPracownika } from '../../../../src/components/budzet/PracaPracownika';

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
  const [zPracownikiem, setZPracownikiem] = useState(false);
  const [pracownikId, setPracownikId] = useState('');
  const dodajRaportPracownika = usePracownicyStore((s) => s.dodajRaport);
  const pracownik = zPracownikiem ? pracownicy.find((p) => p.id === pracownikId) : undefined;
  const praca = usePracaPracownika(pracownik, data);
  const [zaznaczone, setZaznaczone] = useState<RodzajRozliczenia[]>([]);
  const [stawkiTekst, setStawkiTekst] = useState<Partial<Record<RodzajRozliczenia, string>>>({});
  const [ilosciTekst, setIlosciTekst] = useState<Partial<Record<RodzajRozliczenia, string>>>({});
  const [dozowanieTekst, setDozowanieTekst] = useState('');
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
      (['miesieczny', 'dzienny', 'godzinowy', 'kilometr', 'dozowanie'] as RodzajRozliczenia[]).forEach((rodzaj) => {
        if (dotknieteStawki.current.has(rodzaj)) return;
        const stawka = obowiazujace[rodzaj];
        next[rodzaj] = stawka ? String(stawka).replace('.', ',') : '';
      });
      return next;
    });
    setZaznaczone((prev) => prev.filter((rodzaj) => (obowiazujace[rodzaj] ?? 0) > 0));
  }, [obowiazujace]);

  const dni = parsujLiczbePola(dniTekst) ?? 0;
  const dozowanie = parsujLiczbePola(dozowanieTekst) ?? 0;
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
      kwota: kwotaRozliczenia(rodzaj, stawka, ilosc, dni, dozowanie),
      ...(rodzaj === 'miesieczny' ? { dniRobocze: dni } : {}),
      ...(rodzaj === 'dozowanie' ? { dozowanie } : {}),
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
    if (zPracownikiem && !pracownik) { setBlad('Wybierz pracownika albo odznacz „Pracownik”.'); return; }
    if (zaznaczone.length === 0) { setBlad('Zaznacz choć jeden rodzaj rozliczenia.'); return; }
    for (const pozycja of pozycje) {
      const opis = opisRozliczenia(pozycja.rodzaj);
      if (!(pozycja.stawka > 0)) { setBlad(`Podaj stawkę: ${opis.nazwa}.`); return; }
      if (!(pozycja.ilosc > 0)) { setBlad(`Podaj ilość: ${opis.etykietaIlosci.toLowerCase()}.`); return; }
      if (pozycja.rodzaj === 'miesieczny' && !(dni > 0)) { setBlad('Podaj ilość dni pracujących.'); return; }
      if (pozycja.rodzaj === 'dozowanie' && !(dozowanie > 0)) { setBlad('Podaj dozowanie, np. 0,5 kg/m².'); return; }
    }
    if (!(suma > 0)) { setBlad('Kwota raportu wyszła zerowa.'); return; }
    if (pracownik) {
      const bladPracy = praca.blad();
      if (bladPracy) { setBlad(`Pracownik: ${bladPracy}`); return; }
    }
    setBlad('');
    setZapis(true);
    try {
      const raportPracownikaId = pracownik
        ? await dodajRaportPracownika({
          ...praca.daneRaportu(),
          pracownikId: pracownik.id,
          data,
          budowaId,
          sprzetId: maszyna.id,
          uwagi: `Operator: ${rodzajPoId(maszyna.rodzajId)?.nazwa ?? 'sprzęt'} ${etykietaSprzetu(maszyna.numer)}`.trim(),
        })
        : undefined;
      await dodajRaport({
        sprzetId: maszyna.id,
        data,
        budowaId,
        pracownikId: pracownik?.id,
        raportPracownikaId,
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
          contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}
        >
          <View>
            <Etykieta tekst="Data" info="Domyślnie dzień poprzedni. Data zapisuje się po OK w kalendarzu." />
            <KalendarzDnia wartosc={data} theme={theme} onZatwierdz={setData} />
          </View>

          <View>
            <Etykieta tekst="Budowa" wymagane />
            {budowyKolejnosc.length === 0 ? (
              <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj budowę w menu Budowa.</Text>
            ) : (
              <View style={stylFormularza.chipy}>
                {budowyKolejnosc.map((budowa) => (
                  <Wybor
                    key={budowa.id}
                    zaznaczony={budowa.id === budowaId}
                    etykieta={`${budowa.kodBudowy} · ${budowa.nazwaInwestycji}`}
                    accessibilityLabel={`Budowa ${budowa.kodBudowy}`}
                    onPress={() => setBudowaId(budowa.id)}
                  />
                ))}
              </View>
            )}
          </View>

          <Etykieta
            tekst="ROZLICZENIE"
            wymagane
            info={okres
              ? `Stawki z okresu ${etykietaZakresu(okres.od, okres.do)}. Można je zmienić tylko w tym raporcie. Zaznacz jedną albo więcej pozycji – rozliczenia z jednego dnia się sumują.`
              : 'Stawki z karty maszyny. Można je zmienić tylko w tym raporcie. Zaznacz jedną albo więcej pozycji – rozliczenia z jednego dnia się sumują.'}
          />
          {dostepne.length === 0 ? (
            <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Ta maszyna nie ma stawek.</Text>
          ) : dostepne.map((rodzaj) => {
            const opis = opisRozliczenia(rodzaj);
            const on = zaznaczone.includes(rodzaj);
            const pozycja = pozycje.find((p) => p.rodzaj === rodzaj);
            return (
              <View key={rodzaj} style={[styles.blok, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card }]}>
                <TouchableOpacity accessibilityLabel={`Rozliczenie ${opis.nazwa}`} onPress={() => przelacz(rodzaj)} style={styles.check}>
                  <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>{on ? '☑' : '☐'}</Text>
                  <Text style={[styles.checkTekst, { color: theme.colors.text }]}>{opis.nazwa}</Text>
                  {on ? <Text style={[styles.checkKwota, { color: theme.colors.text }]}>{formatLiczby(pozycja?.kwota ?? 0)} zł</Text> : null}
                </TouchableOpacity>
                {on ? (
                  <>
                    <Wiersz proporcje={rodzaj === 'miesieczny' || rodzaj === 'dozowanie' ? [1.5, 1, 1] : undefined}>
                      <Pole
                        etykieta="Stawka"
                        jednostka={opis.jednostkaStawki.replace(' / ', '/')}
                        value={stawkiTekst[rodzaj] ?? ''}
                        onChangeText={(tekst) => {
                          dotknieteStawki.current.add(rodzaj);
                          setStawkiTekst((prev) => ({ ...prev, [rodzaj]: tekst }));
                        }}
                        accessibilityLabel={`Stawka ${opis.nazwa}`}
                        liczba
                      />
                      <Pole
                        etykieta={opis.etykietaIlosci}
                        jednostka={opis.jednostkaIlosci}
                        value={ilosciTekst[rodzaj] ?? ''}
                        onChangeText={(tekst) => setIlosciTekst((prev) => ({ ...prev, [rodzaj]: tekst }))}
                        accessibilityLabel={`Ilość ${opis.nazwa}`}
                        liczba
                      />
                      {rodzaj === 'dozowanie' ? (
                        <Pole
                          etykieta="Dozowanie"
                          jednostka="kg/m²"
                          value={dozowanieTekst}
                          onChangeText={setDozowanieTekst}
                          placeholder="0,5"
                          accessibilityLabel="Dozowanie kg/m²"
                          liczba
                        />
                      ) : null}
                      {rodzaj === 'miesieczny' ? (
                        <Pole
                          etykieta="Dni rob."
                          info={`Dzielnik kosztu miesięcznego. Podpowiedź na ${miesiac}: ${sugerowaneDni} dni robocze (pn–pt bez świąt). Można wpisać inną liczbę.`}
                          jednostka="dni"
                          value={dniTekst}
                          onChangeText={(tekst) => { dniReczne.current = true; setDniTekst(tekst); }}
                          accessibilityLabel="Ilość dni pracujących"
                          liczba
                        />
                      ) : null}
                    </Wiersz>
                    {rodzaj === 'miesieczny' && dniTekst !== String(sugerowaneDni) ? (
                      <TouchableOpacity
                        accessibilityLabel="Przywróć dni robocze"
                        onPress={() => { dniReczne.current = false; setDniTekst(String(sugerowaneDni)); }}
                      >
                        <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>Użyj {sugerowaneDni} dni roboczych</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
                      {tekstFormuly(rodzaj, pozycja?.stawka ?? 0, pozycja?.ilosc ?? 0, dni, pozycja?.kwota ?? 0, dozowanie)}
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })}

          <View style={[styles.blok, { borderColor: zPracownikiem ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <View style={styles.check}>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: zPracownikiem }}
                accessibilityLabel="Przypisz pracownika"
                onPress={() => setZPracownikiem(!zPracownikiem)}
                style={[styles.check, { flex: 1 }]}
              >
                <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>{zPracownikiem ? '☑' : '☐'}</Text>
                <Text style={[styles.checkTekst, { color: theme.colors.text }]}>Pracownik</Text>
                {pracownik ? <Text style={[styles.checkKwota, { color: theme.colors.text }]}>{formatLiczby(praca.wynik.koszt)} zł</Text> : null}
              </TouchableOpacity>
              {zPracownikiem ? (
                <TouchableOpacity onPress={() => router.push('/budzet/pracownicy/nowy' as never)}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>+ Nowy</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {!zPracownikiem ? (
              <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
                Bez pracownika – np. sprzęt z firmy zewnętrznej z własnym operatorem.
              </Text>
            ) : pracownicy.length === 0 ? (
              <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj pracownika w menu Pracownicy.</Text>
            ) : (
              <>
                <View style={stylFormularza.chipy}>
                  {pracownicyAlfabetycznie(pracownicy).map((p) => (
                    <Wybor
                      key={p.id}
                      zaznaczony={p.id === pracownikId}
                      etykieta={nazwaPracownika(p)}
                      accessibilityLabel={`Pracownik ${nazwaPracownika(p)}`}
                      onPress={() => setPracownikId(p.id)}
                    />
                  ))}
                </View>
                {pracownik ? (
                  <>
                    <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
                      Po zapisie raport pracy {nazwaPracownika(pracownik)} z tego dnia doda się sam – do kosztów i wypłaty.
                    </Text>
                    <PolaPracyPracownika praca={praca} theme={theme} etykietaKwoty="Koszt pracownika" />
                  </>
                ) : null}
              </>
            )}
          </View>

          <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Komentarz" accessibilityLabel="Uwagi" />

          <View style={[styles.kwotaKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kosztEtykieta, { color: theme.colors.textSecondary }]}>Kwota</Text>
            <Text accessibilityLabel="Kwota raportu" style={[styles.kwota, { color: theme.colors.text }]}>{formatLiczby(suma)} zł</Text>
          </View>

          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
          <TouchableOpacity
            accessibilityLabel="Zapisz raport"
            disabled={zapis}
            onPress={zapisz}
            style={[stylFormularza.zapisz, { backgroundColor: theme.colors.primary, opacity: zapis ? 0.6 : 1 }]}
          >
            <Text style={stylFormularza.zapiszTekst}>{zapis ? 'Zapis…' : 'Zapisz'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function tekstFormuly(rodzaj: RodzajRozliczenia, stawka: number, ilosc: number, dni: number, kwota: number, dozowanie: number): string {
  const wynik = `${formatLiczby(kwota)} zł`;
  if (rodzaj === 'dozowanie') {
    return `${formatLiczby(stawka)} zł/kg × ${formatLiczby(dozowanie)} kg/m² × ${formatLiczby(ilosc)} m² = ${wynik}`;
  }
  if (rodzaj === 'miesieczny') {
    return `${formatLiczby(stawka)} zł ÷ ${dni} dni pracujących × ${formatLiczby(ilosc)} = ${wynik}`;
  }
  return `${formatLiczby(stawka)} zł × ${formatLiczby(ilosc)} = ${wynik}`;
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  opis: { fontSize: 13, lineHeight: 18 },
  blok: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ptaszek: { fontSize: 20, fontWeight: '800' },
  checkTekst: { fontSize: 15, fontWeight: '700', flex: 1 },
  checkKwota: { fontSize: 15, fontWeight: '800' },
  kwotaKarta: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  kosztEtykieta: { fontSize: 13, fontWeight: '700' },
  kwota: { fontSize: 24, fontWeight: '800' },
});
