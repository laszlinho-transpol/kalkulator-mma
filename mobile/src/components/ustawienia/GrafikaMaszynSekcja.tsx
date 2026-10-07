import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import type { AppTheme } from '../../constants/theme';
import { useGrafikaMaszynStore } from '../../stores/grafikaMaszynStore';
import * as DocumentPicker from 'expo-document-picker';
import { oczyscSvg, type WygladMaszyny } from '../../utils/grafikaMaszyn';
import { RysunekMaszyny, wymiaryMaszyny } from '../sketch/MaszynyObmiaru';
import { InfoTooltip } from '../common/InfoTooltip';

const WYGLADY: { id: WygladMaszyny; nazwa: string; opis: string }[] = [
  { id: 'obmiar', nazwa: 'Obmiar z góry', opis: 'Uproszczony rysunek z obmiaru PZT' },
  { id: 'bok', nazwa: 'Widok z boku', opis: 'Rozkładarka i wywrotka z boku' },
];

function Podglad({ rodzaj, numer }: { rodzaj: 'rozkladarka' | 'auto'; numer?: number }) {
  const { szer, dl } = wymiaryMaszyny(52, rodzaj);
  const w = Math.ceil(dl + 16);
  const h = Math.ceil(szer + 16);
  return (
    <Svg width={w} height={h}>
      <G transform={`translate(${w / 2},${h / 2})`}>
        <RysunekMaszyny rodzaj={rodzaj} szer={szer} dl={dl} numer={numer} />
      </G>
    </Svg>
  );
}

