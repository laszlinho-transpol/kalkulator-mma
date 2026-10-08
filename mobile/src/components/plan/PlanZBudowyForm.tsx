// ============================================================
// FORMULARZ PLANU MASY Z BUDOWY (obszar, km, warstwa, wyjątki)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, useColorScheme,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { InfoTooltip } from '../common/InfoTooltip';
import { DatePickerButton } from '../common/DatePickerButton';
import { NumericInput } from '../common/NumericInput';
import { PoleKilometraz } from '../common/PoleKilometraz';
import { MieszankaPicker } from '../common/MieszankaPicker';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';
import { useBudowyStore } from '../../stores/budowyStore';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { nastepnyDzienKalendarzowy } from '../../utils/dates';
import { Z_METROW_BIEZACYCH } from '../../constants';
import {
  formatLiczby, parsujRzuty, walidujRzuty, generujDomyslneRzuty,
} from '../../utils/calculations';
import { formatujKmM } from '../../utils/projektBudowy';
import { pobierzUstawienia } from '../../utils/ustawieniaAplikacji';
import { WyborKmNaMapie } from './WyborKmNaMapie';
import {
  gestoscZRecepty,
  odsadzkiWpisaneWPlanie,
  opcjeWarstwWZakresie,
  parsujOdsadzkeCm,
  policzOdcinkiPlanu,
  zakresKmObszaru,
  zbudujPlanZZakladek,
  type ZakladkaDoZbudowania,
} from '../../utils/planZBudowy';
import type { KategoriaWarstwy, Plan, ProjektBudowy } from '../../types';

const MAX_DZIALEK = 20;

function generujId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function metryNaPola(m: number): { km: string; mm: string } {
  const z = Z_METROW_BIEZACYCH(Math.max(0, Math.round(m)));
  return { km: String(z.km), mm: String(z.m).padStart(3, '0') };
}

function polaNaMetry(km: string, mm: string): number {
  return (parseInt(km || '0', 10) || 0) * 1000 + (parseInt(mm || '0', 10) || 0);
}

interface ZakladkaDraft {
  id: string;
  legendaId: string;
  odKm: string;
  odM: string;
  doKm: string;
  doM: string;
  warstwaNazwa: string;
  warstwaKat?: KategoriaWarstwy;
  odsL: string;
  odsP: string;
  mieszankaId: string;
  grubosci: string[];
  inicjalizacjaKm: boolean;
}

function nowaZakladka(zrodlo?: Partial<ZakladkaDraft>): ZakladkaDraft {
  return {
    id: zrodlo?.id ?? generujId(),
    legendaId: zrodlo?.legendaId ?? '',
    odKm: zrodlo?.odKm ?? '0',
    odM: zrodlo?.odM ?? '000',
    doKm: zrodlo?.doKm ?? '0',
    doM: zrodlo?.doM ?? '000',
    warstwaNazwa: zrodlo?.warstwaNazwa ?? '',
    warstwaKat: zrodlo?.warstwaKat,
    odsL: zrodlo?.odsL ?? '0',
    odsP: zrodlo?.odsP ?? '0',
    mieszankaId: zrodlo?.mieszankaId ?? '',
    grubosci: zrodlo?.grubosci ? [...zrodlo.grubosci] : [],
    inicjalizacjaKm: zrodlo?.inicjalizacjaKm ?? true,
  };
}

function kopiaZakladki(z: ZakladkaDraft): ZakladkaDraft {
  return nowaZakladka({ ...z, id: generujId(), grubosci: [...z.grubosci], inicjalizacjaKm: false });
}

function zakladkiZPlanu(plan: Plan | undefined, domyslnyObszarId: string): ZakladkaDraft[] {
  if (plan?.zakladkiBudowy?.length) {
    return plan.zakladkiBudowy.map((z) => {
      const a = metryNaPola(z.kilometrazOdM);
      const b = metryNaPola(z.kilometrazDoM);
      return nowaZakladka({
        id: z.id,
        legendaId: z.legendaId,
        odKm: a.km,
        odM: a.mm,
        doKm: b.km,
        doM: b.mm,
        warstwaNazwa: z.warstwaNazwa,
        warstwaKat: z.warstwaKategoria,
        odsL: String(z.odsadzkaLewaCm),
        odsP: String(z.odsadzkaPrawaCm),
        mieszankaId: z.mieszankaId,
        grubosci: z.grubosciCm.map(String),
        inicjalizacjaKm: false,
      });
    });
  }
  if (plan) {
    const a = metryNaPola(plan.kilometrazOdM ?? 0);
    const b = metryNaPola(plan.kilometrazDoM ?? 0);
    const ods = odsadzkiWpisaneWPlanie(plan);
    return [nowaZakladka({
      legendaId: plan.legendaId ?? domyslnyObszarId,
      odKm: a.km,
      odM: a.mm,
      doKm: b.km,
      doM: b.mm,
      warstwaNazwa: plan.warstwaNazwa ?? '',
      warstwaKat: plan.warstwaKategoria,
      odsL: String(ods.lewa),
      odsP: String(ods.prawa),
      mieszankaId: plan.dzialki[0]?.mieszankaId ?? '',
      grubosci: plan.dzialki.map((d) => String(d.gruboscWbudowywania ?? d.grubosc ?? '')),
      inicjalizacjaKm: false,
    })];
  }
  return [nowaZakladka({ legendaId: domyslnyObszarId, inicjalizacjaKm: true })];
}

