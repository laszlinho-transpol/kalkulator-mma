import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { pokazKomunikat } from '../../utils/dialog';
import { udostepnijTekst } from '../../utils/kontaktyTelefonu';
import { oczyscNumer } from '../../utils/kontaktyTelefonuFormat';
import { Przycisk } from './Przycisk';

/** Zadzwoń / Kopiuj / Udostępnij – jednakowo przy każdym numerze w aplikacji. */
export function AkcjeTelefonu({ telefon, nazwa, opisDoUdostepnienia }: {
  telefon: string;
  nazwa: string;
  /** Tekst wysyłany przy udostępnianiu, np. „Jan Nowak (Kierownik), Kobylarnia: +48…”. */
  opisDoUdostepnienia: string;
}) {
  return (
    <View style={styles.rzad}>
      <Przycisk
        maly wariant="drugi" ikona="telefon" tekst="Zadzwoń" accessibilityLabel={`Zadzwoń do ${nazwa}`} style={styles.btn}
        onPress={() => {
          Linking.openURL(`tel:${oczyscNumer(telefon)}`).catch(() => pokazKomunikat('Błąd', 'Nie udało się rozpocząć połączenia.'));
        }}
      />
      <Przycisk
        maly wariant="drugi" ikona="kopiuj" tekst="Kopiuj" accessibilityLabel={`Kopiuj numer ${nazwa}`} style={styles.btn}
        onPress={async () => {
          await Clipboard.setStringAsync(oczyscNumer(telefon));
          pokazKomunikat('Skopiowano', `Numer ${telefon} jest w schowku.`);
        }}
      />
      <Przycisk
        maly wariant="drugi" ikona="udostepnij" tekst="Udostępnij" accessibilityLabel={`Udostępnij numer ${nazwa}`} style={styles.btn}
        onPress={async () => {
          if (await udostepnijTekst(opisDoUdostepnienia)) {
            pokazKomunikat('Skopiowano', 'Udostępnianie jest niedostępne – kontakt skopiowano do schowka.');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rzad: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, paddingHorizontal: 4 },
});
