import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Etykieta, Karta, KalendarzDnia, Pole, Przycisk, Wybor, stylFormularza, useMotyw, ODSTEP, TYPOGRAFIA } from '../../../../src/components/ui';
import { PolaPracyPracownika, usePracaPracownika } from '../../../../src/components/budzet/PracaPracownika';
import { stawkiObowiazujace, wczorajIso } from '../../../../src/budzet/rozliczenie';
import { opisDnia } from '../../../../src/budzet/kalendarzPracy';
import { nazwaPracownika } from '../../../../src/budzet/pracownicy';
import {
  GODZINY_R8, NIEOBECNOSCI, bankR8, czyDzienNieobecnosci, dniZakresu, nazwaBrygady, nazwaNieobecnosci, rodzajRaportu, rozliczNieobecnosci,
  type RodzajDniaPracownika,
} from '../../../../src/budzet/nieobecnosci';
import type { Pracownik, RaportPracownika } from '../../../../src/budzet/typy';
import { dataKrotko } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { useGrupyPracownikowStore } from '../../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { formatLiczby, round2 } from '../../../../src/utils/calculations';
import { potwierdzAkcje } from '../../../../src/utils/dialog';
import { budowaWToku } from '../../../../src/utils/statusBudowy';

type DaneRaportu = Omit<RaportPracownika, 'id' | 'createdAt'>;

const RODZAJE: { id: RodzajDniaPracownika; etykieta: string }[] = [
  { id: 'praca', etykieta: 'Praca' },
  ...NIEOBECNOSCI.map((n) => ({ id: n.id, etykieta: `${n.id} – ${n.nazwa.toLowerCase()}` })),
];

export default function RaportPracownikaScreen() {
  const id = useRouteId();
  const { raportId, data } = useLocalSearchParams<{ raportId?: string; data?: string }>();
  const theme = useMotyw();
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const edytowany = usePracownicyStore((s) => (raportId ? s.raporty.find((r) => r.id === raportId) : undefined));
  const brak = !pracownik ? 'Nie znaleziono pracownika.' : raportId && !edytowany ? 'Nie znaleziono raportu – mógł zostać usunięty.' : '';

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={raportId ? 'Edytuj raport' : 'Dodaj raport'}
        podtytul={pracownik ? nazwaPracownika(pracownik) : ''}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(id ? `/budzet/pracownicy/${id}?zakladka=raporty` : '/budzet/pracownicy') }}
      />
      {brak || !pracownik ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>{brak}</Text>
      ) : (
        <Formularz
          key={edytowany?.id ?? 'nowy'}
          pracownik={pracownik}
          edytowany={edytowany}
          dataStartowa={edytowany?.data ?? (data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : wczorajIso())}
        />
      )}
    </View>
  );
}

