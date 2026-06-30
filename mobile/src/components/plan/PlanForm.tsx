// ============================================================
// PLAN FORM – reużywalny formularz (Nowy plan / Edycja planu)
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, useColorScheme,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../common/AppHeader';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useBudowyStore } from '../../stores/budowyStore';
import { BudowaPicker } from '../common/BudowaPicker';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';
import { DatePickerButton } from '../common/DatePickerButton';
import { NumericInput } from '../common/NumericInput';
import { MieszankaPicker } from '../common/MieszankaPicker';
import { ShapeModal } from '../shapes/ShapeModal';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  obliczPowierzchniFigury, obliczWynikiDzialki, formatLiczby,
  parsujRzuty, walidujRzuty, generujDomyslneRzuty,
} from '../../utils/calculations';
import { nastepnyDzienRoboczy } from '../../utils/dates';
import { obliczPikietazFigur, formatujPikietaz, nastepnyPikietaz } from '../../utils/chainage';
import { DO_METROW_BIEZACYCH, NAZWY_FIGUR } from '../../constants';
import type { DzialkaRobocza, Figura, KierunekUkladania, Mieszanka, Plan, Rzut } from '../../types';

// ---- Typ roboczy formularza działki (stringi dla pól numerycznych) ----
export interface DzialkaForm {
  id: string;
  nazwa: string;
  mieszankaId: string;
  gruboscProjektowaStr: string;
  tolerancjaStr: string;
  gruboscWbudowywaniaStr: string;
  opis: string;
  kmStr: string;
  mStr: string;
  kierunek: KierunekUkladania;
  figury: Figura[];
}

export const generujIdForm = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export function nowyDzialkaForm(idx: number): DzialkaForm {
  return {
    id: generujIdForm(),
    nazwa: `Działka ${idx + 1}`,
    mieszankaId: '',
    gruboscProjektowaStr: '4',
    tolerancjaStr: '10',
    gruboscWbudowywaniaStr: '',
    opis: '',
    kmStr: '0',
    mStr: '000',
    kierunek: 'rosnacy',
    figury: [],
  };
}

/** Konwertuje DzialkaRobocza → DzialkaForm (do edycji) */
export function dzialkaDoFormu(dz: DzialkaRobocza): DzialkaForm {
  const wb = dz.gruboscWbudowywania ?? dz.grubosc;
  return {
    id: dz.id,
    nazwa: dz.nazwa,
    mieszankaId: dz.mieszankaId,
    gruboscProjektowaStr: String(dz.gruboscProjektowa ?? dz.grubosc ?? ''),
    tolerancjaStr: String(dz.tolerancja ?? 10),
    gruboscWbudowywaniaStr: String(wb ?? ''),
    opis: dz.opis ?? '',
    kmStr: String(dz.kilometrazPoczatkowyKm),
    mStr: String(dz.kilometrazPoczatkowyM).padStart(3, '0'),
    kierunek: dz.kierunekUkladania,
    figury: dz.figury,
  };
}

/** Konwertuje DzialkaForm → DzialkaRobocza (do zapisu) */
export function formDoDzialki(dz: DzialkaForm): DzialkaRobocza {
  const km = parseInt(dz.kmStr || '0', 10) || 0;
  const m = parseInt(dz.mStr || '0', 10) || 0;
  const grubWb = parseFloat(dz.gruboscWbudowywaniaStr.replace(',', '.')) || 0;
  const grubProj = parseFloat(dz.gruboscProjektowaStr.replace(',', '.')) || grubWb;
  const tolerancja = parseFloat(dz.tolerancjaStr.replace(',', '.')) || 10;
  return {
    id: dz.id,
    nazwa: dz.nazwa || 'Działka',
    mieszankaId: dz.mieszankaId,
    grubosc: grubWb,
    gruboscProjektowa: grubProj,
    tolerancja,
    gruboscWbudowywania: grubWb,
    opis: dz.opis || undefined,
    kilometrazPoczatkowyKm: km,
    kilometrazPoczatkowyM: m,
    kierunekUkladania: dz.kierunek,
    figury: dz.figury,
  };
}