/** Uzupełnia kilometraż obszaru, pierwszą warstwę i grubości odcinków. Zwraca ten sam obiekt, gdy nic się nie zmienia. */
function uzupelnijZakladke(projekt: ProjektBudowy, z: ZakladkaDraft): ZakladkaDraft {
  let cur = z;
  if (cur.inicjalizacjaKm && cur.legendaId) {
    const zakres = zakresKmObszaru(projekt, cur.legendaId);
    if (zakres) {
      const a = metryNaPola(zakres.odM);
      const b = metryNaPola(zakres.doM);
      cur = { ...cur, odKm: a.km, odM: a.mm, doKm: b.km, doM: b.mm, inicjalizacjaKm: false };
    }
  }
  const od = polaNaMetry(cur.odKm, cur.odM);
  const dok = polaNaMetry(cur.doKm, cur.doM);
  const opcje = cur.legendaId ? opcjeWarstwWZakresie(projekt, cur.legendaId, od, dok) : [];
  if (opcje.length > 0 && !(cur.warstwaNazwa && opcje.some((w) => w.nazwa === cur.warstwaNazwa))) {
    const pierwsza = opcje[0];
    cur = {
      ...cur,
      warstwaNazwa: pierwsza.nazwa,
      warstwaKat: pierwsza.kategoria,
      mieszankaId: pierwsza.mieszankaIds.length === 1 ? pierwsza.mieszankaIds[0] : cur.mieszankaId,
      grubosci: [],
    };
  }
  if (cur.legendaId && cur.warstwaNazwa) {
    const odc = policzOdcinkiPlanu(projekt, {
      legendaId: cur.legendaId,
      odM: od,
      doM: dok,
      warstwaNazwa: cur.warstwaNazwa,
      warstwaKategoria: cur.warstwaKat,
      odsadzkaLewaCm: parsujOdsadzkeCm(cur.odsL),
      odsadzkaPrawaCm: parsujOdsadzkeCm(cur.odsP),
      gestoscTm3: 2.45,
      tonazAuta: 25.5,
    });
    if (odc.length > 0 && cur.grubosci.length !== odc.length) {
      cur = {
        ...cur,
        grubosci: odc.map((o, i) => cur.grubosci[i] || String(o.gruboscProjektowaCm)),
      };
    }
  }
  return cur;
}

interface Props {
  tytul: string;
  budowaId: string;
  initialPlan?: Plan;
  onZapisz: (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function PlanZBudowyForm({ tytul, budowaId, initialPlan, onZapisz }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === budowaId));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const projekt = budowa?.projekt;

  const obszary = useMemo(
    () => (projekt?.legenda ?? []).filter((w) => w.typ === 'obszar' && w.nazwa.trim()),
    [projekt],
  );

  const [data, setData] = useState<Date>(
    initialPlan ? new Date(initialPlan.dataWbudowywania) : nastepnyDzienKalendarzowy(),
  );
  const [zakladki, setZakladki] = useState<ZakladkaDraft[]>(() => zakladkiZPlanu(initialPlan, obszary[0]?.id ?? ''));
  const [aktywna, setAktywna] = useState(0);
  const [tonazStr, setTonazStr] = useState(initialPlan ? String(initialPlan.tonazAuta) : '25.5');
  const [rzutyStr, setRzutyStr] = useState(() => {
    if (!initialPlan?.rzuty?.length || initialPlan.rzuty.length <= 1) return '';
    return initialPlan.rzuty.map((r) => r.iloscSamochodow).join('+');
  });
  const [pickerMix, setPickerMix] = useState(false);
  const [mapaKm, setMapaKm] = useState<'start' | 'koniec' | null>(null);

