import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import type { AppTheme } from '../../constants/theme';
import { adresOsadzonejMapy, linkWyszukiwaniaMaps } from '../../utils/mapaLokalizacji';
import { pokazKomunikat } from '../../utils/dialog';

interface Props {
  theme: AppTheme;
  adres?: string;
  link?: string;
  wysokosc?: number;
}

export function MapaLokalizacji({ theme, adres, link, wysokosc = 200 }: Props) {
  const osadzona = adres ? adresOsadzonejMapy(adres) : null;
  const doOtwarcia = link?.trim() || (adres ? linkWyszukiwaniaMaps(adres) : '');
  if (!osadzona && !doOtwarcia) return null;

  const otworz = () => {
    Linking.openURL(doOtwarcia).catch(() => pokazKomunikat('Błąd', 'Nie udało się otworzyć mapy.'));
  };
  const kopiuj = async () => {
    await Clipboard.setStringAsync(doOtwarcia);
    pokazKomunikat('Skopiowano', 'Link do lokalizacji jest w schowku.');
  };

  return (
    <View style={styles.kontener}>
      {osadzona ? (
        <View style={[styles.mapa, { height: wysokosc, borderColor: theme.colors.border }]}>
          {Platform.OS === 'web'
            ? React.createElement('iframe', {
              src: osadzona,
              title: 'Mapa lokalizacji',
              loading: 'lazy',
              referrerPolicy: 'no-referrer-when-downgrade',
              style: { border: 0, width: '100%', height: '100%' },
            })
            : <WebView source={{ uri: osadzona }} style={{ flex: 1 }} scrollEnabled={false} nestedScrollEnabled />}
        </View>
      ) : null}
      <View style={styles.akcje}>
        <TouchableOpacity accessibilityLabel="Otwórz w Google Maps" style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={otworz}>
          <Text style={styles.btnTekst}>Otwórz w Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Kopiuj link lokalizacji"
          style={[styles.btn, { borderColor: theme.colors.info, borderWidth: 1, backgroundColor: `${theme.colors.info}15` }]}
          onPress={kopiuj}
        >
          <Text style={[styles.btnTekst, { color: theme.colors.info }]}>Kopiuj link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kontener: { gap: 8 },
  mapa: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  akcje: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnTekst: { color: '#1A1A1A', fontWeight: '800', fontSize: 13 },
});