function Formularz({ pracownik, edytowany, dataStartowa }: { pracownik: Pracownik; edytowany?: RaportPracownika; dataStartowa: string }) {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const wszystkieRaporty = usePracownicyStore((s) => s.raporty);
  const dodajRaporty = usePracownicyStore((s) => s.dodajRaporty);
  const zmienRaport = usePracownicyStore((s) => s.zmienRaport);
  const usunRaport = usePracownicyStore((s) => s.usunRaport);
  const budowy = useBudowyStore((s) => s.budowy);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);

  const [rodzaj, setRodzaj] = useState<RodzajDniaPracownika>(edytowany ? rodzajRaportu(edytowany) : 'praca');
  const [data, setData] = useState(dataStartowa);
  const [doDnia, setDoDnia] = useState<string | null>(null);
  const [budowaId, setBudowaId] = useState(edytowany?.budowaId ?? '');
  const [uwagi, setUwagi] = useState(edytowany?.uwagi ?? '');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);
  const praca = usePracaPracownika(pracownik, data, edytowany);
  const zSprzetu = !!edytowany?.sprzetId;
  const powrot = `/budzet/pracownicy/${pracownik.id}?zakladka=raporty`;

  const inne = useMemo(
    () => wszystkieRaporty.filter((r) => r.pracownikId === pracownik.id && r.id !== edytowany?.id),
    [wszystkieRaporty, pracownik.id, edytowany?.id],
  );
  const zajete = useMemo(() => {
    const mapa = new Map<string, RaportPracownika[]>();
    for (const r of inne) mapa.set(r.data, [...(mapa.get(r.data) ?? []), r]);
    return mapa;
  }, [inne]);

  const budowyKolejnosc = [...budowy].sort((a, b) => {
    const archiwum = (b: Parameters<typeof budowaWToku>[0]) => (budowaWToku(b) ? 0 : 1);
    return archiwum(a) - archiwum(b) || a.kodBudowy.localeCompare(b.kodBudowy, 'pl');
  });

  const nieobecnosc = rodzaj === 'praca' ? undefined : rodzaj;
  const koniec = doDnia && doDnia > data ? doDnia : data;
  const zakres = nieobecnosc ? dniZakresu(data, koniec) : [];
  const dniNieobecnosci = nieobecnosc ? zakres.filter((d) => czyDzienNieobecnosci(nieobecnosc, d) && !zajete.has(d)) : [];
  const pominiete = zakres.length - dniNieobecnosci.length;

  const kandydaci: RaportPracownika[] = useMemo(() => {
    if (!nieobecnosc) return [];
    return dniNieobecnosci.map((dzien, i) => ({
      id: edytowany?.id ?? `nowy-${i}`,
      pracownikId: pracownik.id,
      data: dzien,
      rodzaj: nieobecnosc,
      budowaId: '',
      grupaId: pracownik.grupaId,
      godziny: 0,
      godzinyPodstawowe: 0,
      nadgodziny: 0,
      stawki: stawkiObowiazujace(pracownik.stawki, pracownik.historiaStawek, dzien),
      wynagrodzenie: 0,
      kwota: 0,
      uwagi: uwagi.trim() || undefined,
      createdAt: edytowany?.createdAt ?? '9999',
    }));
  }, [nieobecnosc, dniNieobecnosci.join(), pracownik, edytowany?.id, edytowany?.createdAt, uwagi]); // eslint-disable-line react-hooks/exhaustive-deps

  const wyliczone = useMemo(() => {
    if (kandydaci.length === 0) return [];
    const wyniki = rozliczNieobecnosci(pracownik, [...inne, ...kandydaci]);
    return kandydaci.map((k) => ({ raport: k, wynik: wyniki.get(k.id)! }));
  }, [kandydaci, inne, pracownik]);
  const suma = {
    wynagrodzenie: round2(wyliczone.reduce((s, w) => s + w.wynik.wynagrodzenie, 0)),
    koszt: round2(wyliczone.reduce((s, w) => s + w.wynik.koszt, 0)),
  };
  const bank = bankR8(pracownik, inne);
  const saldoPo = round2(bank.saldo - (nieobecnosc === 'R8' ? dniNieobecnosci.length * GODZINY_R8 : 0));

  const bladFormularza = (): string => {
    if (!nieobecnosc) {
      if (!budowaId) return 'Wybierz budowę.';
      const kolizja = (zajete.get(data) ?? []).find((r) => rodzajRaportu(r) !== 'praca');
      if (kolizja) return `${dataKrotko(data)} jest już ${kolizja.rodzaj} – usuń albo zmień tamten raport.`;
      return praca.blad();
    }
    if (doDnia && doDnia < data) return '„Do dnia” nie może być przed datą początku.';
    if (!doDnia) {
      if (zajete.has(data)) return `${dataKrotko(data)} ma już raport. ${nieobecnosc} wpisuje się tylko w dzień bez innych raportów.`;
      if (!czyDzienNieobecnosci(nieobecnosc, data)) return `${nieobecnosc} wpisuje się tylko w dni robocze (pn–pt bez świąt).`;
    }
    if (dniNieobecnosci.length === 0) return 'W wybranym zakresie nie ma wolnych dni do wpisania.';
    if (nieobecnosc === 'R8' && !(dniNieobecnosci.every((_, i) => (kandydaci[i]?.stawki.stawka8h ?? 0) > 0))) {
      return 'R8 liczy się jako 8 × stawka 8h – uzupełnij stawkę 8h na karcie pracownika.';
    }
    return '';
  };

  const zapisz = async () => {
    const komunikat = bladFormularza();
    if (komunikat) { setBlad(komunikat); return; }
    setBlad('');
    setZapis(true);
    try {
      const dane: DaneRaportu[] = nieobecnosc
        ? wyliczone.map(({ raport, wynik }) => {
          const { id: _id, createdAt: _c, ...reszta } = raport;
          return { ...reszta, wynagrodzenie: wynik.wynagrodzenie, kwota: wynik.koszt };
        })
        : [{
          ...praca.daneRaportu(),
          pracownikId: pracownik.id,
          data,
          budowaId,
          sprzetId: edytowany?.sprzetId,
          uwagi: uwagi.trim() || undefined,
        }];
      if (edytowany) await zmienRaport(edytowany.id, dane[0]);
      else await dodajRaporty(dane);
      wstecz(powrot);
    } finally {
      setZapis(false);
    }
  };

  const usun = () => {
    if (!edytowany) return;
    potwierdzAkcje(
      'Usuń raport',
      `Usunąć raport z ${dataKrotko(edytowany.data)}?${zSprzetu ? ' Raport sprzętu z tego dnia zostanie bez zmian.' : ''}`,
      () => { void usunRaport(edytowany.id).then(() => wstecz(powrot)); },
    );
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}>
      <View>
        <Etykieta
          tekst="Rodzaj dnia"
          info={zSprzetu
            ? 'Raport powstał razem z raportem sprzętu (pracownik jako operator) – zostaje dniem pracy.'
            : 'Praca – godziny na budowie. UW, L4, R8, UB i NB nie mają budowy: koszt idzie na brygadę pracownika. Urlop bezpłatny (UB) i nieobecność (NB) to 0 zł.'}
        />
        <View style={stylFormularza.chipy}>
          {RODZAJE.filter((r) => !zSprzetu || r.id === 'praca').map((r) => (
            <Wybor
              key={r.id}
              zaznaczony={rodzaj === r.id}
              etykieta={r.etykieta}
              accessibilityLabel={`Rodzaj ${r.id === 'praca' ? 'praca' : r.id}`}
              onPress={() => { setRodzaj(r.id); setBlad(''); }}
            />
          ))}
        </View>
      </View>

      <View>
        <Etykieta
          tekst={nieobecnosc && !edytowany ? 'Od dnia' : 'Data'}
          info="Domyślnie dzień poprzedni. Data zapisuje się po OK w kalendarzu."
          prawy={<Text style={[styles.typDnia, { color: praca.podzial.wolny ? theme.colors.primary : theme.colors.textSecondary }]}>{opisDnia(data)}</Text>}
        />
        <KalendarzDnia wartosc={data} onZatwierdz={setData} />
      </View>

      {nieobecnosc && !edytowany ? (
        <View>
          <Etykieta
            tekst="Do dnia"
            info={nieobecnosc === 'L4'
              ? 'L4 obejmuje każdy dzień kalendarzowy w zakresie. Dni, które mają już raport, zostaną pominięte.'
              : `${nieobecnosc} wpisze się tylko w dni robocze z zakresu. Dni z raportem zostaną pominięte.`}
          />
          {doDnia ? (
            <View style={{ gap: ODSTEP.s }}>
              <KalendarzDnia wartosc={doDnia} min={data} onZatwierdz={setDoDnia} accessibilityLabel="Wybierz datę końca" />
              <Przycisk maly wariant="tekst" tekst="Tylko jeden dzień" onPress={() => setDoDnia(null)} />
            </View>
          ) : (
            <Przycisk maly wariant="drugi" ikona="plus" tekst="Kilka dni – wybierz koniec" onPress={() => setDoDnia(data)} />
          )}
        </View>
      ) : null}

      {!nieobecnosc ? (
        <>
          <View>
            <Etykieta tekst="Budowa" wymagane />
            {budowyKolejnosc.length === 0 ? (
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Najpierw dodaj budowę w menu Budowa.</Text>
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
          <PolaPracyPracownika praca={praca} theme={theme} />
        </>
      ) : (
        <Karta
          tytul={nazwaNieobecnosci(nieobecnosc)}
          podtytul={`Koszt na: ${nazwaBrygady(grupy, pracownik.grupaId)}`}
          podsumowanie={wyliczone.length > 1
            ? `${wyliczone.length} dni · wypłata ${formatLiczby(suma.wynagrodzenie)} zł · koszt ${formatLiczby(suma.koszt)} zł`
            : undefined}
        >
          {wyliczone.length === 0 ? (
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Wybierz dzień, w który można wpisać {nieobecnosc}.</Text>
          ) : wyliczone.map(({ raport, wynik }) => (
            <View key={raport.data} style={[styles.dzien, { borderColor: theme.colors.border }]}>
              <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]}>{dataKrotko(raport.data)}</Text>
              {wynik.linie.map((linia) => (
                <Text key={linia} style={[TYPOGRAFIA.opis, { color: theme.colors.text }]}>{linia}</Text>
              ))}
              <View style={styles.kwoty}>
                <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Wypłata {formatLiczby(wynik.wynagrodzenie)} zł</Text>
                <Text accessibilityLabel={`Koszt ${raport.data}`} style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]}>
                  Koszt {formatLiczby(wynik.koszt)} zł
                </Text>
              </View>
            </View>
          ))}
          {pominiete > 0 ? (
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
              Pominięte dni: {pominiete} ({nieobecnosc === 'L4' ? 'mają już raport' : 'wolne albo z raportem'}).
            </Text>
          ) : null}
          {nieobecnosc === 'R8' ? (
            <Text style={[TYPOGRAFIA.opis, { color: saldoPo < 0 ? theme.colors.danger : theme.colors.textSecondary, fontWeight: '700' }]}>
              Bank R8 po zapisie: {formatLiczby(saldoPo)} h{saldoPo < 0 ? ' – więcej niż odłożono na zimę' : ''}
            </Text>
          ) : null}
        </Karta>
      )}

      <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Komentarz" accessibilityLabel="Uwagi" />

      {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
      <Przycisk tekst={zapis ? 'Zapis…' : 'Zapisz'} accessibilityLabel="Zapisz raport" disabled={zapis} onPress={() => { void zapisz(); }} />
      {edytowany ? <Przycisk wariant="niebezpieczny" tekst="Usuń raport" onPress={usun} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  typDnia: { fontSize: 13, fontWeight: '800' },
  dzien: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: ODSTEP.s, gap: 2 },
  kwoty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
});
