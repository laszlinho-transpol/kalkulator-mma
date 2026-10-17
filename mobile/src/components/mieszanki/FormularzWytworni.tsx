import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { Pole, stylFormularza } from '../common/Formularz';
import { MapaLokalizacji } from './MapaLokalizacji';
import type { AppTheme } from '../../constants/theme';
import { wstecz } from '../../budzet/nawigacja';
import { czyKrotkiLinkMaps, czyLinkGoogleMaps } from '../../utils/mapaLokalizacji';
import { adresZLinkuMaps } from '../../utils/rozwinLinkMaps';

export interface DaneWytworniFormularza {
  nazwa: string;
  linkGoogleMaps?: string;
  adresMapy?: string;
}

interface Props {
  theme: AppTheme;
  tytul: string;
  wsteczDo: string;
  poczatek?: DaneWytworniFormularza;
  onZapisz: (dane: DaneWytworniFormularza) => Promise<void>;
}

export function FormularzWytworni({ theme, tytul, wsteczDo, poczatek, onZapisz }: Props) {
  const insets = useSafeAreaInsets();
  const [nazwa, setNazwa] = useState(poczatek?.nazwa ?? '');
  const [link, setLink] = useState(poczatek?.linkGoogleMaps ?? '');
  const [adres, setAdres] = useState(poczatek?.adresMapy ?? '');
  const [odczyt, setOdczyt] = useState(false);
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);
  const adresZLinku = useRef<string | null>(poczatek?.adresMapy ?? null);

  useEffect(() => {
    const tekst = link.trim();
    if (!tekst || !czyLinkGoogleMaps(tekst)) return undefined;
    let aktualne = true;
    const t = setTimeout(async () => {
      setOdczyt(true);
      const wynik = await adresZLinkuMaps(tekst);
      if (!aktualne) return;
      setOdczyt(false);
      if (wynik) {
        setAdres((obecny) => (!obecny.trim() || obecny === adresZLinku.current ? wynik : obecny));
        adresZLinku.current = wynik;
      }
    }, 500);
    return () => { aktualne = false; clearTimeout(t); };
  }, [link]);

  const krotkiWPrzegladarce = Platform.OS === 'web' && czyKrotkiLinkMaps(link) && !adres.trim();

  const zapisz = async () => {
    if (!nazwa.trim()) { setBlad('Podaj nazwę wytwórni.'); return; }
    const tekstLinku = link.trim();
    if (tekstLinku && !/^https?:\/\//i.test(tekstLinku)) { setBlad('Link lokalizacji musi zaczynać się od https://'); return; }
    setBlad('');
    setZapis(true);
    try {
      let adresMapy = adres.trim();
      if (!adresMapy && tekstLinku) adresMapy = (await adresZLinkuMaps(tekstLinku)) ?? '';
      await onZapisz({ nazwa: nazwa.trim(), linkGoogleMaps: tekstLinku || undefined, adresMapy: adresMapy || undefined });
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul={tytul} lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(wsteczDo) }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <Pole etykieta="Nazwa wytwórni" wymagane value={nazwa} onChangeText={setNazwa} placeholder="np. Kobylarnia S.A." />
        <Pole
          etykieta="Link Google Maps"
          info="W Google Maps wybierz miejsce → Udostępnij → Kopiuj link i wklej tutaj (np. https://maps.app.goo.gl/…)."
          value={link}
          onChangeText={setLink}
          placeholder="https://maps.app.goo.gl/…"
          accessibilityLabel="Link Google Maps"
          klawiatura="url"
        />
        <Pole
          etykieta={odczyt ? 'Adres na mapie · odczytywanie…' : 'Adres na mapie'}
          info="Uzupełnia się z linku. Możesz też wpisać adres, nazwę miejsca albo współrzędne (np. 53.0855,18.1497) – według tego rysuje się mapa."
          value={adres}
          onChangeText={setAdres}
          placeholder="np. Zakole, 86-061 Kobylarnia"
          accessibilityLabel="Adres na mapie"
        />
        {krotkiWPrzegladarce ? (
          <Text style={[styles.uwaga, { color: theme.colors.warning }]}>
            W przeglądarce skróconego linku nie da się odczytać. Wpisz adres powyżej – w aplikacji na telefonie uzupełni się sam.
          </Text>
        ) : null}
        <MapaLokalizacji theme={theme} adres={adres.trim() || undefined} link={link.trim() || undefined} />

        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="Zapisz wytwórnię"
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
  uwaga: { fontSize: 13, fontWeight: '600' },
});