  const aktywnaIdx = Math.min(aktywna, Math.max(0, zakladki.length - 1));
  const zak = zakladki[aktywnaIdx];

  useEffect(() => {
    if (initialPlan) return;
    let anulowano = false;
    pobierzUstawienia().then((u) => {
      if (anulowano || !(u.tonazDomyslny > 0)) return;
      setTonazStr((prev) => (prev === '25.5' ? String(u.tonazDomyslny) : prev));
    }).catch(() => { /* zostaje 25,5 */ });
    return () => { anulowano = true; };
  }, [initialPlan]);

  useEffect(() => {
    if (obszary.length === 0) return;
    setZakladki((prev) => {
      if (prev.every((z) => z.legendaId)) return prev;
      return prev.map((z) => (
        z.legendaId ? z : { ...z, legendaId: obszary[0].id, inicjalizacjaKm: true }
      ));
    });
  }, [obszary]);

  const podpisZakladek = zakladki.map((z) => [
    z.id, z.legendaId, z.odKm, z.odM, z.doKm, z.doM, z.warstwaNazwa, z.warstwaKat ?? '',
    z.inicjalizacjaKm ? '1' : '0', String(z.grubosci.length),
  ].join('|')).join('||');

  useEffect(() => {
    if (!projekt) return;
    setZakladki((prev) => {
      let zmiana = false;
      const next = prev.map((z) => {
        const u = uzupelnijZakladke(projekt, z);
        if (u !== z) zmiana = true;
        return u;
      });
      return zmiana ? next : prev;
    });
  }, [projekt, podpisZakladek]);

  const tonazAuta = parseFloat(tonazStr.replace(',', '.')) || 25.5;

  const wyniki = useMemo(() => zakladki.map((z) => {
    const od = polaNaMetry(z.odKm, z.odM);
    const dok = polaNaMetry(z.doKm, z.doM);
    const gestosc = gestoscZRecepty(z.mieszankaId, mieszanki);
    const opcje = projekt && z.legendaId ? opcjeWarstwWZakresie(projekt, z.legendaId, od, dok) : [];
    const odcinki = projekt && z.legendaId && z.warstwaNazwa
      ? policzOdcinkiPlanu(projekt, {
        legendaId: z.legendaId,
        odM: od,
        doM: dok,
        warstwaNazwa: z.warstwaNazwa,
        warstwaKategoria: z.warstwaKat,
        odsadzkaLewaCm: parsujOdsadzkeCm(z.odsL),
        odsadzkaPrawaCm: parsujOdsadzkeCm(z.odsP),
        gestoscTm3: gestosc,
        tonazAuta,
        grubosciCm: z.grubosci.map((g) => parseFloat(g.replace(',', '.')) || 0),
      })
      : [];
    return {
      od,
      dok,
      gestosc,
      opcje,
      odcinki,
      obszarNazwa: obszary.find((o) => o.id === z.legendaId)?.nazwa ?? '',
      mieszankaNazwa: mieszanki.find((m) => m.id === z.mieszankaId)?.rodzaj ?? '',
    };
  }), [zakladki, projekt, mieszanki, tonazAuta, obszary]);

  const widok = wyniki[aktywnaIdx];
  const warstwaOpcja = widok?.opcje.find((w) => w.nazwa === zak?.warstwaNazwa);
  const mieszanka = mieszanki.find((m) => m.id === zak?.mieszankaId);
  const kierunek = widok && widok.od > widok.dok ? 'malejacy' : 'rosnacy';

  const sumaPow = roundSum(wyniki.flatMap((w) => w.odcinki.map((o) => o.powierzchniaM2)));
  const sumaMasy = roundSum3(wyniki.flatMap((w) => w.odcinki.map((o) => o.masaMg)));
  const sumaAut = wyniki.reduce((s, w) => s + w.odcinki.reduce((a, o) => a + o.auta, 0), 0);
  const wierszeMix = (() => {
    const mapa = new Map<string, { nazwa: string; pow: number; masa: number; auta: number }>();
    for (const w of wyniki) {
      const nazwa = w.mieszankaNazwa || '—';
      const cur = mapa.get(nazwa) ?? { nazwa, pow: 0, masa: 0, auta: 0 };
      cur.pow += w.odcinki.reduce((s, o) => s + o.powierzchniaM2, 0);
      cur.masa += w.odcinki.reduce((s, o) => s + o.masaMg, 0);
      cur.auta += w.odcinki.reduce((s, o) => s + o.auta, 0);
      mapa.set(nazwa, cur);
    }
    return [...mapa.values()].map((w) => ({
      ...w,
      pow: Math.round(w.pow * 100) / 100,
      masa: Math.round(w.masa * 1000) / 1000,
    }));
  })();