export function GrafikaMaszynSekcja({ theme }: { theme: AppTheme }) {
  const grafika = useGrafikaMaszynStore((s) => s.grafika);
  const ustawWyglad = useGrafikaMaszynStore((s) => s.ustawWyglad);
  const ustawSvg = useGrafikaMaszynStore((s) => s.ustawSvg);
  const [otwarte, setOtwarte] = useState(false);
  const [blad, setBlad] = useState('');

  const zalacz = async (rodzaj: 'rozkladarka' | 'auto') => {
    setBlad('');
    let picker: DocumentPicker.DocumentPickerResult;
    try {
      picker = await DocumentPicker.getDocumentAsync({
        type: ['image/svg+xml', 'text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });
    } catch {
      setBlad('Nie udało się otworzyć wyboru pliku.');
      return;
    }
    if (picker.canceled || !picker.assets?.[0]) return;
    const plik = picker.assets[0];
    const nazwa = (plik.name || '').toLowerCase();
    if (nazwa && !nazwa.endsWith('.svg')) {
      setBlad('Wybierz plik z rozszerzeniem .svg.');
      return;
    }
    let tekst: string;
    try {
      tekst = plik.file ? await plik.file.text() : await (await fetch(plik.uri)).text();
    } catch {
      setBlad('Nie udało się odczytać pliku SVG.');
      return;
    }
    const r = oczyscSvg(tekst);
    if (!r.ok) {
      setBlad(r.blad);
      return;
    }
    await ustawSvg(rodzaj, r.xml);
  };

  const opisMaszyny = (rodzaj: 'rozkladarka' | 'auto') => {
    const wyglad = rodzaj === 'rozkladarka' ? grafika.wygladRozkladarki : grafika.wygladAuta;
    const wlasny = rodzaj === 'rozkladarka' ? grafika.svgRozkladarki : grafika.svgAuta;
    const nazwa = WYGLADY.find((w) => w.id === wyglad)?.nazwa ?? 'Obmiar z góry';
    return wlasny ? `${nazwa}, własny SVG` : nazwa;
  };

  return (
    <View style={[styl.blok, { borderTopColor: theme.colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styl.tytul, { color: theme.colors.textSecondary, flex: 1 }]}>GRAFIKA NA SZKICU</Text>
        <InfoTooltip tresc="Przód maszyny jest w prawo. Na szkicu obraca się zgodnie z kierunkiem układania i staje na szerokość pasa. Rozkładarka i auto mają osobny wygląd. Własny plik SVG zastępuje wbudowany rysunek tylko tej maszyny." />
      </View>
      <View style={styl.podgladRzad}>
        <View style={styl.podgladKarta}>
          <Podglad rodzaj="rozkladarka" />
          <Text style={[styl.podpis, { color: theme.colors.text }]}>Rozkładarka</Text>
        </View>
        <View style={styl.podgladKarta}>
          <Podglad rodzaj="auto" numer={8} />
          <Text style={[styl.podpis, { color: theme.colors.text }]}>Auto</Text>
        </View>
      </View>
      <Text style={[styl.aktualny, { color: theme.colors.textSecondary }]}>
        Rozkładarka: {opisMaszyny('rozkladarka')}
      </Text>
      <Text style={[styl.aktualny, { color: theme.colors.textSecondary, marginTop: -6 }]}>
        Auto: {opisMaszyny('auto')}
      </Text>
      <TouchableOpacity
        style={[styl.btn, { backgroundColor: theme.colors.primary }]}
        onPress={() => { setBlad(''); setOtwarte(true); }}
      >
        <Text style={styl.btnTekst}>Zmień grafikę</Text>
      </TouchableOpacity>

      <Modal visible={otwarte} transparent animationType="fade" onRequestClose={() => setOtwarte(false)}>
        <Pressable style={styl.tlo} onPress={() => setOtwarte(false)}>
          <Pressable style={[styl.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styl.kartaTytul, { color: theme.colors.text, flex: 1 }]}>Zmień grafikę</Text>
              <InfoTooltip tresc="Rozkładarka i auto mają osobny wygląd. Wybór wbudowanego rysunku usuwa tylko własny plik tej maszyny. Przód SVG niech wskazuje w prawo." />
            </View>
            <MaszynaWybor
              etykieta="Rozkładarka"
              wyglad={grafika.wygladRozkladarki}
              wlasny={!!grafika.svgRozkladarki}
              theme={theme}
              onWyglad={(w) => { setBlad(''); void ustawWyglad('rozkladarka', w); }}
              onZalacz={() => { void zalacz('rozkladarka'); }}
              onUsun={() => { setBlad(''); void ustawSvg('rozkladarka', null); }}
            />
            <MaszynaWybor
              etykieta="Auto"
              wyglad={grafika.wygladAuta}
              wlasny={!!grafika.svgAuta}
              theme={theme}
              onWyglad={(w) => { setBlad(''); void ustawWyglad('auto', w); }}
              onZalacz={() => { void zalacz('auto'); }}
              onUsun={() => { setBlad(''); void ustawSvg('auto', null); }}
            />
            {blad ? <Text style={[styl.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
            <TouchableOpacity style={[styl.btn, { backgroundColor: theme.colors.primary, marginTop: 8 }]} onPress={() => setOtwarte(false)}>
              <Text style={styl.btnTekst}>Gotowe</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MaszynaWybor({
  etykieta, wyglad, wlasny, theme, onWyglad, onZalacz, onUsun,
}: {
  etykieta: string;
  wyglad: WygladMaszyny;
  wlasny: boolean;
  theme: AppTheme;
  onWyglad: (w: WygladMaszyny) => void;
  onZalacz: () => void;
  onUsun: () => void;
}) {
  return (
    <View style={[styl.maszyna, { borderColor: theme.colors.border }]}>
      <Text style={[styl.opcjaNazwa, { color: theme.colors.text }]}>{etykieta}</Text>
      <View style={styl.chipRzad}>
        {WYGLADY.map((w) => {
          const on = wyglad === w.id && !wlasny;
          return (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styl.chip, {
                  borderColor: on ? theme.colors.primary : theme.colors.border,
                  backgroundColor: on ? `${theme.colors.primary}18` : theme.colors.inputBackground,
                }]}
                onPress={() => onWyglad(w.id)}
              >
                <Text style={{ color: on ? theme.colors.primary : theme.colors.text, fontWeight: '700', fontSize: 13 }}>{w.nazwa}</Text>
              </TouchableOpacity>
              <InfoTooltip tresc={w.opis} />
            </View>
          );
        })}
      </View>
      <View style={styl.plikRzad}>
        <TouchableOpacity style={[styl.btnMaly, { borderColor: theme.colors.primary }]} onPress={onZalacz}>
          <Text style={[styl.btnMalyTekst, { color: theme.colors.primary }]}>{wlasny ? 'Zmień SVG' : 'Załącz SVG'}</Text>
        </TouchableOpacity>
        {wlasny ? (
          <TouchableOpacity onPress={onUsun}>
            <Text style={[styl.usun, { color: theme.colors.danger }]}>Usuń</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styl = StyleSheet.create({
  blok: { borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  tytul: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  opis: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  podgladRzad: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  podgladKarta: { alignItems: 'center' },
  podpis: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  aktualny: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  btn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  karta: { borderRadius: 16, borderWidth: 1, padding: 16 },
  kartaTytul: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  opcja: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  opcjaNazwa: { fontSize: 15, fontWeight: '700' },
  opcjaOpis: { fontSize: 12, marginTop: 2 },
  maszyna: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  chipRzad: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  plikRzad: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  btnMaly: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  btnMalyTekst: { fontSize: 13, fontWeight: '700' },
  usun: { fontSize: 13, fontWeight: '700' },
  blad: { fontSize: 13, marginTop: 10 },
});
