// Wskaźnik rozkładarki: gdzie ustawić wskaźnik względem osi, gąsienicy i płozy, żeby stół szedł po lince.

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Etykieta, Przycisk, PrzyciskIkony, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, Wybor,
  WycinekPola, WycinekPrzycisku, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoStref } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RozkladarkaZGory } from '../../../assets/svg/RozkladarkaZGory';
import { SchematStolu, parsujMetry } from '../../../src/components/niezbednik/KonfiguracjaStolu';
import { RysWskaznik } from '../../../src/components/niezbednik/RysunkiMasy';
import { fm } from '../../../src/geodezja/geometria';
import { DOMYSLNA_SZER_POSZERZENIA, MAX_POSZERZEN_STRONA, obliczWskaznikRozkladarki } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'masa/wskaznik-rozkladarki';
const NOWE_POSZERZENIE = fm(DOMYSLNA_SZER_POSZERZENIA, 2);

export default function WskaznikRozkladarkiScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, widokStrefy } = usePrzewijanieDoStref();

  const [wPodstawa, setWPodstawa] = useState('2,5');
  const [wMaxStolu, setWMaxStolu] = useState('5');
  const [poszL, setPoszL] = useState<string[]>([NOWE_POSZERZENIE]);
  const [poszP, setPoszP] = useState<string[]>([NOWE_POSZERZENIE]);
  const [wDocelowa, setWDocelowa] = useState('6');
  const [lLinka, setLLinka] = useState('0,5');
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
  const w = wynik.ok ? wynik.wynik : null;
  const m = (x: number) => `${fm(x, 2)} m`;

  const dodajL = () => { if (poszL.length < MAX_POSZERZEN_STRONA) setPoszL((s) => [...s, NOWE_POSZERZENIE]); };
  const dodajP = () => { if (poszP.length < MAX_POSZERZEN_STRONA) setPoszP((s) => [...s, NOWE_POSZERZENIE]); };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Wskaźnik rozkładarki" podtytul="Stół, poszerzenia i wymiary" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co liczy ten kalkulator',
              rysunek: <RysWskaznik odOsi={w ? m(w.odOsiM) : '…'} odGasienicy={w ? m(w.odGasiennicyM) : '…'} odPlozy={w ? m(w.odPlozyM) : '…'} />,
              opis: 'Rozkładarka jedzie po **lince** naciągniętej obok pasa. Kalkulator mówi, w jakiej odległości od **osi maszyny**, od **gąsienicy** i od **płozy stołu** ustawić wskaźnik, żeby krawędź stołu szła dokładnie tam, gdzie trzeba.',
            },
            {
              tytul: 'Opisz stół',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Podstawa stołu" wartosc="2,5" jednostka="m" aktywne />
                    <WycinekPola etykieta="Max szerokość" wartosc="5" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekPrzycisku tekst="Dodaj P2" plus drugi />
                </>
              ),
              opis: 'Wpisz **podstawę** stołu (złożony) i jego **maksymalny wysuw**. W sekcji **Poszerzenia** dopisz założone nakładki – osobno z lewej i prawej, do 4 na stronę. Schemat stołu od razu pokaże zakres szerokości.',
            },
            {
              tytul: 'Ustaw wskaźnik',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Docelowa szerokość" wartosc="6" jednostka="m" />
                    <WycinekPola etykieta="Linka od krawędzi" wartosc="0,5" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekWyniku etykieta="Od osi maszyny" wartosc={w ? m(w.odOsiM) : '—'} />
                </>
              ),
              opis: 'Podaj **docelową szerokość** układania, odległość **linki od krawędzi** pasa i wybierz stronę, po której jest linka. Jeśli szerokość nie mieści się w zakresie stołu, zobaczysz podpowiedź, co zmienić.',
            },
          ]}
        />

        <View ref={widokStrefy('parametry')}>
          <StrefaKlawiatury nazwa="parametry">
            <Sekcja tytul="Parametry stołu">
              <View style={styles.parametry}>
                <RozkladarkaZGory width={120} height={80} />
                <View style={{ flex: 1, gap: 10 }}>
                  <PoleLiczby etykieta="Podstawa stołu" value={wPodstawa} onChangeText={setWPodstawa} jednostka="m" accessibilityLabel="Podstawa stołu [m]" />
                  <PoleLiczby etykieta="Max szerokość stołu" value={wMaxStolu} onChangeText={setWMaxStolu} jednostka="m" accessibilityLabel="Max szerokość stołu [m]" />
                </View>
              </View>
              <KlawiaturaLiczb />
            </Sekcja>
          </StrefaKlawiatury>
        </View>

        <Sekcja tytul="Konfiguracja stołu">
          <SchematStolu
            wPodstawa={parsujMetry(wPodstawa)}
            wMaxStolu={parsujMetry(wMaxStolu)}
            poszerzeniaL={liczbyL}
            poszerzeniaP={liczbyP}
            onDodajL={dodajL}
            onDodajP={dodajP}
          />
        </Sekcja>

        <View ref={widokStrefy('poszerzenia')}>
          <StrefaKlawiatury nazwa="poszerzenia">
            <Sekcja tytul="Poszerzenia">
              <View style={styles.dwieKolumny}>
                <ListaPoszerzen strona="L" tytul="Strona lewa" wartosci={poszL} onZmien={setPoszL} onDodaj={dodajL} />
                <ListaPoszerzen strona="P" tytul="Strona prawa" wartosci={poszP} onZmien={setPoszP} onDodaj={dodajP} />
              </View>
              <KlawiaturaLiczb />
            </Sekcja>
          </StrefaKlawiatury>
        </View>

        <View ref={widokStrefy('ukladanie')}>
          <StrefaKlawiatury nazwa="ukladanie">
            <Sekcja tytul="Układanie">
              <Wiersz>
                <PoleLiczby etykieta="Docelowa szerokość" value={wDocelowa} onChangeText={setWDocelowa} jednostka="m" accessibilityLabel="Docelowa szerokość układania [m]" />
                <PoleLiczby etykieta="Linka od krawędzi" value={lLinka} onChangeText={setLLinka} jednostka="m" accessibilityLabel="Odległość linki od krawędzi [m]" />
              </Wiersz>
              <Etykieta tekst="Strona wskaźnika" />
              <Wiersz>
                <Wybor zaznaczony={strona === 'lewa'} etykieta="Lewa" accessibilityLabel="Strona lewa" onPress={() => setStrona('lewa')} wysrodkuj />
                <Wybor zaznaczony={strona === 'prawa'} etykieta="Prawa" accessibilityLabel="Strona prawa" onPress={() => setStrona('prawa')} wysrodkuj />
              </Wiersz>
              {!wynik.ok ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{wynik.blad}</Text> : null}
              <RamkaWyniku etykieta="Od osi maszyny" accessibilityLabel="Wynik od osi maszyny" wartosc={w ? m(w.odOsiM) : '—'} />
              {w ? (
                <SiatkaDanych
                  pozycje={[
                    { etykieta: 'Od gąsienicy', wartosc: m(w.odGasiennicyM), dopisek: `${w.odGasiennicyCm} cm` },
                    { etykieta: 'Od zewn. płozy stołu', wartosc: m(w.odPlozyM), dopisek: `${w.odPlozyCm} cm` },
                    { etykieta: 'Szerokość stołu', wartosc: m(w.sumaSzerokosciM) },
                    { etykieta: 'Zakres stołu', wartosc: `${fm(w.szerMinM, 2)}–${fm(w.szerMaxM, 2)} m` },
                  ]}
                />
              ) : null}
              <KlawiaturaLiczb />
            </Sekcja>
          </StrefaKlawiatury>
        </View>

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={() => {
            if (w) {
              dodaj(
                `Wskaźnik ${w.strona}: od osi ${fm(w.odOsiM, 2)} m (${w.odOsiCm} cm), od gąsienicy ${fm(w.odGasiennicyM, 2)} m, od płozy ${fm(w.odPlozyM, 2)} m | stół ${fm(w.sumaSzerokosciM, 2)} m`,
                'Masa i sprzęt',
              );
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

function ListaPoszerzen({ strona, tytul, wartosci, onZmien, onDodaj }: {
  strona: 'L' | 'P';
  tytul: string;
  wartosci: string[];
  onZmien: (nastepne: string[]) => void;
  onDodaj: () => void;
}) {
  const theme = useMotyw();
  return (
    <View style={styles.kolumna}>
      <Etykieta tekst={tytul} />
      {wartosci.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>Brak poszerzeń</Text> : null}
      {wartosci.map((v, i) => (
        <View key={i} style={styles.poszerzenie}>
          <View style={{ flex: 1 }}>
            <PoleLiczby
              etykieta={`P${i + 1}`}
              value={v}
              onChangeText={(t) => onZmien(wartosci.map((x, idx) => (idx === i ? t : x)))}
              jednostka="m"
              accessibilityLabel={`Poszerzenie P${i + 1} (${strona}) [m]`}
            />
          </View>
          <PrzyciskIkony
            ikona="usun"
            kolor={theme.colors.danger}
            accessibilityLabel={`Usuń poszerzenie P${i + 1} (${strona})`}
            onPress={() => onZmien(wartosci.filter((_, idx) => idx !== i))}
          />
        </View>
      ))}
      {wartosci.length < MAX_POSZERZEN_STRONA ? (
        <Przycisk wariant="drugi" maly ikona="plus" tekst={`Dodaj P${wartosci.length + 1}`} accessibilityLabel={`Dodaj poszerzenie ${strona}`} onPress={onDodaj} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
  parametry: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dwieKolumny: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  kolumna: { flex: 1, minWidth: 0, gap: 8 },
  poszerzenie: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
});
