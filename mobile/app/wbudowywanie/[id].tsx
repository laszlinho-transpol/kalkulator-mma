// ============================================================
// EKRAN: WBUDOWYWANIE – Live Tracker (Plan / Kontrola / Live)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, useColorScheme, Alert, KeyboardAvoidingView,
  Platform, Modal, Pressable, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { usePlanPoId } from '../../src/hooks/usePlanPoId';
import { useWpisyDlaPlanu } from '../../src/hooks/useWpisyDlaPlanu';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { DzialkaSketch, type WpisLiveMarker } from '../../src/components/sketch/DzialkaSketch';
import { PlanCalySketch } from '../../src/components/sketch/PlanCalySketch';
import { AppHeader } from '../../src/components/common/AppHeader';
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import { SafeModal } from '../../src/components/common/SafeModal';
import { ZalacznikiViewer } from '../../src/components/common/ZalacznikiViewer';
import { TabelaAut } from '../../src/components/plan/TabelaAut';
import { generujRaportPDF } from '../../src/utils/pdfGenerator';
import { gruboscWbudowywania, gruboscProjektowa, formatujTolerancje, kolorUzyskanejGrubosci, kolorGrubosciDoHex } from '../../src/utils/grubosc';
import {
  obliczWynikiDzialki, obliczLacznaDlugosc, obliczKontrolę,
  obliczPowierzchnioweOdStartu, formatLiczby, obliczTabeleAutPlanu,
} from '../../src/utils/calculations';
import {
  obliczKontrolePlanu,
  obliczPodsumowaniePlanuDnia,
  budujSegmentyPlanu,
  metryOdMasyPlanu,
  budujFiguryPlanu,
  obliczMarkeryPlanuCiaglego,
  obliczPodsumowanieOdcinkaPlanu,
  sortujWpisyPlanu,
} from '../../src/utils/planCiagly';
import { formatujDatePl, aktualnaGodzina } from '../../src/utils/dates';
import {
  znajdzAktywnaDzialke,
  rozdzielMetryNaDzialki,
  obliczBilansLivePlanu,
  dzialkiDoAutoZamkniecia,
  nastepnyNumerAuta,
} from '../../src/utils/liveProgress';
import type { DzialkaRobocza, WpisLive } from '../../src/types';

type ZakladkaTyp = 'plan' | 'kontrola' | 'live' | 'pzt';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
/** Wysokość okna przewijania szkicu LIVE – ~42% ekranu, min 260 / max 520 px */
const VIEWPORT_SZKICU_LIVE = Math.min(Math.max(SCREEN_H * 0.42, 260), 520);

// Kolumny tabeli Live (przewijane poziomo)
const KOLUMNY = [
  { id: 'auto', label: '#', width: 36 },
  { id: 'mg', label: 'Mg', width: 56 },
  { id: 'metry', label: 'm', width: 56 },
  { id: 'grubosc', label: 'Gr.', width: 56 },
  { id: 'doKonca', label: 'Do końca m', width: 80 },
  { id: 'godzina', label: 'Godz.', width: 56 },
];

