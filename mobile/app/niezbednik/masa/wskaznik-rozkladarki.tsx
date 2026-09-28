import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { RozkladarkaZGory } from '../../../assets/svg/RozkladarkaZGory';
import {
  EdytorPoszerzen,
  PoleWiersz,
  SchematStolu,
  parsujMetry,
} from '../../../src/components/niezbednik/KonfiguracjaStolu';
import { DOMYSLNA_SZER_POSZERZENIA, MAX_POSZERZEN_STRONA, obliczWskaznikRozkladarki } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZOLTY_TLO = '#F8E7A0';
const ZOLTY_TEKST = '#5C4A12';
const POMARANCZ = '#F0B429';
const POMARANCZ_TEKST = '#4A3208';

function fmtWynik(m: number, cm: number): string {
  return `${m.toFixed(2).replace('.', ',')} m`;
}

export default function WskaznikRozkladarkiScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();

  const [wPodstawa, setWPodstawa] = useState('2.5');
  const [wMaxStolu, setWMaxStolu] = useState('5.0');
  const [poszL, setPoszL] = useState<string[]>([String(DOMYSLNA_SZER_POSZERZENIA)]);
  const [poszP, setPoszP] = useState<string[]>([String(DOMYSLNA_SZER_POSZERZENIA)]);
  const [wDocelowa, setWDocelowa] = useState('6');
  const [lLinka, setLLinka] = useState('0.5');
  const [strona, setStrona] = useState<'lewa' | 'prawa'>('lewa');

  const liczbyL = useMemo(() => poszL.map(parsujMetry), [poszL]);
  const liczbyP = useMemo(() => poszP.map(parsujMetry), [poszP]);

  const wynik = obliczWskaznikRozkladarki({
    wPodstawa: parsujMetry(wPodstawa),
    wMaxStolu: parsujMetry(wMaxStolu),
    poszerzeniaL: liczbyL,
    poszerzeniaP: liczbyP,
    wDocelowa: parsujMetry(wDocelowa),
    strona,
    lLinka: parsujMetry(lLinka),
  });

  const dodajL = () => {
    if (poszL.length >= MAX_POSZERZEN_STRONA) return;
    setPoszL((s) => [...s, String(DOMYSLNA_SZER_POSZERZENIA)]);
  };
  const dodajP = () => {
    if (poszP.length >= MAX_POSZERZEN_STRONA) return;
    setPoszP((s) => [...s, String(DOMYSLNA_SZER_POSZERZENIA)]);
  };

  const kartaForm = theme.dark ? '#3A3420' : ZOLTY_TLO;
  const kartaWynik = theme.dark ? '#4A3A12' : POMARANCZ;
  const tekstForm = theme.dark ? theme.colors.text : ZOLTY_TEKST;
  const tekstWynik = theme.dark ? '#FFF3C4' : POMARANCZ_TEKST;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Wskaźnik rozkładarki" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.parametryRow}>
            <RozkladarkaZGory width={132} height={88} />
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.sekcja, { color: theme.colors.textSecondary }]}>Parametry stołu</Text>
              <PoleWiersz label="Podstawa stołu" value={wPodstawa} onChange={setWPodstawa} theme={theme} />
              <PoleWiersz label="Max szerokość stołu" value={wMaxStolu} onChange={setWMaxStolu} theme={theme} />
            </View>
          </View>
        </View>

        <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sekcja, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
            Konfiguracja stołu
          </Text>
          <SchematStolu
            wPodstawa={parsujMetry(wPodstawa)}
            wMaxStolu={parsujMetry(wMaxStolu)}
            poszerzeniaL={liczbyL}
            poszerzeniaP={liczbyP}
            onDodajL={dodajL}
            onDodajP={dodajP}
          />
          <View style={{ height: 8 }} />
          <EdytorPoszerzen
            lewe={poszL}
            prawe={poszP}
            onZmienLewe={setPoszL}
            onZmienPrawe={setPoszP}
            theme={theme}
          />
        </View>

        <View style={[styles.karta, { backgroundColor: kartaForm, borderColor: 'transparent' }]}>
          <PoleWiersz label="Docelowa szerokość układania:" value={wDocelowa} onChange={setWDocelowa} theme={theme} />
          <PoleWiersz label="Odległość linki od krawędzi:" value={lLinka} onChange={setLLinka} theme={theme} />
          <View style={styles.wiersz}>
            <Text style={[styles.wierszLabel, { color: tekstForm }]}>Strona wskaźnika:</Text>
            <View style={styles.stronaRow}>
              {(['lewa', 'prawa'] as const).map((s) => {
                const aktywna = strona === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStrona(s)}
                    style={[
                      styles.stronaBtn,
                      {
                        backgroundColor: aktywna ? theme.colors.card : 'transparent',
                        borderColor: aktywna ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: aktywna ? theme.colors.primary : tekstForm, fontWeight: '800', fontSize: 12 }}>
                      {s === 'lewa' ? 'LEWA' : 'PRAWA'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {!wynik.ok ? (
          <View style={[styles.blad, { backgroundColor: `${theme.colors.danger}15`, borderColor: theme.colors.danger }]}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{wynik.blad}</Text>
          </View>
        ) : (
          <View style={[styles.karta, { backgroundColor: kartaWynik, borderColor: 'transparent', gap: 10 }]}>
            <Text style={[styles.sekcja, { color: tekstWynik, textAlign: 'center' }]}>
              Wymiary dla wskaźnika
            </Text>
            <WierszWyniku etykieta="Od osi maszyny:" wartosc={fmtWynik(wynik.wynik.odOsiM, wynik.wynik.odOsiCm)} cm={wynik.wynik.odOsiCm} kolor={tekstWynik} tlo={theme.colors.card} />
            <WierszWyniku etykieta="Od gąsienicy:" wartosc={fmtWynik(wynik.wynik.odGasiennicyM, wynik.wynik.odGasiennicyCm)} cm={wynik.wynik.odGasiennicyCm} kolor={tekstWynik} tlo={theme.colors.card} />
            <WierszWyniku etykieta="Od zewnętrznej płozy stołu:" wartosc={fmtWynik(wynik.wynik.odPlozyM, wynik.wynik.odPlozyCm)} cm={wynik.wynik.odPlozyCm} kolor={tekstWynik} tlo={theme.colors.card} />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.colors.secondary }]}
              onPress={() => dodaj(
                `Wskaźnik ${wynik.wynik.strona}: od osi ${wynik.wynik.odOsiM.toFixed(2)} m (${wynik.wynik.odOsiCm} cm), od gąsienicy ${wynik.wynik.odGasiennicyM.toFixed(2)} m, od płozy ${wynik.wynik.odPlozyM.toFixed(2)} m | stół ${wynik.wynik.sumaSzerokosciM.toFixed(2)} m`,
                'Masa i sprzęt',
              )}
            >
              <Text style={styles.btnTekst}>Zapisz do Notatnika</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function WierszWyniku({
  etykieta, wartosc, cm, kolor, tlo,
}: {
  etykieta: string;
  wartosc: string;
  cm: number;
  kolor: string;
  tlo: string;
}) {
  return (
    <View style={styles.wiersz}>
      <Text style={[styles.wierszLabel, { color: kolor }]}>{etykieta}</Text>
      <View style={[styles.wynikPigułka, { backgroundColor: tlo }]}>
        <Text style={[styles.wynikWartosc, { color: kolor }]}>{wartosc}</Text>
        <Text style={[styles.wynikCm, { color: kolor }]}>{cm} cm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  karta: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  parametryRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sekcja: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  wiersz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  wierszLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  stronaRow: { flexDirection: 'row', gap: 6 },
  stronaBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  blad: { borderWidth: 1, borderRadius: 12, padding: 12 },
  wynikPigułka: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end', minWidth: 92 },
  wynikWartosc: { fontSize: 15, fontWeight: '800' },
  wynikCm: { fontSize: 10, fontWeight: '600', opacity: 0.7 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnTekst: { color: '#fff', fontWeight: '700' },
});
