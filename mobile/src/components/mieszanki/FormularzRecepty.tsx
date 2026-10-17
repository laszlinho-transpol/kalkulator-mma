import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { Etykieta, Pole, Wiersz, Wybor, stylFormularza } from '../common/Formularz';
import type { AppTheme } from '../../constants/theme';
import { wstecz } from '../../budzet/nawigacja';
import { parsujLiczbePola, tekstZapisanejStawki } from '../../budzet/rozliczenie';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import { PODPOWIEDZI_KR, bladKategoriiRuchu, normalizujKategorieRuchu, rodzajMieszanki } from '../../mieszanki/kolejnosc';

export interface DaneReceptyFormularza {
  wytworniaId?: string;
  rodzaj: string;
  nrRecepty?: string;
  kategoriaRuchu?: string;
  ciezarObjetosciowy: number;
  cena?: number;
}

interface Props {
  theme: AppTheme;
  tytul: string;
  wsteczDo: string;
  poczatek?: Partial<DaneReceptyFormularza>;
  onZapisz: (dane: DaneReceptyFormularza) => Promise<void>;
}

export function FormularzRecepty({ theme, tytul, wsteczDo, poczatek, onZapisz }: Props) {
  const insets = useSafeAreaInsets();
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const [wytworniaId, setWytworniaId] = useState(poczatek?.wytworniaId ?? '');
  const [rodzaj, setRodzaj] = useState(poczatek?.rodzaj ?? '');
  const [nrRecepty, setNrRecepty] = useState(poczatek?.nrRecepty ?? '');
  const [kr, setKr] = useState(normalizujKategorieRuchu(poczatek?.kategoriaRuchu) ?? '');
  const [ciezar, setCiezar] = useState(poczatek?.ciezarObjetosciowy ? String(poczatek.ciezarObjetosciowy).replace('.', ',') : '');
  const [cena, setCena] = useState(tekstZapisanejStawki(poczatek?.cena));
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);

  const zapisz = async () => {
    if (!rodzaj.trim()) { setBlad('Podaj rodzaj mieszanki (np. AC22P).'); return; }
    const bladKr = bladKategoriiRuchu(kr);
    if (bladKr) { setBlad(bladKr); return; }
    const c = parsujLiczbePola(ciezar);
    if (c == null || c <= 0 || c > 5) { setBlad('Podaj prawidłowy ciężar objętościowy (np. 2,455).'); return; }
    let kwota: number | undefined;
    if (cena.trim()) {
      const p = parsujLiczbePola(cena);
      if (p == null || p <= 0) { setBlad('Cena przyjmuje liczbę większą od zera.'); return; }
      kwota = p;
    }
    setBlad('');
    setZapis(true);
    try {
      await onZapisz({
        wytworniaId: wytworniaId || undefined,
        rodzaj: rodzaj.trim().toUpperCase(),
        nrRecepty: nrRecepty.trim() || undefined,
        kategoriaRuchu: normalizujKategorieRuchu(kr),
        ciezarObjetosciowy: Math.round(c * 1000) / 1000,
        cena: kwota,
      });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul={tytul} lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(wsteczDo) }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <Etykieta tekst="Wytwórnia" info="Bez wytwórni recepta trafi do grupy „Bez wytwórni”." />
        <View style={stylFormularza.chipy}>
          <Wybor zaznaczony={!wytworniaId} etykieta="Bez wytwórni" onPress={() => setWytworniaId('')} />
          {wytwornie.map((w) => (
            <Wybor key={w.id} zaznaczony={wytworniaId === w.id} etykieta={w.nazwa} accessibilityLabel={`Wytwórnia ${w.nazwa}`} onPress={() => setWytworniaId(w.id)} />
          ))}
        </View>
        <Wiersz>
          <Pole etykieta="Rodzaj" wymagane info="Typ mieszanki, np. AC22P." value={rodzaj} onChangeText={(t) => setRodzaj(t.toUpperCase())} placeholder="AC22P" accessibilityLabel="Rodzaj mieszanki" />
          <Pole etykieta="Nr recepty" info="Numer recepty wytwórni (opcjonalnie)." value={nrRecepty} onChangeText={setNrRecepty} placeholder="—" accessibilityLabel="Nr recepty" />
        </Wiersz>
        <View>
          <Pole
            etykieta="Kategoria ruchu"
            wymagane
            info="Wpisz samą wartość, np. 1-2. W całej aplikacji recepta pokazuje się jako rodzaj + KR, np. AC16W KR1-2. Kategoria ustala też kolejność recept o tym samym rodzaju – od najwyższej."
            value={kr}
            onChangeText={(t) => setKr(t.toUpperCase().replace(/KR/g, '').replace(/\s+/g, ''))}
            placeholder="1-2"
            accessibilityLabel="Kategoria ruchu"
          />
          <View style={[stylFormularza.chipy, { marginTop: 6 }]}>
            {PODPOWIEDZI_KR.map((k) => (
              <Wybor key={k} zaznaczony={kr === k} etykieta={`KR${k}`} accessibilityLabel={`Kategoria KR${k}`} onPress={() => setKr(kr === k ? '' : k)} />
            ))}
          </View>
          {rodzaj.trim() && normalizujKategorieRuchu(kr) ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
              Nazwa w aplikacji: {rodzajMieszanki({ rodzaj: rodzaj.trim().toUpperCase(), kategoriaRuchu: kr })}
            </Text>
          ) : null}
        </View>
        <Wiersz>
          <Pole etykieta="Ciężar obj." wymagane info="Ciężar objętościowy – masa po zagęszczeniu, np. 2,455 t/m³." jednostka="t/m³" value={ciezar} onChangeText={setCiezar} placeholder="2,455" accessibilityLabel="Ciężar objętościowy" liczba />
          <Pole etykieta="Cena" info="Cena netto za tonę. Zmiany w czasie zapiszesz w zakładce Historia ceny na karcie recepty." jednostka="zł/t" value={cena} onChangeText={setCena} placeholder="np. 310" accessibilityLabel="Cena recepty" liczba />
        </Wiersz>
        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="Zapisz receptę"
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
});
