// ============================================================
// HARMONOGRAM – dodaj / edytuj plan: prosty (budowa, mieszanka, tony) albo zaawansowany (*) przez „Zaplanuj masę”
// ============================================================

import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppHeader, Etykieta, KalendarzDnia, Pole, Przycisk, Wybor, isoZDaty, stylFormularza, useMotyw, ODSTEP, TYPOGRAFIA,
} from '../../src/components/ui';
import { FormularzBudowy } from '../../src/components/budowa/FormularzBudowy';
import { WyborMieszanki, nazwaMieszanki } from '../../src/components/mieszanki/WyborMieszanki';
import { wstecz } from '../../src/budzet/nawigacja';
import { brakiZaawansowanego, mieszankiBudowy } from '../../src/harmonogram/harmonogram';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useHarmonogramStore } from '../../src/stores/harmonogramStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { grupyBudow, opisStatusu } from '../../src/utils/statusBudowy';

type Tryb = 'prosty' | 'zaawansowany';

export default function NowyPlanHarmonogramuScreen() {
  const theme = useMotyw();
  const { data: dataParam, id } = useLocalSearchParams<{ data?: string; id?: string }>();
  const edytowany = useHarmonogramStore((s) => s.wpisy.find((w) => w.id === id));
  const dodaj = useHarmonogramStore((s) => s.dodaj);
  const aktualizuj = useHarmonogramStore((s) => s.aktualizuj);
  const budowy = useBudowyStore((s) => s.budowy);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const dzis = isoZDaty(new Date());

  const [data, setData] = useState(edytowany?.data ?? (dataParam && dataParam >= dzis ? dataParam : dzis));
  const [budowaId, setBudowaId] = useState(edytowany?.budowaId ?? '');
  const [tryb, setTryb] = useState<Tryb>('prosty');
  const [mieszankaId, setMieszankaId] = useState(edytowany?.mieszankaId ?? '');
  const [inne, setInne] = useState(false);
  const [ilosc, setIlosc] = useState(edytowany ? String(edytowany.ilosc).replace('.', ',') : '');
  const [uwagi, setUwagi] = useState(edytowany?.uwagi ?? '');
  const [nowaBudowa, setNowaBudowa] = useState(false);
  const [blad, setBlad] = useState('');

  const wToku = useMemo(() => grupyBudow(budowy).filter((g) => g.status !== 'zakonczona').flatMap((g) => g.budowy), [budowy]);
  const budowa = budowy.find((b) => b.id === budowaId);
  const zatwierdzone = useMemo(() => {
    const ids = mieszankiBudowy(budowa);
    return mieszanki.filter((m) => ids.includes(m.id));
  }, [budowa, mieszanki]);
  const braki = brakiZaawansowanego(budowa);
  const pokazInne = inne || (!!budowa && zatwierdzone.length === 0)
    || (!!mieszankaId && !zatwierdzone.some((m) => m.id === mieszankaId));

  const wybierzBudowe = (bid: string) => {
    setBudowaId(bid);
    setMieszankaId('');
    setInne(false);
    setBlad('');
    if (brakiZaawansowanego(budowy.find((b) => b.id === bid)).length > 0) setTryb('prosty');
  };

  const zapisz = async () => {
    const tony = Number(ilosc.replace(',', '.'));
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    if (!mieszankaId) { setBlad('Wybierz mieszankę.'); return; }
    if (!Number.isFinite(tony) || tony <= 0) { setBlad('Podaj ilość masy w tonach.'); return; }
    const dane = { data, budowaId, mieszankaId, ilosc: tony, uwagi: uwagi.trim() || undefined };
    if (edytowany) await aktualizuj(edytowany.id, dane);
    else await dodaj(dane);
    wstecz('/harmonogram');
  };

  const dalejZaawansowany = () => {
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    router.replace(`/plan/nowy?budowaId=${budowaId}&data=${data}&zHarmonogramu=1` as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader
        tytul={edytowany ? 'Edytuj plan' : 'Dodaj plan'}
        lewy={{ tekst: 'Anuluj', onPress: () => wstecz('/harmonogram') }}
        prawy={tryb === 'prosty' ? { tekst: 'Zapisz', onPress: () => { void zapisz(); }, kolor: theme.colors.primary } : undefined}
      />
      <ScrollView contentContainerStyle={[stylFormularza.tresc, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <View>
          <Etykieta tekst="Dzień" />
          <KalendarzDnia wartosc={data} min={dzis} onZatwierdz={setData} accessibilityLabel="Dzień planu" />
        </View>

        <View>
          <Etykieta tekst="Budowa" info="Budowy aktywne i na gwarancji. Nową budowę dodasz tym samym formularzem co w menu Budowa." />
          <View style={stylFormularza.chipy}>
            {wToku.map((b) => (
              <Wybor
                key={b.id}
                zaznaczony={b.id === budowaId}
                etykieta={`${b.kodBudowy} · ${b.nazwaInwestycji}${b.status === 'gwarancja' ? ` (${opisStatusu(b)})` : ''}`}
                accessibilityLabel={`Budowa ${b.kodBudowy}`}
                onPress={() => wybierzBudowe(b.id)}
              />
            ))}
            <Wybor zaznaczony={false} etykieta="+ Nowa budowa" onPress={() => setNowaBudowa(true)} />
          </View>
        </View>

        {!edytowany ? (
          <View>
            <Etykieta
              tekst="Rodzaj planu"
              info="Prosty: budowa, mieszanka i ilość. Zaawansowany (*): formularz „Zaplanuj masę” – powierzchnia, ilość masy do zamówienia i liczba aut; plan trafia też na Wbudowywanie."
            />
            <View style={stylFormularza.chipy}>
              <Wybor zaznaczony={tryb === 'prosty'} etykieta="Prosty" accessibilityLabel="Plan prosty" onPress={() => setTryb('prosty')} />
              <Wybor
                zaznaczony={tryb === 'zaawansowany'}
                etykieta="Zaawansowany *"
                accessibilityLabel="Plan zaawansowany"
                onPress={() => {
                  if (!budowa) { setBlad('Najpierw wybierz budowę.'); return; }
                  if (braki.length === 0) { setTryb('zaawansowany'); setBlad(''); }
                }}
              />
            </View>
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, marginTop: ODSTEP.xs }]}>
              {!budowa
                ? '* Dostępny dla budów z plikami XFDF (obszary na PZT) i skonfigurowanymi konstrukcjami.'
                : braki.length
                  ? `* Niedostępny dla ${budowa.kodBudowy} – brakuje: ${braki.join(', ')}.`
                  : `* Dostępny dla ${budowa.kodBudowy}.`}
            </Text>
          </View>
        ) : null}

        {tryb === 'zaawansowany' ? (
          <Przycisk tekst="Dalej: Zaplanuj masę *" ikona="dalej" onPress={dalejZaawansowany} />
        ) : (
          <>
            {budowa ? (
              <View>
                <Etykieta tekst="Mieszanka" info="Mieszanki zatwierdzone w konstrukcjach tej budowy. „Inne” pokazuje wszystkie wytwórnie i ich mieszanki." />
                <View style={stylFormularza.chipy}>
                  {zatwierdzone.map((m) => (
                    <Wybor
                      key={m.id}
                      zaznaczony={!pokazInne && m.id === mieszankaId}
                      etykieta={nazwaMieszanki(m)}
                      accessibilityLabel={`Mieszanka ${nazwaMieszanki(m)}`}
                      onPress={() => { setMieszankaId(m.id); setInne(false); }}
                    />
                  ))}
                  <Wybor zaznaczony={pokazInne} etykieta="Inne" accessibilityLabel="Inna mieszanka" onPress={() => setInne(true)} />
                </View>
                {zatwierdzone.length === 0 ? (
                  <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, marginTop: ODSTEP.xs }]}>
                    Budowa nie ma jeszcze zatwierdzonych mieszanek – wybierz z listy wytwórni.
                  </Text>
                ) : null}
                {pokazInne ? (
                  <View style={{ marginTop: ODSTEP.s }}>
                    <WyborMieszanki
                      mieszanki={mieszanki}
                      zaznaczone={mieszankaId ? [mieszankaId] : []}
                      onWybierz={(m) => setMieszankaId(m.id)}
                      pustyTekst="Brak mieszanek – dodaj je w menu Mieszanki."
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
            <Pole etykieta="Ilość" value={ilosc} onChangeText={setIlosc} liczba jednostka="t" placeholder="np. 120" accessibilityLabel="Ilość ton" />
            <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="opcjonalnie" multiline />
            <Przycisk tekst={edytowany ? 'Zapisz zmiany' : 'Zapisz plan'} onPress={() => { void zapisz(); }} />
          </>
        )}
        {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
      </ScrollView>

      <FormularzBudowy
        widoczny={nowaBudowa}
        onZamknij={() => setNowaBudowa(false)}
        onZapisano={(nid) => { setNowaBudowa(false); wybierzBudowe(nid); }}
      />
    </View>
  );
}