  const patchAktywna = (patch: Partial<ZakladkaDraft>) => {
    setZakladki((prev) => prev.map((z, i) => (i === aktywnaIdx ? { ...z, ...patch } : z)));
  };

  const zmienLiczbe = (delta: number) => {
    if (delta > 0) {
      if (zakladki.length >= MAX_DZIALEK) return;
      const ostatnia = zakladki[zakladki.length - 1];
      setZakladki([...zakladki, kopiaZakladki(ostatnia)]);
      setAktywna(zakladki.length);
      return;
    }
    if (zakladki.length <= 1) return;
    setZakladki(zakladki.slice(0, -1));
    setAktywna((i) => Math.min(i, zakladki.length - 2));
  };

  const przesun = (kierunekPrzesuniecia: -1 | 1) => {
    const j = aktywnaIdx + kierunekPrzesuniecia;
    if (j < 0 || j >= zakladki.length) return;
    setZakladki((prev) => {
      const next = [...prev];
      const biezaca = next[aktywnaIdx];
      next[aktywnaIdx] = next[j];
      next[j] = biezaca;
      return next;
    });
    setAktywna(j);
  };

  const zapisz = async () => {
    if (!projekt) { Alert.alert('Brak projektu', 'Uzupełnij PZT i konstrukcje w menu Budowa.'); return; }
    const doZbudowania: ZakladkaDoZbudowania[] = [];
    for (let i = 0; i < zakladki.length; i++) {
      const z = zakladki[i];
      const w = wyniki[i];
      const nr = zakladki.length > 1 ? `Działka ${i + 1}: ` : '';
      if (!z.legendaId) { Alert.alert('Obszar', `${nr}Wybierz obszar z listy.`); setAktywna(i); return; }
      if (!z.warstwaNazwa) { Alert.alert('Warstwa', `${nr}Wybierz warstwę.`); setAktywna(i); return; }
      if (w.od === w.dok) { Alert.alert('Kilometraż', `${nr}Start i koniec muszą się różnić – od tego zależy kierunek układania.`); setAktywna(i); return; }
      if (!z.mieszankaId) { Alert.alert('Recepta', `${nr}Wybierz receptę, aby przeliczyć gęstość i masę.`); setAktywna(i); return; }
      if (w.odcinki.length === 0) { Alert.alert('Konstrukcja', `${nr}W podanym kilometrażu nie ma konstrukcji dla tego obszaru.`); setAktywna(i); return; }
      doZbudowania.push({
        id: z.id,
        legendaId: z.legendaId,
        obszarNazwa: w.obszarNazwa,
        warstwaNazwa: z.warstwaNazwa,
        warstwaKategoria: z.warstwaKat,
        kilometrazOdM: w.od,
        kilometrazDoM: w.dok,
        odsadzkaLewaCm: parsujOdsadzkeCm(z.odsL),
        odsadzkaPrawaCm: parsujOdsadzkeCm(z.odsP),
        mieszankaId: z.mieszankaId,
        gestoscTm3: w.gestosc,
        grubosciCm: w.odcinki.map((o, j) => (
          parseFloat((z.grubosci[j] || String(o.gruboscProjektowaCm)).replace(',', '.')) || o.gruboscProjektowaCm
        )),
      });
    }
    let rzuty = generujDomyslneRzuty(Math.max(1, sumaAut));
    if (rzutyStr.trim()) {
      const parsed = parsujRzuty(rzutyStr);
      if (!parsed || !walidujRzuty(rzutyStr, sumaAut)) {
        Alert.alert('Rzuty', `Podział "${rzutyStr}" musi sumować się do ${sumaAut} aut.`);
        return;
      }
      rzuty = parsed;
    }
    const dane = zbudujPlanZZakladek(projekt, {
      budowaId,
      dataWbudowywania: data.toISOString(),
      tonazAuta,
      rzuty,
      zakladki: doZbudowania,
    });
    await onZapisz(dane);
  };

