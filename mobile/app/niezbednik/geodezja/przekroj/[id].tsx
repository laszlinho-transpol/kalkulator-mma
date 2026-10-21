// Przekrój poprzeczny: kreator szczegółu (elementy od lewej do prawej) i pomiar łatą na zapisanym szablonie.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Naciskany, useMotyw, PROMIEN } from '../../../../src/components/ui';
import { EdytorPrzekroju, OknoDanychPrzekroju, useEdycjaPrzekroju } from '../../../../src/components/geodezja/EdytorPrzekroju';
import { Okienko } from '../../../../src/components/geodezja/Okienko';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useGeodezjaStore } from '../../../../src/stores/geodezjaStore';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { svgPrzekroju } from '../../../../src/geodezja/rysunek';
import { dodajSzczegolBudowy } from '../../../../src/geodezja/szczegolyBudowy';
import { dokumentPrzekroju } from '../../../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../../../src/eksport/udostepnijPdf';
import { udostepnijSvg } from '../../../../src/eksport/udostepnijSvg';
import { pokazKomunikat, potwierdzAkcje } from '../../../../src/utils/dialog';
import { pustyProjektBudowy } from '../../../../src/utils/projektBudowy';
import { budowaWToku, opisStatusu } from '../../../../src/utils/statusBudowy';

export default function PrzekrojScreen() {
  const id = useRouteId();
  const theme = useMotyw();
  const zapisany = useGeodezjaStore((s) => s.przekroje.find((x) => x.id === id));
  const zapiszPrzekroj = useGeodezjaStore((s) => s.zapiszPrzekroj);
  const usunPrzekrojZeStore = useGeodezjaStore((s) => s.usunPrzekroj);
  const { przekroj, setPrzekroj, oznaczUsuniety } = useEdycjaPrzekroju(zapisany, zapiszPrzekroj);
  const [oknoDane, setOknoDane] = useState(false);
  const [oknoBudowy, setOknoBudowy] = useState(false);

  if (!przekroj) {
    return (
      <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Przekrój poprzeczny" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={[styles.pusto, { color: theme.colors.textSecondary }]}>Nie znaleziono przekroju.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={przekroj.nazwa}
        podtytul={przekroj.archiwum ? 'Archiwum' : 'Przekrój poprzeczny'}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Edytuj', onPress: () => setOknoDane(true) }}
        udostepnij={() => udostepnijDokumentPdf(dokumentPrzekroju(przekroj))}
      />
      <EdytorPrzekroju przekroj={przekroj} setPrzekroj={setPrzekroj} />

      {oknoDane ? (
        <OknoDanychPrzekroju
          przekroj={przekroj}
          onAnuluj={() => setOknoDane(false)}
          onZapisz={(z) => {
            setPrzekroj((p) => ({ ...p, ...z }));
            setOknoDane(false);
          }}
          onArchiwum={() => {
            setPrzekroj((p) => ({ ...p, archiwum: !p.archiwum }));
            setOknoDane(false);
          }}
          onPrzypisz={() => {
            setOknoDane(false);
            setOknoBudowy(true);
          }}
          onSvg={() => udostepnijSvg(svgPrzekroju(przekroj).svg, przekroj.nazwa)}
          onUsun={() => potwierdzAkcje('Usunąć przekrój?', `„${przekroj.nazwa}” zostanie usunięty bez możliwości przywrócenia.`, () => {
            oznaczUsuniety();
            usunPrzekrojZeStore(przekroj.id);
            setOknoDane(false);
            router.back();
          })}
        />
      ) : null}

      {oknoBudowy ? <OknoPrzypisania przekrojNazwa={przekroj.nazwa} onAnuluj={() => setOknoBudowy(false)} onWybierz={async (budowaId) => {
        const { budowy, zapiszProjekt } = useBudowyStore.getState();
        const b = budowy.find((x) => x.id === budowaId);
        if (!b) return;
        await zapiszProjekt(b.id, dodajSzczegolBudowy(b.projekt ?? pustyProjektBudowy(), przekroj));
        setOknoBudowy(false);
        pokazKomunikat('Przypisano do budowy', `Kopia „${przekroj.nazwa}” jest w budowie ${b.kodBudowy}: Konstrukcje › Szczegóły. Zmiany w szczególe nie zmieniają tego szablonu.`);
      }} /> : null}
    </View>
  );
}

function OknoPrzypisania({ przekrojNazwa, onAnuluj, onWybierz }: {
  przekrojNazwa: string;
  onAnuluj: () => void;
  onWybierz: (budowaId: string) => void;
}) {
  const theme = useMotyw();
  const budowy = useBudowyStore((s) => s.budowy).filter((b) => budowaWToku(b));
  return (
    <Okienko widoczne tytul="Przypisz do budowy" onAnuluj={onAnuluj}>
      <Text style={{ color: theme.colors.textSecondary }}>
        Kopia „{przekrojNazwa}” trafi do zakładki Konstrukcje › Szczegóły wybranej budowy.
      </Text>
      {budowy.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>Brak aktywnych budów.</Text> : null}
      {budowy.map((b) => (
        <Naciskany
          key={b.id}
          accessibilityRole="button"
          accessibilityLabel={`Przypisz do ${b.kodBudowy}`}
          onPress={() => onWybierz(b.id)}
          style={[styles.budowa, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{b.kodBudowy}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
            {b.nazwaInwestycji} · {opisStatusu(b)} · szczegóły: {b.projekt?.szczegoly?.length ?? 0}
          </Text>
        </Naciskany>
      ))}
    </Okienko>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  pusto: { padding: 24, textAlign: 'center' },
  budowa: { borderWidth: 1, borderRadius: PROMIEN.m, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
});
