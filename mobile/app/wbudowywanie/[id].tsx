// ============================================================
// EKRAN: WBUDOWYWANIE – Live Tracker (Plan / Kontrola / Live)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { WielokatPodglad } from '../../src/components/obmiar/WielokatPodglad';
import { SzkicPlanuBudowy } from '../../src/components/budowa/SzkicPlanuBudowy';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { obszarZWpisamiLive } from '../../src/utils/obmiarDoPlanu';
import { PlanCalySketch } from '../../src/components/sketch/PlanCalySketch';
import { AppHeader } from '../../src/components/common/AppHeader';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import { SafeModal } from '../../src/components/common/SafeModal';
import { ZalacznikiViewer } from '../../src/components/common/ZalacznikiViewer';
import { TabelaAut } from '../../src/components/plan/TabelaAut';
import { generujRaportPDF } from '../../src/utils/pdfGenerator';
import { gruboscWbudowywania, gruboscProjektowa, formatujTolerancje, kolorUzyskanejGrubosci, kolorGrubosciDoHex } from '../../src/utils/grubosc';
import {
  obliczWynikiDzialki, obliczLacznaDlugosc, obliczKontrolę,
  formatLiczby, obliczTabeleAutPlanu,
  round2,
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
import { formatujPikietaz, pikietazPoMetrach, zakresOdcinkaKm } from '../../src/utils/chainage';
import { formatujKmM } from '../../src/utils/projektBudowy';
import { obszarySzkicuPlanu, pozycjaSzkicuPoMetrach, uzupelnijProfilObmiaruDzialek } from '../../src/utils/planZBudowy';
import {
  znajdzAktywnaDzialke,
  rozdzielMetryNaDzialki,
  obliczBilansLivePlanu,
  dzialkiDoAutoZamkniecia,
  nastepnyNumerAuta,
  grupujAutaLive,
  zamknieciaReczneDzialek,
  ulozenieAutLive,
  sesjePoUlozeniu,
  gruboscSegmentuLive,
  metryPrzedWpisem,
  sumaMetrowDzialki,
} from '../../src/utils/liveProgress';
import { potwierdzAkcje } from '../../src/utils/dialog';
import type { DzialkaRobocza, Plan, WpisLive } from '../../src/types';

type ZakladkaTyp = 'plan' | 'kontrola' | 'live' | 'pzt';

const ETYKIETY_RZUTU = ['I rzut', 'II rzut', 'III rzut', 'IV rzut', 'V rzut'];

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
/** Wysokość okna przewijania szkicu LIVE – ~42% ekranu, min 260 / max 520 px */
const VIEWPORT_SZKICU_LIVE = Math.min(Math.max(SCREEN_H * 0.42, 260), 520);

/** Uzyskana grubość obok założonej przez użytkownika (grubość wbudowywania, nie projekt). */
function tekstGrubosciLive(uzyskana: number, zalozena: number): string {
  if (!(uzyskana > 0)) return '–';
  const znak = uzyskana > zalozena + 0.2 ? ' ▲' : uzyskana < zalozena - 0.2 ? ' ▼' : '';
  return `${formatLiczby(uzyskana)}${znak} / ${formatLiczby(zalozena)}`;
}

function kmWpisuLive(plan: Plan, wpisy: WpisLive[], wpis: WpisLive): string {
  const dz = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
  if (!dz) return '';
  const start = dz.kilometrazPoczatkowyKm * 1000 + dz.kilometrazPoczatkowyM;
  const przed = metryPrzedWpisem(plan, wpisy, wpis);
  const zakres = zakresOdcinkaKm(start, przed, wpis.przejechaneMetry, dz.kierunekUkladania);
  return `${formatujPikietaz(zakres.odM)}–${formatujPikietaz(zakres.doM)}`;
}

/** Wstecz z historii, a gdy historia jest pusta albo nic się nie dzieje – menu główne. */
function wracajZPlanu() {
  const przed = typeof window !== 'undefined' ? window.location.href : '';
  try {
    if (router.canGoBack()) router.back();
    else {
      router.replace('/');
      return;
    }
  } catch {
    router.replace('/');
    return;
  }
  if (!przed || typeof window === 'undefined') return;
  window.setTimeout(() => {
    if (window.location.href === przed) router.replace('/');
  }, 500);
}

// Kolumny tabeli Live (przewijane poziomo)
const KOLUMNY = [
  { id: 'auto', label: '#', width: 56 },
  { id: 'mg', label: 'Mg', width: 56 },
  { id: 'metry', label: 'm', width: 56 },
  { id: 'grubosc', label: 'Uzysk./założ.', width: 108 },
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
    sesje, dodajAutoZRozbiciem, zastapPostepPlanu,
    czyDzialkaZakonczona, oznaczOstatnieAuto, wznowDzialke, wyczyścWpisyPlanu,
  } = useLiveStore();
  const wpisyCalegoPlanu = useWpisyDlaPlanu(id);

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');

  // Kontrola
  const [wbudowaneTonyStr, setWbudowaneTony] = useState('');
  const [przejechaneMetryStr, setPrzejechaneMetry] = useState('');

  // Nowy wpis Live
  const [nowyTonaz, setNowyTonaz] = useState('');
  const [nowyMetry, setNowyMetry] = useState('');
  const [trybMetrowLive, setTrybMetrowLive] = useState<'zAuta' | 'odStartu'>('zAuta');
  const [nowyKomentarz, setNowyKomentarz] = useState('');
  const [nowyGodzina, setNowyGodzina] = useState(aktualnaGodzina());
  const [edytowanyNumerAuta, setEdytowanyNumerAuta] = useState<number | null>(null);

  // Modal auta
  const [autaModal, setAutaModal] = useState<{ wpis: WpisLive } | null>(null);
  const [autaModalZakladka, setAutaModalZakladka] = useState<'szczegoły' | 'odcinek'>('szczegoły');
  const [viewerPzt, setViewerPzt] = useState(false);
  const [generujeRaport, setGenerujeRaport] = useState(false);
  const [potwierdzZakonczenie, setPotwierdzZakonczenie] = useState(false);
  const [numerRzutu, setNumerRzutu] = useState(1);
  const [rzutListaOtwarta, setRzutListaOtwarta] = useState(false);
  const rzutReczny = useRef(false);
  const [szkicObszarId, setSzkicObszarId] = useState<string | null>(null);
  const [blokadaSzkicuPzt, setBlokadaSzkicuPzt] = useState(false);
  const [mapaSzkicAktywna, setMapaSzkicAktywna] = useState(false);
  const sesjaObmiaru = useObmiarStore((s) => s.sesjaPoId(plan?.sesjaObmiaruId ?? ''));
  const ustawTloOpcje = useObmiarStore((s) => s.ustawTloOpcje);
  const budowaPodglad = plan?.budowaId ? budowy.find((b) => b.id === plan.budowaId) : undefined;
  const dzialkiObmiaru = useMemo(
    () => uzupelnijProfilObmiaruDzialek(budowaPodglad?.projekt, plan),
    [budowaPodglad?.projekt, plan],
  );

  useEffect(() => {
    if (rzutReczny.current || edytowanyNumerAuta != null) return;
    const max = wpisyCalegoPlanu.reduce((m, w) => Math.max(m, w.numerAuta), 0);
    const ostatni = wpisyCalegoPlanu.find((w) => w.numerAuta === max);
    if (ostatni) setNumerRzutu(ostatni.numerRzutu ?? 1);
  }, [wpisyCalegoPlanu, edytowanyNumerAuta]);

  useEffect(() => {
    const p = usePlanyStore.getState().pobierzPlan(id ?? '');
    if (!p || p.zrodlo !== 'obmiar') return;
    const akt = znajdzAktywnaDzialke(p, wpisyCalegoPlanu, sesje);
    if (akt) setSzkicObszarId(akt.dzialka.id);
  }, [id, wpisyCalegoPlanu, sesje]);

  const [recznySzkicId, setRecznySzkicId] = useState<string | null>(null);
  const poprzedniCelSzkicu = useRef<string | null>(null);
  const celSzkicuBudowy = useMemo(() => {
    if (!plan || plan.zrodlo !== 'budowa') return null;
    const obszary = obszarySzkicuPlanu(plan);
    if (obszary.length === 0) return null;
    const ulozone = wpisyCalegoPlanu.reduce((s, w) => s + w.przejechaneMetry, 0);
    const val = parseFloat(nowyMetry.replace(',', '.'));
    const wpisuje = edytowanyNumerAuta == null && nowyMetry.trim() !== '' && !Number.isNaN(val) && val >= 0;
    if (wpisuje) {
      const globalne = trybMetrowLive === 'odStartu' ? val : ulozone + val;
      const poz = pozycjaSzkicuPoMetrach(plan, obszary, globalne);
      if (poz) return { obszarId: poz.obszarId, stacjaM: poz.stacjaM as number | null };
    }
    const akt = znajdzAktywnaDzialke(plan, wpisyCalegoPlanu, sesje);
    const obszar = (akt && obszary.find((o) => o.dzialkaIds.includes(akt.dzialka.id))) || obszary[0];
    return { obszarId: obszar.id, stacjaM: null as number | null };
  }, [plan, wpisyCalegoPlanu, sesje, nowyMetry, trybMetrowLive, edytowanyNumerAuta]);

  useEffect(() => {
    const idCelu = celSzkicuBudowy?.obszarId ?? null;
    if (idCelu && idCelu !== poprzedniCelSzkicu.current) {
      poprzedniCelSzkicu.current = idCelu;
      setRecznySzkicId(null);
    }
  }, [celSzkicuBudowy?.obszarId]);

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Wbudowywanie" lewy={{ tekst: '‹ Wstecz', onPress: wracajZPlanu }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.danger, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const propsTlaPzt = sesjaObmiaru?.tloPzt
    ? {
      tloPzt: sesjaObmiaru.tloPzt,
      skalaPzt: sesjaObmiaru.skala,
      onTloWidoczne: (v: boolean) => { void ustawTloOpcje(sesjaObmiaru.id, { widoczne: v }); },
    }
    : {};

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const ciezarPoMieszance = (mId: string) => mieszanki.find((m) => m.id === mId)?.ciezarObjetosciowy;
  const budowa = budowaPodglad;
  const projektSzkicu = budowa?.projekt;
  const zalacznikiPzt = budowa?.zalaczniki?.length
    ? budowa.zalaczniki
    : (plan.zalaczniki ?? []);


  const planDoLiczenia = dzialkiObmiaru === plan.dzialki
    ? plan
    : { ...plan, dzialki: dzialkiObmiaru };
  const tabeleAutPlanu = obliczTabeleAutPlanu(
    dzialkiObmiaru,
    plan.rzuty,
    plan.tonazAuta,
    (mId) => ciezarPoMieszance(mId),
  );
  const podsumowanieDnia = obliczPodsumowaniePlanuDnia(planDoLiczenia, ciezarPoMieszance, tabeleAutPlanu);
  const aktywnaDzialka = znajdzAktywnaDzialke(plan, wpisyCalegoPlanu, sesje);
  const dzialkaDoWpisu = aktywnaDzialka?.dzialka ?? plan.dzialki[plan.dzialki.length - 1];
  const dzialkaZakonczonaWpisu = dzialkaDoWpisu ? czyDzialkaZakonczona(plan.id, dzialkaDoWpisu.id) : false;
  const kolejnyNumerAuta = nastepnyNumerAuta(wpisyCalegoPlanu);
  const bilansPlanu = obliczBilansLivePlanu(
    planDoLiczenia,
    wpisyCalegoPlanu,
    ciezarPoMieszance,
  );
  const segmentyPlanu = budujSegmentyPlanu(dzialkiObmiaru, ciezarPoMieszance);
  const figuryPlanu = budujFiguryPlanu(plan, ciezarPoMieszance);
  const markeryPlanu = obliczMarkeryPlanuCiaglego(plan, wpisyCalegoPlanu);
  const wpisyLivePosortowane = sortujWpisyPlanu(plan, wpisyCalegoPlanu);
  const mapaMetrowWpisu = new Map(markeryPlanu.map((m) => [m.wpis.id, m.metryKumulatywne]));

  const tonNowyLive = parseFloat(nowyTonaz.replace(',', '.'));
  const metryPlanowaneLive = edytowanyNumerAuta == null && !isNaN(tonNowyLive) && tonNowyLive > 0
    ? metryOdMasyPlanu(segmentyPlanu, bilansPlanu.lacznyTonaz + tonNowyLive)
    : null;
  const metryZDojazduZAuta = metryPlanowaneLive != null
    ? round2(Math.max(0, metryPlanowaneLive - bilansPlanu.laczneMetry))
    : null;
  const lacznaMasaPlanWysw = round2(bilansPlanu.lacznyTonaz + bilansPlanu.pozostalaMasaWgPlanu);
  const lacznaMasaSrWysw = round2(bilansPlanu.lacznyTonaz + bilansPlanu.pozostalaMasaWgSredniej);

  const wartoscMetrowNum = parseFloat(nowyMetry.replace(',', '.'));
  const metryOdStartuObliczone = !isNaN(wartoscMetrowNum) && trybMetrowLive === 'zAuta'
    ? round2(bilansPlanu.laczneMetry + wartoscMetrowNum)
    : (!isNaN(wartoscMetrowNum) ? wartoscMetrowNum : null);
  const metryZAutaObliczone = !isNaN(wartoscMetrowNum) && trybMetrowLive === 'odStartu'
    ? round2(wartoscMetrowNum - bilansPlanu.laczneMetry)
    : (!isNaN(wartoscMetrowNum) ? wartoscMetrowNum : null);

  const przelaczTrybMetrow = (nowy: 'zAuta' | 'odStartu') => {
    if (nowy === trybMetrowLive || edytowanyNumerAuta != null) return;
    if (!isNaN(wartoscMetrowNum) && wartoscMetrowNum > 0) {
      if (nowy === 'odStartu') {
        setNowyMetry(String(round2(bilansPlanu.laczneMetry + wartoscMetrowNum)));
      } else {
        setNowyMetry(String(round2(Math.max(0, wartoscMetrowNum - bilansPlanu.laczneMetry))));
      }
    }
    setTrybMetrowLive(nowy);
  };

  const rozwiazMetryWpisu = (): number | null => {
    const val = parseFloat(nowyMetry.replace(',', '.'));
    if (isNaN(val)) return null;
    if (edytowanyNumerAuta != null || trybMetrowLive === 'zAuta') return val;
    return round2(val - bilansPlanu.laczneMetry);
  };

  // Kontrola całego dnia
  const tonyK = parseFloat(wbudowaneTonyStr.replace(',', '.'));
  const metryK = parseFloat(przejechaneMetryStr.replace(',', '.'));
  const metryPlanowane = !isNaN(tonyK) && tonyK > 0
    ? metryOdMasyPlanu(segmentyPlanu, tonyK)
    : null;
  const wynikiKontroli = !isNaN(tonyK) && !isNaN(metryK) && tonyK > 0 && metryK > 0
    ? obliczKontrolePlanu(planDoLiczenia, tonyK, metryK, ciezarPoMieszance)
    : null;

  const obliczWierszLive = (wpis: WpisLive) => {
    const dz = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
    const mie = dz ? getMieszanka(dz.mieszankaId) : undefined;
    const metryKum = mapaMetrowWpisu.get(wpis.id) ?? 0;
    if (!dz || !mie) return { grubosc: 0, doKoncaM: 0, grPlan: 0 };
    const przed = metryPrzedWpisem(plan, wpisyCalegoPlanu, wpis);
    const { grubosc: gr } = gruboscSegmentuLive(
      dz, przed, wpis.przejechaneMetry, wpis.tonazPrzywieziony, mie.ciezarObjetosciowy,
    );
    const doK = Math.max(0, bilansPlanu.lacznaDlugoscPlanu - metryKum);
    return { grubosc: gr, doKoncaM: doK, grPlan: gruboscWbudowywania(dz) };
  };

  const opcjeRaportuDnia = () => ({
    plan,
    wpisyLive: wpisyCalegoPlanu,
    mieszanki,
    budowa: budowa
      ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji }
      : undefined,
  });

  const zakonczIArchiwizuj = () => {
    if (!generujeRaport) setPotwierdzZakonczenie(true);
  };

  const wykonajZakonczenie = async (zRaportem: boolean) => {
    setGenerujeRaport(true);
    try {
      await archiwizujPlan(plan.id);
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać dniówki do archiwum.');
      setGenerujeRaport(false);
      return;
    }
    if (zRaportem) {
      try { await generujRaportPDF(opcjeRaportuDnia()); } catch { /* raport można zrobić z archiwum */ }
    }
    setPotwierdzZakonczenie(false);
    setGenerujeRaport(false);
    router.replace('/archiwum' as any);
  };

  const ostatnieAuto = () => {
    const dz = aktywnaDzialka?.dzialka;
    if (!dz) return;
    if (czyDzialkaZakonczona(plan.id, dz.id)) {
      potwierdzAkcje(
        'Wznów działkę',
        'Czy chcesz wznowić rozpisywanie aut na tej działce?',
        () => { void wznowDzialke(plan.id, dz.id); },
        'Wznów',
      );
      return;
    }
    potwierdzAkcje(
      'Ostatnie auto',
      `Kończysz działkę „${dz.nazwa}”. Kolejne auto będzie na następnej działce.`,
      async () => {
        await oznaczOstatnieAuto(plan.id, dz.id);
        const next = (aktywnaDzialka?.idx ?? 0) + 1;
        if (next < plan.dzialki.length) {
          Alert.alert(
            'Przejście do kolejnej działki',
            `${plan.dzialki[next].nazwa}\nKolejne auto: #${kolejnyNumerAuta}`,
          );
        }
      },
      'Zakończ działkę',
    );
  };

  const mieszankiUnikalne = [...new Set(plan.dzialki.map((d) => d.mieszankaId))];
  const koniecMieszanki = () => {
    const dz = aktywnaDzialka?.dzialka;
    if (!dz) return;
    const mix = dz.mieszankaId;
    const nazwaMix = getMieszanka(mix)?.rodzaj ?? 'mieszanki';
    potwierdzAkcje(
      'Koniec mieszanki',
      `Zakończyć wszystkie działki mieszanki ${nazwaMix} i przejść do kolejnej?`,
      async () => {
        for (const d of plan.dzialki) {
          if (d.mieszankaId === mix && !czyDzialkaZakonczona(plan.id, d.id)) {
            await oznaczOstatnieAuto(plan.id, d.id);
          }
        }
        const next = plan.dzialki.find((d) => d.mieszankaId !== mix && !czyDzialkaZakonczona(plan.id, d.id));
        if (next) {
          setSzkicObszarId(next.id);
          Alert.alert('Kolejna mieszanka', `${next.nazwa}\nKolejne auto: #${kolejnyNumerAuta}`);
        }
      },
      'Zakończ mieszankę',
    );
  };

  const zapiszAuta = async (auta: ReturnType<typeof grupujAutaLive>) => {
    const reczne = zamknieciaReczneDzialek(plan, wpisyCalegoPlanu, sesje);
    const zajete = reczne.filter((id) => sumaMetrowDzialki(wpisyCalegoPlanu, id) > 0.05);
    let n = 0;
    const nowe = ulozenieAutLive(
      plan,
      auta,
      reczne,
      ciezarPoMieszance,
      () => `live-${Date.now().toString(36)}-${n++}`,
      zajete,
    );
    const sesjeNowe = sesjePoUlozeniu(plan, nowe, reczne, sesje).filter((s) => s.planId === plan.id);
    await zastapPostepPlanu(plan.id, nowe, sesjeNowe);
  };

  const dodajWpisLive = async () => {
    const ton = parseFloat(nowyTonaz.replace(',', '.'));
    const met = rozwiazMetryWpisu();
    if (isNaN(ton) || ton <= 0) { Alert.alert('Błąd', 'Podaj prawidłowy tonaż.'); return; }
    if (met === null || met <= 0) {
      Alert.alert('Błąd', trybMetrowLive === 'odStartu' && edytowanyNumerAuta == null
        ? 'Odległość od startu musi być większa niż dotychczas przejechane metry.'
        : 'Podaj prawidłowe metry.');
      return;
    }
    if (edytowanyNumerAuta != null) {
      const numer = edytowanyNumerAuta;
      const auta = grupujAutaLive(plan, wpisyCalegoPlanu).map((a) => (
        a.numerAuta === numer
          ? {
            ...a,
            tonaz: round2(ton),
            metry: round2(met),
            komentarz: nowyKomentarz.trim() || undefined,
            godzinaWybudowania: nowyGodzina,
            numerRzutu,
          }
          : a
      ));
      await zapiszAuta(auta);
      const max = auta.reduce((m, a) => Math.max(m, a.numerAuta), 0);
      if (numer !== max) {
        const ostatni = auta.find((a) => a.numerAuta === max);
        setNumerRzutu(ostatni?.numerRzutu ?? 1);
      }
      setEdytowanyNumerAuta(null);
      rzutReczny.current = true;
    } else {
      if (!aktywnaDzialka) {
        Alert.alert('Plan ukończony', 'Wszystkie działki są zakończone. Możesz zarchiwizować plan.');
        return;
      }
      const segmenty = rozdzielMetryNaDzialki(
        plan, wpisyCalegoPlanu, sesje, met, ton, ciezarPoMieszance,
      );
      if (segmenty.length === 0) {
        Alert.alert('Brak miejsca', 'Nie można rozdzielić metrów – sprawdź postęp na działkach.');
        return;
      }
      const doZamkniecia = dzialkiDoAutoZamkniecia(plan, wpisyCalegoPlanu, sesje, segmenty);
      await dodajAutoZRozbiciem(
        {
          planId: plan.id,
          numerAuta: kolejnyNumerAuta,
          numerRzutu,
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
    setTrybMetrowLive('zAuta');
    setRzutListaOtwarta(false);
  };

  const rozpocznijEdycjeAuta = (auto: ReturnType<typeof grupujAutaLive>[number]) => {
    setEdytowanyNumerAuta(auto.numerAuta);
    setTrybMetrowLive('zAuta');
    setNowyTonaz(String(auto.tonaz));
    setNowyMetry(String(auto.metry));
    setNowyKomentarz(auto.komentarz ?? '');
    setNowyGodzina(auto.godzinaWybudowania);
    setNumerRzutu(auto.numerRzutu ?? 1);
    rzutReczny.current = true;
    setRzutListaOtwarta(false);
  };

  const anulujEdycjeWpisu = () => {
    setEdytowanyNumerAuta(null);
    setTrybMetrowLive('zAuta');
    setNowyTonaz(''); setNowyMetry(''); setNowyKomentarz(''); setNowyGodzina(aktualnaGodzina());
    rzutReczny.current = false;
    setRzutListaOtwarta(false);
  };

  const usunAutoLive = (numer: number) => {
    potwierdzAkcje(
      'Usuń auto',
      `Usunąć auto #${numer}? Zniknie ze wszystkich obszarów, a kolejne auta i bilans zostaną przeliczone.`,
      async () => {
        const zostaja = grupujAutaLive(plan, wpisyCalegoPlanu)
          .filter((a) => a.numerAuta !== numer)
          .map((a, i) => ({ ...a, numerAuta: i + 1 }));
        if (zostaja.length === 0) await wyczyścWpisyPlanu(plan.id);
        else await zapiszAuta(zostaja);
        anulujEdycjeWpisu();
      },
    );
  };

  const wyczyscLive = () => {
    if (wpisyCalegoPlanu.length === 0) {
      Alert.alert('Brak wpisów', 'Nie ma żadnych aut LIVE do usunięcia.');
      return;
    }
    potwierdzAkcje(
      'Wyczyść LIVE',
      'Usunąć wszystkie wprowadzone auta w tym planie i zacząć od nowa?',
      async () => {
        await wyczyścWpisyPlanu(plan.id);
        anulujEdycjeWpisu();
      },
      'Wyczyść',
    );
  };

  const autaLive = grupujAutaLive(plan, wpisyCalegoPlanu);
  const podgladRozkladu = (() => {
    const ton = parseFloat(nowyTonaz.replace(',', '.'));
    const met = rozwiazMetryWpisu();
    if (!(ton > 0) || met == null || met <= 0) {
      return [] as { dzialkaId: string; metry: number; tonaz: number; przed: number }[];
    }
    if (edytowanyNumerAuta != null) {
      const numer = edytowanyNumerAuta;
      const auta = grupujAutaLive(plan, wpisyCalegoPlanu).map((a) => (
        a.numerAuta === numer ? { ...a, tonaz: round2(ton), metry: round2(met) } : a
      ));
      const reczne = zamknieciaReczneDzialek(plan, wpisyCalegoPlanu, sesje);
      const zajete = reczne.filter((id) => sumaMetrowDzialki(wpisyCalegoPlanu, id) > 0.05);
      let n = 0;
      const wszystkie = ulozenieAutLive(
        plan, auta, reczne, ciezarPoMieszance, () => `podglad-${n++}`, zajete,
      );
      return wszystkie.filter((w) => w.numerAuta === numer).map((w) => ({
        dzialkaId: w.dzialkaId,
        metry: w.przejechaneMetry,
        tonaz: w.tonazPrzywieziony,
        przed: metryPrzedWpisem(plan, wszystkie, w),
      }));
    }
    return rozdzielMetryNaDzialki(plan, wpisyCalegoPlanu, sesje, met, ton, ciezarPoMieszance).map((s) => ({
      dzialkaId: s.dzialkaId,
      metry: s.metry,
      tonaz: s.tonaz,
      przed: sumaMetrowDzialki(wpisyCalegoPlanu, s.dzialkaId),
    }));
  })();

  // Selektor działki – usunięty (kontrola i LIVE = cały odcinek dnia)

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        podtytul={plan.dzialki.length > 1 ? `Całość dnia · ${plan.dzialki.length} działki` : plan.dzialki[0]?.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: wracajZPlanu }}
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
        <ScrollView
          contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!(blokadaSzkicuPzt && (plan.zrodlo === 'obmiar' || plan.zrodlo === 'budowa') && (aktywnaZakladka === 'live' || aktywnaZakladka === 'plan'))}
        >

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
              {plan.zrodlo === 'budowa' && projektSzkicu ? (
                obszarySzkicuPlanu(plan).map((obszar) => {
                  const dzialkiObszaru = plan.dzialki.filter((d) => obszar.dzialkaIds.includes(d.id));
                  const doKarty = dzialkiObszaru.length > 0 ? dzialkiObszaru : [];
                  let powObszaru = 0;
                  let masaObszaru = 0;
                  let autaObszaru = 0;
                  const mieszNazwy: string[] = [];
                  for (const dz of doKarty) {
                    const mie = getMieszanka(dz.mieszankaId);
                    if (!mie) continue;
                    const w = obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta);
                    powObszaru += w.lacznaPowierzchnia;
                    masaObszaru += w.lacznaIloscMasy;
                    autaObszaru += w.iloscSamochodow;
                    if (!mieszNazwy.includes(mie.rodzaj)) mieszNazwy.push(mie.rodzaj);
                  }
                  return (
                    <View key={obszar.id}>
                      <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>
                          Szkic PZT · {obszar.numer}. {obszar.nazwa}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                          {formatujKmM(obszar.kilometrazOdM)} - {formatujKmM(obszar.kilometrazDoM)}
                        </Text>
                        <SzkicPlanuBudowy
                          projekt={projektSzkicu}
                          plan={plan}
                          theme={theme}
                          wpisy={wpisyCalegoPlanu.filter((w) => obszar.dzialkaIds.includes(w.dzialkaId))}
                          wysokosc={280}
                          zakres={obszar}
                          blokadaPodgladu={blokadaSzkicuPzt}
                          onBlokadaPodgladu={setBlokadaSzkicuPzt}
                          onDotykZmiana={setMapaSzkicAktywna}
                          onPressAuto={(wpisId) => {
                            const wpis = wpisyCalegoPlanu.find((w) => w.id === wpisId);
                            if (wpis) { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }
                          }}
                        />
                      </View>
                      <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>
                          {obszar.numer}. {obszar.nazwa}
                        </Text>
                        <IR label="Mieszanka" v={mieszNazwy.join(', ') || '—'} theme={theme} />
                        <IR label="Powierzchnia" v={`${formatLiczby(powObszaru)} m²`} theme={theme} />
                        <IR label="Masa" v={`${formatLiczby(masaObszaru, 3)} Mg`} theme={theme} bold />
                        <IR label="Samochodów (plan)" v={String(autaObszaru)} theme={theme} bold />
                        {doKarty.map((dz) => {
                          const mie = getMieszanka(dz.mieszankaId);
                          if (!mie) return null;
                          const wyniki = obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta);
                          const tabelaDz = tabeleAutPlanu.dzialki.find((t) => t.dzialkaId === dz.id);
                          return (
                            <View key={dz.id} style={{ marginTop: 12 }}>
                              {doKarty.length > 1 ? (
                                <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 6 }}>
                                  {dz.nazwa}
                                  {tabelaDz ? `  (auta ${tabelaDz.numerAutaOd}–${tabelaDz.numerAutaDo})` : ''}
                                </Text>
                              ) : null}
                              <IR label="Grubość projektowa" v={`${gruboscProjektowa(dz)} cm`} theme={theme} />
                              <IR label="Tolerancja" v={formatujTolerancje(dz)} theme={theme} />
                              <IR label="Grubość wbudowywania" v={`${gruboscWbudowywania(dz)} cm`} theme={theme} />
                              <IR label="Metrów" v={`${formatLiczby(obliczLacznaDlugosc(dz))} m`} theme={theme} />
                              {doKarty.length > 1 ? (
                                <IR label="Masa odcinka" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} />
                              ) : null}
                              <Text style={[styles.kartaTytul, { color: theme.colors.text, marginTop: 8, marginBottom: 8 }]}>Rozpiska samochodów</Text>
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
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              ) : plan.dzialki.map((dz) => {
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
                {plan.zrodlo === 'budowa' ? null : (
                <View style={{ marginTop: 12 }}>
                  {plan.zrodlo === 'obmiar' && sesjaObmiaru ? (() => {
                    const obszar = sesjaObmiaru.obszary.find((o) => o.id === dz.id);
                    if (!obszar) {
                      return (
                        <DzialkaSketch
                          dzialka={dz}
                          ciezarObjetosciowy={mie.ciezarObjetosciowy}
                          wykonaneMetry={wBiez.reduce((s, w) => s + w.przejechaneMetry, 0)}
                          markery={cumMDz}
                          onTruckPress={(wpis) => { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }}
                        />
                      );
                    }
                    const zLive = obszarZWpisamiLive(obszar, wBiez);
                    const dl = Math.max(obliczLacznaDlugosc(dz), 0.01);
                    return (
                      <WielokatPodglad
                        wierzcholki={zLive.wierzcholkiM}
                        obszar={zLive}
                        kolorWypelnienia={zLive.kolorWypelnienia}
                        postepLive={(zLive.przejechaneMetry ?? 0) / dl}
                        wysokosc={260}
                        resetKlucz={`plan-${obszar.id}`}
                        pokazMaszyny
                        onPressAuto={(wpisId) => {
                          const wpis = wpisyCalegoPlanu.find((w) => w.id === wpisId);
                          if (wpis) { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }
                        }}
                        onDotykZmiana={setMapaSzkicAktywna}
                        blokadaPodgladu={blokadaSzkicuPzt}
                        onBlokadaPodgladu={setBlokadaSzkicuPzt}
                        {...propsTlaPzt}
                      />
                    );
                  })() : (
                    <DzialkaSketch
                      dzialka={dz}
                      ciezarObjetosciowy={mie.ciezarObjetosciowy}
                      wykonaneMetry={wBiez.reduce((s, w) => s + w.przejechaneMetry, 0)}
                      markery={cumMDz}
                      onTruckPress={(wpis) => { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }}
                    />
                  )}
                </View>
                )}
              </View>
            );
          })}
            </>
          )}

          {/* ======== KONTROLA ======== */}
          {aktywnaZakladka === 'kontrola' && (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.kartaTytul, { color: theme.colors.text, flex: 1 }]}>Kontrola całego dnia</Text>
                <InfoTooltip tresc="Wpisz łączne tony i metry od startu pierwszej działki – program pokaże pozycję na całym odcinku." />
              </View>
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
                    <IR label="Do wbudowania (plan)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgPlanu, 2)} Mg (${formatLiczby(lacznaMasaPlanWysw, 2)} Mg)`} theme={theme} />
                    <IR label="Do wbudowania (śr. grub.)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgSredniej, 2)} Mg (${formatLiczby(lacznaMasaSrWysw, 2)} Mg)`} theme={theme} />
                    {aktywnaDzialka && (
                      <Text style={[styles.opisMaly, { color: theme.colors.success, marginTop: 8, fontWeight: '600' }]}>
                        ● Aktywna działka: {aktywnaDzialka.dzialka.nazwa}
                      </Text>
                    )}
                    {(plan.zrodlo === 'obmiar' || plan.zrodlo === 'budowa') && plan.dzialki.map((dz) => {
                      const met = wpisyCalegoPlanu.filter((w) => w.dzialkaId === dz.id).reduce((s, w) => s + w.przejechaneMetry, 0);
                      const dl = obliczLacznaDlugosc(dz);
                      return (
                        <IR
                          key={dz.id}
                          label={dz.nazwa}
                          v={`${formatLiczby(met)} / ${formatLiczby(dl)} m`}
                          theme={theme}
                        />
                      );
                    })}
                  </View>

                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>
                    {plan.zrodlo === 'budowa' ? 'Szkic PZT (wycinek km)' : plan.zrodlo === 'obmiar' ? 'Szkic obszarów PZT' : 'Szkic planu dnia'}
                  </Text>
                  {plan.zrodlo === 'budowa' && projektSzkicu ? (() => {
                    const obszary = obszarySzkicuPlanu(plan);
                    const wpisuje = celSzkicuBudowy?.stacjaM != null;
                    const widocznyId = (wpisuje ? celSzkicuBudowy?.obszarId : null)
                      ?? recznySzkicId
                      ?? celSzkicuBudowy?.obszarId
                      ?? obszary[0]?.id;
                    const obszar = obszary.find((o) => o.id === widocznyId) ?? obszary[0];
                    if (!obszar) {
                      return (
                        <SzkicPlanuBudowy
                          projekt={projektSzkicu}
                          plan={plan}
                          theme={theme}
                          wpisy={wpisyCalegoPlanu}
                          wysokosc={Math.min(VIEWPORT_SZKICU_LIVE, 360)}
                          blokadaPodgladu={blokadaSzkicuPzt}
                          onBlokadaPodgladu={setBlokadaSzkicuPzt}
                          onDotykZmiana={setMapaSzkicAktywna}
                        />
                      );
                    }
                    const aktualny = celSzkicuBudowy?.obszarId === obszar.id;
                    return (
                      <>
                        {obszary.length > 1 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {obszary.map((o) => {
                              const on = o.id === obszar.id;
                              const postep = celSzkicuBudowy?.obszarId === o.id;
                              return (
                                <TouchableOpacity
                                  key={o.id}
                                  accessibilityLabel={`Zakładka szkicu ${o.numer}`}
                                  onPress={() => setRecznySzkicId(o.id)}
                                  style={[styles.selectorBtn, {
                                    borderColor: postep ? theme.colors.success : (on ? theme.colors.primary : theme.colors.border),
                                    backgroundColor: on ? theme.colors.primary : theme.colors.inputBackground,
                                    borderWidth: postep ? 2 : 1,
                                  }]}
                                >
                                  <Text style={{ color: on ? '#fff' : theme.colors.text, fontWeight: '800', fontSize: 13 }}>
                                    {o.numer}. {o.nazwa}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        ) : null}
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                          {formatujKmM(obszar.kilometrazOdM)} - {formatujKmM(obszar.kilometrazDoM)}
                          {aktualny ? '  ·  układane teraz' : ''}
                        </Text>
                        <SzkicPlanuBudowy
                          key={obszar.id}
                          projekt={projektSzkicu}
                          plan={plan}
                          theme={theme}
                          wpisy={wpisyCalegoPlanu.filter((w) => obszar.dzialkaIds.includes(w.dzialkaId))}
                          wysokosc={Math.min(VIEWPORT_SZKICU_LIVE, 360)}
                          zakres={obszar}
                          stacjaPodgladuM={aktualny ? celSzkicuBudowy?.stacjaM : null}
                          blokadaPodgladu={blokadaSzkicuPzt}
                          onBlokadaPodgladu={setBlokadaSzkicuPzt}
                          onDotykZmiana={setMapaSzkicAktywna}
                          onPressAuto={(wpisId) => {
                            const wpis = wpisyCalegoPlanu.find((w) => w.id === wpisId);
                            if (wpis) { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }
                          }}
                        />
                      </>
                    );
                  })() : plan.zrodlo === 'obmiar' && sesjaObmiaru ? (
                    <>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {sesjaObmiaru.obszary.map((o) => {
                          const on = (szkicObszarId ?? aktywnaDzialka?.dzialka.id) === o.id;
                          return (
                            <TouchableOpacity
                              key={o.id}
                              onPress={() => setSzkicObszarId(o.id)}
                              style={[styles.selectorBtn, {
                                borderColor: on ? theme.colors.primary : theme.colors.border,
                                backgroundColor: on ? `${theme.colors.primary}15` : theme.colors.inputBackground,
                              }]}
                            >
                              <Text style={{ color: on ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                {o.kolejnosc}. {o.nazwaDzialki || o.nazwa}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {(() => {
                        const oid = szkicObszarId ?? aktywnaDzialka?.dzialka.id ?? sesjaObmiaru.obszary[0]?.id;
                        const obszar = sesjaObmiaru.obszary.find((o) => o.id === oid);
                        if (!obszar) return null;
                        const wp = wpisyCalegoPlanu.filter((w) => w.dzialkaId === obszar.id);
                        const zLive = obszarZWpisamiLive(obszar, wp);
                        const dz = plan.dzialki.find((d) => d.id === obszar.id);
                        const dl = dz ? obliczLacznaDlugosc(dz) : 0;
                        return (
                          <WielokatPodglad
                            wierzcholki={zLive.wierzcholkiM}
                            obszar={zLive}
                            kolorWypelnienia={zLive.kolorWypelnienia}
                            postepLive={dl > 0 ? (zLive.przejechaneMetry ?? 0) / dl : 0}
                            wysokosc={300}
                            resetKlucz={obszar.id}
                            pokazMaszyny
                            onPressAuto={(wpisId) => {
                              const wpis = wpisyCalegoPlanu.find((w) => w.id === wpisId);
                              if (wpis) { setAutaModal({ wpis }); setAutaModalZakladka('szczegoły'); }
                            }}
                            onDotykZmiana={setMapaSzkicAktywna}
                            blokadaPodgladu={blokadaSzkicuPzt}
                            onBlokadaPodgladu={setBlokadaSzkicuPzt}
                            {...propsTlaPzt}
                          />
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1 }}>Szkic dnia</Text>
                        <InfoTooltip tresc="Jeden ciągły odcinek – przewiń w pionie, aby przejrzeć cały plan." />
                      </View>
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
                    </>
                  )}
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
                          <Text style={[styles.tabelaNaglTekst, { width: 88, color: theme.colors.textSecondary }]}>Działka</Text>
                          <Text style={[styles.tabelaNaglTekst, { width: 108, color: theme.colors.textSecondary }]}>km</Text>
                          <Text style={[styles.tabelaNaglTekst, { width: 32, color: theme.colors.textSecondary }]} />
                          <Text style={[styles.tabelaNaglTekst, { width: 32, color: theme.colors.textSecondary }]} />
                        </View>
                        {autaLive.map((auto) => {
                          const segmenty = wpisyLivePosortowane.filter((w) => w.numerAuta === auto.numerAuta);
                          const ostatni = segmenty[segmenty.length - 1];
                          const jeden = segmenty.length === 1 ? segmenty[0] : undefined;
                          const wierszJednego = jeden ? obliczWierszLive(jeden) : null;
                          const doKonca = ostatni ? obliczWierszLive(ostatni).doKoncaM : 0;
                          const grPlan = wierszJednego?.grPlan ?? 0;
                          const grW = wierszJednego?.grubosc ?? 0;
                          const przepal = Boolean(wierszJednego && grW > grPlan + 0.2);
                          const niedomiar = Boolean(wierszJednego && grW < grPlan - 0.2);
                          const nazwaObszaru = jeden
                            ? (plan.dzialki.find((d) => d.id === jeden.dzialkaId)?.nazwa ?? '—')
                            : segmenty.map((s) => plan.dzialki.find((d) => d.id === s.dzialkaId)?.nazwa).filter(Boolean).join(' → ');
                          const kmJednego = jeden ? kmWpisuLive(plan, wpisyCalegoPlanu, jeden) : '';
                          return (
                            <View key={`auto-${auto.numerAuta}`}>
                              <View style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border }]}>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[0].width, color: theme.colors.textSecondary }]}>{auto.numerAuta} {ETYKIETY_RZUTU[(auto.numerRzutu ?? 1) - 1]?.replace(' rzut', '')}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[1].width, color: theme.colors.text }]}>{formatLiczby(auto.tonaz)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[2].width, color: theme.colors.text }]}>{formatLiczby(auto.metry)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[3].width, color: przepal ? theme.colors.danger : niedomiar ? theme.colors.warning : theme.colors.success }]}>
                                  {wierszJednego && grW > 0 ? tekstGrubosciLive(grW, grPlan) : '—'}
                                </Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[4].width, color: theme.colors.text }]}>{formatLiczby(doKonca)}</Text>
                                <Text style={[styles.tabelaKom, { width: KOLUMNY[5].width, color: theme.colors.text }]}>{auto.godzinaWybudowania}</Text>
                                <Text style={[styles.tabelaKom, { width: 88, color: theme.colors.textSecondary, fontSize: 10 }]} numberOfLines={2}>{nazwaObszaru}</Text>
                                <Text style={[styles.tabelaKom, { width: 108, color: theme.colors.info, fontSize: 10 }]} numberOfLines={2}>{kmJednego || '—'}</Text>
                                <TouchableOpacity accessibilityLabel={`Edytuj auto ${auto.numerAuta}`} onPress={() => rozpocznijEdycjeAuta(auto)} style={{ width: 32, alignItems: 'center' }}>
                                  <Text style={{ color: theme.colors.info, fontSize: 15 }}>✎</Text>
                                </TouchableOpacity>
                                <TouchableOpacity accessibilityLabel={`Usuń auto ${auto.numerAuta}`} onPress={() => usunAutoLive(auto.numerAuta)} style={{ width: 32, alignItems: 'center' }}>
                                  <Text style={{ color: theme.colors.danger, fontSize: 16 }}>✕</Text>
                                </TouchableOpacity>
                              </View>
                              {segmenty.length > 1 && segmenty.map((wpis) => {
                                const dz = plan.dzialki.find((d) => d.id === wpis.dzialkaId);
                                const { grubosc: grSeg, grPlan: grP } = obliczWierszLive(wpis);
                                const ponad = grSeg > grP + 0.2;
                                const ponizej = grSeg < grP - 0.2;
                                return (
                                  <View key={wpis.id} style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border, backgroundColor: `${theme.colors.primary}08` }]}>
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[0].width, color: theme.colors.textSecondary, fontSize: 11 }]}>{auto.numerAuta}</Text>
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[1].width, color: theme.colors.text, fontSize: 11 }]}>{formatLiczby(wpis.tonazPrzywieziony)}</Text>
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[2].width, color: theme.colors.text, fontSize: 11 }]}>{formatLiczby(wpis.przejechaneMetry)}</Text>
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[3].width, fontSize: 11, color: ponad ? theme.colors.danger : ponizej ? theme.colors.warning : theme.colors.success }]}>
                                      {tekstGrubosciLive(grSeg, grP)}
                                    </Text>
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[4].width, color: theme.colors.textSecondary, fontSize: 11 }]} />
                                    <Text style={[styles.tabelaKom, { width: KOLUMNY[5].width, color: theme.colors.textSecondary, fontSize: 11 }]} />
                                    <Text style={[styles.tabelaKom, { width: 88, color: theme.colors.textSecondary, fontSize: 10 }]} numberOfLines={2}>{dz?.nazwa ?? '—'}</Text>
                                    <Text style={[styles.tabelaKom, { width: 108, color: theme.colors.info, fontSize: 10 }]} numberOfLines={2}>{dz ? kmWpisuLive(plan, wpisyCalegoPlanu, wpis) : '—'}</Text>
                                    <Text style={{ width: 32 }} />
                                    <Text style={{ width: 32 }} />
                                  </View>
                                );
                              })}
                              {auto.komentarz ? (
                                <Text style={[styles.komentarzTekst, { color: theme.colors.textSecondary, borderBottomColor: theme.colors.border }]}>💬 {auto.komentarz}</Text>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <View style={[styles.livePodsumWrap, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
                      <IR label="Pozostało pow." v={`${formatLiczby(bilansPlanu.pozostalaPowierzchnia)} m²`} theme={theme} />
                      <IR label="Do końca metrów" v={`${formatLiczby(bilansPlanu.pozostaloMetrow)} m`} theme={theme} />
                      <IR label="Do wbudowania (założenie)" v={`${formatLiczby(bilansPlanu.pozostalaMasaWgPlanu, 2)} Mg`} theme={theme} />
                    </View>
                  </View>
                )}

                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: edytowanyNumerAuta != null ? theme.colors.warning : theme.colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <Text style={[styles.kartaTytul, { color: theme.colors.text, marginBottom: 0, flex: 1 }]}>
                      {edytowanyNumerAuta != null ? `Edycja auta #${edytowanyNumerAuta}` : `Auto #${kolejnyNumerAuta}`}
                    </Text>
                    <View style={{ minWidth: 120 }}>
                      <TouchableOpacity
                        onPress={() => setRzutListaOtwarta((o) => !o)}
                        style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, paddingVertical: 8 }]}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                          {ETYKIETY_RZUTU[numerRzutu - 1] ?? 'I rzut'} {rzutListaOtwarta ? '▴' : '▾'}
                        </Text>
                      </TouchableOpacity>
                      {rzutListaOtwarta && (
                        <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, marginTop: 4, overflow: 'hidden', backgroundColor: theme.colors.card }}>
                          {ETYKIETY_RZUTU.map((etykieta, i) => (
                            <TouchableOpacity
                              key={etykieta}
                              onPress={() => {
                                setNumerRzutu(i + 1);
                                rzutReczny.current = true;
                                setRzutListaOtwarta(false);
                              }}
                              style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: numerRzutu === i + 1 ? `${theme.colors.primary}18` : 'transparent' }}
                            >
                              <Text style={{ color: numerRzutu === i + 1 ? theme.colors.primary : theme.colors.text, fontWeight: '600' }}>{etykieta}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                    {edytowanyNumerAuta != null
                      ? 'Edytujesz całe auto: łączny tonaż i łączne metry. Tony wcześniejszych obszarów liczą się z grubości wbudowywania wpisanej w planie, nie z grubości projektowej. Na ostatnim obszarze wychodzi grubość z reszty ładunku i widać, czy trzyma założenie.'
                      : aktywnaDzialka
                        ? `Program sam liczy pozycję od „${aktywnaDzialka.dzialka.nazwa}”. Auto, które przechodzi na kolejny obszar, zachowuje ten sam numer.`
                        : 'Wszystkie działki zakończone.'}
                    {dzialkaZakonczonaWpisu && edytowanyNumerAuta == null ? ' (aktywna działka zakończona – wznów lub dodaj metry na kolejnej)' : ''}
                  </Text>
                  <NumInput label="Tonaż [Mg]" value={nowyTonaz} onChange={setNowyTonaz} theme={theme} placeholder={String(plan.tonazAuta)} />
                  {edytowanyNumerAuta == null && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>Gdzie powinniśmy dojechać</Text>
                      <View style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                          {metryPlanowaneLive != null && metryZDojazduZAuta != null
                            ? `${formatLiczby(metryPlanowaneLive)} m od startu / ${formatLiczby(metryZDojazduZAuta)} m z auta`
                            : '— wpisz tonaż powyżej —'}
                        </Text>
                      </View>
                    </View>
                  )}
                  {edytowanyNumerAuta == null && (
                    <View style={[styles.miniTabs, { borderColor: theme.colors.border, marginBottom: 8 }]}>
                      {([
                        { id: 'zAuta' as const, label: 'Metry z auta' },
                        { id: 'odStartu' as const, label: 'Od startu planu' },
                      ]).map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.miniTab, trybMetrowLive === t.id && { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary }]}
                          onPress={() => przelaczTrybMetrow(t.id)}
                        >
                          <Text style={[styles.miniTabTekst, { color: trybMetrowLive === t.id ? theme.colors.primary : theme.colors.textSecondary }]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <NumInput
                    label={edytowanyNumerAuta != null || trybMetrowLive === 'zAuta' ? 'Przejechane metry z auta [m]' : 'Odległość od startu [m]'}
                    value={nowyMetry}
                    onChange={setNowyMetry}
                    theme={theme}
                  />
                  {edytowanyNumerAuta == null && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>
                        {trybMetrowLive === 'zAuta' ? 'Odległość od startu (auto)' : 'Metry z auta (auto)'}
                      </Text>
                      <View style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                          {trybMetrowLive === 'zAuta'
                            ? (metryOdStartuObliczone != null && !isNaN(wartoscMetrowNum) ? `${formatLiczby(metryOdStartuObliczone)} m` : '—')
                            : (metryZAutaObliczone != null && !isNaN(wartoscMetrowNum) ? `${formatLiczby(metryZAutaObliczone)} m` : '—')}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.godzinWrap}>
                    <Text style={[styles.godzLabel, { color: theme.colors.textSecondary }]}>Godz. wybudowania</Text>
                    <TextInput style={[styles.godzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyGodzina} onChangeText={setNowyGodzina} maxLength={5} placeholder="HH:MM" placeholderTextColor={theme.colors.textSecondary} keyboardType="numbers-and-punctuation" />
                  </View>
                  <TextInput style={[styles.komentarzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyKomentarz} onChangeText={setNowyKomentarz} placeholder="Komentarz / uwagi (opcjonalnie)" placeholderTextColor={theme.colors.textSecondary} multiline />
                  {podgladRozkladu.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>Rozkład na obszary</Text>
                      {podgladRozkladu.map((seg, i) => {
                        const dz = plan.dzialki.find((d) => d.id === seg.dzialkaId);
                        const rho = dz ? (ciezarPoMieszance(dz.mieszankaId) ?? 2.45) : 2.45;
                        const gr = dz ? gruboscSegmentuLive(dz, seg.przed, seg.metry, seg.tonaz, rho).grubosc : 0;
                        const zalozena = dz ? gruboscWbudowywania(dz) : 0;
                        const start = dz ? dz.kilometrazPoczatkowyKm * 1000 + dz.kilometrazPoczatkowyM : 0;
                        const zakres = dz ? zakresOdcinkaKm(start, seg.przed, seg.metry, dz.kierunekUkladania) : null;
                        return (
                          <Text key={`${seg.dzialkaId}-${i}`} style={{ color: theme.colors.text, fontSize: 13, marginBottom: 2 }}>
                            {dz?.nazwa ?? 'Obszar'}: {formatLiczby(seg.metry)} m · {formatLiczby(seg.tonaz)} Mg · {tekstGrubosciLive(gr, zalozena)} cm
                            {zakres ? ` · ${formatujPikietaz(zakres.odM)}–${formatujPikietaz(zakres.doM)}` : ''}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                  <TouchableOpacity
                    accessibilityLabel={edytowanyNumerAuta != null ? 'Zapisz zmiany auta' : `Dodaj auto ${kolejnyNumerAuta}`}
                    style={[styles.btnDodajAuto, { backgroundColor: edytowanyNumerAuta != null ? theme.colors.warning : theme.colors.success }]}
                    onPress={dodajWpisLive}
                  >
                    <Text style={styles.btnDodajAutoTekst}>{edytowanyNumerAuta != null ? '✓ Zapisz zmiany' : `+ Dodaj auto #${kolejnyNumerAuta}`}</Text>
                  </TouchableOpacity>
                  {edytowanyNumerAuta != null && (
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
                  {mieszankiUnikalne.length > 1 && aktywnaDzialka && (
                    <TouchableOpacity
                      style={[styles.btnOstatnieAuto, {
                        backgroundColor: `${theme.colors.info}15`,
                        borderColor: theme.colors.info,
                        marginTop: 10,
                      }]}
                      onPress={koniecMieszanki}
                    >
                      <Text style={{ color: theme.colors.info, fontWeight: '700', fontSize: 14 }}>
                        Koniec mieszanki – {getMieszanka(aktywnaDzialka.dzialka.mieszankaId)?.rodzaj ?? 'następna'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.karta, { backgroundColor: `${theme.colors.danger}08`, borderColor: theme.colors.danger }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.kartaTytul, { color: theme.colors.danger, flex: 1 }]}>Zakończenie dniówki</Text>
                    <InfoTooltip tresc="Po zakończeniu dniówka trafia do archiwum tej budowy. Raport PDF i e-mail są w archiwum." />
                  </View>
                  <TouchableOpacity
                    style={[styles.btnOstatnieAuto, { backgroundColor: `${theme.colors.textSecondary}15`, borderColor: theme.colors.border, marginBottom: 10 }]}
                    accessibilityLabel="Wyczyść LIVE"
                    onPress={wyczyscLive}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>🗑 Wyczyść LIVE</Text>
                  </TouchableOpacity>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, flex: 1 }]}>
                      {zalacznikiPzt.length} plik(ów)
                    </Text>
                    <InfoTooltip tresc="Podgląd załączników z przybliżaniem i obracaniem." />
                  </View>
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
          planDoLiczenia,
          wpisyCalegoPlanu,
          wpis.numerAuta,
          ciezarPoMieszance,
        );
        const przedModal = metryPrzedWpisem(plan, wpisyCalegoPlanu, wpis);
        const uzysk = gruboscSegmentuLive(
          dzModal,
          przedModal,
          wpis.przejechaneMetry,
          wpis.tonazPrzywieziony,
          mieModal.ciezarObjetosciowy,
        );
        const powAuta = uzysk.powierzchnia;
        const grAuta = uzysk.grubosc;
        const bilansAuta = wpis.tonazPrzywieziony - powAuta * (grModal / 100) * mieModal.ciezarObjetosciowy;
        const startKm = dzModal.kilometrazPoczatkowyKm * 1000 + dzModal.kilometrazPoczatkowyM;
        const zakresKm = zakresOdcinkaKm(startKm, przedModal, wpis.przejechaneMetry, dzModal.kierunekUkladania);
        const metryAuta = zakresKm
          ? `${formatLiczby(wpis.przejechaneMetry)} m (${formatujKmM(zakresKm.odM)} - ${formatujKmM(zakresKm.doM)})`
          : `${formatLiczby(wpis.przejechaneMetry)} m`;

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
                  <ModalRow label="Przejechane metry" v={metryAuta} theme={theme} />
                  <ModalRow label="Zakryta powierzchnia" v={`${formatLiczby(powAuta)} m²`} theme={theme} />
                  <ModalRow label="Grubość założona" v={`${formatLiczby(grModal)} cm`} theme={theme} />
                  <ModalRow label="Grubość projektowa" v={`${formatLiczby(gruboscProjektowa(dzModal))} cm`} theme={theme} />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.opisMaly, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>
                      Odcinek 1→{wpis.numerAuta}
                    </Text>
                    <InfoTooltip tresc={`Podsumowanie całego planu dnia od auta #1 do #${wpis.numerAuta}.`} />
                  </View>
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

      <Modal visible={potwierdzZakonczenie} transparent animationType="slide" onRequestClose={() => { if (!generujeRaport) setPotwierdzZakonczenie(false); }}>
        <Pressable style={styles.modalTlo} onPress={() => { if (!generujeRaport) setPotwierdzZakonczenie(false); }}>
          <Pressable style={[styles.modalKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTytul, { color: theme.colors.text, textAlign: 'center', marginBottom: 8 }]}>Zakończ układanie</Text>
            <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
              Dniówka zostanie zapisana w archiwum. Raport PDF możesz przygotować teraz albo później, przy przeglądaniu planu.
            </Text>
            <TouchableOpacity
              style={[styles.btnDodajAuto, { backgroundColor: theme.colors.danger, marginBottom: 10 }]}
              onPress={() => { void wykonajZakonczenie(true); }}
              disabled={generujeRaport}
            >
              <Text style={styles.btnDodajAutoTekst}>{generujeRaport ? 'Zapisuję…' : 'Zakończ i przygotuj PDF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnOstatnieAuto, { borderColor: theme.colors.border, marginBottom: 10 }]}
              onPress={() => { void wykonajZakonczenie(false); }}
              disabled={generujeRaport}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>Tylko zapisz do archiwum</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnOstatnieAuto, { borderColor: theme.colors.border }]}
              onPress={() => setPotwierdzZakonczenie(false)}
              disabled={generujeRaport}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', fontSize: 15 }}>Anuluj</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 }}>{v}</Text>
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
