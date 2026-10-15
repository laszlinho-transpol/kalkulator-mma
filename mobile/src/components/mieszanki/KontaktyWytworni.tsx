import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { AppTheme } from '../../constants/theme';
import type { KontaktWytworni } from '../../types';
import { Etykieta, Pole, Wiersz, Wybor, stylFormularza } from '../common/Formularz';
import { InfoTooltip } from '../common/InfoTooltip';
import { pokazKomunikat, potwierdzAkcje } from '../../utils/dialog';
import { czyMoznaWybracKontakt, udostepnijTekst, wybierzKontaktZTelefonu } from '../../utils/kontaktyTelefonu';
import { oczyscNumer } from '../../utils/kontaktyTelefonuFormat';

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface Props {
  theme: AppTheme;
  nazwaWytworni: string;
  kontakty: KontaktWytworni[];
  onZmien: (kontakty: KontaktWytworni[]) => Promise<void>;
}

export function KontaktyWytworni({ theme, nazwaWytworni, kontakty, onZmien }: Props) {
  const [edytowany, setEdytowany] = useState<string | null>(null);

  const zapisz = async (kontakt: KontaktWytworni) => {
    const jest = kontakty.some((k) => k.id === kontakt.id);
    await onZmien(jest ? kontakty.map((k) => (k.id === kontakt.id ? kontakt : k)) : [...kontakty, kontakt]);
    setEdytowany(null);
  };

  const opis = (k: KontaktWytworni) => `${k.nazwa}${k.stanowisko ? ` (${k.stanowisko})` : ''}, ${nazwaWytworni}: ${k.telefon}`;

  return (
    <View style={styles.sekcja}>
      <View style={styles.naglowek}>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Numery kontaktowe</Text>
        <InfoTooltip tresc="Plusem dodasz numer z kontaktów telefonu albo wpiszesz go ręcznie. Przyciski pod numerem: zadzwoń, kopiuj, udostępnij." />
        {edytowany !== 'nowy' ? (
          <TouchableOpacity
            accessibilityLabel="Dodaj kontakt"
            onPress={() => setEdytowany('nowy')}
            style={[styles.plus, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.plusTekst}>+</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {kontakty.length === 0 && edytowany !== 'nowy' ? (
        <Text style={{ color: theme.colors.textSecondary }}>Brak numerów. Dodaj pierwszy plusem.</Text>
      ) : null}

      {kontakty.map((k) => (edytowany === k.id ? (
        <FormularzKontaktu key={k.id} theme={theme} poczatek={k} onAnuluj={() => setEdytowany(null)} onZapisz={zapisz} />
      ) : (
        <View key={k.id} style={[styles.kontakt, { borderColor: theme.colors.border }]}>
          <View style={styles.naglowek}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nazwa, { color: theme.colors.text }]} numberOfLines={1}>{k.nazwa || 'Bez nazwy'}</Text>
              {k.stanowisko ? <Text style={{ color: theme.colors.textSecondary }} numberOfLines={1}>{k.stanowisko}</Text> : null}
            </View>
            <TouchableOpacity accessibilityLabel={`Edytuj kontakt ${k.nazwa}`} onPress={() => setEdytowany(k.id)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Edytuj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Usuń kontakt ${k.nazwa}`}
              onPress={() => potwierdzAkcje('Usuń kontakt', `Usunąć ${k.nazwa || k.telefon}?`, () => { void onZmien(kontakty.filter((x) => x.id !== k.id)); })}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Usuń</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.numer, { color: theme.colors.text }]} selectable>{k.telefon}</Text>
          <View style={styles.akcje}>
            <Akcja theme={theme} etykieta="Zadzwoń" opis={`Zadzwoń do ${k.nazwa}`} onPress={() => {
              Linking.openURL(`tel:${oczyscNumer(k.telefon)}`).catch(() => pokazKomunikat('Błąd', 'Nie udało się rozpocząć połączenia.'));
            }} />
            <Akcja theme={theme} etykieta="Kopiuj" opis={`Kopiuj numer ${k.nazwa}`} onPress={async () => {
              await Clipboard.setStringAsync(oczyscNumer(k.telefon));
              pokazKomunikat('Skopiowano', `Numer ${k.telefon} jest w schowku.`);
            }} />
            <Akcja theme={theme} etykieta="Udostępnij" opis={`Udostępnij numer ${k.nazwa}`} onPress={async () => {
              if (await udostepnijTekst(opis(k))) pokazKomunikat('Skopiowano', 'Udostępnianie jest niedostępne – kontakt skopiowano do schowka.');
            }} />
          </View>
        </View>
      )))}

      {edytowany === 'nowy' ? (
        <FormularzKontaktu theme={theme} onAnuluj={() => setEdytowany(null)} onZapisz={zapisz} />
      ) : null}
    </View>
  );
}

function Akcja({ theme, etykieta, opis, onPress }: { theme: AppTheme; etykieta: string; opis: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityLabel={opis}
      onPress={onPress}
      style={[styles.akcja, { borderColor: theme.colors.info, backgroundColor: `${theme.colors.info}12` }]}
    >
      <Text style={{ color: theme.colors.info, fontWeight: '800', fontSize: 13 }}>{etykieta}</Text>
    </TouchableOpacity>
  );
}

function FormularzKontaktu({ theme, poczatek, onAnuluj, onZapisz }: {
  theme: AppTheme;
  poczatek?: KontaktWytworni;
  onAnuluj: () => void;
  onZapisz: (kontakt: KontaktWytworni) => Promise<void>;
}) {
  const [nazwa, setNazwa] = useState(poczatek?.nazwa ?? '');
  const [stanowisko, setStanowisko] = useState(poczatek?.stanowisko ?? '');
  const [telefon, setTelefon] = useState(poczatek?.telefon ?? '');
  const [numeryZKontaktu, setNumeryZKontaktu] = useState<string[]>([]);
  const [blad, setBlad] = useState('');

  const zKontaktow = async () => {
    try {
      const wybrany = await wybierzKontaktZTelefonu();
      if (!wybrany) return;
      if (wybrany.nazwa) setNazwa(wybrany.nazwa);
      if (wybrany.stanowisko) setStanowisko(wybrany.stanowisko);
      if (wybrany.telefony[0]) setTelefon(wybrany.telefony[0]);
      setNumeryZKontaktu(wybrany.telefony.length > 1 ? wybrany.telefony : []);
      if (wybrany.telefony.length === 0) setBlad('Ten kontakt nie ma numeru telefonu – wpisz go ręcznie.');
      else setBlad('');
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się otworzyć kontaktów.');
    }
  };

  const zapisz = async () => {
    if (oczyscNumer(telefon).replace('+', '').length < 3) { setBlad('Wpisz numer telefonu.'); return; }
    setBlad('');
    await onZapisz({
      id: poczatek?.id ?? generujId(),
      nazwa: nazwa.trim(),
      stanowisko: stanowisko.trim() || undefined,
      telefon: telefon.trim(),
    });
  };

  return (
    <View style={[styles.formularz, { borderColor: theme.colors.primary }]}>
      {czyMoznaWybracKontakt() ? (
        <TouchableOpacity
          accessibilityLabel="Wybierz z kontaktów telefonu"
          onPress={zKontaktow}
          style={[styles.zKontaktow, { borderColor: theme.colors.info, backgroundColor: `${theme.colors.info}12` }]}
        >
          <Text style={{ color: theme.colors.info, fontWeight: '800' }}>Z kontaktów telefonu</Text>
        </TouchableOpacity>
      ) : null}
      <Wiersz>
        <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} placeholder="np. Jan Nowak" accessibilityLabel="Nazwa kontaktu" />
        <Pole etykieta="Stanowisko" value={stanowisko} onChangeText={setStanowisko} placeholder="np. Kierownik" accessibilityLabel="Stanowisko kontaktu" />
      </Wiersz>
      <Pole etykieta="Numer telefonu" wymagane value={telefon} onChangeText={setTelefon} placeholder="+48 600 100 200" accessibilityLabel="Numer telefonu" klawiatura="phone-pad" />
      {numeryZKontaktu.length > 0 ? (
        <>
          <Etykieta tekst="Numery tego kontaktu" />
          <View style={stylFormularza.chipy}>
            {numeryZKontaktu.map((n) => <Wybor key={n} zaznaczony={n === telefon} etykieta={n} onPress={() => setTelefon(n)} />)}
          </View>
        </>
      ) : null}
      {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
      <View style={styles.przyciski}>
        <TouchableOpacity onPress={onAnuluj} style={[styles.btn, { borderColor: theme.colors.border, borderWidth: 1 }]}>
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Anuluj</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Zapisz kontakt" onPress={zapisz} style={[styles.btn, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: '#1A1A1A', fontWeight: '800' }}>Zapisz kontakt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sekcja: { gap: 8 },
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tytul: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  plus: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  plusTekst: { color: '#1A1A1A', fontSize: 22, fontWeight: '800', lineHeight: 24 },
  kontakt: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  nazwa: { fontSize: 15, fontWeight: '800' },
  numer: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  akcje: { flexDirection: 'row', gap: 6 },
  akcja: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  formularz: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  zKontaktow: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  przyciski: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
});
