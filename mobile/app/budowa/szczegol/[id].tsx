// Szczegół konstrukcyjny budowy: edycja kopii przekroju i pomiar łatą (szablon w geodezji pozostaje bez zmian).

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, useMotyw } from '../../../src/components/ui';
import { EdytorPrzekroju, OknoDanychPrzekroju, useEdycjaPrzekroju } from '../../../src/components/geodezja/EdytorPrzekroju';
import { useBudowyStore } from '../../../src/stores/budowyStore';
import { svgPrzekroju } from '../../../src/geodezja/rysunek';
import { usunSzczegolBudowy, zapiszSzczegolBudowy } from '../../../src/geodezja/szczegolyBudowy';
import type { PrzekrojPoprzeczny } from '../../../src/geodezja/przekroj';
import { dokumentPrzekroju } from '../../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../../src/eksport/udostepnijPdf';
import { udostepnijSvg } from '../../../src/eksport/udostepnijSvg';
import { potwierdzAkcje } from '../../../src/utils/dialog';

export default function SzczegolBudowyScreen() {
  const { id, budowaId } = useLocalSearchParams<{ id: string; budowaId: string }>();
  const theme = useMotyw();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === budowaId));
  const zapisany = budowa?.projekt?.szczegoly?.find((s) => s.id === id);
  const zapisz = (p: PrzekrojPoprzeczny) => {
    const { budowy, zapiszProjekt } = useBudowyStore.getState();
    const projekt = budowy.find((b) => b.id === budowaId)?.projekt;
    if (projekt) void zapiszProjekt(budowaId, zapiszSzczegolBudowy(projekt, p));
  };
  const { przekroj, setPrzekroj, oznaczUsuniety } = useEdycjaPrzekroju(zapisany, zapisz);
  const [oknoDane, setOknoDane] = useState(false);

  if (!budowa || !przekroj) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader tytul="Szczegół" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 24, textAlign: 'center' }}>Nie znaleziono szczegółu.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader
        tytul={przekroj.nazwa}
        podtytul={`${budowa.kodBudowy} · szczegół konstrukcji`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Edytuj', onPress: () => setOknoDane(true) }}
        udostepnij={() => udostepnijDokumentPdf(dokumentPrzekroju(przekroj))}
      />
      <EdytorPrzekroju przekroj={przekroj} setPrzekroj={setPrzekroj} />
      {oknoDane ? (
        <OknoDanychPrzekroju
          tytul="Dane szczegółu"
          przekroj={przekroj}
          onAnuluj={() => setOknoDane(false)}
          onZapisz={(z) => {
            setPrzekroj((p) => ({ ...p, ...z }));
            setOknoDane(false);
          }}
          onSvg={() => udostepnijSvg(svgPrzekroju(przekroj).svg, przekroj.nazwa)}
          tekstUsun="Usuń szczegół z budowy"
          onUsun={() => potwierdzAkcje('Usunąć szczegół?', `„${przekroj.nazwa}” zostanie usunięty z budowy ${budowa.kodBudowy}. Szablon w geodezji pozostaje.`, () => {
            oznaczUsuniety();
            const { budowy, zapiszProjekt } = useBudowyStore.getState();
            const projekt = budowy.find((b) => b.id === budowaId)?.projekt;
            if (projekt) void zapiszProjekt(budowaId, usunSzczegolBudowy(projekt, przekroj.id));
            setOknoDane(false);
            router.back();
          })}
        />
      ) : null}
    </View>
  );
}