// ---- Props komponentu ----

interface PlanFormProps {
  tytul: string;
  initialPlan?: Plan;
  onZapisz: (dane: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// ---- Główny komponent formularza ----

export function PlanForm({ tytul, initialPlan, onZapisz }: PlanFormProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { pobierzMieszanke } = useMieszankiStore();
  const { budowy } = useBudowyStore();

  const [budowaId, setBudowaId] = useState<string | undefined>(initialPlan?.budowaId);
  const [budowaPicker, setBudowaPicker] = useState(false);

  // Inicjalizacja stanu (z planem lub od zera)
  const [dataWbudowywania, setData] = useState<Date>(
    initialPlan ? new Date(initialPlan.dataWbudowywania) : nastepnyDzienRoboczy(),
  );
  const [tonazAutaStr, setTonazAutaStr] = useState(
    initialPlan ? String(initialPlan.tonazAuta) : '25.5',
  );
  const [dzialki, setDzialki] = useState<DzialkaForm[]>(
    initialPlan ? initialPlan.dzialki.map(dzialkaDoFormu) : [nowyDzialkaForm(0)],
  );
  const [rzutyStr, setRzutyStr] = useState(() => {
    if (!initialPlan?.rzuty?.length || initialPlan.rzuty.length <= 1) return '';
    return initialPlan.rzuty.map((r) => r.iloscSamochodow).join('+');
  });

  // Modals
  const [mieszankaPickerIdx, setMieszankaPickerIdx] = useState<number | null>(null);
  const [shapeModalIdx, setShapeModalIdx] = useState<number | null>(null);
  const [edytowanaFiguraId, setEdytowanaFiguraId] = useState<string | null>(null);

  const tonazAuta = parseFloat(tonazAutaStr.replace(',', '.')) || 25.5;
  const minimumDataWbudowywania = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ---- Licznik działek ----
  const zmienLiczbeDzialek = (delta: number) => {
    setDzialki((prev) => {
      const nowa = prev.length + delta;
      if (nowa < 1 || nowa > 10) return prev;
      if (delta > 0) return [...prev, nowyDzialkaForm(prev.length)];
      if (prev[prev.length - 1].figury.length > 0) {
        Alert.alert('Uwaga', 'Ostatnia działka zawiera figury – usuń je przed usunięciem działki.');
        return prev;
      }
      return prev.slice(0, -1);
    });
  };

  const updateDzialka = useCallback(<K extends keyof DzialkaForm>(idx: number, key: K, val: DzialkaForm[K]) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[idx] = { ...kopia[idx], [key]: val };
      return kopia;
    });
  }, []);

  // ---- Figury ----
  const pikietazDlaNastepnejFigury = (dz: DzialkaForm): number => {
    const km = parseInt(dz.kmStr || '0', 10) || 0;
    const m = parseInt(dz.mStr || '0', 10) || 0;
    if (dz.figury.length === 0) return DO_METROW_BIEZACYCH(km, m);
    const temp = formDoDzialki(dz);
    const pik = obliczPikietazFigur(temp);
    return pik.length > 0 ? pik[pik.length - 1].koniec : DO_METROW_BIEZACYCH(km, m);
  };

  const dodajFigure = (dzIdx: number, figura: Figura) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[dzIdx] = { ...kopia[dzIdx], figury: [...kopia[dzIdx].figury, figura] };
      return kopia;
    });
  };

  const usunFigure = (dzIdx: number, figId: string) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[dzIdx] = { ...kopia[dzIdx], figury: kopia[dzIdx].figury.filter((f) => f.id !== figId) };
      return kopia;
    });
  };

  const edytujFigure = (dzIdx: number, figId: string) => {
    setEdytowanaFiguraId(figId);
    setShapeModalIdx(dzIdx);
  };

  const zapiszFigure = (dzIdx: number, figura: Figura) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[dzIdx] = {
        ...kopia[dzIdx],
        figury: kopia[dzIdx].figury.map((f) => (f.id === figura.id ? figura : f)),
      };
      return kopia;
    });
    setEdytowanaFiguraId(null);
    setShapeModalIdx(null);
  };

  // ---- Obliczenia sumaryczne ----
  const obliczSume = () => {
    let sumaMasy = 0;
    for (const dz of dzialki) {
      const mie = pobierzMieszanke(dz.mieszankaId);
      const gr = parseFloat(dz.gruboscWbudowywaniaStr.replace(',', '.'));
      if (!mie || !gr || dz.figury.length === 0) continue;
      const temp = formDoDzialki(dz);
      sumaMasy += obliczWynikiDzialki(temp, mie.ciezarObjetosciowy, tonazAuta).lacznaIloscMasy;
    }
    return { sumaMasy, sumaAut: Math.ceil(sumaMasy / tonazAuta) };
  };

  const { sumaMasy, sumaAut } = obliczSume();

  // ---- Zapis ----
  const zapisz = async () => {
    for (let i = 0; i < dzialki.length; i++) {
      const dz = dzialki[i];
      if (!dz.nazwa.trim()) { Alert.alert('Błąd', `Działka ${i + 1}: podaj nazwę.`); return; }
      if (!dz.mieszankaId) { Alert.alert('Błąd', `Działka "${dz.nazwa}": wybierz mieszankę.`); return; }
      if (!dz.gruboscWbudowywaniaStr || parseFloat(dz.gruboscWbudowywaniaStr) <= 0) { Alert.alert('Błąd', `Działka "${dz.nazwa}": podaj grubość wbudowywania.`); return; }
      if (dz.figury.length === 0) { Alert.alert('Błąd', `Działka "${dz.nazwa}": dodaj co najmniej jedną figurę.`); return; }
    }
    let rzuty: Rzut[] = generujDomyslneRzuty(sumaAut);
    if (rzutyStr.trim()) {
      const parsed = parsujRzuty(rzutyStr);
      if (!parsed || !walidujRzuty(rzutyStr, sumaAut)) {
        Alert.alert('Błąd', `Podział rzutów "${rzutyStr}" jest nieprawidłowy. Suma musi wynosić ${sumaAut}.`);
        return;
      }
      rzuty = parsed;
    }
    await onZapisz({
      dataWbudowywania: dataWbudowywania.toISOString(),
      budowaId,
      iloscDzialek: dzialki.length,
      dzialki: dzialki.map(formDoDzialki),
      tonazAuta,
      rzuty,
      status: 'aktywny',
    });
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={tytul}
        lewy={{ tekst: 'Anuluj', onPress: () => router.back(), kolor: theme.colors.danger }}
        prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Ogólne */}
          <Sekcja tytul="Ogólne" theme={theme}>
            <DatePickerButton label="Data wbudowywania" value={dataWbudowywania} onChange={setData} minimumDate={minimumDataWbudowywania} />
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Budowa</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, justifyContent: 'center' }]}
                onPress={() => setBudowaPicker(true)}
              >
                <Text style={{ color: theme.colors.text }} numberOfLines={2}>
                  {budowaId
                    ? (() => { const b = budowy.find((x) => x.id === budowaId); return b ? `${b.kodBudowy} – ${b.nazwaInwestycji}` : 'Wybrano'; })()
                    : 'Bez przypisania'}
                </Text>
              </TouchableOpacity>
            </View>
            <NumericInput label="Tonaż auta" value={tonazAutaStr} onChangeText={setTonazAutaStr} unit="t" decimals={1}
              tooltip="Domyślny ładunek wywrotki (zazwyczaj 25,5 t)." placeholder="25.5" />
          </Sekcja>

          {/* Liczba działek */}
          <Sekcja tytul="Działki robocze" theme={theme}>
            <View style={styles.licznikWrap}>
              <Text style={[styles.licznikLabel, { color: theme.colors.textSecondary }]}>Ilość działek roboczych</Text>
              <InfoTooltip tresc="Działka robocza to jeden odcinek, którym będziesz zarządzać danego dnia." />
              <View style={styles.licznikPrzyciski}>
                <TouchableOpacity style={[styles.licznikBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => zmienLiczbeDzialek(-1)}>
                  <Text style={[styles.licznikBtnTekst, { color: theme.colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.licznikWartosc, { color: theme.colors.text }]}>{dzialki.length}</Text>
                <TouchableOpacity style={[styles.licznikBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => zmienLiczbeDzialek(1)}>
                  <Text style={[styles.licznikBtnTekst, { color: theme.colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Sekcja>

          {/* Działki */}
          {dzialki.map((dz, dzIdx) => (
            <KartaDzialki
              key={dz.id}
              dz={dz}
              dzIdx={dzIdx}
              theme={theme}
              tonazAuta={tonazAuta}
              pobierzMieszanke={pobierzMieszanke}
              updateDzialka={updateDzialka}
              onMieszankaPicker={() => setMieszankaPickerIdx(dzIdx)}
              onAddShape={() => { setEdytowanaFiguraId(null); setShapeModalIdx(dzIdx); }}
              onEditShape={(figId) => edytujFigure(dzIdx, figId)}
              onRemoveShape={(figId) => usunFigure(dzIdx, figId)}
            />
          ))}

          {/* Rzuty */}
          {sumaAut > 0 && (
            <Sekcja tytul="Podział na rzuty" theme={theme}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.podsumRow, { color: theme.colors.text }]}>
                  Łączna masa: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{formatLiczby(sumaMasy, 2)} Mg</Text>
                </Text>
                <Text style={[styles.podsumRow, { color: theme.colors.text }]}>
                  Aut: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{sumaAut}</Text>
                </Text>
              </View>
              <View style={styles.rzadEtykiety}>
                <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Podział rzutów</Text>
                <InfoTooltip tresc={`Wpisz podział samochodów na partie (rzuty), np. "6+6+4". Suma musi wynosić ${sumaAut}. Jeśli puste – jeden rzut.`} />
              </View>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: rzutyStr && !walidujRzuty(rzutyStr, sumaAut) ? theme.colors.danger : theme.colors.border,
                  color: theme.colors.text,
                }]}
                value={rzutyStr}
                onChangeText={setRzutyStr}
                placeholder={`np. ${Math.ceil(sumaAut / 2)}+${Math.floor(sumaAut / 2)} (opcjonalne)`}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
              {rzutyStr && !walidujRzuty(rzutyStr, sumaAut) && (
                <Text style={[styles.bladRzuty, { color: theme.colors.danger }]}>
                  Suma rzutów musi wynosić {sumaAut}
                </Text>
              )}
            </Sekcja>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      {mieszankaPickerIdx !== null && (
        <MieszankaPicker
          visible
          theme={theme}
          selectedId={dzialki[mieszankaPickerIdx]?.mieszankaId ?? ''}
          onSelect={(m: Mieszanka) => updateDzialka(mieszankaPickerIdx!, 'mieszankaId', m.id)}
          onClose={() => setMieszankaPickerIdx(null)}
          onDodajNowa={() => router.push('/mieszanki' as any)}
        />
      )}
      <BudowaPicker
        visible={budowaPicker}
        budowy={budowy}
        selectedId={budowaId}
        theme={theme}
        onSelect={(id) => setBudowaId(id)}
        onClose={() => setBudowaPicker(false)}
      />
      {shapeModalIdx !== null && (() => {
        const dz = dzialki[shapeModalIdx];
        const figuraEd = edytowanaFiguraId ? dz.figury.find((f) => f.id === edytowanaFiguraId) : undefined;
        const temp = formDoDzialki(dz);
        const nextPik = figuraEd
          ? (obliczPikietazFigur(temp).find((_, i) => dz.figury[i]?.id === figuraEd.id)?.poczatek ?? nastepnyPikietaz(temp))
          : nastepnyPikietaz(temp);
        return (
          <ShapeModal
            visible
            numeracja={figuraEd?.numeracja ?? dz.figury.length + 1}
            kilometrazPoczatkowy={nextPik}
            figuraEdytowana={figuraEd}
            onDodaj={(figura) => dodajFigure(shapeModalIdx!, figura)}
            onZapisz={(figura) => zapiszFigure(shapeModalIdx!, figura)}
            onClose={() => { setShapeModalIdx(null); setEdytowanaFiguraId(null); }}
          />
        );
      })()}
    </View>
  );
}

// ---- KartaDzialki (sub-komponent) ----

interface KartaDzialkiProps {
  dz: DzialkaForm;
  dzIdx: number;
  theme: AppTheme;
  tonazAuta: number;
  pobierzMieszanke: (id: string) => any;
  updateDzialka: <K extends keyof DzialkaForm>(idx: number, key: K, val: DzialkaForm[K]) => void;
  onMieszankaPicker: () => void;
  onAddShape: () => void;
  onEditShape: (figId: string) => void;
  onRemoveShape: (figId: string) => void;
}

function KartaDzialki({ dz, dzIdx, theme, tonazAuta, pobierzMieszanke, updateDzialka, onMieszankaPicker, onAddShape, onEditShape, onRemoveShape }: KartaDzialkiProps) {
  const mieszanka = pobierzMieszanke(dz.mieszankaId);
  const grubosc = parseFloat(dz.gruboscWbudowywaniaStr.replace(',', '.')) || 0;
  const km = parseInt(dz.kmStr || '0', 10) || 0;
  const m = parseInt(dz.mStr || '0', 10) || 0;

  let wynikiDzialki = null;
  if (mieszanka && grubosc > 0 && dz.figury.length > 0) {
    const temp = formDoDzialki(dz);
    wynikiDzialki = obliczWynikiDzialki(temp, mieszanka.ciezarObjetosciowy, tonazAuta);
  }

  const pikietaze = dz.figury.length > 0
    ? obliczPikietazFigur(formDoDzialki(dz))
    : [];

  return (
    <View style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.kartaDzialkiTytul, { color: theme.colors.primary }]}>
        Działka {dzIdx + 1}
      </Text>

      {/* Nazwa */}
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Nazwa</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
        value={dz.nazwa}
        onChangeText={(v) => updateDzialka(dzIdx, 'nazwa', v)}
        placeholder="Nazwa działki"
        placeholderTextColor={theme.colors.textSecondary}
      />

      {/* Mieszanka */}
      <View style={styles.rzadEtykiety}>
        <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Mieszanka *</Text>
        <InfoTooltip tresc="Wybierz recepturę asfaltu z bazy. Ciężar objętościowy wpływa na obliczaną ilość ton." />
      </View>
      <TouchableOpacity
        style={[styles.btnMieszanka, { backgroundColor: theme.colors.inputBackground, borderColor: mieszanka ? theme.colors.primary : theme.colors.border }]}
        onPress={onMieszankaPicker}
      >
        {mieszanka
          ? <Text style={[styles.btnMieszankaTekst, { color: theme.colors.text }]}>{mieszanka.rodzaj}  •  ρ = {mieszanka.ciezarObjetosciowy.toFixed(3)} t/m³</Text>
          : <Text style={[styles.btnMieszankaTekst, { color: theme.colors.textSecondary }]}>Dotknij, aby wybrać mieszankę →</Text>
        }
      </TouchableOpacity>

      {/* Grubości warstwy */}
      <NumericInput label="Grubość projektowa *" value={dz.gruboscProjektowaStr} onChangeText={(v) => updateDzialka(dzIdx, 'gruboscProjektowaStr', v)} unit="cm"
        tooltip="Grubość projektowa warstwy z dokumentacji (np. 4 cm)." required decimals={1} />
      <NumericInput label="Tolerancja *" value={dz.tolerancjaStr} onChangeText={(v) => updateDzialka(dzIdx, 'tolerancjaStr', v)} unit="%"
        tooltip="Dopuszczalna tolerancja grubości, domyślnie ±10%." required decimals={0} />
      <NumericInput label="Grubość wbudowywania *" value={dz.gruboscWbudowywaniaStr} onChangeText={(v) => updateDzialka(dzIdx, 'gruboscWbudowywaniaStr', v)} unit="cm"
        tooltip="Planowana grubość po wbudowaniu i zagęszczeniu (np. 3,8 cm). Używana w obliczeniach masy." required decimals={1} />

      {/* Opis */}
      <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Opis (opcjonalny)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
        value={dz.opis}
        onChangeText={(v) => updateDzialka(dzIdx, 'opis', v)}
        placeholder="Notatki, uwagi..."
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        numberOfLines={2}
      />

      {/* Kilometraż */}
      <View style={styles.rzadEtykiety}>
        <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Kilometraż początkowy</Text>
        <InfoTooltip tresc="Pikietaż punktu startowego. Format: km+mmm, np. 105+500." />
      </View>
      <View style={styles.pikietazWrap}>
        <TextInput
          style={[styles.inputKm, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={dz.kmStr}
          onChangeText={(v) => updateDzialka(dzIdx, 'kmStr', v.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <Text style={[styles.pikietazPlus, { color: theme.colors.textSecondary }]}>+</Text>
        <TextInput
          style={[styles.inputM, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={dz.mStr}
          onChangeText={(v) => updateDzialka(dzIdx, 'mStr', v.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="numeric"
          placeholder="000"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={3}
        />
      </View>

      {/* Kierunek */}
      <View style={styles.rzadEtykiety}>
        <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Kierunek układania</Text>
        <InfoTooltip tresc="Rosnący: km rośnie (od 105+000 do 105+500). Malejący: km maleje." />
      </View>
      <View style={styles.kierunekWrap}>
        {(['rosnacy', 'malejacy'] as KierunekUkladania[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.btnKierunek, { borderColor: theme.colors.border, backgroundColor: dz.kierunek === k ? theme.colors.primary : theme.colors.inputBackground }]}
            onPress={() => updateDzialka(dzIdx, 'kierunek', k)}
          >
            <Text style={[styles.btnKierunekTekst, { color: dz.kierunek === k ? '#fff' : theme.colors.text }]}>
              {k === 'rosnacy' ? '↑ Rosnący' : '↓ Malejący'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Figury */}
      <View style={[styles.figurySep, { borderTopColor: theme.colors.border }]} />
      <View style={styles.rzadEtykiety}>
        <Text style={[styles.figuryTytul, { color: theme.colors.text }]}>Figury geometryczne</Text>
        <InfoTooltip tresc="Dodaj pola działki jako figury geometryczne. Każda dziedziczy pikietaż końca poprzedniej." />
      </View>

      {dz.figury.length === 0 && (
        <Text style={[styles.brakFigur, { color: theme.colors.textSecondary }]}>Brak figur – dodaj pierwszą ↓</Text>
      )}

      {dz.figury.map((figura, figIdx) => {
        const pik = pikietaze[figIdx];
        const pow = obliczPowierzchniFigury(figura);
        return (
          <View key={figura.id} style={[styles.figuraWiersz, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <View style={styles.figuraLewo}>
              <Text style={[styles.figuraNumer, { color: theme.colors.primary }]}>#{figIdx + 1}</Text>
              <View>
                <Text style={[styles.figuraNazwa, { color: theme.colors.text }]}>{NAZWY_FIGUR[figura.typ]}</Text>
                <Text style={[styles.figuraInfo, { color: theme.colors.textSecondary }]}>
                  {pow.toFixed(2).replace('.', ',')} m²
                  {pik ? `  •  ${formatujPikietaz(pik.poczatek)} – ${formatujPikietaz(pik.koniec)}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.figuraAkcje}>
              <TouchableOpacity onPress={() => onEditShape(figura.id)} style={styles.btnAkcjaFig} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.btnEdytujTekst, { color: theme.colors.info }]}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemoveShape(figura.id)} style={styles.btnAkcjaFig} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.btnUsunTekst, { color: theme.colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.btnDodajFigure, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` }]}
        onPress={onAddShape}
      >
        <Text style={[styles.btnDodajFigureTekst, { color: theme.colors.primary }]}>+ Dodaj figurę</Text>
      </TouchableOpacity>

      {/* Podsumowanie działki */}
      {wynikiDzialki && (
        <View style={[styles.podsumDzialki, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
          <Text style={[styles.podsumRow, { color: theme.colors.text }]}>Powierzchnia: <Text style={{ fontWeight: '700' }}>{formatLiczby(wynikiDzialki.lacznaPowierzchnia)} m²</Text></Text>
          <Text style={[styles.podsumRow, { color: theme.colors.text }]}>Masa: <Text style={{ fontWeight: '700' }}>{formatLiczby(wynikiDzialki.lacznaIloscMasy, 3)} Mg</Text></Text>
          <Text style={[styles.podsumRow, { color: theme.colors.text }]}>Samochodów: <Text style={{ fontWeight: '700' }}>{wynikiDzialki.iloscSamochodow}</Text></Text>
        </View>
      )}
    </View>
  );
}

// ---- Sekcja ----
function Sekcja({ tytul, children, theme }: { tytul: string; children: React.ReactNode; theme: AppTheme }) {
  return (
    <View style={[sekcjaStyles.wrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[sekcjaStyles.tytul, { color: theme.colors.textSecondary }]}>{tytul.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const sekcjaStyles = StyleSheet.create({
  wrap: { marginBottom: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  tytul: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
});

// ---- Style ----
const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 16, gap: 0 },
  kartaDzialki: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  kartaDzialkiTytul: { fontSize: 14, fontWeight: '800', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  etykieta: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  rzadEtykiety: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6, gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  inputMulti: { minHeight: 56, textAlignVertical: 'top' },
  btnMieszanka: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  btnMieszankaTekst: { fontSize: 15 },
  pikietazWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputKm: { flex: 2, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlign: 'center' },
  pikietazPlus: { fontSize: 20, fontWeight: '300' },
  inputM: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlign: 'center' },
  kierunekWrap: { flexDirection: 'row', gap: 10 },
  btnKierunek: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnKierunekTekst: { fontSize: 14, fontWeight: '600' },
  figurySep: { borderTopWidth: 1, marginVertical: 14 },
  figuryTytul: { fontSize: 15, fontWeight: '700' },
  brakFigur: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
  figuraWiersz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  figuraLewo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  figuraNumer: { fontSize: 14, fontWeight: '800', width: 24 },
  figuraNazwa: { fontSize: 14, fontWeight: '600' },
  figuraInfo: { fontSize: 12, marginTop: 2 },
  figuraAkcje: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btnAkcjaFig: { padding: 6 },
  btnEdytujTekst: { fontSize: 17, fontWeight: '700' },
  btnUsun: { padding: 6 },
  btnUsunTekst: { fontSize: 18, fontWeight: '700' },
  btnDodajFigure: { borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnDodajFigureTekst: { fontSize: 15, fontWeight: '700' },
  podsumDzialki: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14, gap: 4 },
  podsumRow: { fontSize: 14 },
  licznikWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  licznikLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  licznikPrzyciski: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  licznikBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  licznikBtnTekst: { fontSize: 22, fontWeight: '300', lineHeight: 28 },
  licznikWartosc: { fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  bladRzuty: { fontSize: 13, marginTop: 4 },
  zalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  btnDodajZal: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
});
