import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { Etykieta, Pole, Wiersz, Wybor, stylFormularza } from '../common/Formularz';
import type { AppTheme } from '../../constants/theme';
import { parsujLiczbePola, tekstZapisanejStawki } from '../../budzet/rozliczenie';
import { POLA_WYNAGRODZENIA, type PoleWynagrodzenia, type StawkiPracownika } from '../../budzet/pracownicy';
import { wstecz } from '../../budzet/nawigacja';
import { useGrupyPracownikowStore } from '../../stores/grupyPracownikowStore';
import { czyMoznaWybracKontakt, wybierzKontaktZTelefonu } from '../../utils/kontaktyTelefonu';
import { Przycisk } from '../ui/Przycisk';

export interface DanePracownikaFormularza {
  nazwisko: string;
  imie: string;
  telefon?: string;
  grupaNazwa: string;
  stawki: StawkiPracownika;
}

const PRZYKLADY: Record<PoleWynagrodzenia, string> = {
  stawka8h: 'np. 45',
  nadgodzina: 'np. 60',
  kierowca: 'np. 30',
  pasazer: 'np. 20',
  zus: 'np. 1,4',
};

interface Props {
  theme: AppTheme;
  tytul: string;
  wsteczDo: string;
  poczatek?: { nazwisko: string; imie: string; telefon?: string; grupa?: string; stawki: StawkiPracownika };
  onZapisz: (dane: DanePracownikaFormularza) => Promise<void>;
}

export function FormularzPracownika({ theme, tytul, wsteczDo, poczatek, onZapisz }: Props) {
  const insets = useSafeAreaInsets();
  const grupy = useGrupyPracownikowStore((s) => s.grupy);
  const [nazwisko, setNazwisko] = useState(poczatek?.nazwisko ?? '');
  const [imie, setImie] = useState(poczatek?.imie ?? '');
  const [telefon, setTelefon] = useState(poczatek?.telefon ?? '');
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
    if (!nazwisko.trim()) { setBlad('Wpisz nazwisko.'); return; }
    if (!imie.trim()) { setBlad('Wpisz imię.'); return; }
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
        telefon: telefon.trim() || undefined,
        grupaNazwa: grupa,
        stawki,
      });
    } finally {
      setZapis(false);
    }
  };

  const zKontaktow = async () => {
    try {
      const wybrany = await wybierzKontaktZTelefonu();
      if (!wybrany) return;
      if (wybrany.telefony[0]) setTelefon(wybrany.telefony[0]);
      else setBlad('Ten kontakt nie ma numeru telefonu – wpisz go ręcznie.');
      if (!nazwisko.trim() && !imie.trim() && wybrany.nazwa) {
        const [pierwsze, ...reszta] = wybrany.nazwa.trim().split(/\s+/);
        setImie(pierwsze ?? '');
        setNazwisko(reszta.join(' '));
      }
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się otworzyć kontaktów.');
    }
  };

  const polaStawek = (ids: PoleWynagrodzenia[]) => ids.map((id) => {
    const pole = POLA_WYNAGRODZENIA.find((p) => p.id === id)!;
    return (
      <Pole
        key={id}
        etykieta={pole.nazwa}
        info={pole.podpowiedz}
        jednostka={pole.mnoznik ? '×' : pole.jednostka}
        value={stawkiTekst[id]}
        onChangeText={(tekst) => setStawkiTekst((prev) => ({ ...prev, [id]: tekst }))}
        placeholder={PRZYKLADY[id]}
        accessibilityLabel={pole.nazwa}
        liczba
      />
    );
  });

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul={tytul} lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(wsteczDo) }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}
      >
        <Wiersz>
          <Pole etykieta="Nazwisko" wymagane value={nazwisko} onChangeText={setNazwisko} placeholder="Kowalski" />
          <Pole etykieta="Imię" wymagane value={imie} onChangeText={setImie} placeholder="Jan" />
        </Wiersz>
        <Wiersz>
          <Pole
            etykieta="Telefon"
            info="Na karcie pracownika numer ma przyciski: zadzwoń, kopiuj, udostępnij."
            value={telefon}
            onChangeText={setTelefon}
            placeholder="+48 600 100 200"
            accessibilityLabel="Telefon pracownika"
            klawiatura="phone-pad"
          />
          {czyMoznaWybracKontakt() ? (
            <View style={styles.zKontaktow}>
              <Przycisk wariant="drugi" ikona="telefon" tekst="Z kontaktów" accessibilityLabel="Wybierz z kontaktów telefonu" onPress={zKontaktow} />
            </View>
          ) : <View />}
        </Wiersz>
        <Pole
          etykieta="Grupa"
          info="Nowa nazwa tworzy grupę w bazie. Istniejącą wybierzesz z podpowiedzi pod polem."
          value={grupa}
          onChangeText={setGrupa}
          placeholder="np. Brygada asfaltowa"
        />
        {podpowiedzi.length > 0 ? (
          <View style={stylFormularza.chipy}>
            {podpowiedzi.map((g) => (
              <Wybor
                key={g.id}
                zaznaczony={g.nazwa.toLowerCase() === fraza}
                etykieta={`${g.ulubiona ? '★ ' : ''}${g.nazwa}`}
                accessibilityLabel={`Podpowiedź grupy ${g.nazwa}`}
                onPress={() => setGrupa(g.nazwa)}
              />
            ))}
          </View>
        ) : null}

        <Etykieta tekst="WYNAGRODZENIE" info="Okres obowiązywania stawek ustawisz w zakładce Historia stawek na karcie pracownika." />
        <Wiersz>{polaStawek(['stawka8h', 'nadgodzina'])}</Wiersz>
        <Wiersz>{polaStawek(['kierowca', 'pasazer'])}</Wiersz>
        <Wiersz>{[...polaStawek(['zus']), <View key="pusto" />]}</Wiersz>

        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="Zapisz pracownika"
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
  zKontaktow: { flex: 1, justifyContent: 'flex-end' },
});
