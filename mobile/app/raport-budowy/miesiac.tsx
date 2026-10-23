import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Karta, Przycisk, useMotyw, ODSTEP, TYPOGRAFIA } from '../../src/components/ui';
import { formatujDzienIso } from '../../src/components/common/KalendarzDnia';
import { liczbaRaportow } from '../../src/components/budowa/SekcjaRaporty';
import { wstecz } from '../../src/budzet/nawigacja';
import { etykietaMiesiaca, podsumowanieDnia, przerobRaportu, raportyMiesiaca, sumaPrzerobu } from '../../src/raportyBudowy/raporty';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { usePracownicyStore } from '../../src/stores/pracownicyStore';
import { useRaportyBudowyStore } from '../../src/stores/raportyBudowyStore';
import { useSprzetStore } from '../../src/stores/sprzetStore';
import { dokumentMiesiacaBudowy } from '../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../src/eksport/udostepnijPdf';
import { formatLiczby } from '../../src/utils/calculations';

const wielkaLitera = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function RaportyMiesiacaScreen() {
  const { budowaId, miesiac } = useLocalSearchParams<{ budowaId: string; miesiac: string }>();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === budowaId));
  const wszystkie = useRaportyBudowyStore((s) => s.raporty);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const raportyPracownikow = usePracownicyStore((s) => s.raporty);
  const raportySprzetu = useSprzetStore((s) => s.raporty);
  const raporty = useMemo(
    () => raportyMiesiaca(wszystkie.filter((r) => r.budowaId === budowaId), miesiac ?? ''),
    [wszystkie, budowaId, miesiac],
  );
  const powrot = `/budowa/${budowaId}?zakladka=raporty`;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={miesiac ? etykietaMiesiaca(miesiac) : 'Raporty'}
        podtytul={budowa ? `${budowa.kodBudowy} · ${liczbaRaportow(raporty.length)}` : undefined}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
        udostepnij={raporty.length ? () => udostepnijDokumentPdf(dokumentMiesiacaBudowy({
          miesiac: miesiac ?? '', budowa, raporty, mieszanki, raportyPracownikow, raportySprzetu,
        })) : undefined}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        {raporty.length === 0 ? (
          <View style={{ gap: ODSTEP.m }}>
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>W tym miesiącu nie ma już raportów.</Text>
            <Przycisk tekst="Wróć do raportów" wariant="drugi" onPress={() => wstecz(powrot)} />
          </View>
        ) : raporty.map((r) => {
          const przerob = przerobRaportu(r);
          const suma = sumaPrzerobu(przerob);
          const dzien = podsumowanieDnia(r, mieszanki, raportyPracownikow, raportySprzetu);
          const opis = przerob.length > 0
            ? przerob.map((w) => `${w.mieszankaNazwa ?? w.warstwaNazwa}: ${formatLiczby(w.ilosc)} t`).join(' · ')
            : 'Bez warstw';
          return (
            <Karta
              key={r.id}
              tytul={wielkaLitera(formatujDzienIso(r.data))}
              podtytul={opis}
              podsumowanie={`${formatLiczby(suma.ilosc)} t · ${formatLiczby(suma.powierzchniaM2)} m² · ${formatLiczby(dzien.razem)} zł`}
              accessibilityLabel={`Raport ${r.data}`}
              onPress={() => router.push(`/raport-budowy/${r.id}` as never)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: ODSTEP.l, gap: ODSTEP.m },
});
