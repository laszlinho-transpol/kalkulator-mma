import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Etykieta, Pole, Wiersz } from '../common/Formularz';
import { etykietaZakresu } from '../common/KalendarzZakresu';
import type { AppTheme } from '../../constants/theme';
import { formatLiczby } from '../../utils/calculations';
import { okresNaDzien, parsujLiczbePola, stawkiObowiazujace } from '../../budzet/rozliczenie';
import {
  POLA_WYNAGRODZENIA, bladPracyDnia, kwotaPracownika, liniePodsumowania, podzialGodzin,
  type Dojazd, type PoleWynagrodzenia, type StawkiPracownika,
} from '../../budzet/pracownicy';
import type { Pracownik, RaportPracownika } from '../../budzet/typy';

export type DaneRaportuPracy = Omit<RaportPracownika, 'id' | 'createdAt' | 'pracownikId' | 'data' | 'budowaId' | 'uwagi' | 'sprzetId'>;

/** Stan formularza godzin i stawek pracownika na dany dzień. Stawki podpowiadają się z karty (z okresu obowiązującego w dniu). */
export function usePracaPracownika(pracownik: Pracownik | undefined, data: string) {
  const [godzinyTekst, setGodzinyTekst] = useState('8');
  const [kierowcaTekst, setKierowcaTekst] = useState('');
  const [pasazerTekst, setPasazerTekst] = useState('');
  const [delegacja, setDelegacja] = useState(false);
  const [stawkiTekst, setStawkiTekst] = useState<Partial<Record<PoleWynagrodzenia, string>>>({});
  const dotkniete = useRef(new Set<PoleWynagrodzenia>());

  const obowiazujace = useMemo(
    () => (pracownik ? stawkiObowiazujace(pracownik.stawki, pracownik.historiaStawek, data) : {} as StawkiPracownika),
    [pracownik, data],
  );
  const okres = pracownik ? okresNaDzien(pracownik.historiaStawek, data) : undefined;

  useEffect(() => {
    dotkniete.current.clear();
  }, [pracownik?.id]);

  useEffect(() => {
    setStawkiTekst((prev) => {
      const next = { ...prev };
      for (const pole of POLA_WYNAGRODZENIA) {
        if (dotkniete.current.has(pole.id)) continue;
        const stawka = obowiazujace[pole.id];
        next[pole.id] = stawka ? String(stawka).replace('.', ',') : '';
      }
      return next;
    });
  }, [obowiazujace]);

  const stawki: StawkiPracownika = {};
  for (const pole of POLA_WYNAGRODZENIA) {
    const liczba = parsujLiczbePola(stawkiTekst[pole.id] ?? '');
    if (liczba != null && liczba > 0) stawki[pole.id] = liczba;
  }
  const godziny = parsujLiczbePola(godzinyTekst) ?? 0;
  const podzial = podzialGodzin(data, godziny);
  const godzinyJazdy = (tekst: string) => (tekst.trim() ? parsujLiczbePola(tekst) ?? Number.NaN : 0);
  const dojazd: Dojazd = { kierowca: godzinyJazdy(kierowcaTekst), pasazer: godzinyJazdy(pasazerTekst) };
  const dojazdLiczony: Dojazd = {
    kierowca: Number.isFinite(dojazd.kierowca) ? dojazd.kierowca : 0,
    pasazer: Number.isFinite(dojazd.pasazer) ? dojazd.pasazer : 0,
  };
  const wynik = kwotaPracownika(stawki, podzial.podstawowe, podzial.nadgodziny, dojazdLiczony, delegacja);

  const blad = (): string => {
    const zly = POLA_WYNAGRODZENIA.find((pole) => (stawkiTekst[pole.id] ?? '').trim() && !stawki[pole.id]);
    if (zly) return `Pole „${zly.nazwa}” przyjmuje liczbę większą od zera.`;
    return bladPracyDnia(stawki, { godziny, podstawowe: podzial.podstawowe, nadgodziny: podzial.nadgodziny, dojazd, delegacja });
  };

  const daneRaportu = (): DaneRaportuPracy => ({
    godziny,
    godzinyPodstawowe: podzial.podstawowe,
    nadgodziny: podzial.nadgodziny,
    godzinyKierowca: dojazdLiczony.kierowca || undefined,
    godzinyPasazer: dojazdLiczony.pasazer || undefined,
    delegacja: delegacja || undefined,
    stawki,
    wynagrodzenie: wynik.wynagrodzenie,
    kwota: wynik.koszt,
  });

  const ustawStawke = (pole: PoleWynagrodzenia, tekst: string) => {
    dotkniete.current.add(pole);
    setStawkiTekst((prev) => ({ ...prev, [pole]: tekst }));
  };

  return {
    godzinyTekst, setGodzinyTekst, kierowcaTekst, setKierowcaTekst, pasazerTekst, setPasazerTekst,
    delegacja, setDelegacja, stawkiTekst, ustawStawke,
    stawki, podzial, dojazd: dojazdLiczony, wynik, okres, blad, daneRaportu,
  };
}

