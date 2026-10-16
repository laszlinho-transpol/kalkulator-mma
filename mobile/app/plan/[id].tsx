// ============================================================
// EKRAN: SZCZEGÓŁY PLANU – podsumowanie, tabela aut, szkic, udostępnianie
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, Modal, Pressable, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { usePlanPoId } from '../../src/hooks/usePlanPoId';
import { useWpisyDlaPlanu } from '../../src/hooks/useWpisyDlaPlanu';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import { AppHeader } from '../../src/components/common/AppHeader';
import { ZalacznikiViewer } from '../../src/components/common/ZalacznikiViewer';
import { DzialkaSketch } from '../../src/components/sketch/DzialkaSketch';
import { SzkicPlanuBudowy } from '../../src/components/budowa/SzkicPlanuBudowy';
import { tekstPrzycisk, tekstWramce } from '../../src/constants/layout';
import { TabelaAut } from '../../src/components/plan/TabelaAut';
import {
  obliczWynikiDzialki, formatLiczby, obliczTabeleAutPlanu, generujDomyslneRzuty,
  obliczLacznaDlugosc,
} from '../../src/utils/calculations';
import { gruboscWbudowywania, gruboscProjektowa, formatujTolerancje } from '../../src/utils/grubosc';
import { formatujDatePl } from '../../src/utils/dates';
import { komentarzPlanuBudowy, obszarySzkicuPlanu, tytulPlanuBudowy, uzupelnijProfilObmiaruDzialek } from '../../src/utils/planZBudowy';
import { formatujKmM } from '../../src/utils/projektBudowy';
import { pokazKomunikat, potwierdzAkcje } from '../../src/utils/dialog';
import { formatujPikietaz, pikietazPoMetrach } from '../../src/utils/chainage';
import { eksportujJSON, generujInteraktywnyHTML } from '../../src/utils/htmlGenerator';
import type { DzialkaRobocza, Rzut } from '../../src/types';
import { Przycisk, Sekcja, SiatkaDanych, WierszDanych, kolorDnia, rodzajDnia } from '../../src/components/ui';
import { karta as kartaWspolna } from '../../src/constants/layout';

type ZakladkaTyp = 'plan' | 'tabela' | 'szkic';

