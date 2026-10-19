// ============================================================
// HARMONOGRAM – dodaj / edytuj plan: prosty (budowa, mieszanka, tony) albo zaawansowany (*) przez „Zaplanuj masę”
// ============================================================

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppHeader, Etykieta, KalendarzDnia, Pole, Przycisk, PrzyciskIkony, Wybor, isoZDaty, stylFormularza, useMotyw, ODSTEP, PROMIEN, TYPOGRAFIA,
} from '../../src/components/ui';
import { FormularzBudowy } from '../../src/components/budowa/FormularzBudowy';
import { WyborMieszanki, nazwaMieszanki } from '../../src/components/mieszanki/WyborMieszanki';
import { wstecz } from '../../src/budzet/nawigacja';
import { brakiZaawansowanego, mieszankiBudowy, mieszankiWpisu } from '../../src/harmonogram/harmonogram';
import { formatLiczby } from '../../src/utils/calculations';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useHarmonogramStore } from '../../src/stores/harmonogramStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { grupyBudow, opisStatusu } from '../../src/utils/statusBudowy';

type Tryb = 'prosty' | 'zaawansowany';
type WierszMieszanki = { mieszankaId: string; ilosc: string };

const tonyZ = (t: string) => Number(t.replace(',', '.'));

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
  const [wiersze, setWiersze] = useState<WierszMieszanki[]>(() => (
    edytowany ? mieszankiWpisu(edytowany).map((x) => ({ mieszankaId: x.mieszankaId, ilosc: String(x.ilosc).replace('.', ',') })) : []
  ));
  const [inne, setInne] = useState(false);
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
    || wiersze.some((w) => !zatwierdzone.some((m) => m.id === w.mieszankaId));
  const wybrane = wiersze.map((w) => w.mieszankaId);
  const razem = wiersze.reduce((s, w) => s + (Number.isFinite(tonyZ(w.ilosc)) ? tonyZ(w.ilosc) : 0), 0);

  const przelaczMieszanke = (mid: string) => setWiersze((obecne) => (
    obecne.some((w) => w.mieszankaId === mid) ? obecne.filter((w) => w.mieszankaId !== mid) : [...obecne, { mieszankaId: mid, ilosc: '' }]
  ));
  const ustawIlosc = (mid: string, ilosc: string) => setWiersze((obecne) => obecne.map((w) => (w.mieszankaId === mid ? { ...w, ilosc } : w)));

  const wybierzBudowe = (bid: string) => {
    setBudowaId(bid);
    setWiersze([]);
    setInne(false);
    setBlad('');
    if (brakiZaawansowanego(budowy.find((b) => b.id === bid)).length > 0) setTryb('prosty');
  };

  const zapisz = async () => {
    if (!budowaId) { setBlad('Wybierz budowę.'); return; }
    if (wiersze.length === 0) { setBlad('Wybierz co najmniej jedną mieszankę.'); return; }
    const bezIlosci = wiersze.find((w) => !(tonyZ(w.ilosc) > 0));
    if (bezIlosci) {
      const m = mieszanki.find((x) => x.id === bezIlosci.mieszankaId);
      setBlad(`Podaj ilość w tonach dla ${m ? nazwaMieszanki(m) : 'mieszanki'}.`);
      return;
    }
    const dane = {
      data,
      budowaId,
      mieszanki: wiersze.map((w) => ({ mieszankaId: w.mieszankaId, ilosc: tonyZ(w.ilosc) })),
      mieszankaId: undefined,
      ilosc: undefined,
      uwagi: uwagi.trim() || undefined,
    };
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
                <Etykieta
                  tekst="Mieszanki"
                  info="Jeden plan dnia może mieć kilka mieszanek – zaznacz każdą i podaj jej ilość. Na liście są mieszanki zatwierdzone w konstrukcjach tej budowy; „Inne” pokazuje wszystkie wytwórnie i ich mieszanki."
                />
                <View style={stylFormularza.chipy}>
                  {zatwierdzone.map((m) => (
                    <Wybor
                      key={m.id}
                      zaznaczony={wybrane.includes(m.id)}
                      etykieta={`${wybrane.includes(m.id) ? '✓ ' : ''}${nazwaMieszanki(m)}`}
                      accessibilityLabel={`Mieszanka ${nazwaMieszanki(m)}`}
                      onPress={() => przelaczMieszanke(m.id)}
                    />
                  ))}
                  <Wybor zaznaczony={pokazInne} etykieta="Inne" accessibilityLabel="Inna mieszanka" onPress={() => setInne(!inne || !pokazInne)} />
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
                      zaznaczone={wybrane}
                      onWybierz={(m) => przelaczMieszanke(m.id)}
                      pustyTekst="Brak mieszanek – dodaj je w menu Mieszanki."
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
            {wiersze.length > 0 ? (
              <View>
                <Etykieta tekst={`Ilość · ${wiersze.length} ${wiersze.length === 1 ? 'mieszanka' : wiersze.length < 5 ? 'mieszanki' : 'mieszanek'}`} />
                <View style={{ gap: ODSTEP.s }}>
                  {wiersze.map((w) => {
                    const m = mieszanki.find((x) => x.id === w.mieszankaId);
                    const nazwa = m ? nazwaMieszanki(m) : 'Mieszanka usunięta';
                    return (
                      <View key={w.mieszankaId} style={[styles.wiersz, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                        <Text style={[TYPOGRAFIA.wartosc, styles.nazwa, { color: theme.colors.text }]} numberOfLines={2}>{nazwa}</Text>
                        <View style={styles.ilosc}>
                          <Pole value={w.ilosc} onChangeText={(t) => ustawIlosc(w.mieszankaId, t)} liczba jednostka="t" placeholder="np. 120" accessibilityLabel={`Ilość ton ${nazwa}`} />
                        </View>
                        <PrzyciskIkony ikona="usun" kolor={theme.colors.danger} accessibilityLabel={`Usuń mieszankę ${nazwa}`} onPress={() => przelaczMieszanke(w.mieszankaId)} />
                      </View>
                    );
                  })}
                  {wiersze.length > 1 ? (
                    <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.text, textAlign: 'right' }]}>Razem {formatLiczby(razem)} t</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
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

const styles = StyleSheet.create({
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, borderWidth: 1, borderRadius: PROMIEN.m, paddingLeft: ODSTEP.m, paddingRight: ODSTEP.xs, paddingVertical: ODSTEP.xs },
  nazwa: { flex: 1 },
  ilosc: { width: 130 },
});
