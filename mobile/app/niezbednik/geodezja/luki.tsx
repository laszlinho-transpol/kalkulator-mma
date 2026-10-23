// Tyczenie łuków metodą rzędnych od stycznej: y = R − √(R² − x²) co krok wzdłuż stycznej.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, Sekcja, Wiersz, WycinekPola, WycinekWiersz, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoDanych } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysLukStyczna } from '../../../src/components/geodezja/ZasadyGeodezji';
import { fm, liczbaZTekstu } from '../../../src/geodezja/geometria';
import { tyczenieLukow } from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'geodezja/luki';
const MAKS_PUNKTOW = 500;

export default function LukiScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, dane } = usePrzewijanieDoDanych();
  const [promien, setPromien] = useState('100');
  const [krok, setKrok] = useState('5');
  const r = liczbaZTekstu(promien);
  const k = liczbaZTekstu(krok);
  const blad = r == null || r <= 0
    ? 'Wpisz promień łuku większy od zera.'
    : k == null || k <= 0
      ? 'Wpisz krok większy od zera.'
      : r / k > MAKS_PUNKTOW
        ? `Za mały krok – tabela miałaby ponad ${MAKS_PUNKTOW} wierszy.`
        : null;
  const tabela = !blad && r && k ? tyczenieLukow(r, k) : [];

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Tyczenie łuków" podtytul="Rzędne od stycznej" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Łuk od stycznej',
              rysunek: <RysLukStyczna />,
              opis: 'Łuk tyczysz od **stycznej** – prostej, która dotyka łuku w jego początku **PŁ**. Wzdłuż stycznej odmierzasz odległość **x**, a prostopadle do niej odsunięcie **y** do łuku: y = R − √(R² − x²).',
            },
            {
              tytul: 'Wpisz promień i krok',
              rysunek: (
                <WycinekWiersz>
                  <WycinekPola etykieta="Promień R" wartosc="100" jednostka="m" aktywne />
                  <WycinekPola etykieta="Krok x" wartosc="5" jednostka="m" />
                </WycinekWiersz>
              ),
              opis: 'Wpisz **promień R** z projektu i **krok** – co ile metrów wzdłuż stycznej chcesz wbijać szpilki (np. co 5 m). Pola wypełniasz klawiaturą liczbową pod danymi.',
            },
            {
              tytul: 'Odczytaj tabelę i tycz',
              rysunek: <WycinekTabeli />,
              opis: 'Dla każdego **x** tabela podaje **y** w metrach. Od PŁ odmierz x na stycznej, wystaw prostopadłą (kątownik albo 3-4-5) i odmierz y – to punkt łuku. Dla długich łuków y rośnie szybko, więc tycz z obu końców.',
            },
          ]}
        />

        <StrefaKlawiatury>
          <View ref={dane}>
            <Sekcja tytul="Dane">
              <Wiersz>
                <PoleLiczby etykieta="Promień R" value={promien} onChangeText={setPromien} jednostka="m" accessibilityLabel="Promień łuku R [m]" />
                <PoleLiczby etykieta="Krok x" value={krok} onChangeText={setKrok} jednostka="m" accessibilityLabel="Krok pomiarowy [m]" />
              </Wiersz>
              {blad ? <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{blad}</Text> : null}
              <KlawiaturaLiczb />
            </Sekcja>
          </View>
        </StrefaKlawiatury>

        {tabela.length ? (
          <Sekcja tytul={`Rzędne od stycznej · ${tabela.length} pkt`}>
            <View style={[styles.tabela, { borderColor: theme.colors.border }]}>
              <View style={[styles.wiersz, { backgroundColor: `${theme.colors.primary}18`, borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.kom, styles.nagl, { color: theme.colors.textSecondary }]}>x wzdłuż stycznej</Text>
                <Text style={[styles.kom, styles.nagl, { color: theme.colors.textSecondary }]}>y odsunięcie</Text>
              </View>
              {tabela.map((w, i) => (
                <View key={w.x} style={[styles.wiersz, { borderBottomColor: theme.colors.border, backgroundColor: i % 2 ? theme.colors.inputBackground : 'transparent' }]}>
                  <Text style={[styles.kom, { color: theme.colors.text }]}>{fm(w.x, 2)} m</Text>
                  <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '800' }]}>{fm(w.y, 3)} m</Text>
                </View>
              ))}
            </View>
          </Sekcja>
        ) : null}

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={() => {
            if (!tabela.length || r == null) return;
            const pierwsze = tabela.slice(1, 6).map((w) => `x ${fm(w.x, 2)} → y ${fm(w.y, 3)}`).join('; ');
            dodaj(`Tyczenie łuku R = ${fm(r, 2)} m, krok ${fm(k ?? 0, 2)} m: ${pierwsze}${tabela.length > 6 ? '…' : ''}`, 'Geodezja');
          }}
        />
      </ScrollView>
    </View>
  );
}

function WycinekTabeli() {
  const theme = useMotyw();
  const wiersze = [['0', '0,000'], ['5', '0,125'], ['10', '0,501'], ['15', '1,131']];
  return (
    <View style={[styles.tabela, { borderColor: theme.colors.border }]}>
      <View style={[styles.wierszMaly, { backgroundColor: `${theme.colors.primary}18`, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.kom, styles.nagl, { color: theme.colors.textSecondary }]}>x [m]</Text>
        <Text style={[styles.kom, styles.nagl, { color: theme.colors.textSecondary }]}>y [m]</Text>
      </View>
      {wiersze.map(([x, y], i) => (
        <View key={x} style={[styles.wierszMaly, { borderBottomColor: theme.colors.border, backgroundColor: i === 2 ? `${theme.colors.primary}22` : 'transparent' }]}>
          <Text style={[styles.kom, { color: theme.colors.text }]}>{x}</Text>
          <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '800' }]}>{y}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
  tabela: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  wiersz: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  wierszMaly: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  kom: { flex: 1, textAlign: 'center', fontSize: 14 },
  nagl: { fontWeight: '800', fontSize: 12 },
});
