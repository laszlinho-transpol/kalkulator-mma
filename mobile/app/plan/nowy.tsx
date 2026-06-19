// ============================================================
// EKRAN: NOWY PLAN – formularz konfiguracji działek i figur
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView, useColorScheme, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { DatePickerButton } from '../../src/components/common/DatePickerButton';
import { NumericInput } from '../../src/components/common/NumericInput';
import { MieszankaPicker } from '../../src/components/common/MieszankaPicker';
import { ShapeModal } from '../../src/components/shapes/ShapeModal';
import { InfoTooltip } from '../../src/components/common/InfoTooltip';
import {
  obliczPowierzchniFigury, obliczWynikiDzialki, obliczLacznaDlugosc,
  parsujRzuty, walidujRzuty, generujDomyslneRzuty, formatLiczby,
} from '../../src/utils/calculations';
import { nastepnyDzienRoboczy } from '../../src/utils/dates';
import { obliczPikietazFigur, formatujPikietaz, nastepnyPikietaz } from '../../src/utils/chainage';
import { DO_METROW_BIEZACYCH, NAZWY_FIGUR } from '../../src/constants';
import type { DzialkaRobocza, Figura, KierunekUkladania, Mieszanka, Rzut } from '../../src/types';

// ---- Pomocniczy typ stanu formularza działki (stringi dla numerycznych pól) ----
interface DzialkaForm {
  id: string;
  nazwa: string;
  mieszankaId: string;
  gruboscStr: string;
  opis: string;
  kmStr: string;    // część km pikietażu
  mStr: string;     // część m pikietażu
  kierunek: KierunekUkladania;
  figury: Figura[];
}

const DOMYSLNY_TONAZ = '25.5';

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function nowiDzialka(idx: number): DzialkaForm {
  return {
    id: generujId(),
    nazwa: `Działka ${idx + 1}`,
    mieszankaId: '',
    gruboscStr: '',
    opis: '',
    kmStr: '0',
    mStr: '000',
    kierunek: 'rosnacy',
    figury: [],
  };
}