  if (!budowa) {
    return (
      <View style={[styl.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul={tytul} lewy={{ tekst: 'Anuluj', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.danger, padding: 24 }}>Nie znaleziono budowy.</Text>
      </View>
    );
  }

  if (!projekt || obszary.length === 0 || !zak || !widok) {
    return (
      <View style={[styl.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul={tytul} lewy={{ tekst: 'Anuluj', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, padding: 24, lineHeight: 22 }}>
          Ta budowa nie ma jeszcze legendy obszarów. Uzupełnij PZT, legendę i konstrukcje w menu Budowa, potem wróć tutaj.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styl.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={tytul}
        podtytul={`${budowa.kodBudowy} – ${budowa.nazwaInwestycji}`}
        lewy={{ tekst: 'Anuluj', onPress: () => router.back(), kolor: theme.colors.danger }}
        prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styl.zawartosc, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
          <Sekcja tytul="Data układania" theme={theme}>
            <DatePickerButton label="Data" value={data} onChange={setData} />
          </Sekcja>

          <Sekcja
            tytul="Działki robocze"
            theme={theme}
            info="Każda działka robocza to osobny obszar do ułożenia. Druga i kolejne otwierają zakładkę z tymi samymi polami. Kolejność zakładek to kolejność zakrywania."
          >
            <View style={styl.licznikWrap}>
              <Text style={[styl.licznikLabel, { color: theme.colors.textSecondary }]}>Ilość działek roboczych</Text>
              <View style={styl.licznikPrzyciski}>
                <TouchableOpacity
                  accessibilityLabel="Usuń działkę roboczą"
                  style={[styl.licznikBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: zakladki.length <= 1 ? 0.4 : 1 }]}
                  onPress={() => zmienLiczbe(-1)}
                >
                  <Text style={[styl.licznikBtnTekst, { color: theme.colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text
                  accessibilityLabel={`Liczba działek roboczych ${zakladki.length}`}
                  style={[styl.licznikWartosc, { color: theme.colors.text }]}
                >
                  {zakladki.length}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Dodaj działkę roboczą"
                  style={[styl.licznikBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: zakladki.length >= MAX_DZIALEK ? 0.4 : 1 }]}
                  onPress={() => zmienLiczbe(1)}
                >
                  <Text style={[styl.licznikBtnTekst, { color: theme.colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Sekcja>

          {zakladki.length > 1 && (
            <View style={styl.zakladkiBlok}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styl.zakladkiRzad}>
                {zakladki.map((z, i) => {
                  const on = i === aktywnaIdx;
                  const nazwa = wyniki[i]?.obszarNazwa;
                  return (
                    <TouchableOpacity
                      key={z.id}
                      accessibilityLabel={`Zakładka działka ${i + 1}`}
                      style={[styl.zakladka, {
                        borderColor: on ? theme.colors.primary : theme.colors.border,
                        backgroundColor: on ? theme.colors.primary : theme.colors.card,
                      }]}
                      onPress={() => setAktywna(i)}
                    >
                      <Text style={{ color: on ? '#fff' : theme.colors.text, fontWeight: '800' }}>
                        Działka {i + 1}
                      </Text>
                      {nazwa ? (
                        <Text style={{ color: on ? '#fff' : theme.colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                          {nazwa}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styl.kolejnosc}>
                <TouchableOpacity
                  accessibilityLabel="Przesuń działkę wcześniej"
                  style={[styl.kolejnoscBtn, { borderColor: theme.colors.border, opacity: aktywnaIdx === 0 ? 0.4 : 1 }]}
                  onPress={() => przesun(-1)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>← Wcześniej</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Przesuń działkę później"
                  style={[styl.kolejnoscBtn, { borderColor: theme.colors.border, opacity: aktywnaIdx === zakladki.length - 1 ? 0.4 : 1 }]}
                  onPress={() => przesun(1)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Później →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Sekcja tytul="Obszar" theme={theme}>
            {obszary.map((o) => {
              const on = o.id === zak.legendaId;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styl.chip, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}18` : theme.colors.inputBackground }]}
                  onPress={() => patchAktywna({ legendaId: o.id, inicjalizacjaKm: true, warstwaNazwa: '', grubosci: [] })}
                >
                  <View style={[styl.kropka, { backgroundColor: o.kolor }]} />
                  <Text style={{ color: theme.colors.text, fontWeight: on ? '700' : '500', flex: 1 }}>{o.nazwa}</Text>
                </TouchableOpacity>
              );
            })}
          </Sekcja>

          <Sekcja
            tytul="Kilometraż"
            theme={theme}
            info="Start i koniec określają kierunek układania. „Zaznacz na mapie” stawia obie krawędzie wybranego obszaru i wpisuje kilometraż."
          >
            <Text style={[styl.hint, { color: theme.colors.text, fontWeight: '700' }]}>
              Kierunek: {kierunek === 'rosnacy' ? 'rosnący ↑' : 'malejący ↓'}
            </Text>
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Start</Text>
            <PoleKilometraz
              theme={theme}
              km={zak.odKm}
              m={zak.odM}
              onKm={(v) => patchAktywna({ odKm: v })}
              onM={(v) => patchAktywna({ odM: v })}
            />
            <TouchableOpacity
              style={[styl.btnMapa, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}12` }]}
              onPress={() => setMapaKm('start')}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Zaznacz na mapie</Text>
            </TouchableOpacity>
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Koniec</Text>
            <PoleKilometraz
              theme={theme}
              km={zak.doKm}
              m={zak.doM}
              onKm={(v) => patchAktywna({ doKm: v })}
              onM={(v) => patchAktywna({ doM: v })}
            />
            <TouchableOpacity
              style={[styl.btnMapa, { borderColor: '#DC2626', backgroundColor: '#DC262612' }]}
              onPress={() => setMapaKm('koniec')}
            >
              <Text style={{ color: '#DC2626', fontWeight: '800' }}>Zaznacz na mapie</Text>
            </TouchableOpacity>
          </Sekcja>

          {widok.odcinki.length > 1 && (
            <Sekcja tytul="Różne konstrukcje w zakresie" theme={theme}>
              <Text style={[styl.hint, { color: theme.colors.warning }]}>
                W kilometrażu {formatujKmM(Math.min(widok.od, widok.dok))} – {formatujKmM(Math.max(widok.od, widok.dok))} program wykrył {widok.odcinki.length} odcinki. Dla każdego możesz zmienić grubość.
              </Text>
              {widok.odcinki.map((o) => (
                <View key={`${o.odM}-${o.doM}`} style={[styl.odcinek, { borderColor: o.wyjateks ? theme.colors.warning : theme.colors.border }]}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                    {formatujKmM(o.odM)} – {formatujKmM(o.doM)}{o.wyjateks ? ' · wyjątek' : ''}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>{o.opisKonstrukcji}</Text>
                </View>
              ))}
            </Sekcja>
          )}

          <Sekcja tytul="Warstwa" theme={theme}>
            {widok.opcje.length === 0 ? (
              <Text style={[styl.hint, { color: theme.colors.danger }]}>Brak warstw konstrukcji w tym kilometrażu.</Text>
            ) : widok.opcje.map((w) => {
              const on = w.nazwa === zak.warstwaNazwa;
              return (
                <TouchableOpacity
                  key={`${w.kategoria}|${w.nazwa}`}
                  style={[styl.chip, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}18` : theme.colors.inputBackground }]}
                  onPress={() => patchAktywna({
                    warstwaNazwa: w.nazwa,
                    warstwaKat: w.kategoria,
                    grubosci: [],
                    mieszankaId: w.mieszankaIds.length === 1 ? w.mieszankaIds[0] : zak.mieszankaId,
                  })}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: on ? '700' : '500' }}>{w.nazwa}</Text>
                </TouchableOpacity>
              );
            })}
          </Sekcja>

          <Sekcja
            tytul="Odsadzki i recepta"
            theme={theme}
            info="0 cm to sam obrys z PZT (odsadzka z konstrukcji, np. 15 cm, nie dodaje się sama). Dodatnia poszerza tylko tam, gdzie nie ma krawężnika. Przy krawężniku zostaje obrys. Ujemna zwęża, np. −10 cm."
          >
            {warstwaOpcja ? (
              <Text style={[styl.hint, { color: theme.colors.text }]}>
                W konstrukcji: L {formatLiczby(warstwaOpcja.odsadzkaLewaCm, 1)} / P {formatLiczby(warstwaOpcja.odsadzkaPrawaCm, 1)} cm (nie doliczane automatycznie)
              </Text>
            ) : null}
            <View style={styl.dwa}>
              <View style={{ flex: 1 }}>
                <NumericInput label="Odsadzka lewa" value={zak.odsL} onChangeText={(v) => patchAktywna({ odsL: v })} unit="cm" decimals={1} allowNegative />
              </View>
              <View style={{ flex: 1 }}>
                <NumericInput label="Odsadzka prawa" value={zak.odsP} onChangeText={(v) => patchAktywna({ odsP: v })} unit="cm" decimals={1} allowNegative />
              </View>
            </View>
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Recepta</Text>
            <TouchableOpacity
              style={[styl.btnMix, { borderColor: mieszanka ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              onPress={() => setPickerMix(true)}
            >
              {mieszanka
                ? <Text style={{ color: theme.colors.text }}>{mieszanka.rodzaj}  •  ρ = {mieszanka.ciezarObjetosciowy.toFixed(3)} t/m³</Text>
                : <Text style={{ color: theme.colors.textSecondary }}>Wybierz receptę z listy →</Text>}
            </TouchableOpacity>
          </Sekcja>

          <Sekcja tytul="Odcinki i grubość" theme={theme}>
            {widok.odcinki.map((o, i) => (
              <View key={`g-${zak.id}-${o.odM}-${o.doM}`} style={[styl.odcinek, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {formatujKmM(o.odM)} – {formatujKmM(o.doM)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{o.opisKonstrukcji}</Text>
                <NumericInput
                  label="Grubość wbudowywania"
                  value={zak.grubosci[i] ?? String(o.gruboscProjektowaCm)}
                  onChangeText={(v) => {
                    const n = widok.odcinki.map((x, j) => (j === i ? v : (zak.grubosci[j] ?? String(x.gruboscProjektowaCm))));
                    patchAktywna({ grubosci: n });
                  }}
                  unit="cm"
                  decimals={1}
                  tooltip={`Projekt: ${o.gruboscProjektowaCm} cm`}
                />
                <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                  {formatLiczby(o.powierzchniaM2)} m²  ·  {formatLiczby(o.masaMg, 3)} Mg  ·  {o.auta} aut
                  {'  ·  '}odsadzka L {formatLiczby(o.odsadzkaLewaCm, 1)} / P {formatLiczby(o.odsadzkaPrawaCm, 1)} cm
                </Text>
              </View>
            ))}
          </Sekcja>

          <View
            accessibilityLabel="Auta i podsumowanie"
            style={[styl.podsum, { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary }]}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '800', marginBottom: 8 }}>AUTA I PODSUMOWANIE</Text>
            <NumericInput label="Tonaż na auto" value={tonazStr} onChangeText={setTonazStr} unit="t" decimals={1} placeholder="25.5" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styl.etykieta, { color: theme.colors.textSecondary, flex: 1 }]}>Podział na rzuty (opcjonalnie)</Text>
              <InfoTooltip tresc="Wpisz podział samochodów na partie, np. 6+6+4. Suma musi wynosić liczbę aut ze wszystkich działek. Puste pole oznacza jeden rzut." />
            </View>
            <TextInput
              style={[styl.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: rzutyStr && !walidujRzuty(rzutyStr, sumaAut) ? theme.colors.danger : theme.colors.border,
                color: theme.colors.text,
              }]}
              value={rzutyStr}
              onChangeText={setRzutyStr}
              placeholder={sumaAut > 0 ? `np. ${Math.ceil(sumaAut / 2)}+${Math.floor(sumaAut / 2)}  (suma = ${sumaAut})` : 'np. 6+6+4'}
              placeholderTextColor={theme.colors.textSecondary}
            />
            {rzutyStr && !walidujRzuty(rzutyStr, sumaAut) ? (
              <Text style={{ color: theme.colors.danger, marginTop: 4 }}>Suma rzutów musi wynosić {sumaAut}</Text>
            ) : null}

            {wierszeMix.length > 1 ? (
              <TabelaMieszanek wiersze={wierszeMix} razemPow={sumaPow} razemMasa={sumaMasy} razemAut={sumaAut} theme={theme} />
            ) : (
              <>
                <Text style={[styl.wierszPodsum, { color: theme.colors.textSecondary }]}>Rodzaj mieszanki</Text>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{wierszeMix[0]?.nazwa || '—'}</Text>
                <Text style={[styl.wierszPodsum, { color: theme.colors.textSecondary }]}>Powierzchnia</Text>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatLiczby(sumaPow)} m²</Text>
                <Text style={[styl.wierszPodsum, { color: theme.colors.textSecondary }]}>Tony do wbudowania</Text>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {formatLiczby(sumaMasy, 3)} Mg  ·  {sumaAut} aut
                </Text>
              </>
            )}

            <Text style={[styl.wierszPodsum, { color: theme.colors.textSecondary }]}>Obszar wbudowywania</Text>
            {wyniki.map((w, i) => (
              <Text key={zakladki[i].id} style={{ color: theme.colors.text, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                {i + 1}. {w.obszarNazwa || '—'} · {formatujKmM(w.od)} - {formatujKmM(w.dok)}
                {w.mieszankaNazwa ? ` · ${w.mieszankaNazwa}` : ''}
                {' · '}{formatLiczby(roundSum(w.odcinki.map((o) => o.powierzchniaM2)))} m²
                {' · '}{formatLiczby(roundSum3(w.odcinki.map((o) => o.masaMg)), 3)} Mg
              </Text>
            ))}
            {widok.odcinki.length > 1 && zakladki.length === 1 && (
              <Text style={{ color: theme.colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                {widok.odcinki.length} odcinki o zmiennej konstrukcji
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {mapaKm && projekt ? (
        <WyborKmNaMapie
          visible
          rola={mapaKm}
          projekt={projekt}
          legendaId={zak.legendaId}
          kilometrazM={mapaKm === 'start' ? widok.od : widok.dok}
          drugiKmM={mapaKm === 'start' ? widok.dok : widok.od}
          theme={theme}
          onClose={() => setMapaKm(null)}
          onWybierz={(metry) => {
            const pola = metryNaPola(metry);
            if (mapaKm === 'start') patchAktywna({ odKm: pola.km, odM: pola.mm });
            else patchAktywna({ doKm: pola.km, doM: pola.mm });
          }}
        />
      ) : null}

      <MieszankaPicker
        visible={pickerMix}
        selectedId={zak.mieszankaId}
        theme={theme}
        dozwoloneIds={warstwaOpcja?.mieszankaIds}
        onSelect={(m) => { patchAktywna({ mieszankaId: m.id }); setPickerMix(false); }}
        onClose={() => setPickerMix(false)}
      />
    </View>
  );
}

function TabelaMieszanek({
  wiersze, razemPow, razemMasa, razemAut, theme,
}: {
  wiersze: Array<{ nazwa: string; pow: number; masa: number; auta: number }>;
  razemPow: number;
  razemMasa: number;
  razemAut: number;
  theme: AppTheme;
}) {
  const naglowek = { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' as const };
  const kom = { color: theme.colors.text, fontSize: 13 };
  const wiersz = (nazwa: string, pow: string, tony: string, mocny = false) => (
    <View key={nazwa} style={[styl.tabelaWiersz, { borderTopColor: theme.colors.border }]}>
      <Text style={[kom, { flex: 1.4, fontWeight: mocny ? '800' : '600' }]}>{nazwa}</Text>
      <Text style={[kom, { flex: 1, fontWeight: mocny ? '800' : '500' }]}>{pow}</Text>
      <Text style={[kom, { flex: 1.3, fontWeight: mocny ? '800' : '500' }]}>{tony}</Text>
    </View>
  );
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styl.tabelaWiersz}>
        <Text style={[naglowek, { flex: 1.4 }]}>Rodzaj mieszanki</Text>
        <Text style={[naglowek, { flex: 1 }]}>Powierzchnia</Text>
        <Text style={[naglowek, { flex: 1.3 }]}>Tony do wbudowania</Text>
      </View>
      {wiersze.map((w) => wiersz(w.nazwa, `${formatLiczby(w.pow)} m²`, `${formatLiczby(w.masa, 3)} Mg  ·  ${w.auta} aut`))}
      {wiersz('Razem', `${formatLiczby(razemPow)} m²`, `${formatLiczby(razemMasa, 3)} Mg  ·  ${razemAut} aut`, true)}
    </View>
  );
}

function roundSum(xs: number[]): number {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
}
function roundSum3(xs: number[]): number {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 1000) / 1000;
}

function Sekcja({ tytul, info, children, theme }: { tytul: string; info?: string; children: React.ReactNode; theme: AppTheme }) {
  return (
    <View style={[styl.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styl.sekcjaTytul, { color: theme.colors.textSecondary, flex: 1 }]}>{tytul.toUpperCase()}</Text>
        {info ? <InfoTooltip tresc={info} /> : null}
      </View>
      {children}
    </View>
  );
}

const styl = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 16 },
  sekcja: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  sekcjaTytul: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  etykieta: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  kropka: { width: 14, height: 14, borderRadius: 7 },
  odcinek: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  dwa: { flexDirection: 'row', gap: 10 },
  btnMix: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  btnMapa: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  podsum: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8 },
  wierszPodsum: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 2 },
  tabelaWiersz: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'transparent' },
  licznikWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  licznikLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  licznikPrzyciski: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  licznikBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  licznikBtnTekst: { fontSize: 22, fontWeight: '300', lineHeight: 28 },
  licznikWartosc: { fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  zakladkiBlok: { marginBottom: 14 },
  zakladkiRzad: { gap: 8, paddingBottom: 8 },
  zakladka: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 180 },
  kolejnosc: { flexDirection: 'row', gap: 8 },
  kolejnoscBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: 'transparent' },
});
