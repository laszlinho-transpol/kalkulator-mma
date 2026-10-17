import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Przycisk, Sekcja, SiatkaDanych, Zakladki, useMotyw, ODSTEP, TYPOGRAFIA } from '../../src/components/ui';
import { formatujDzienIso } from '../../src/components/common/KalendarzDnia';
import { ZakladkaPrzerob } from '../../src/components/raportyBudowy/ZakladkaPrzerob';
import { ZakladkaMaterial } from '../../src/components/raportyBudowy/ZakladkaMaterial';
import { ZakladkaTransport } from '../../src/components/raportyBudowy/ZakladkaTransport';
import { ZakladkaRobocizna } from '../../src/components/raportyBudowy/ZakladkaRobocizna';
import { wstecz } from '../../src/budzet/nawigacja';
import { dataKrotko } from '../../src/budzet/wyswietlanie';
import { podsumowanieDnia } from '../../src/raportyBudowy/raporty';
import type { RaportDzienny } from '../../src/raportyBudowy/typy';
import { useRouteId } from '../../src/hooks/useRouteId';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { usePracownicyStore } from '../../src/stores/pracownicyStore';
import { useRaportyBudowyStore } from '../../src/stores/raportyBudowyStore';
import { useSprzetStore } from '../../src/stores/sprzetStore';
import { dokumentRaportuBudowy } from '../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../src/eksport/udostepnijPdf';
import { formatLiczby } from '../../src/utils/calculations';
import { potwierdzAkcje } from '../../src/utils/dialog';

type ZakladkaRaportu = 'przerob' | 'material' | 'transport' | 'robocizna';
const ZAKLADKI: [ZakladkaRaportu, string][] = [
  ['przerob', 'Przerób'],
  ['material', 'Materiał'],
  ['transport', 'Transport'],
  ['robocizna', 'Robocizna'],
];

export default function RaportDziennyScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const raport = useRaportyBudowyStore((s) => s.raporty.find((r) => r.id === id));
  const aktualizuj = useRaportyBudowyStore((s) => s.aktualizuj);
  const usun = useRaportyBudowyStore((s) => s.usun);
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === raport?.budowaId));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const raportyPracownikow = usePracownicyStore((s) => s.raporty);
  const raportySprzetu = useSprzetStore((s) => s.raporty);
  const [zakladka, setZakladka] = useState<ZakladkaRaportu>(
    () => ZAKLADKI.find(([k]) => k === startowa)?.[0] ?? 'przerob',
  );

  const powrot = raport ? `/raport-budowy/miesiac?budowaId=${raport.budowaId}&miesiac=${raport.data.slice(0, 7)}` : '/budowa';
  const onZmien = (zmiany: Partial<RaportDzienny>) => { if (raport) void aktualizuj(raport.id, zmiany); };

  if (!raport) {
    return (
      <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Raport" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budowa') }} />
        <Text style={{ color: theme.colors.textSecondary, padding: ODSTEP.l }}>Nie znaleziono raportu.</Text>
      </View>
    );
  }

  const dzien = podsumowanieDnia(raport, mieszanki, raportyPracownikow, raportySprzetu);

  const usunRaport = () => potwierdzAkcje('Usunąć raport?', `Raport z dnia ${dataKrotko(raport.data)} zniknie razem z materiałem i transportem.`, () => {
    void usun(raport.id).then(() => wstecz(powrot));
  });

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={`Raport ${dataKrotko(raport.data)}`}
        podtytul={budowa ? `${budowa.kodBudowy} · ${formatujDzienIso(raport.data)}` : formatujDzienIso(raport.data)}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
        udostepnij={() => udostepnijDokumentPdf(dokumentRaportuBudowy({
          raport, budowa, mieszanki, raportyPracownikow, raportySprzetu,
          pracownicy: usePracownicyStore.getState().pracownicy,
          sprzet: useSprzetStore.getState().sprzet,
        }))}
        prawy={{ tekst: 'Edytuj', onPress: () => router.push({ pathname: '/raport-budowy/formularz', params: { id: raport.id } } as never) }}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <Sekcja tytul="Kwota dnia" info="Materiał + transport + zatwierdzona robocizna.">
          <SiatkaDanych
            pozycje={[
              { etykieta: 'Materiał', wartosc: `${formatLiczby(dzien.material)} zł` },
              { etykieta: 'Transport', wartosc: `${formatLiczby(dzien.transport)} zł` },
              { etykieta: 'Robocizna', wartosc: `${formatLiczby(dzien.robocizna)} zł` },
              { etykieta: 'Razem', wartosc: `${formatLiczby(dzien.razem)} zł`, kolor: theme.colors.primary, dopisek: 'kwota dnia' },
            ]}
          />
        </Sekcja>

        <Zakladki<ZakladkaRaportu> theme={theme} aktywna={zakladka} onZmien={setZakladka} zakladki={ZAKLADKI} />

        {zakladka === 'przerob' ? <ZakladkaPrzerob raport={raport} /> : null}
        {zakladka === 'material' ? <ZakladkaMaterial raport={raport} onZmien={onZmien} /> : null}
        {zakladka === 'transport' ? <ZakladkaTransport raport={raport} onZmien={onZmien} /> : null}
        {zakladka === 'robocizna' ? <ZakladkaRobocizna raport={raport} onZmien={onZmien} /> : null}

        <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
          Zmiany w zakładkach zapisują się od razu.
        </Text>
        <Przycisk tekst="Usuń raport" ikona="usun" wariant="niebezpieczny" onPress={usunRaport} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: ODSTEP.l, gap: ODSTEP.m },
});
