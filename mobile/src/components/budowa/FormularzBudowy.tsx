// Formularz budowy (nowa i edycja): kod, nazwa, status i opcjonalny koniec gwarancji.
// Ten sam w menu Budowa, na karcie budowy i przy dodawaniu planu w Harmonogramie.

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeModal } from '../common/SafeModal';
import { Etykieta, KalendarzDnia, Pole, Wiersz, Wybor, stylFormularza, useMotyw } from '../ui';
import { useBudowyStore } from '../../stores/budowyStore';
import { pustyProjektBudowy } from '../../utils/projektBudowy';
import { STATUSY_BUDOWY, dzisIso, zapisanyStatus, type StatusBudowy } from '../../utils/statusBudowy';
import type { Budowa } from '../../types';

const zaRok = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return dzisIso(d);
};

export function FormularzBudowy({ widoczny, budowa, onZamknij, onZapisano }: {
  widoczny: boolean;
  /** Brak = nowa budowa. */
  budowa?: Budowa;
  onZamknij: () => void;
  onZapisano?: (id: string) => void;
}) {
  const theme = useMotyw();
  const dodajBudowe = useBudowyStore((s) => s.dodajBudowe);
  const edytujBudowe = useBudowyStore((s) => s.edytujBudowe);
  const [kod, setKod] = useState('');
  const [nazwa, setNazwa] = useState('');
  const [status, setStatus] = useState<StatusBudowy>('aktywna');
  const [zDniem, setZDniem] = useState(false);
  const [gwarancjaDo, setGwarancjaDo] = useState(zaRok());
  const [blad, setBlad] = useState('');

  useEffect(() => {
    if (!widoczny) return;
    setKod(budowa?.kodBudowy ?? '');
    setNazwa(budowa?.nazwaInwestycji ?? '');
    setStatus(budowa ? zapisanyStatus(budowa) : 'aktywna');
    setZDniem(!!budowa?.gwarancjaDo);
    setGwarancjaDo(budowa?.gwarancjaDo ?? zaRok());
    setBlad('');
  }, [widoczny, budowa]);

  const zapisz = async () => {
    if (!kod.trim()) { setBlad('Podaj kod budowy (np. B128).'); return; }
    if (!nazwa.trim()) { setBlad('Podaj nazwę inwestycji.'); return; }
    const dane = {
      kodBudowy: kod.trim().toUpperCase(),
      nazwaInwestycji: nazwa.trim(),
      status,
      gwarancjaDo: status === 'gwarancja' && zDniem ? gwarancjaDo : undefined,
    };
    if (budowa) {
      await edytujBudowe(budowa.id, dane);
      onZapisano?.(budowa.id);
    } else {
      const id = await dodajBudowe({ ...dane, projekt: pustyProjektBudowy() });
      onZapisano?.(id);
    }
  };

  return (
    <SafeModal
      visible={widoczny}
      tytul={budowa ? 'Edytuj budowę' : 'Nowa budowa'}
      theme={theme}
      onClose={onZamknij}
      prawy={{ tekst: budowa ? 'Zapisz' : 'Utwórz', onPress: () => { void zapisz(); }, kolor: theme.colors.primary }}
    >
      <View style={stylFormularza.tresc}>
        <Wiersz proporcje={[1, 2.4]}>
          <Pole etykieta="Kod" value={kod} onChangeText={(t) => setKod(t.toUpperCase())} placeholder="B128" accessibilityLabel="Kod budowy" />
          <Pole etykieta="Nazwa inwestycji" value={nazwa} onChangeText={setNazwa} placeholder="np. DK25 Mąkowarsko" accessibilityLabel="Nazwa inwestycji" />
        </Wiersz>
        <Etykieta tekst="Status" info="Gwarancja z datą końca po tym dniu sama przechodzi do zakończonych. Planować można na budowach aktywnych i w gwarancji." />
        <View style={stylFormularza.chipy}>
          {STATUSY_BUDOWY.map((s) => (
            <Wybor key={s.id} zaznaczony={status === s.id} etykieta={s.nazwa} accessibilityLabel={`Status ${s.nazwa}`} onPress={() => setStatus(s.id)} />
          ))}
        </View>
        {status === 'gwarancja' ? (
          <>
            <Wybor
              zaznaczony={zDniem}
              etykieta={zDniem ? '☑ Gwarancja do dnia' : '☐ Gwarancja do dnia (opcjonalnie)'}
              accessibilityLabel="Gwarancja do dnia"
              onPress={() => setZDniem((v) => !v)}
            />
            {zDniem ? <KalendarzDnia wartosc={gwarancjaDo} onZatwierdz={setGwarancjaDo} accessibilityLabel="Koniec gwarancji" /> : null}
          </>
        ) : null}
        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
      </View>
    </SafeModal>
  );
}
