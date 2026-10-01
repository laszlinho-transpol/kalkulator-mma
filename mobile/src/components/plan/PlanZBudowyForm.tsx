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
import {
  gestoscZRecepty,
  komentarzPlanuBudowy,
  opcjeWarstwWZakresie,
  policzOdcinkiPlanu,
  zakresKmObszaru,
  zbudujPlanZBudowy,
} from '../../utils/planZBudowy';
import type { KategoriaWarstwy, Plan } from '../../types';

function metryNaPola(m: number): { km: string; mm: string } {
  const z = Z_METROW_BIEZACYCH(Math.max(0, Math.round(m)));
  return { km: String(z.km), mm: String(z.m).padStart(3, '0') };
}

function polaNaMetry(km: string, mm: string): number {
  return (parseInt(km || '0', 10) || 0) * 1000 + (parseInt(mm || '0', 10) || 0);
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
  const [legendaId, setLegendaId] = useState(initialPlan?.legendaId ?? obszary[0]?.id ?? '');
  const [odKm, setOdKm] = useState('0');
  const [odM, setOdM] = useState('000');
  const [doKm, setDoKm] = useState('0');
  const [doM, setDoM] = useState('000');
  const [warstwaNazwa, setWarstwaNazwa] = useState(initialPlan?.warstwaNazwa ?? '');
  const [warstwaKat, setWarstwaKat] = useState<KategoriaWarstwy | undefined>(initialPlan?.warstwaKategoria);
  const [odsL, setOdsL] = useState(String(initialPlan?.odsadzkaLewaCm ?? 0));
  const [odsP, setOdsP] = useState(String(initialPlan?.odsadzkaPrawaCm ?? 0));
  const [mieszankaId, setMieszankaId] = useState(initialPlan?.dzialki[0]?.mieszankaId ?? '');
  const [grubosci, setGrubosci] = useState<string[]>([]);
  const [tonazStr, setTonazStr] = useState(initialPlan ? String(initialPlan.tonazAuta) : '25.5');
  const [rzutyStr, setRzutyStr] = useState(() => {
    if (!initialPlan?.rzuty?.length || initialPlan.rzuty.length <= 1) return '';
    return initialPlan.rzuty.map((r) => r.iloscSamochodow).join('+');
  });
  const [pickerMix, setPickerMix] = useState(false);
  const [inicjalizacjaKm, setInicjalizacjaKm] = useState(!initialPlan);

  useEffect(() => {
    if (!initialPlan) return;
    const a = metryNaPola(initialPlan.kilometrazOdM ?? 0);
    const b = metryNaPola(initialPlan.kilometrazDoM ?? 0);
    setOdKm(a.km); setOdM(a.mm);
    setDoKm(b.km); setDoM(b.mm);
    setGrubosci(initialPlan.dzialki.map((d) => String(d.gruboscWbudowywania ?? d.grubosc ?? '')));
  }, [initialPlan]);

  useEffect(() => {
    if (!inicjalizacjaKm || !projekt || !legendaId) return;
    const z = zakresKmObszaru(projekt, legendaId);
    if (!z) return;
    const a = metryNaPola(z.odM);
    const b = metryNaPola(z.doM);
    setOdKm(a.km); setOdM(a.mm);
    setDoKm(b.km); setDoM(b.mm);
    setInicjalizacjaKm(false);
  }, [inicjalizacjaKm, projekt, legendaId]);

  const odMetry = polaNaMetry(odKm, odM);
  const doMetry = polaNaMetry(doKm, doM);
  const kierunek = odMetry > doMetry ? 'malejacy' : 'rosnacy';
  const tonazAuta = parseFloat(tonazStr.replace(',', '.')) || 25.5;

  const opcjeWarstw = useMemo(() => {
    if (!projekt || !legendaId) return [];
    return opcjeWarstwWZakresie(projekt, legendaId, odMetry, doMetry);
  }, [projekt, legendaId, odMetry, doMetry]);

  useEffect(() => {
    if (warstwaNazwa && opcjeWarstw.some((w) => w.nazwa === warstwaNazwa)) return;
    if (opcjeWarstw.length === 0) return;
    const pierwsza = opcjeWarstw[0];
    setWarstwaNazwa(pierwsza.nazwa);
    setWarstwaKat(pierwsza.kategoria);
    setOdsL(String(pierwsza.odsadzkaLewaCm ?? pierwsza.odsadzkaCm));
    setOdsP(String(pierwsza.odsadzkaPrawaCm ?? pierwsza.odsadzkaCm));
    if (pierwsza.mieszankaIds.length === 1) setMieszankaId(pierwsza.mieszankaIds[0]);
  }, [opcjeWarstw, warstwaNazwa]);

  const warstwaOpcja = opcjeWarstw.find((w) => w.nazwa === warstwaNazwa);
  const gestosc = gestoscZRecepty(mieszankaId, mieszanki);
  const mieszanka = mieszanki.find((m) => m.id === mieszankaId);

  const odcinkiBaza = useMemo(() => {
    if (!projekt || !legendaId || !warstwaNazwa) return [];
    return policzOdcinkiPlanu(projekt, {
      legendaId,
      odM: odMetry,
      doM: doMetry,
      warstwaNazwa,
      warstwaKategoria: warstwaKat,
      odsadzkaLewaCm: parseFloat(odsL.replace(',', '.')) || 0,
      odsadzkaPrawaCm: parseFloat(odsP.replace(',', '.')) || 0,
      gestoscTm3: gestosc,
      tonazAuta,
      grubosciCm: grubosci.map((g) => parseFloat(g.replace(',', '.')) || 0),
    });
  }, [projekt, legendaId, warstwaNazwa, warstwaKat, odMetry, doMetry, odsL, odsP, gestosc, tonazAuta, grubosci]);

  useEffect(() => {
    setGrubosci((prev) => {
      if (odcinkiBaza.length === 0) return prev;
      if (prev.length === odcinkiBaza.length) return prev;
      return odcinkiBaza.map((o, i) => prev[i] || String(o.gruboscProjektowaCm));
    });
  }, [odcinkiBaza]);

  const sumaPow = roundSum(odcinkiBaza.map((o) => o.powierzchniaM2));
  const sumaMasy = roundSum3(odcinkiBaza.map((o) => o.masaMg));
  const sumaAut = odcinkiBaza.reduce((s, o) => s + o.auta, 0);
  const obszarNazwa = obszary.find((o) => o.id === legendaId)?.nazwa ?? '';

  const zapisz = async () => {
    if (!projekt) { Alert.alert('Brak projektu', 'Uzupełnij PZT i konstrukcje w menu Budowa.'); return; }
    if (!legendaId) { Alert.alert('Obszar', 'Wybierz obszar z listy.'); return; }
    if (!warstwaNazwa) { Alert.alert('Warstwa', 'Wybierz warstwę.'); return; }
    if (odMetry === doMetry) { Alert.alert('Kilometraż', 'Start i koniec muszą się różnić – od tego zależy kierunek układania.'); return; }
    if (!mieszankaId) { Alert.alert('Recepta', 'Wybierz receptę, aby przeliczyć gęstość i masę.'); return; }
    if (odcinkiBaza.length === 0) { Alert.alert('Konstrukcja', 'W podanym kilometrażu nie ma konstrukcji dla tego obszaru.'); return; }
    let rzuty = generujDomyslneRzuty(Math.max(1, sumaAut));
    if (rzutyStr.trim()) {
      const parsed = parsujRzuty(rzutyStr);
      if (!parsed || !walidujRzuty(rzutyStr, sumaAut)) {
        Alert.alert('Rzuty', `Podział "${rzutyStr}" musi sumować się do ${sumaAut} aut.`);
        return;
      }
      rzuty = parsed;
    }
    const dane = zbudujPlanZBudowy(projekt, {
      budowaId,
      dataWbudowywania: data.toISOString(),
      legendaId,
      obszarNazwa,
      warstwaNazwa,
      warstwaKategoria: warstwaKat,
      kilometrazOdM: odMetry,
      kilometrazDoM: doMetry,
      odsadzkaLewaCm: parseFloat(odsL.replace(',', '.')) || 0,
      odsadzkaPrawaCm: parseFloat(odsP.replace(',', '.')) || 0,
      mieszankaId,
      gestoscTm3: gestosc,
      tonazAuta,
      rzuty,
      grubosciCm: odcinkiBaza.map((o, i) => parseFloat((grubosci[i] || String(o.gruboscProjektowaCm)).replace(',', '.')) || o.gruboscProjektowaCm),
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

  if (!projekt || obszary.length === 0) {
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

          <Sekcja tytul="Obszar" theme={theme}>
            {obszary.map((o) => {
              const on = o.id === legendaId;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styl.chip, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}18` : theme.colors.inputBackground }]}
                  onPress={() => { setLegendaId(o.id); setInicjalizacjaKm(true); setWarstwaNazwa(''); }}
                >
                  <View style={[styl.kropka, { backgroundColor: o.kolor }]} />
                  <Text style={{ color: theme.colors.text, fontWeight: on ? '700' : '500', flex: 1 }}>{o.nazwa}</Text>
                </TouchableOpacity>
              );
            })}
          </Sekcja>

          <Sekcja tytul="Kilometraż" theme={theme}>
            <Text style={[styl.hint, { color: theme.colors.textSecondary }]}>
              Start i koniec określają kierunek układania. Teraz: {kierunek === 'rosnacy' ? 'rosnący ↑' : 'malejący ↓'}
            </Text>
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Start</Text>
            <PoleKilometraz theme={theme} km={odKm} m={odM} onKm={setOdKm} onM={setOdM} />
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Koniec</Text>
            <PoleKilometraz theme={theme} km={doKm} m={doM} onKm={setDoKm} onM={setDoM} />
          </Sekcja>

          {odcinkiBaza.length > 1 && (
            <Sekcja tytul="Różne konstrukcje w zakresie" theme={theme}>
              <Text style={[styl.hint, { color: theme.colors.warning }]}>
                W kilometrażu {formatujKmM(Math.min(odMetry, doMetry))} – {formatujKmM(Math.max(odMetry, doMetry))} program wykrył {odcinkiBaza.length} odcinki. Dla każdego możesz zmienić grubość.
              </Text>
              {odcinkiBaza.map((o) => (
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
            {opcjeWarstw.length === 0 ? (
              <Text style={[styl.hint, { color: theme.colors.danger }]}>Brak warstw konstrukcji w tym kilometrażu.</Text>
            ) : opcjeWarstw.map((w) => {
              const on = w.nazwa === warstwaNazwa;
              return (
                <TouchableOpacity
                  key={`${w.kategoria}|${w.nazwa}`}
                  style={[styl.chip, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}18` : theme.colors.inputBackground }]}
                  onPress={() => {
                    setWarstwaNazwa(w.nazwa);
                    setWarstwaKat(w.kategoria);
                    setOdsL(String(w.odsadzkaLewaCm ?? w.odsadzkaCm));
                    setOdsP(String(w.odsadzkaPrawaCm ?? w.odsadzkaCm));
                    setGrubosci([]);
                    if (w.mieszankaIds.length === 1) setMieszankaId(w.mieszankaIds[0]);
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: on ? '700' : '500' }}>{w.nazwa}</Text>
                </TouchableOpacity>
              );
            })}
          </Sekcja>

          <Sekcja tytul="Odsadzki i recepta" theme={theme}>
            <View style={styl.dwa}>
              <View style={{ flex: 1 }}>
                <NumericInput label="Odsadzka lewa" value={odsL} onChangeText={setOdsL} unit="cm" decimals={1} />
              </View>
              <View style={{ flex: 1 }}>
                <NumericInput label="Odsadzka prawa" value={odsP} onChangeText={setOdsP} unit="cm" decimals={1} />
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
            {odcinkiBaza.map((o, i) => (
              <View key={`g-${o.odM}-${o.doM}`} style={[styl.odcinek, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {formatujKmM(o.odM)} – {formatujKmM(o.doM)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{o.opisKonstrukcji}</Text>
                <NumericInput
                  label="Grubość wbudowywania"
                  value={grubosci[i] ?? String(o.gruboscProjektowaCm)}
                  onChangeText={(v) => setGrubosci((p) => {
                    const n = odcinkiBaza.map((x, j) => (j === i ? v : (p[j] ?? String(x.gruboscProjektowaCm))));
                    return n;
                  })}
                  unit="cm"
                  decimals={1}
                  tooltip={`Projekt: ${o.gruboscProjektowaCm} cm`}
                />
                <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                  {formatLiczby(o.powierzchniaM2)} m²  ·  {formatLiczby(o.masaMg, 3)} Mg  ·  {o.auta} aut
                </Text>
              </View>
            ))}
          </Sekcja>

          <Sekcja tytul="Auta" theme={theme}>
            <NumericInput label="Tonaż auta" value={tonazStr} onChangeText={setTonazStr} unit="t" decimals={1} placeholder="25.5" />
            <Text style={[styl.etykieta, { color: theme.colors.textSecondary }]}>Podział na rzuty (opcjonalnie)</Text>
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
            {rzutyStr && !walidujRzuty(rzutyStr, sumaAut) && (
              <Text style={{ color: theme.colors.danger, marginTop: 4 }}>Suma rzutów musi wynosić {sumaAut}</Text>
            )}
          </Sekcja>

          <View style={[styl.podsum, { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', marginBottom: 8 }}>Podsumowanie</Text>
            <Text style={{ color: theme.colors.text }}>{warstwaNazwa || '—'} · {obszarNazwa}</Text>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
              {komentarzPlanuBudowy({ kilometrazOdM: odMetry, kilometrazDoM: doMetry, obszarNazwa })}
            </Text>
            <Text style={{ color: theme.colors.text, marginTop: 8, fontWeight: '700' }}>
              {formatLiczby(sumaPow)} m²  ·  {formatLiczby(sumaMasy, 3)} Mg  ·  {sumaAut} aut
            </Text>
            {warstwaOpcja && odcinkiBaza.length > 1 && (
              <Text style={{ color: theme.colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                {odcinkiBaza.length} odcinki o zmiennej konstrukcji
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MieszankaPicker
        visible={pickerMix}
        selectedId={mieszankaId}
        theme={theme}
        dozwoloneIds={warstwaOpcja?.mieszankaIds}
        onSelect={(m) => { setMieszankaId(m.id); setPickerMix(false); }}
        onClose={() => setPickerMix(false)}
      />
    </View>
  );
}

function roundSum(xs: number[]): number {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
}
function roundSum3(xs: number[]): number {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 1000) / 1000;
}

function Sekcja({ tytul, children, theme }: { tytul: string; children: React.ReactNode; theme: AppTheme }) {
  return (
    <View style={[styl.sekcja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styl.sekcjaTytul, { color: theme.colors.textSecondary }]}>{tytul.toUpperCase()}</Text>
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  podsum: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8 },
});