export default function PlanDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const id = useRouteId();

  const plan = usePlanPoId(id);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const budowy = useBudowyStore((s) => s.budowy);
  const usunPlan = usePlanyStore((s) => s.usunPlan);
  const wyczyścWpisyPlanu = useLiveStore((s) => s.wyczyścWpisyPlanu);
  const wpisyLive = useWpisyDlaPlanu(id);

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');
  const [wybranaIdx, setWybranaIdx] = useState(0);
  /** -1 = całość planu, 0+ = działka robocza */
  const [idxTabeliAut, setIdxTabeliAut] = useState(-1);
  const [udostepnijModal, setUdostepnijModal] = useState(false);
  const [autorModal, setAutorModal] = useState(false);
  const [autorNazwa, setAutorNazwa] = useState('');
  const [viewerZal, setViewerZal] = useState(false);
  const insets = useSafeAreaInsets();

  const budowaPodglad = plan?.budowaId ? budowy.find((b) => b.id === plan.budowaId) : undefined;
  const dzialkiObmiaru = useMemo(
    () => uzupelnijProfilObmiaruDzialek(budowaPodglad?.projekt, plan),
    [budowaPodglad?.projekt, plan],
  );
  const tabeleAut = useMemo(() => {
    if (!plan) return null;
    const ciezar = (mid: string) => mieszanki.find((m) => m.id === mid)?.ciezarObjetosciowy;
    let sumaAut = 0;
    for (const dz of plan.dzialki) {
      const rho = ciezar(dz.mieszankaId);
      if (rho == null) continue;
      sumaAut += obliczWynikiDzialki(dz, rho, plan.tonazAuta).iloscSamochodow;
    }
    const rzuty = plan.rzuty.length > 0 ? plan.rzuty : generujDomyslneRzuty(sumaAut);
    return obliczTabeleAutPlanu(dzialkiObmiaru, rzuty, plan.tonazAuta, ciezar);
  }, [plan, mieszanki, dzialkiObmiaru]);

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Plan" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const getMieszanka = (id: string) => mieszanki.find((m) => m.id === id);
  const obszarySzkicu = plan.zrodlo === 'budowa' ? obszarySzkicuPlanu(plan) : [];

  const udostepnijJSON = async () => {
    try { await eksportujJSON(plan, mieszanki, wpisyLive); } catch { /* cancelled */ }
    setUdostepnijModal(false);
  };

  const przygotujHTML = () => {
    setAutorNazwa('');
    setAutorModal(true);
    setUdostepnijModal(false);
  };

  const udostepnijHTML = async () => {
    if (!autorNazwa.trim()) {
      pokazKomunikat('Podaj autora', 'Wpisz imię i nazwisko osoby odpowiedzialnej za raport.');
      return;
    }
    try {
      await generujInteraktywnyHTML(plan, mieszanki, {
        autor: autorNazwa.trim(),
        wpisyLive,
        projekt: budowaPodglad?.projekt,
      });
    } catch { /* cancelled */ }
    setAutorModal(false);
  };

  const budowa = budowaPodglad;
  const projektSzkicu = budowa?.projekt;

  const usunTenPlan = () => potwierdzAkcje(
    'Usuń plan',
    `Usunąć „${plan.zrodlo === 'budowa' ? tytulPlanuBudowy(plan) : formatujDatePl(plan.dataWbudowywania)}”?`,
    () => {
      void (async () => {
        await wyczyścWpisyPlanu(plan.id);
        await usunPlan(plan.id);
        router.back();
      })();
    },
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={plan.zrodlo === 'budowa' ? tytulPlanuBudowy(plan) : formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        podtytul={plan.zrodlo === 'budowa' ? komentarzPlanuBudowy(plan) : undefined}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Udostępnij', onPress: () => setUdostepnijModal(true), kolor: theme.colors.secondary }}
        przyciski={plan.status === 'aktywny' ? [
          { tekst: '✏ Edytuj plan', onPress: () => router.push(`/plan/edytuj/${plan.id}` as any), kolor: theme.colors.warning },
          { tekst: '▶ Wbudowywanie', onPress: () => router.push(`/wbudowywanie/${plan.id}` as any), kolor: '#fff', tlo: theme.colors.success },
          { tekst: 'Usuń', onPress: usunTenPlan, kolor: theme.colors.danger },
        ] : []}
      />

      {/* Zakładki z animowanym wskaźnikiem */}
      <AnimatedTabBar
        tabs={[
          { id: 'plan', etykieta: 'Plan' },
          { id: 'tabela', etykieta: 'Tabela aut' },
          { id: 'szkic', etykieta: 'Szkic' },
        ]}
        aktywnaId={aktywnaZakladka}
        onChange={(id) => setZakladka(id as ZakladkaTyp)}
      />

      <ScrollView contentContainerStyle={styles.zawartosc} showsVerticalScrollIndicator={false}>

        {/* ---- ZAKŁADKA: PLAN ---- */}
        {aktywnaZakladka === 'plan' && (
          <>
            <Sekcja tytul="Dane planu">
              <WierszDanych etykieta="Data" wartosc={formatujDatePl(plan.dataWbudowywania)} kolor={rodzajDnia(plan.dataWbudowywania.slice(0, 10)) === 'roboczy' ? undefined : kolorDnia(theme, plan.dataWbudowywania.slice(0, 10))} />
              {budowa ? <WierszDanych etykieta="Budowa" wartosc={`${budowa.kodBudowy} – ${budowa.nazwaInwestycji}`} /> : null}
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Tonaż auta', wartosc: `${plan.tonazAuta} t` },
                  { etykieta: 'Działki', wartosc: `${plan.dzialki.length}` },
                ]}
              />
            </Sekcja>

            {(budowa?.zalaczniki?.length || plan.zalaczniki?.length) ? (
              <Sekcja tytul={`Załączniki budowy · ${(budowa?.zalaczniki ?? plan.zalaczniki ?? []).length}`}>
                {(budowa?.zalaczniki ?? plan.zalaczniki ?? []).map((z) => (
                  <Text key={z.id} style={[tekstWramce, { color: theme.colors.text, fontSize: 14 }]} numberOfLines={2}>
                    📎 {z.nazwa}
                  </Text>
                ))}
                <Przycisk wariant="drugi" maly tekst="👁 Podgląd załączników" onPress={() => setViewerZal(true)} />
              </Sekcja>
            ) : null}

            {plan.dzialki.map((dz) => {
              const mieszanka = getMieszanka(dz.mieszankaId);
              if (!mieszanka) return null;
              const wyniki = obliczWynikiDzialki(dz, mieszanka.ciezarObjetosciowy, plan.tonazAuta);
              const km0 = dz.kilometrazPoczatkowyKm * 1000 + dz.kilometrazPoczatkowyM;
              const km1 = pikietazPoMetrach(km0, obliczLacznaDlugosc(dz), dz.kierunekUkladania);
              const zakres = `${formatujPikietaz(km0)} – ${formatujPikietaz(km1)}`;
              return (
                <Sekcja key={dz.id} tytul={zakres}>
                  <WierszDanych etykieta="Kierunek" wartosc={dz.kierunekUkladania === 'malejacy' ? 'malejący ↓' : 'rosnący ↑'} />
                  <WierszDanych etykieta="Mieszanka" wartosc={`${mieszanka.rodzaj}  ρ=${mieszanka.ciezarObjetosciowy.toFixed(3)}`} />
                  <WierszDanych etykieta="Tolerancja" wartosc={formatujTolerancje(dz)} />
                  <SiatkaDanych
                    pozycje={[
                      { etykieta: 'Grubość projektowa', wartosc: `${gruboscProjektowa(dz)} cm` },
                      { etykieta: 'Grubość wbudowania', wartosc: `${gruboscWbudowywania(dz)} cm` },
                      { etykieta: 'Figury', wartosc: `${dz.figury.length}` },
                      { etykieta: 'Powierzchnia', wartosc: `${formatLiczby(wyniki.lacznaPowierzchnia)} m²` },
                      { etykieta: 'Masa', wartosc: `${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg` },
                      { etykieta: 'Samochodów', wartosc: `${wyniki.iloscSamochodow}` },
                    ]}
                  />
                </Sekcja>
              );
            })}

            {(() => {
              let suma = 0;
              plan.dzialki.forEach((dz) => {
                const m = getMieszanka(dz.mieszankaId);
                if (!m) return;
                suma += obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta).lacznaIloscMasy;
              });
              return (
                <Sekcja tytul="Razem">
                  <SiatkaDanych
                    pozycje={[
                      { etykieta: 'Łączna masa', wartosc: `${formatLiczby(suma, 2)} Mg` },
                      { etykieta: 'Łącznie aut', wartosc: `${Math.ceil(suma / plan.tonazAuta)}` },
                    ]}
                  />
                </Sekcja>
              );
            })()}
          </>
        )}

        {/* ---- ZAKŁADKA: TABELA AUT ---- */}
        {aktywnaZakladka === 'tabela' && tabeleAut && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              <TouchableOpacity
                style={[styles.selectorBtn, { borderColor: idxTabeliAut === -1 ? theme.colors.primary : theme.colors.border, backgroundColor: idxTabeliAut === -1 ? `${theme.colors.primary}15` : theme.colors.card }]}
                onPress={() => setIdxTabeliAut(-1)}
              >
                <Text style={{ color: idxTabeliAut === -1 ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                  Całość ({tabeleAut.lacznaIloscAut})
                </Text>
              </TouchableOpacity>
              {tabeleAut.dzialki.map((td, idx) => (
                <TouchableOpacity
                  key={td.dzialkaId}
                  style={[styles.selectorBtn, { borderColor: idxTabeliAut === idx ? theme.colors.primary : theme.colors.border, backgroundColor: idxTabeliAut === idx ? `${theme.colors.primary}15` : theme.colors.card }]}
                  onPress={() => setIdxTabeliAut(idx)}
                >
                  <Text style={{ color: idxTabeliAut === idx ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                    {td.nazwa} ({td.wiersze.length})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {idxTabeliAut === -1 ? (() => {
              const pierwsza = dzialkiObmiaru[0] ?? plan.dzialki[0];
              const m0 = pierwsza ? getMieszanka(pierwsza.mieszankaId) : undefined;
              if (!pierwsza || !m0) return null;
              const sumaMasy = tabeleAut.calosc.reduce((s, w) => s + w.masa, 0);
              const sumaMetrow = tabeleAut.calosc.reduce((s, w) => s + w.metry, 0);
              const rzutyStr = plan.rzuty.map((r) => r.iloscSamochodow).join('+') || String(tabeleAut.lacznaIloscAut);
              return (
                <TabelaAut
                  dzialka={pierwsza}
                  tonazAuta={plan.tonazAuta}
                  rzuty={plan.rzuty}
                  ciezarObjetosciowy={m0.ciezarObjetosciowy}
                  theme={theme}
                  wiersze={tabeleAut.calosc}
                  naglowek={{
                    doWbudowania: `${formatLiczby(sumaMasy, 2)} Mg`,
                    iloscAut: String(tabeleAut.lacznaIloscAut),
                    rzuty: rzutyStr,
                    lacznieMetrow: `${formatLiczby(sumaMetrow)} m`,
                    podtytul: 'CAŁOŚĆ – wszystkie działki robocze',
                  }}
                />
              );
            })() : (() => {
              const td = tabeleAut.dzialki[idxTabeliAut];
              if (!td) return null;
              const dz = dzialkiObmiaru.find((d) => d.id === td.dzialkaId) ?? plan.dzialki.find((d) => d.id === td.dzialkaId);
              const m = dz ? getMieszanka(dz.mieszankaId) : undefined;
              if (!dz || !m) return null;
              return (
                <TabelaAut
                  dzialka={dz}
                  tonazAuta={plan.tonazAuta}
                  rzuty={plan.rzuty}
                  ciezarObjetosciowy={m.ciezarObjetosciowy}
                  theme={theme}
                  wiersze={td.wiersze}
                  naglowek={{
                    doWbudowania: `${formatLiczby(td.wiersze.reduce((s, w) => s + w.masa, 0), 2)} Mg`,
                    iloscAut: String(td.wiersze.length),
                    rzuty: td.wiersze.length > 0
                      ? [...new Set(td.wiersze.map((w) => w.numerRzutu))].map((nr) => td.wiersze.filter((w) => w.numerRzutu === nr).length).join('+')
                      : '0',
                    lacznieMetrow: `${formatLiczby(obliczLacznaDlugosc(dz))} m`,
                    podtytul: `Auta ${td.numerAutaOd}–${td.numerAutaDo}`,
                  }}
                />
              );
            })()}
          </>
        )}

        {/* ---- ZAKŁADKA: SZKIC ---- */}
        {aktywnaZakladka === 'szkic' && (
          <>
            {plan.zrodlo === 'budowa' && projektSzkicu ? (
              obszarySzkicu.length > 0 ? obszarySzkicu.map((obszar) => (
                <View key={obszar.id} style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
                    Szkic PZT · {obszar.numer}. {obszar.nazwa}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                    {formatujKmM(obszar.kilometrazOdM)} - {formatujKmM(obszar.kilometrazDoM)}
                  </Text>
                  <SzkicPlanuBudowy
                    projekt={projektSzkicu}
                    plan={plan}
                    theme={theme}
                    wysokosc={320}
                    zakres={obszar}
                  />
                </View>
              )) : (
                <View style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Szkic PZT (wycinek km)</Text>
                  <SzkicPlanuBudowy projekt={projektSzkicu} plan={plan} theme={theme} wysokosc={320} />
                </View>
              )
            ) : (
              <>
            {plan.dzialki.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {plan.dzialki.map((dz, idx) => (
                  <TouchableOpacity
                    key={dz.id}
                    style={[styles.selectorBtn, { borderColor: wybranaIdx === idx ? theme.colors.primary : theme.colors.border, backgroundColor: wybranaIdx === idx ? `${theme.colors.primary}15` : theme.colors.card }]}
                    onPress={() => setWybranaIdx(idx)}
                  >
                    <Text style={{ color: wybranaIdx === idx ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                      {dz.nazwa}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {(() => {
              const dz = plan.dzialki[wybranaIdx];
              const m = getMieszanka(dz.mieszankaId);
              return (
                <View style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Szkic: {dz.nazwa}</Text>
                  <DzialkaSketch dzialka={dz} ciezarObjetosciowy={m?.ciezarObjetosciowy ?? 2.4} />
                </View>
              );
            })()}
              </>
            )}
          </>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Modal udostępniania */}
      <Modal visible={udostepnijModal} transparent animationType="slide" onRequestClose={() => setUdostepnijModal(false)}>
        <Pressable style={uStyles.tlo} onPress={() => setUdostepnijModal(false)}>
          <Pressable style={[uStyles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[uStyles.tytul, { color: theme.colors.text }]}>Udostępnij plan</Text>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.info}15`, borderColor: theme.colors.info }]} onPress={udostepnijJSON}>
              <Text style={[uStyles.btnIkona]}>📦</Text>
              <View>
                <Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Eksportuj do aplikacji</Text>
                <Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Plik .json do importu przez innego użytkownika</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.secondary}15`, borderColor: theme.colors.secondary }]} onPress={przygotujHTML}>
              <Text style={uStyles.btnIkona}>🌐</Text>
              <View style={{ flex: 1 }}>
                <Text style={[uStyles.btnTytul, tekstWramce, { color: theme.colors.text }]} numberOfLines={2}>Generuj interaktywny HTML</Text>
                <Text style={[uStyles.btnOpis, tekstWramce, { color: theme.colors.textSecondary }]} numberOfLines={3}>Kalkulator offline z trybem Live dla majstra na budowie</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btnAnuluj, { borderColor: theme.colors.border }]} onPress={() => setUdostepnijModal(false)}>
              <Text style={[uStyles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Anuluj</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ZalacznikiViewer
        visible={viewerZal}
        zalaczniki={budowa?.zalaczniki ?? plan.zalaczniki ?? []}
        theme={theme}
        onClose={() => setViewerZal(false)}
      />

      <Modal visible={autorModal} transparent animationType="slide" onRequestClose={() => setAutorModal(false)}>
        <Pressable style={uStyles.tlo} onPress={() => setAutorModal(false)}>
          <Pressable style={[uStyles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[uStyles.tytul, { color: theme.colors.text }]}>Autor raportu</Text>
            <Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary, marginBottom: 12, textAlign: 'center' }]}>
              Podaj kto przygotowuje raport. Majster na budowie uzupełni dane Live i odeśle plik z powrotem.
            </Text>
            <TextInput
              style={[uStyles.inputAutor, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={autorNazwa}
              onChangeText={setAutorNazwa}
              placeholder="np. Jan Kowalski"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TouchableOpacity style={[uStyles.btnPelny, { backgroundColor: theme.colors.primary }]} onPress={udostepnijHTML}>
              <Text style={[tekstPrzycisk, { color: '#fff' }]}>Generuj i udostępnij HTML</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btnAnuluj, { borderColor: theme.colors.border }]} onPress={() => setAutorModal(false)}>
              <Text style={[uStyles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Anuluj</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const uStyles = StyleSheet.create({
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  karta: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  tytul: { fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  btnIkona: { fontSize: 28 },
  btnTytul: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  btnOpis: { fontSize: 12 },
  btnAnuluj: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAnulujTekst: { fontSize: 15, fontWeight: '600' },
  inputAutor: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  btnPelny: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  wstecz: { fontSize: 17, minWidth: 60 },
  naglowekSrodek: { flex: 1, alignItems: 'center' },
  tytul: { fontSize: 16, fontWeight: '700' },
  udostepnij: { fontSize: 15, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  zakladki: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  zakladka: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  zakladkaTekst: { fontSize: 14, fontWeight: '600' },
  zawartosc: { padding: 16, gap: 12 },
  kartaDzialki: { ...kartaWspolna, padding: 16 },
  kartaTytul: { fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  podsumWrap: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  selectorScroll: { marginBottom: 12 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  tabelaNaglowek: { borderRadius: 10, padding: 12, marginBottom: 8 },
  tabelaRzad: {
    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tabelaRzadNagl: { paddingVertical: 10 },
  tabelaKomNagl: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tabelaKom: { flex: 1, fontSize: 13, textAlign: 'center' },
  rzutSeparator: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, marginVertical: 4 },
  rzutLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