export default function NowyPlanScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const { dodajPlan } = usePlanyStore();
  const { mieszanki, pobierzMieszanke } = useMieszankiStore();

  // ---- Stan ogólny ----
  const [dataWbudowywania, setData] = useState(nastepnyDzienRoboczy());
  const [tonazAutaStr, setTonazAutaStr] = useState(DOMYSLNY_TONAZ);
  const [dzialki, setDzialki] = useState<DzialkaForm[]>([nowiDzialka(0)]);
  const [rzutyStr, setRzutyStr] = useState('');

  // ---- Modals ----
  const [mieszankaPickerDzialkaIdx, setMieszankaPickerIdx] = useState<number | null>(null);
  const [shapeModalDzialkaIdx, setShapeModalIdx] = useState<number | null>(null);

  // ---- Licznik działek ----
  const zmienLiczbeDzialek = (delta: number) => {
    setDzialki((prev) => {
      const nowa = prev.length + delta;
      if (nowa < 1 || nowa > 10) return prev;
      if (delta > 0) return [...prev, nowiDzialka(prev.length)];
      if (prev[prev.length - 1].figury.length > 0) {
        Alert.alert('Uwaga', 'Ostatnia działka zawiera figury – usuń je przed usunięciem działki.', [{ text: 'OK' }]);
        return prev;
      }
      return prev.slice(0, -1);
    });
  };

  // ---- Aktualizacja pola działki ----
  const updateDzialka = useCallback(<K extends keyof DzialkaForm>(idx: number, key: K, val: DzialkaForm[K]) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[idx] = { ...kopia[idx], [key]: val };
      return kopia;
    });
  }, []);

  // ---- Figury ----
  const pikietazPoczatkowyDlaNastepnejFigury = (dzialkaForm: DzialkaForm): number => {
    const km = parseInt(dzialkaForm.kmStr || '0', 10) || 0;
    const m = parseInt(dzialkaForm.mStr || '0', 10) || 0;
    const bazowy = DO_METROW_BIEZACYCH(km, m);
    if (dzialkaForm.figury.length === 0) return bazowy;
    // Odtwarzamy DzialkaRobocza żeby użyć obliczPikietazFigur
    const tempDzialka = formToDzialka(dzialkaForm, km, m);
    const pik = obliczPikietazFigur(tempDzialka);
    return pik.length > 0 ? pik[pik.length - 1].koniec : bazowy;
  };

  const dodajFigure = (dzialkaIdx: number, figura: Figura) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[dzialkaIdx] = { ...kopia[dzialkaIdx], figury: [...kopia[dzialkaIdx].figury, figura] };
      return kopia;
    });
  };

  const usunFigure = (dzialkaIdx: number, figuraId: string) => {
    setDzialki((prev) => {
      const kopia = [...prev];
      kopia[dzialkaIdx] = {
        ...kopia[dzialkaIdx],
        figury: kopia[dzialkaIdx].figury.filter((f) => f.id !== figuraId),
      };
      return kopia;
    });
  };

  // ---- Obliczenia dla podglądu ----
  const tonazAuta = parseFloat(tonazAutaStr.replace(',', '.')) || 25.5;

  const obliczSumaryczneDane = () => {
    let sumaMasy = 0, sumaAut = 0;
    for (const dz of dzialki) {
      const mieszanka = pobierzMieszanke(dz.mieszankaId);
      if (!mieszanka || !dz.gruboscStr || dz.figury.length === 0) continue;
      const grubosc = parseFloat(dz.gruboscStr.replace(',', '.'));
      if (isNaN(grubosc)) continue;
      const temp = formToDzialka(dz, parseInt(dz.kmStr || '0'), parseInt(dz.mStr || '0'), grubosc);
      const wyniki = obliczWynikiDzialki(temp, mieszanka.ciezarObjetosciowy, tonazAuta);
      sumaMasy += wyniki.lacznaIloscMasy;
      sumaAut += wyniki.iloscSamochodow;
    }
    return { sumaMasy, sumaAut: Math.ceil(sumaMasy / tonazAuta) };
  };

  const { sumaMasy, sumaAut } = obliczSumaryczneDane();

  // ---- Walidacja i zapis ----
  const zapisz = async () => {
    // Sprawdź czy są mieszanki i grubości
    for (let i = 0; i < dzialki.length; i++) {
      const dz = dzialki[i];
      if (!dz.nazwa.trim()) { Alert.alert('Błąd', `Działka ${i + 1}: podaj nazwę.`); return; }
      if (!dz.mieszankaId) { Alert.alert('Błąd', `Działka "${dz.nazwa}": wybierz mieszankę.`); return; }
      if (!dz.gruboscStr || parseFloat(dz.gruboscStr) <= 0) { Alert.alert('Błąd', `Działka "${dz.nazwa}": podaj grubość warstwy.`); return; }
      if (dz.figury.length === 0) { Alert.alert('Błąd', `Działka "${dz.nazwa}": dodaj co najmniej jedną figurę.`); return; }
    }

    // Rzuty
    let rzuty: Rzut[] = generujDomyslneRzuty(sumaAut);
    if (rzutyStr.trim()) {
      const parsed = parsujRzuty(rzutyStr);
      if (!parsed || !walidujRzuty(rzutyStr, sumaAut)) {
        Alert.alert('Błąd', `Podział rzutów "${rzutyStr}" jest nieprawidłowy. Suma musi wynosić ${sumaAut} aut.`);
        return;
      }
      rzuty = parsed;
    }

    // Zbuduj pełne obiekty DzialkaRobocza
    const pekneDzialki: DzialkaRobocza[] = dzialki.map((dz) => {
      const km = parseInt(dz.kmStr || '0', 10) || 0;
      const m = parseInt(dz.mStr || '0', 10) || 0;
      const grubosc = parseFloat(dz.gruboscStr.replace(',', '.'));
      return formToDzialka(dz, km, m, grubosc);
    });

    const planId = await dodajPlan({
      dataWbudowywania: dataWbudowywania.toISOString(),
      iloscDzialek: dzialki.length,
      dzialki: pekneDzialki,
      tonazAuta,
      rzuty,
      status: 'aktywny',
    });

    router.replace(`/plan/${planId}` as any);
  };

  // ---- Render ----
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.danger }]}>Anuluj</Text>
        </TouchableOpacity>
        <Text style={[styles.tytul, { color: theme.colors.text }]}>Nowy Plan</Text>
        <TouchableOpacity style={[styles.btnZapisz, { backgroundColor: theme.colors.primary }]} onPress={zapisz}>
          <Text style={styles.btnZapiszTekst}>Zapisz</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.zawartosc} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* SEKCJA: Ogólne */}
          <Sekcja tytul="Ogólne" theme={theme}>
            <DatePickerButton
              label="Data wbudowywania"
              value={dataWbudowywania}
              onChange={setData}
              minimumDate={new Date()}
            />
            <NumericInput
              label="Tonaż auta"
              value={tonazAutaStr}
              onChangeText={setTonazAutaStr}
              unit="t"
              decimals={1}
              tooltip="Domyślny ładunek wywrotki. Zazwyczaj 25,5 t. Możesz zmienić na rzeczywisty tonaż swoich aut."
              placeholder="25.5"
            />
          </Sekcja>

          {/* SEKCJA: Liczba działek */}
          <Sekcja tytul="Działki robocze" theme={theme}>
            <View style={styles.licznikWrap}>
              <Text style={[styles.licznikLabel, { color: theme.colors.textSecondary }]}>
                Ilość działek roboczych
              </Text>
              <InfoTooltip tresc="Działka robocza to jeden odcinek, którym będziesz zarządzać danego dnia. Każda działka ma swoją mieszankę, grubość i figury geometryczne." />
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

          {/* DZIAŁKI */}
          {dzialki.map((dz, dzIdx) => {
            const mieszanka = pobierzMieszanke(dz.mieszankaId);
            const grubosc = parseFloat(dz.gruboscStr.replace(',', '.')) || 0;
            const km = parseInt(dz.kmStr || '0', 10) || 0;
            const m = parseInt(dz.mStr || '0', 10) || 0;

            let wynikiDzialki = null;
            if (mieszanka && grubosc > 0 && dz.figury.length > 0) {
              const temp = formToDzialka(dz, km, m, grubosc);
              wynikiDzialki = obliczWynikiDzialki(temp, mieszanka.ciezarObjetosciowy, tonazAuta);
            }

            return (
              <View key={dz.id} style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
                  onPress={() => setMieszankaPickerIdx(dzIdx)}
                >
                  {mieszanka ? (
                    <Text style={[styles.btnMieszankaTekst, { color: theme.colors.text }]}>
                      {mieszanka.rodzaj}  •  ρ = {mieszanka.ciezarObjetosciowy.toFixed(3)} t/m³
                    </Text>
                  ) : (
                    <Text style={[styles.btnMieszankaTekst, { color: theme.colors.textSecondary }]}>
                      Dotknij, aby wybrać mieszankę →
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Grubość */}
                <NumericInput
                  label="Grubość warstwy *"
                  value={dz.gruboscStr}
                  onChangeText={(v) => updateDzialka(dzIdx, 'gruboscStr', v)}
                  unit="cm"
                  tooltip="Projektowana grubość wbudowywanej warstwy po zagęszczeniu. Zazwyczaj 4–8 cm."
                  required
                  decimals={1}
                />

                {/* Opis */}
                <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Opis (opcjonalny)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
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
                  <InfoTooltip tresc="Pikietaż (kilometraż) punktu startowego działki. Format: km+mmm, np. 105+500 oznacza 105 km i 500 m." />
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
                  <InfoTooltip tresc="Rosnący: km rośnie w trakcie układania (np. od 105+000 do 105+500). Malejący: km maleje (np. od 105+500 do 105+000)." />
                </View>
                <View style={styles.kierunekWrap}>
                  {(['rosnacy', 'malejacy'] as KierunekUkladania[]).map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.btnKierunek,
                        { borderColor: theme.colors.border, backgroundColor: dz.kierunek === k ? theme.colors.primary : theme.colors.inputBackground },
                      ]}
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
                  <InfoTooltip tresc="Dodaj kolejne pola działki jako figury geometryczne. Każda figura dziedziczy pikietaż końca poprzedniej." />
                </View>

                {dz.figury.length === 0 && (
                  <Text style={[styles.brakFigur, { color: theme.colors.textSecondary }]}>Brak figur – dodaj pierwszą ↓</Text>
                )}

                {dz.figury.map((figura, figIdx) => {
                  const tempDzialka = formToDzialka(dz, km, m, grubosc);
                  const pik = obliczPikietazFigur(tempDzialka);
                  const p = pik[figIdx];
                  const pow = obliczPowierzchniFigury(figura);
                  return (
                    <View key={figura.id} style={[styles.figuraWiersz, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <View style={styles.figuraLewo}>
                        <Text style={[styles.figuraNumer, { color: theme.colors.primary }]}>#{figIdx + 1}</Text>
                        <View>
                          <Text style={[styles.figuraNazwa, { color: theme.colors.text }]}>{NAZWY_FIGUR[figura.typ]}</Text>
                          <Text style={[styles.figuraInfo, { color: theme.colors.textSecondary }]}>
                            {pow.toFixed(2).replace('.', ',')} m²
                            {p ? `  •  ${formatujPikietaz(p.poczatek)} – ${formatujPikietaz(p.koniec)}` : ''}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => usunFigure(dzIdx, figura.id)} style={styles.btnUsunFigure}>
                        <Text style={[styles.btnUsunFigureTekst, { color: theme.colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.btnDodajFigure, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` }]}
                  onPress={() => setShapeModalIdx(dzIdx)}
                >
                  <Text style={[styles.btnDodajFigureTekst, { color: theme.colors.primary }]}>+ Dodaj figurę</Text>
                </TouchableOpacity>

                {/* Podsumowanie działki */}
                {wynikiDzialki && (
                  <View style={[styles.podsumowanieDzialki, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
                    <Text style={[styles.podsumowanieRow, { color: theme.colors.text }]}>
                      Powierzchnia: <Text style={{ fontWeight: '700' }}>{formatLiczby(wynikiDzialki.lacznaPowierzchnia)} m²</Text>
                    </Text>
                    <Text style={[styles.podsumowanieRow, { color: theme.colors.text }]}>
                      Masa: <Text style={{ fontWeight: '700' }}>{formatLiczby(wynikiDzialki.lacznaIloscMasy, 3)} Mg</Text>
                    </Text>
                    <Text style={[styles.podsumowanieRow, { color: theme.colors.text }]}>
                      Samochodów: <Text style={{ fontWeight: '700' }}>{wynikiDzialki.iloscSamochodow}</Text>
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* SEKCJA: Rzuty */}
          {sumaAut > 0 && (
            <Sekcja tytul="Podział na rzuty" theme={theme}>
              <View style={styles.rzadEtykiety}>
                <Text style={[styles.podsumowanieRow, { color: theme.colors.text }]}>
                  Łączna masa: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{formatLiczby(sumaMasy, 2)} Mg</Text>
                </Text>
              </View>
              <View style={styles.rzadEtykiety}>
                <Text style={[styles.podsumowanieRow, { color: theme.colors.text }]}>
                  Ilość samochodów: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{sumaAut}</Text>
                </Text>
              </View>
              <View style={styles.rzadEtykiety}>
                <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Podział na rzuty</Text>
                <InfoTooltip tresc={`Wpisz podział samochodów na partie (rzuty), np. "6+6+4". Suma musi wynosić ${sumaAut}. Jeśli zostawisz puste, wszystkie auta będą w jednym rzucie.`} />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: rzutyStr && !walidujRzuty(rzutyStr, sumaAut) ? theme.colors.danger : theme.colors.border, color: theme.colors.text }]}
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

      {/* MODALE */}
      {mieszankaPickerDzialkaIdx !== null && (
        <MieszankaPicker
          visible
          selectedId={dzialki[mieszankaPickerDzialkaIdx]?.mieszankaId ?? ''}
          onSelect={(m: Mieszanka) => updateDzialka(mieszankaPickerDzialkaIdx!, 'mieszankaId', m.id)}
          onClose={() => setMieszankaPickerIdx(null)}
          onDodajNowa={() => router.push('/mieszanki' as any)}
        />
      )}

      {shapeModalDzialkaIdx !== null && (() => {
        const dz = dzialki[shapeModalDzialkaIdx];
        const km = parseInt(dz.kmStr || '0', 10) || 0;
        const m = parseInt(dz.mStr || '0', 10) || 0;
        const grubosc = parseFloat(dz.gruboscStr.replace(',', '.')) || 0;
        const temp = formToDzialka(dz, km, m, grubosc);
        const nextPik = nastepnyPikietaz(temp);
        return (
          <ShapeModal
            visible
            numeracja={dz.figury.length + 1}
            kilometrazPoczatkowy={nextPik}
            onDodaj={(figura) => dodajFigure(shapeModalDzialkaIdx!, figura)}
            onClose={() => setShapeModalIdx(null)}
          />
        );
      })()}
    </SafeAreaView>
  );
}

// ---- Pomocnicze komponenty ----

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

// ---- Konwersja DzialkaForm → DzialkaRobocza ----
function formToDzialka(dz: DzialkaForm, km: number, m: number, grubosc?: number): DzialkaRobocza {
  return {
    id: dz.id,
    nazwa: dz.nazwa || 'Działka',
    mieszankaId: dz.mieszankaId,
    grubosc: grubosc ?? (parseFloat(dz.gruboscStr.replace(',', '.')) || 0),
    opis: dz.opis || undefined,
    kilometrazPoczatkowyKm: km,
    kilometrazPoczatkowyM: m,
    kierunekUkladania: dz.kierunek,
    figury: dz.figury,
  };
}

// ---- Style ----
const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  wstecz: { fontSize: 17 },
  tytul: { fontSize: 17, fontWeight: '700' },
  btnZapisz: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  btnZapiszTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
  zawartosc: { padding: 16, gap: 0 },
  kartaDzialki: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  kartaDzialkiTytul: { fontSize: 14, fontWeight: '800', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  etykieta: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  rzadEtykiety: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6, gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
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
  figuraWiersz: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  figuraLewo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  figuraNumer: { fontSize: 14, fontWeight: '800', width: 24 },
  figuraNazwa: { fontSize: 14, fontWeight: '600' },
  figuraInfo: { fontSize: 12, marginTop: 2 },
  btnUsunFigure: { padding: 6 },
  btnUsunFigureTekst: { fontSize: 18, fontWeight: '700' },
  btnDodajFigure: {
    borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  btnDodajFigureTekst: { fontSize: 15, fontWeight: '700' },
  podsumowanieDzialki: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14, gap: 4,
  },
  podsumowanieRow: { fontSize: 14 },
  licznikWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  licznikLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  licznikPrzyciski: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  licznikBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  licznikBtnTekst: { fontSize: 22, fontWeight: '300', lineHeight: 28 },
  licznikWartosc: { fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  bladRzuty: { fontSize: 13, marginTop: 4 },
});