export default function WbudowywanieDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId();
  const plan = usePlanPoId(id);
  const archiwizujPlan = usePlanyStore((s) => s.archiwizujPlan);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const budowy = useBudowyStore((s) => s.budowy);
  const {
    sesje, dodajAutoZRozbiciem, edytujWpisAuta, usunWpisAuta,
    czyDzialkaZakonczona, oznaczOstatnieAuto, wznowDzialke,
  } = useLiveStore();
  const wpisyCalegoPlanu = useWpisyDlaPlanu(id);

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');

  // Kontrola
  const [wbudowaneTonyStr, setWbudowaneTony] = useState('');
  const [przejechaneMetryStr, setPrzejechaneMetry] = useState('');

  // Nowy wpis Live
  const [nowyTonaz, setNowyTonaz] = useState('');
  const [nowyMetry, setNowyMetry] = useState('');
  const [nowyKomentarz, setNowyKomentarz] = useState('');
  const [nowyGodzina, setNowyGodzina] = useState(aktualnaGodzina());
  const [edytowanyWpisId, setEdytowanyWpisId] = useState<string | null>(null);

  // Modal auta
  const [autaModal, setAutaModal] = useState<{ wpis: WpisLive } | null>(null);
  const [autaModalZakladka, setAutaModalZakladka] = useState<'szczegoły' | 'odcinek'>('szczegoły');
  const [viewerPzt, setViewerPzt] = useState(false);
  const [generujeRaport, setGenerujeRaport] = useState(false);

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Wbudowywanie" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.danger, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const ciezarPoMieszance = (mId: string) => mieszanki.find((m) => m.id === mId)?.ciezarObjetosciowy;
  const budowa = plan.budowaId ? budowy.find((b) => b.id === plan.budowaId) : undefined;
  const zalacznikiPzt = budowa?.zalaczniki?.length
    ? budowa.zalaczniki
    : (plan.zalaczniki ?? []);


  const tabeleAutPlanu = obliczTabeleAutPlanu(
    plan.dzialki,
    plan.rzuty,
    plan.tonazAuta,
    (mId) => ciezarPoMieszance(mId),
  );
  const podsumowanieDnia = obliczPodsumowaniePlanuDnia(plan, ciezarPoMieszance, tabeleAutPlanu);
  const aktywnaDzialka = znajdzAktywnaDzialke(plan, wpisyCalegoPlanu, sesje);
  const dzialkaDoWpisu = aktywnaDzialka?.dzialka ?? plan.dzialki[plan.dzialki.length - 1];
  const dzialkaZakonczonaWpisu = dzialkaDoWpisu ? czyDzialkaZakonczona(plan.id, dzialkaDoWpisu.id) : false;
  const kolejnyNumerAuta = nastepnyNumerAuta(wpisyCalegoPlanu);
  const bilansPlanu = obliczBilansLivePlanu(
    plan,
    wpisyCalegoPlanu,
    ciezarPoMieszance,
  );
  const segmentyPlanu = budujSegmentyPlanu(plan.dzialki, ciezarPoMieszance);
  const figuryPlanu = budujFiguryPlanu(plan, ciezarPoMieszance);
  const markeryPlanu = obliczMarkeryPlanuCiaglego(plan, wpisyCalegoPlanu);
  const wpisyLivePosortowane = sortujWpisyPlanu(plan, wpisyCalegoPlanu);
  const mapaMetrowWpisu = new Map(markeryPlanu.map((m) => [m.wpis.id, m.metryKumulatywne]));

  const tonNowyLive = parseFloat(nowyTonaz.replace(',', '.'));
  const metryPlanowaneLive = !edytowanyWpisId && !isNaN(tonNowyLive) && tonNowyLive > 0
    ? metryOdMasyPlanu(segmentyPlanu, bilansPlanu.lacznyTonaz + tonNowyLive)
    : null;

  // Kontrola całego dnia
  const tonyK = parseFloat(wbudowaneTonyStr.replace(',', '.'));
  const metryK = parseFloat(przejechaneMetryStr.replace(',', '.'));
  const metryPlanowane = !isNaN(tonyK) && tonyK > 0
    ? metryOdMasyPlanu(segmentyPlanu, tonyK)
    : null;
  const wynikiKontroli = !isNaN(tonyK) && !isNaN(metryK) && tonyK > 0 && metryK > 0
    ? obliczKontrolePlanu(plan, tonyK, metryK, ciezarPoMieszance)
    : null;

  const obliczWierszLive = (wpis: WpisLive) => {
    const dz = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
    const mie = dz ? getMieszanka(dz.mieszankaId) : undefined;
    const metryKum = mapaMetrowWpisu.get(wpis.id) ?? 0;
    if (!dz || !mie) return { grubosc: 0, doKoncaM: 0, grPlan: 0 };
    const powJednego = obliczPowierzchnioweOdStartu(dz, wpis.przejechaneMetry);
    const gr = powJednego > 0 ? (wpis.tonazPrzywieziony / (mie.ciezarObjetosciowy * powJednego)) * 100 : 0;
    const doK = Math.max(0, bilansPlanu.lacznaDlugoscPlanu - metryKum);
    return { grubosc: gr, doKoncaM: doK, grPlan: gruboscWbudowywania(dz) };
  };

  const zakonczIArchiwizuj = () => Alert.alert(
    'Zakończ i archiwizuj',
    'Plan zostanie przeniesiony do archiwum. Wygenerujemy raport PDF do wysłania.',
    [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Zakończ i wyślij raport',
        style: 'destructive',
        onPress: async () => {
          setGenerujeRaport(true);
          try {
            await generujRaportPDF({
              plan, wpisyLive: wpisyCalegoPlanu, mieszanki,
              budowa: budowa ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji } : undefined,
            });
            await archiwizujPlan(plan.id);
            router.replace('/archiwum' as any);
          } catch {
            Alert.alert('Uwaga', 'Plan zarchiwizowany, ale nie udało się wygenerować raportu PDF.');
            await archiwizujPlan(plan.id);
            router.replace('/archiwum' as any);
          } finally {
            setGenerujeRaport(false);
          }
        },
      },
      {
        text: 'Tylko archiwizuj',
        onPress: async () => {
          await archiwizujPlan(plan.id);
          router.replace('/archiwum' as any);
        },
      },
    ],
  );

  const ostatnieAuto = () => {
    const dz = aktywnaDzialka?.dzialka;
    if (!dz) return;
    if (czyDzialkaZakonczona(plan.id, dz.id)) {
      Alert.alert('Wznów działkę', 'Czy chcesz wznowić rozpisywanie aut na tej działce?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wznów', onPress: () => wznowDzialke(plan.id, dz.id) },
      ]);
      return;
    }
    Alert.alert('Ostatnie auto', `Kończysz działkę „${dz.nazwa}”. Kolejne auto będzie na następnej działce.`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Zakończ działkę',
        onPress: async () => {
          await oznaczOstatnieAuto(plan.id, dz.id);
          const next = (aktywnaDzialka?.idx ?? 0) + 1;
          if (next < plan.dzialki.length) {
            Alert.alert(
              'Przejście do kolejnej działki',
              `${plan.dzialki[next].nazwa}\nKolejne auto: #${kolejnyNumerAuta}`,
            );
          }
        },
      },
    ]);
  };

  const dodajWpisLive = async () => {
    const ton = parseFloat(nowyTonaz.replace(',', '.'));
    const met = parseFloat(nowyMetry.replace(',', '.'));
    if (isNaN(ton) || ton <= 0) { Alert.alert('Błąd', 'Podaj prawidłowy tonaż.'); return; }
    if (isNaN(met) || met <= 0) { Alert.alert('Błąd', 'Podaj prawidłowe metry.'); return; }
    if (edytowanyWpisId) {
      await edytujWpisAuta(edytowanyWpisId, {
        tonazPrzywieziony: ton,
        przejechaneMetry: met,
        komentarz: nowyKomentarz.trim() || undefined,
        godzinaWybudowania: nowyGodzina,
      });
      setEdytowanyWpisId(null);
    } else {
      if (!aktywnaDzialka) {
        Alert.alert('Plan ukończony', 'Wszystkie działki są zakończone. Możesz zarchiwizować plan.');
        return;
      }
      const segmenty = rozdzielMetryNaDzialki(plan, wpisyCalegoPlanu, sesje, met, ton);
      if (segmenty.length === 0) {
        Alert.alert('Brak miejsca', 'Nie można rozdzielić metrów – sprawdź postęp na działkach.');
        return;
      }
      const doZamkniecia = dzialkiDoAutoZamkniecia(plan, wpisyCalegoPlanu, sesje, segmenty);
      await dodajAutoZRozbiciem(
        {
          planId: plan.id,
          numerAuta: kolejnyNumerAuta,
          komentarz: nowyKomentarz.trim() || undefined,
          godzinaWybudowania: nowyGodzina,
        },
        segmenty.map((s) => ({ dzialkaId: s.dzialkaId, tonaz: s.tonaz, metry: s.metry })),
      );
      for (const dzId of doZamkniecia) {
        await oznaczOstatnieAuto(plan.id, dzId);
      }
      if (segmenty.length > 1 || doZamkniecia.length > 0) {
        const nazwy = segmenty.map((s) => plan.dzialki[s.dzialkaIdx]?.nazwa).filter(Boolean).join(' → ');
        const msg = segmenty.length > 1
          ? `Auto #${kolejnyNumerAuta} rozłożone na: ${nazwy}`
          : doZamkniecia.length > 0
            ? `Działka „${plan.dzialki.find((d) => d.id === doZamkniecia[0])?.nazwa}” ukończona – kolejne auto na następnej.`
            : '';
        if (msg) Alert.alert('Postęp LIVE', msg);
      }
    }
    setNowyTonaz(''); setNowyMetry(''); setNowyKomentarz(''); setNowyGodzina(aktualnaGodzina());
  };

  const rozpocznijEdycjeWpisu = (wpis: WpisLive) => {
    setEdytowanyWpisId(wpis.id);
    setNowyTonaz(String(wpis.tonazPrzywieziony));
    setNowyMetry(String(wpis.przejechaneMetry));
    setNowyKomentarz(wpis.komentarz ?? '');
    setNowyGodzina(wpis.godzinaWybudowania);
  };

  const anulujEdycjeWpisu = () => {
    setEdytowanyWpisId(null);
    setNowyTonaz(''); setNowyMetry(''); setNowyKomentarz(''); setNowyGodzina(aktualnaGodzina());
  };

  // Selektor działki – usunięty (kontrola i LIVE = cały odcinek dnia)

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        podtytul={plan.dzialki.length > 1 ? `Całość dnia · ${plan.dzialki.length} działki` : plan.dzialki[0]?.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: generujeRaport ? '…' : 'Zakończ', onPress: zakonczIArchiwizuj, kolor: '#fff', tlo: theme.colors.danger }}
      />

      <AnimatedTabBar
        tabs={[
          { id: 'plan', etykieta: 'Plan' },
          { id: 'kontrola', etykieta: 'Kontrola' },
          { id: 'live', etykieta: '● Live' },
          ...(zalacznikiPzt.length > 0 ? [{ id: 'pzt', etykieta: 'PZT' }] : []),
        ]}
        aktywnaId={aktywnaZakladka}
        onChange={(id) => setZakladka(id as ZakladkaTyp)}
        akcentKolor={aktywnaZakladka === 'live' ? theme.colors.success : theme.colors.primary}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ======== PLAN ======== */}
          {aktywnaZakladka === 'plan' && (
            <>
              <View style={[styles.karta, { backgroundColor: `${theme.colors.primary}10`, borderColor: theme.colors.primary }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>Podsumowanie całego dnia</Text>
                <IR label="Działki robocze" v={String(podsumowanieDnia.liczbaDzialek)} theme={theme} />
                <IR label="Łączna masa do wbudowania" v={`${formatLiczby(podsumowanieDnia.lacznaMasa, 3)} Mg`} theme={theme} bold />
                <IR label="Łączna powierzchnia" v={`${formatLiczby(podsumowanieDnia.lacznaPowierzchnia)} m²`} theme={theme} />
                <IR label="Łącznie metrów" v={`${formatLiczby(podsumowanieDnia.laczneMetry)} m`} theme={theme} />
                <IR label="Samochodów (plan)" v={String(podsumowanieDnia.lacznaIloscAut)} theme={theme} bold />
              </View>
              {plan.dzialki.map((dz) => {
            const mie = getMieszanka(dz.mieszankaId);
            if (!mie) return null;
            const wyniki = obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta);
            const wBiez = wpisyCalegoPlanu.filter((w) => w.dzialkaId === dz.id);
            const tabelaDz = tabeleAutPlanu.dzialki.find((t) => t.dzialkaId === dz.id);
            const cumMDz: WpisLiveMarker[] = [];
            let c = 0;
            for (const w of wBiez) { c += w.przejechaneMetry; cumMDz.push({ wpis: w, metryKumulatywne: c }); }
            return (
              <View key={dz.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>
                  {dz.nazwa}
                  {tabelaDz ? `  (auta ${tabelaDz.numerAutaOd}–${tabelaDz.numerAutaDo})` : ''}
                </Text>
                <IR label="Mieszanka" v={`${mie.rodzaj}  ρ=${mie.ciezarObjetosciowy.toFixed(3)}`} theme={theme} />
                <IR label="Grubość projektowa" v={`${gruboscProjektowa(dz)} cm`} theme={theme} />
                <IR label="Tolerancja" v={formatujTolerancje(dz)} theme={theme} />
                <IR label="Grubość wbudowywania" v={`${gruboscWbudowywania(dz)} cm`} theme={theme} />
                <IR label="Masa" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} bold />
                <IR label="Samochodów (plan)" v={`${wyniki.iloscSamochodow}`} theme={theme} bold />
                <IR label="Metrów" v={`${formatLiczby(obliczLacznaDlugosc(dz))} m`} theme={theme} />
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text, marginBottom: 8 }]}>Rozpiska samochodów</Text>
                  <TabelaAut
                    dzialka={dz}
                    tonazAuta={plan.tonazAuta}
                    rzuty={plan.rzuty}
                    ciezarObjetosciowy={mie.ciezarObjetosciowy}
                    theme={theme}
                    wiersze={tabelaDz?.wiersze}
                    naglowek={tabelaDz ? {
                      doWbudowania: `${formatLiczby(tabelaDz.wiersze.reduce((s, w) => s + w.masa, 0), 2)} Mg`,
                      iloscAut: `${tabelaDz.numerAutaOd}–${tabelaDz.numerAutaDo}`,
                      rzuty: [...new Set(tabelaDz.wiersze.map((w) => w.numerRzutu))].join('+'),
                      lacznieMetrow: `${formatLiczby(obliczLacznaDlugosc(dz))} m`,
                    } : undefined}
                  />
                </View>
                <View style={{ marginTop: 12 }}>
                  <DzialkaSketch
                    dzialka={dz}
                    ciezarObjetosciowy={mie.ciezarObjetosciowy}
                    wykonaneMetry={wBiez.reduce((s, w) => s + w.przejechaneMetry, 0)}
                    markery={cumMDz}
                    onTruckPress={(wpis) => { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }}
                  />
                </View>
              </View>
            );
          })}
            </>
          )}

          {/* ======== KONTROLA ======== */}
          {aktywnaZakladka === 'kontrola' && (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Kontrola całego dnia</Text>
              <Text style={[styles.opisMaly, { color: theme.colors.textSecondary }]}>
                Wpisz łączne tony i metry od startu pierwszej działki – program pokaże pozycję na całym odcinku.
              </Text>
              <NumInput label="Wbudowane tony [Mg]" value={wbudowaneTonyStr} onChange={setWbudowaneTony} theme={theme} />
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>Gdzie powinniśmy dojechać</Text>
                <View style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                    {metryPlanowane != null ? `${formatLiczby(metryPlanowane)} m od startu` : '— wpisz tony powyżej —'}
                  </Text>
                </View>
              </View>
              <NumInput label="Przejechane metry [m] od startu" value={przejechaneMetryStr} onChange={setPrzejechaneMetry} theme={theme} />
              {wynikiKontroli ? (
                <View style={styles.wynikKontroli}>
                  <Text style={[styles.wynikNagl, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>Wyniki porównania:</Text>
                  {wynikiKontroli.lokalizacja && (
                    <WynikRow
                      label="Pozycja na planie"
                      wartosc={`${wynikiKontroli.lokalizacja.dzialkaNazwa}, ${formatLiczby(wynikiKontroli.lokalizacja.metryWDzialce)} m w działce`}
                      theme={theme}
                    />
                  )}
                  <WynikRow label="Metry od startu (fakt)" wartosc={`${formatLiczby(wynikiKontroli.lokalizacja?.metryGlobalne ?? metryK)} m`} theme={theme} />
                  <WynikRow label="Metry od startu (wg ton)" wartosc={`${formatLiczby(wynikiKontroli.metryPlanowaneOdTonow)} m`} theme={theme} />
                  <WynikRow label="Zakryta powierzchnia" wartosc={`${formatLiczby(wynikiKontroli.zakrytaPowierzchnia)} m²`} theme={theme} />
                  <WynikRow label="Uzyskana grubość" wartosc={`${formatLiczby(wynikiKontroli.uzyskanaGrubosc)} cm`} theme={theme} />
                  <WynikRowBilans bilans={wynikiKontroli.bilansMasy} theme={theme} />
                  <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                  <WynikRow label="Do końca metrów (plan)" wartosc={`${formatLiczby(wynikiKontroli.pozostaloMetrow)} m`} theme={theme} />
                  <WynikRow label="Do wbudowania pow." wartosc={`${formatLiczby(wynikiKontroli.pozostaloPowierzchni)} m²`} theme={theme} />
                  <WynikRow label={`Do wbudowania wg planu (${formatLiczby(wynikiKontroli.sredniaGruboscPlanu)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgZalozen, 2)} Mg`} theme={theme} />
                  <WynikRow label={`Do wbudowania wg śr. (${formatLiczby(wynikiKontroli.uzyskanaGrubosc, 2)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgSredniej, 2)} Mg`} theme={theme} />
                </View>
              ) : (
                <View style={[styles.wynikPuste, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Wpisz tony i metry od startu planu, aby zobaczyć porównanie.</Text>
                </View>
              )}
            </View>
          )}

          {/* ======== LIVE ======== */}
          {aktywnaZakladka === 'live' && (
              <>
                <View style={[styles.karta, { backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.success }]}>
                    <Text style={[styles.kartaTytul, { color: theme.colors.success }]}>Bilans całego planu</Text>
                    <IR label="Aut (łącznie)" v={String(bilansPlanu.liczbaAut)} theme={theme} bold />
                    <IR label="Wbudowano" v={`${formatLiczby(bilansPlanu.lacznyTonaz, 2)} Mg`} theme={theme} bold />
                    <IR label="Przejechano" v={`${formatLiczby(bilansPlanu.laczneMetry)} m`} theme={theme} />
                    <IR label="Zakryta powierzchnia" v={`${formatLiczby(bilansPlanu.zakrytaPowierzchnia)} m²`} theme={theme} />
                    {bilansPlanu.sredniaGrubosc > 0 && (
                      <IR label="Śr. grubość" v={`${formatLiczby(bilansPlanu.sredniaGrubosc, 2)} cm`} theme={theme} />
                    )}
                    <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                    <IR label="Pozostało pow." v={`${formatLiczby(bilansPlanu.pozostalaPowierzchnia)} m²`} theme={theme} />
                    <IR label="Do końca metrów" v={`${formatLiczby(bilansPlanu.pozostaloMetrow)} m`} theme={theme} />
                    <IR label="Do wbudowania (plan)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgPlanu, 2)} Mg`} theme={theme} />
                    <IR label="Do wbudowania (śr. grub.)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgSredniej, 2)} Mg`} theme={theme} />
                    {aktywnaDzialka && (
                      <Text style={[styles.opisMaly, { color: theme.colors.success, marginTop: 8, fontWeight: '600' }]}>
                        ● Aktywna działka: {aktywnaDzialka.dzialka.nazwa}
                      </Text>
                    )}
                  </View>

                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>Szkic planu dnia</Text>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                    Jeden ciągły odcinek – przewiń w pionie, aby przejrzeć cały plan.
                  </Text>
                  <View style={styles.szkicRow}>
                    <View style={[styles.szkicLewy, { maxHeight: VIEWPORT_SZKICU_LIVE, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator bounces={false} contentContainerStyle={{ paddingVertical: 4 }}>
                        <PlanCalySketch
                          figuryPlanu={figuryPlanu}
                          wykonaneMetryGlobalne={bilansPlanu.laczneMetry}
                          markery={markeryPlanu}
                          onTruckPress={(wpis) => { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }}
                        />
                      </ScrollView>
                    </View>
                    <View style={[styles.szkicPanel, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <PanelStat label="Aut" wartosc={String(bilansPlanu.liczbaAut)} theme={theme} kolor={theme.colors.primary} />
                      <PanelStat label="Mg" wartosc={formatLiczby(bilansPlanu.lacznyTonaz, 2)} theme={theme} kolor={theme.colors.text} />
                      <PanelStat label="m" wartosc={formatLiczby(bilansPlanu.laczneMetry)} theme={theme} kolor={theme.colors.text} />
                      {bilansPlanu.sredniaGrubosc > 0 && (
                        <PanelStat label="Śr.gr." wartosc={`${formatLiczby(bilansPlanu.sredniaGrubosc, 2)} cm`} theme={theme} kolor={theme.colors.success} />
                      )}
                    </View>
                  </View>
                </View>

                {wpisyLivePosortowane.length > 0 && (
                  <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Tabela aut – cały plan</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        <View style={[styles.tabelaNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
                          {KOLUMNY.map((k) => (
                            <Text key={k.id} style={[styles.tabelaNaglTekst, { width: k.width, color: theme.colors.textSecondary }]}>{k.label}</Text>
                          ))}
                          <Text style={[styles.tabelaNaglTekst, { width: 72, color: theme.colors.textSecondary }]}>Działka</Text>
                          <Text style={[styles.tabelaNaglTekst, { width: 32, color: theme.colors.textSecondary }]} />
                          <Text style={[styles.tabelaNaglTekst, { width: 32, color: theme.colors.textSecondary }]} />
                        </View>
                        {wpisyLivePosortowane.map((wpis) => {
                          const dz = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
                          const { grubosc: grW, doKoncaM, grPlan } = obliczWierszLive(wpis);
                          const przepal = grW > grPlan + 0.2;
                          const niedomiar = grW < grPlan - 0.2;
                          return (
                            <View key={wpis.id}>
                              <View style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border }]}>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[0].width, color: theme.colors.textSecondary }]}>{wpis.numerAuta}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[1].width, color: theme.colors.text }]}>{formatLiczby(wpis.tonazPrzywieziony)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[2].width, color: theme.colors.text }]}>{formatLiczby(wpis.przejechaneMetry)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[3].width, color: przepal ? theme.colors.danger : niedomiar ? theme.colors.warning : theme.colors.success }]}>
                                  {grW > 0 ? `${formatLiczby(grW)} ${przepal ? '▲' : niedomiar ? '▼' : ''}` : '–'}
                                </Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[4].width, color: theme.colors.text }]}>{formatLiczby(doKoncaM)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[5].width, color: theme.colors.text }]}>{wpis.godzinaWybudowania}</Text>
                                <Text style={[styles.tabelaKom, { width: 72, color: theme.colors.textSecondary, fontSize: 10 }]} numberOfLines={1}>{dz?.nazwa ?? '—'}</Text>
                                <TouchableOpacity onPress={() => rozpocznijEdycjeWpisu(wpis)} style={{ width: 32, alignItems: 'center' }}>
                                  <Text style={{ color: theme.colors.info, fontSize: 15 }}>✎</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Alert.alert('Usuń auto', `Usunąć auto #${wpis.numerAuta} (wszystkie segmenty na planie)?`, [
                                  { text: 'Anuluj', style: 'cancel' },
                                  { text: 'Usuń', style: 'destructive', onPress: () => usunWpisAuta(wpis.id) },
                                ])} style={{ width: 32, alignItems: 'center' }}>
                                  <Text style={{ color: theme.colors.danger, fontSize: 16 }}>✕</Text>
                                </TouchableOpacity>
                              </View>
                              {wpis.komentarz ? (
                                <Text style={[styles.komentarzTekst, { color: theme.colors.textSecondary, borderBottomColor: theme.colors.border }]}>💬 {wpis.komentarz}</Text>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <View style={[styles.livePodsumWrap, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
                      <IR label="Pozostało pow." v={`${formatLiczby(bilansPlanu.pozostalaPowierzchnia)} m²`} theme={theme} />
                      <IR label="Do końca metrów" v={`${formatLiczby(bilansPlanu.pozostaloMetrow)} m`} theme={theme} />
                      <IR label="Do wbudowania (plan)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgPlanu, 2)} Mg`} theme={theme} />
                    </View>
                  </View>
                )}

                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: edytowanyWpisId ? theme.colors.warning : theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
                    {edytowanyWpisId
                      ? `Edycja auta #${wpisyCalegoPlanu.find((w) => w.id === edytowanyWpisId)?.numerAuta ?? '?'}`
                      : `Auto #${kolejnyNumerAuta}`}
                  </Text>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                    {edytowanyWpisId
                      ? 'Edycja istniejącego wpisu – metry nie są automatycznie rozdzielane.'
                      : aktywnaDzialka
                        ? `Program sam liczy pozycję od „${aktywnaDzialka.dzialka.nazwa}” – metry mogą przejść na kolejne działki.`
                        : 'Wszystkie działki zakończone.'}
                    {dzialkaZakonczonaWpisu && !edytowanyWpisId ? ' (aktywna działka zakończona – wznów lub dodaj metry na kolejnej)' : ''}
                  </Text>
                  <NumInput label="Tonaż [Mg]" value={nowyTonaz} onChange={setNowyTonaz} theme={theme} placeholder={String(plan.tonazAuta)} />
                  {!edytowanyWpisId && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>Gdzie powinniśmy dojechać</Text>
                      <View style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                          {metryPlanowaneLive != null
                            ? `${formatLiczby(metryPlanowaneLive)} m od startu planu`
                            : '— wpisz tonaż powyżej —'}
                        </Text>
                      </View>
                    </View>
                  )}
                  <NumInput label="Przejechane metry [m]" value={nowyMetry} onChange={setNowyMetry} theme={theme} />
                  <View style={styles.godzinWrap}>
                    <Text style={[styles.godzLabel, { color: theme.colors.textSecondary }]}>Godz. wybudowania</Text>
                    <TextInput style={[styles.godzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyGodzina} onChangeText={setNowyGodzina} maxLength={5} placeholder="HH:MM" placeholderTextColor={theme.colors.textSecondary} keyboardType="numbers-and-punctuation" />
                  </View>
                  <TextInput style={[styles.komentarzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyKomentarz} onChangeText={setNowyKomentarz} placeholder="Komentarz / uwagi (opcjonalnie)" placeholderTextColor={theme.colors.textSecondary} multiline />
                  <TouchableOpacity style={[styles.btnDodajAuto, { backgroundColor: edytowanyWpisId ? theme.colors.warning : theme.colors.success }]} onPress={dodajWpisLive}>
                    <Text style={styles.btnDodajAutoTekst}>{edytowanyWpisId ? '✓ Zapisz zmiany' : `+ Dodaj auto #${kolejnyNumerAuta}`}</Text>
                  </TouchableOpacity>
                  {edytowanyWpisId && (
                    <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={anulujEdycjeWpisu}>
                      <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Anuluj edycję</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.btnOstatnieAuto, {
                      backgroundColor: dzialkaZakonczonaWpisu ? `${theme.colors.warning}20` : `${theme.colors.textSecondary}15`,
                      borderColor: dzialkaZakonczonaWpisu ? theme.colors.warning : theme.colors.border,
                      marginTop: 10,
                    }]}
                    onPress={ostatnieAuto}
                  >
                    <Text style={{ color: dzialkaZakonczonaWpisu ? theme.colors.warning : theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                      {dzialkaZakonczonaWpisu ? '↩ Wznów rozpisywanie aut' : `🏁 Ostatnie auto – koniec „${dzialkaDoWpisu?.nazwa}”`}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.karta, { backgroundColor: `${theme.colors.danger}08`, borderColor: theme.colors.danger }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.danger }]}>Zakończenie dniówki</Text>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                    Po zakończeniu plan trafi do archiwum. Wygenerujemy raport PDF z podsumowaniem Live do wysłania mailem.
                  </Text>
                  <TouchableOpacity style={[styles.btnDodajAuto, { backgroundColor: theme.colors.danger }]} onPress={zakonczIArchiwizuj} disabled={generujeRaport}>
                    <Text style={styles.btnDodajAutoTekst}>{generujeRaport ? 'Generuję raport…' : 'Zakończ i archiwizuj'}</Text>
                  </TouchableOpacity>
                </View>
              </>
          )}

          {/* ======== PZT ======== */}
          {aktywnaZakladka === 'pzt' && (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Plan sytuacyjny / PZT</Text>
              {zalacznikiPzt.length === 0 ? (
                <Text style={[styles.opisMaly, { color: theme.colors.textSecondary }]}>
                  Brak załączników. Dodaj pliki PDF do budowy w sekcji Zaplanuj Masę → + Budowa.
                </Text>
              ) : (
                <>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                    {zalacznikiPzt.length} plik(ów) – podgląd z przybliżaniem i obracaniem.
                  </Text>
                  {zalacznikiPzt.map((z) => (
                    <Text key={z.id} style={{ color: theme.colors.text, marginBottom: 4 }}>📎 {z.nazwa}</Text>
                  ))}
                  <TouchableOpacity
                    style={[styles.btnDodajAuto, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                    onPress={() => setViewerPzt(true)}
                  >
                    <Text style={styles.btnDodajAutoTekst}>👁 Otwórz podgląd</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ======= MODAL AUTA – 2 zakładki ======= */}
      {autaModal && (() => {
        const { wpis } = autaModal;
        const dzModal = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
        const mieModal = dzModal ? getMieszanka(dzModal.mieszankaId) : undefined;
        if (!dzModal || !mieModal) return null;
        const grModal = gruboscWbudowywania(dzModal);
        const odcinekPlanu = obliczPodsumowanieOdcinkaPlanu(
          plan,
          wpisyCalegoPlanu,
          wpis.numerAuta,
          ciezarPoMieszance,
        );
        const powAuta = obliczPowierzchnioweOdStartu(dzModal, wpis.przejechaneMetry);
        const grAuta = powAuta > 0 ? (wpis.tonazPrzywieziony / (mieModal.ciezarObjetosciowy * powAuta)) * 100 : 0;
        const bilansAuta = wpis.tonazPrzywieziony - powAuta * (grModal / 100) * mieModal.ciezarObjetosciowy;

        return (
          <SafeModal
            visible
            tytul={`Auto #${wpis.numerAuta}`}
            theme={theme}
            onClose={() => setAutaModal(null)}
            lewy={{ tekst: 'Zamknij', onPress: () => setAutaModal(null), kolor: theme.colors.primary }}
          >
            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                Godz. {wpis.godzinaWybudowania}{dzModal ? ` · ${dzModal.nazwa}` : ''}
              </Text>
              <View style={[styles.miniTabs, { borderColor: theme.colors.border }]}>
                {(['szczegoły', 'odcinek'] as const).map((z) => (
                  <TouchableOpacity key={z} style={[styles.miniTab, autaModalZakladka === z && { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary }]} onPress={() => setAutaModalZakladka(z)}>
                    <Text style={[styles.miniTabTekst, { color: autaModalZakladka === z ? theme.colors.primary : theme.colors.textSecondary }]}>
                      {z === 'szczegoły' ? 'Szczegóły auta' : `Odcinek 1→${wpis.numerAuta}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {autaModalZakladka === 'szczegoły' && (
                <>
                  <ModalRow label="Tonaż przywieziony" v={`${formatLiczby(wpis.tonazPrzywieziony)} Mg`} theme={theme} />
                  <ModalRow label="Przejechane metry" v={`${formatLiczby(wpis.przejechaneMetry)} m`} theme={theme} />
                  <ModalRow label="Zakryta powierzchnia" v={`${formatLiczby(powAuta)} m²`} theme={theme} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Uzyskana grubość</Text>
                    <Text style={{ color: Math.abs(grAuta - grModal) > 0.3 ? theme.colors.danger : theme.colors.success, fontSize: 14, fontWeight: '700' }}>
                      {formatLiczby(grAuta)} cm {grAuta > grModal ? '▲' : grAuta < grModal ? '▼' : ''}
                    </Text>
                  </View>
                  <View style={[styles.bilansBoks, { backgroundColor: bilansAuta > 0 ? `${theme.colors.danger}20` : `${theme.colors.success}20` }]}>
                    <Text style={{ color: bilansAuta > 0 ? theme.colors.danger : theme.colors.success, fontWeight: '700', fontSize: 14 }}>
                      Bilans: {bilansAuta > 0 ? '+' : ''}{formatLiczby(bilansAuta, 2)} Mg {bilansAuta > 0 ? '(przepał)' : '(oszczędność)'}
                    </Text>
                  </View>
                  {wpis.komentarz && <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginTop: 8 }]}>💬 {wpis.komentarz}</Text>}
                </>
              )}
              {autaModalZakladka === 'odcinek' && (
                <>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                    Podsumowanie całego planu dnia od auta #1 do #{wpis.numerAuta}
                  </Text>
                  <ModalRow label="Łączny tonaż" v={`${formatLiczby(odcinekPlanu.tonDo, 2)} Mg`} theme={theme} />
                  <ModalRow label="Łącznie metrów (od startu)" v={`${formatLiczby(odcinekPlanu.metryDo)} m`} theme={theme} />
                  <ModalRow label="Zakryta powierzchnia" v={`${formatLiczby(odcinekPlanu.powDo)} m²`} theme={theme} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Śr. grubość (1→{wpis.numerAuta})</Text>
                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
                      {formatLiczby(odcinekPlanu.sredniaGrubosc)} cm
                    </Text>
                  </View>
                  <View style={[styles.bilansBoks, { backgroundColor: odcinekPlanu.bilansMasy > 0 ? `${theme.colors.danger}20` : `${theme.colors.success}20` }]}>
                    <Text style={{ color: odcinekPlanu.bilansMasy > 0 ? theme.colors.danger : theme.colors.success, fontWeight: '700', fontSize: 14 }}>
                      Bilans łączny: {odcinekPlanu.bilansMasy > 0 ? '+' : ''}{formatLiczby(odcinekPlanu.bilansMasy, 2)} Mg {odcinekPlanu.bilansMasy > 0 ? '(przepał)' : '(oszczędność)'}
                    </Text>
                  </View>
                  <View style={[styles.sep, { backgroundColor: theme.colors.border, marginVertical: 10 }]} />
                  <ModalRow label="Do końca metrów (plan)" v={`${formatLiczby(odcinekPlanu.pozostaloMetrow)} m`} theme={theme} />
                </>
              )}
            </ScrollView>
          </SafeModal>
        );
      })()}

      <ZalacznikiViewer visible={viewerPzt} zalaczniki={zalacznikiPzt} theme={theme} onClose={() => setViewerPzt(false)} />
    </View>
  );
}

// ---- Komponenty pomocnicze ----

function PanelStat({ label, wartosc, theme, kolor }: { label: string; wartosc: string; theme: AppTheme; kolor: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)' }}>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>{wartosc}</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function IR({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: bold ? '700' : '400', marginLeft: 8 }}>{v}</Text>
    </View>
  );
}

function ModalRow({ label, v, theme }: { label: string; v: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{v}</Text>
    </View>
  );
}

function NumInput({ label, value, onChange, theme, placeholder }: { label: string; value: string; onChange: (v: string) => void; theme: AppTheme; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput value={value} onChangeText={(t) => onChange(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={theme.colors.textSecondary} style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }} />
    </View>
  );
}

function WynikRow({ label, wartosc, theme }: { label: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>{wartosc}</Text>
    </View>
  );
}

function WynikRowGrubosc({ uzyskana, dzialka, theme }: { uzyskana: number; dzialka: DzialkaRobocza; theme: AppTheme }) {
  const wb = gruboscWbudowywania(dzialka);
  const kolorTyp = kolorUzyskanejGrubosci(uzyskana, dzialka);
  const kolor = kolorGrubosciDoHex(kolorTyp, theme);
  const roznica = uzyskana - wb;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Uzyskana grubość</Text>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>
        {formatLiczby(uzyskana)} cm {roznica > 0.05 ? '▲' : roznica < -0.05 ? '▼' : ''}
      </Text>
    </View>
  );
}

function WynikRowBilans({ bilans, theme }: { bilans: number; theme: AppTheme }) {
  const czyOszczednosc = bilans < 0;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: czyOszczednosc ? `${theme.colors.success}20` : `${theme.colors.danger}20`, marginVertical: 4 }}>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '600' }}>Bilans {czyOszczednosc ? '(oszczędność)' : '(przepał)'}</Text>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '700' }}>{bilans > 0 ? '+' : ''}{formatLiczby(bilans, 2)} Mg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectorScroll: { paddingHorizontal: 14, paddingVertical: 8, maxHeight: 50 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  kartaTytul: { fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  opisMaly: { fontSize: 13, lineHeight: 18 },
  sep: { height: 1, marginVertical: 10 },
  wynikKontroli: { marginTop: 14 },
  wynikNagl: { fontSize: 14, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8 },
  wynikPuste: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  szkicRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  szkicLewy: { flex: 1, minWidth: 0, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  szkicPanel: { width: 78, borderRadius: 10, borderWidth: 1, padding: 8, gap: 4, alignSelf: 'flex-start' },
  tabelaNagl: { flexDirection: 'row', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4 },
  tabelaNaglTekst: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabelaRzad: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, alignItems: 'center' },
  tabelaKom: { fontSize: 12, textAlign: 'center' },
  komentarzTekst: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 1, fontStyle: 'italic' },
  tabelaSuma: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, marginTop: 4, alignItems: 'center' },
  livePodsumWrap: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, gap: 2 },
  livePodsumTytul: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  godzinWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  godzLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  godzInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlign: 'center' },
  komentarzInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 48, marginBottom: 12 },
  btnDodajAuto: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnDodajAutoTekst: { color: '#fff', fontSize: 15, fontWeight: '700' },
  poleSzare: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnOstatnieAuto: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalTlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKarta: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  modalTytul: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  miniTabs: { flexDirection: 'row', gap: 8, marginBottom: 12, borderWidth: 0 },
  miniTab: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  miniTabTekst: { fontSize: 13, fontWeight: '600' },
  bilansBoks: { borderRadius: 10, padding: 12, marginTop: 8, alignItems: 'center' },
  btnModalZamknij: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnModalZamknijTekst: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