export type PracaPracownika = ReturnType<typeof usePracaPracownika>;

const UKLAD_STAWEK: PoleWynagrodzenia[][] = [['stawka8h', 'nadgodzina'], ['kierowca', 'pasazer'], ['zus', 'delegacja']];

export function PolaPracyPracownika({ praca, theme, etykietaKwoty = 'Kwota raportu' }: {
  praca: PracaPracownika;
  theme: AppTheme;
  /** Etykieta dostępności kwoty – inna, gdy formularz siedzi w raporcie sprzętu. */
  etykietaKwoty?: string;
}) {
  const { podzial, stawki, wynik, okres } = praca;
  return (
    <>
      <Wiersz>
        <Pole
          etykieta="Praca"
          info="Pn–pt do 8 h liczy się stawką 8h, każda godzina ponad 8 h to nadgodzina. W soboty, niedziele i święta każda godzina to nadgodzina."
          jednostka="h"
          value={praca.godzinyTekst}
          onChangeText={praca.setGodzinyTekst}
          accessibilityLabel="Godziny pracy"
          liczba
        />
        <Pole
          etykieta="Kierowca"
          info="Godziny jazdy w tym dniu. Można wpisać kierowcę i pasażera naraz, gdy pracownik prowadził w jedną stronę, a jechał jako pasażer w drugą."
          jednostka="h"
          value={praca.kierowcaTekst}
          onChangeText={praca.setKierowcaTekst}
          accessibilityLabel="Godziny kierowcy"
          placeholder="0"
          liczba
        />
        <Pole
          etykieta="Pasażer"
          jednostka="h"
          value={praca.pasazerTekst}
          onChangeText={praca.setPasazerTekst}
          accessibilityLabel="Godziny pasażera"
          placeholder="0"
          liczba
        />
      </Wiersz>
      <Text style={[styles.opis, { color: theme.colors.text }]}>
        Stawka 8h: {formatLiczby(podzial.podstawowe)} h · nadgodziny: {formatLiczby(podzial.nadgodziny)} h
      </Text>

      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: praca.delegacja }}
        accessibilityLabel="Delegacja"
        onPress={() => praca.setDelegacja(!praca.delegacja)}
        style={[styles.check, { borderColor: praca.delegacja ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card }]}
      >
        <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>{praca.delegacja ? '☑' : '☐'}</Text>
        <Text style={[styles.checkTekst, { color: theme.colors.text }]}>Delegacja</Text>
        <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
          {stawki.delegacja ? `${formatLiczby(stawki.delegacja)} zł` : 'brak stawki'}
        </Text>
      </TouchableOpacity>

      <Etykieta
        tekst="STAWKI"
        info={okres
          ? `Stawki z okresu ${etykietaZakresu(okres.od, okres.do)}. Można je zmienić tylko w tym raporcie.`
          : 'Stawki z karty pracownika. Można je zmienić tylko w tym raporcie.'}
      />
      {UKLAD_STAWEK.map((ids) => (
        <Wiersz key={ids.join()}>
          {ids.map((pid) => {
            const pole = POLA_WYNAGRODZENIA.find((p) => p.id === pid)!;
            return (
              <Pole
                key={pid}
                etykieta={pole.nazwa}
                jednostka={pole.mnoznik ? '×' : pole.jednostka}
                value={praca.stawkiTekst[pole.id] ?? ''}
                onChangeText={(tekst) => praca.ustawStawke(pole.id, tekst)}
                accessibilityLabel={`Stawka ${pole.nazwa}`}
                liczba
              />
            );
          })}
        </Wiersz>
      ))}

      <View style={[styles.kwotaKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {liniePodsumowania(stawki, podzial.podstawowe, podzial.nadgodziny, praca.dojazd, wynik).map((linia) => (
          <Text key={linia} style={[styles.opis, { color: theme.colors.text }]}>{linia}</Text>
        ))}
        <View style={styles.kosztWiersz}>
          <Text style={[styles.kosztEtykieta, { color: theme.colors.textSecondary }]}>Koszt pracodawcy</Text>
          <Text accessibilityLabel={etykietaKwoty} style={[styles.kwota, { color: theme.colors.text }]}>{formatLiczby(wynik.koszt)} zł</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  opis: { fontSize: 13, lineHeight: 18 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  ptaszek: { fontSize: 20, fontWeight: '800' },
  checkTekst: { fontSize: 15, fontWeight: '700', flex: 1 },
  kwotaKarta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  kosztWiersz: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  kosztEtykieta: { fontSize: 13, fontWeight: '700' },
  kwota: { fontSize: 24, fontWeight: '800' },
});
