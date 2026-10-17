// ============================================================
// EKRAN: ARCHIWUM – szczegóły zakończonego planu + PDF
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouteId } from '../../src/hooks/useRouteId';
import { usePlanPoId } from '../../src/hooks/usePlanPoId';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import { DzialkaSketch } from '../../src/components/sketch/DzialkaSketch';
import { SzkicPlanuBudowy } from '../../src/components/budowa/SzkicPlanuBudowy';
import { TabelaLive } from '../../src/components/plan/TabelaLive';
import { generujRaportPDF, wyslijRaportDniaMailem } from '../../src/utils/pdfGenerator';
import { eksportujJSON, generujInteraktywnyHTML } from '../../src/utils/htmlGenerator';
import { formatLiczby } from '../../src/utils/calculations';
import { policzBilansDnia } from '../../src/utils/bilansDnia';
import { formatujDatePl } from '../../src/utils/dates';
import { formatujPikietaz } from '../../src/utils/chainage';
import { formatujKmM } from '../../src/utils/projektBudowy';
import { obszarySzkicuPlanu } from '../../src/utils/planZBudowy';
import { AppHeader } from '../../src/components/common/AppHeader';
import { wstecz } from '../../src/budzet/nawigacja';
import { karta as kartaWspolna } from '../../src/constants/layout';
import { pokazKomunikat } from '../../src/utils/dialog';
import { Przycisk, Sekcja, SiatkaDanych, WierszDanych, kolorDnia, rodzajDnia } from '../../src/components/ui';

type ZakladkaTyp = 'podsumowanie' | 'live' | 'szkic';

export default function ArchiwumDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const id = useRouteId();
  const plan = usePlanPoId(id);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const budowy = useBudowyStore((s) => s.budowy);
  const { wpisyDlaPlanu } = useLiveStore();

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('podsumowanie');
  const [wybranaIdx, setWybranaIdx] = useState(0);
  const [generujePDF, setGenerujePDF] = useState(false);
  const [udostepnijModal, setUdostepnijModal] = useState(false);
  const insets = useSafeAreaInsets();

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Archiwum" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/archiwum') }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const budowa = plan.budowaId ? budowy.find((b) => b.id === plan.budowaId) : undefined;
  const projektSzkicu = budowa?.projekt;

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const wpisyLive = wpisyDlaPlanu(plan.id);
  const wybraDzialka = plan.dzialki[wybranaIdx];

  const opcjeRaportu = {
    plan,
    wpisyLive,
    mieszanki,
    budowa: budowa ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji } : undefined,
  };

  const handleGenerujPDF = async () => {
    setGenerujePDF(true);
    try { await generujRaportPDF(opcjeRaportu); }
    catch { pokazKomunikat('Błąd', 'Nie udało się wygenerować PDF. Spróbuj ponownie.'); }
    finally { setGenerujePDF(false); }
  };

  const handleWyslijMail = async () => {
    setGenerujePDF(true);
    try { await wyslijRaportDniaMailem(opcjeRaportu); }
    catch { pokazKomunikat('Błąd', 'Nie udało się przygotować wiadomości z PDF.'); }
    finally { setGenerujePDF(false); }
  };

  const bilans = policzBilansDnia(plan, wpisyLive, mieszanki);
  const znakMasy = bilans.deltaMasaMg > 0.0005 ? '+' : '';
  const znakMetry = bilans.deltaMetry > 0.05 ? '+' : '';
  const znakGr = bilans.deltaGruboscCm > 0.0005 ? '+' : '';
  const kolorMasy = bilans.deltaMasaMg > 0.0005 ? theme.colors.danger : theme.colors.success;
  const kolorMetry = bilans.deltaMetry < -0.05 ? theme.colors.danger : theme.colors.success;
  const kolorGr = bilans.deltaGruboscCm > 0.0005 ? theme.colors.danger : theme.colors.success;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        podtytul="Archiwum"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/archiwum') }}
        przyciski={[
          { tekst: '↑ Udostępnij', onPress: () => setUdostepnijModal(true), kolor: theme.colors.secondary },
          { tekst: generujePDF ? 'Generowanie…' : '📄 PDF', onPress: handleGenerujPDF, disabled: generujePDF },
        ]}
      />

      {/* Zakładki z animowanym wskaźnikiem */}
      <AnimatedTabBar
        tabs={[
          { id: 'podsumowanie', etykieta: 'Podsumowanie' },
          { id: 'live', etykieta: 'Tabela Live' },
          { id: 'szkic', etykieta: 'Szkic' },
        ]}
        aktywnaId={aktywnaZakladka}
        onChange={(id) => setZakladka(id as ZakladkaTyp)}
      />

      {/* Selektor działki */}
      {plan.dzialki.length > 1 && aktywnaZakladka !== 'podsumowanie' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.selectorScroll, { backgroundColor: theme.colors.card }]}>
          {plan.dzialki.map((dz, idx) => (
            <TouchableOpacity
              key={dz.id}
              style={[styles.selectorBtn, { borderColor: wybranaIdx === idx ? theme.colors.primary : theme.colors.border, backgroundColor: wybranaIdx === idx ? `${theme.colors.primary}15` : theme.colors.inputBackground }]}
              onPress={() => setWybranaIdx(idx)}
            >
              <Text style={{ color: wybranaIdx === idx ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{dz.nazwa}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

        {/* ======== PODSUMOWANIE ======== */}
        {aktywnaZakladka === 'podsumowanie' && (
          <>
            <Sekcja tytul="Dzień">
              <WierszDanych
                etykieta="Data"
                wartosc={formatujDatePl(plan.dataWbudowywania)}
                kolor={rodzajDnia(plan.dataWbudowywania) === 'roboczy' ? undefined : kolorDnia(theme, plan.dataWbudowywania)}
              />
              {budowa ? <WierszDanych etykieta="Budowa" wartosc={`${budowa.kodBudowy} – ${budowa.nazwaInwestycji}`} kolor={theme.colors.secondary} /> : null}
              <WierszDanych etykieta="Mieszanka" wartosc={bilans.mieszanka} />
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Działki', wartosc: `${bilans.liczbaDzialek}` },
                  { etykieta: 'Aut przybyło', wartosc: bilans.autOpis },
                ]}
              />
            </Sekcja>

            <Sekcja tytul="Bilans końcowy" info="Wartości wykonane porównane z planem. Zielony – w normie, czerwony – przekroczenie masy lub grubości albo brak metrów.">
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Masa – plan', wartosc: `${formatLiczby(bilans.masaPlanMg, 2)} Mg` },
                  {
                    etykieta: 'Masa – wbudowana',
                    wartosc: `${formatLiczby(bilans.masaLiveMg, 2)} Mg`,
                    dopisek: `${znakMasy}${formatLiczby(bilans.deltaMasaMg, 2)} Mg`,
                    kolor: kolorMasy,
                  },
                  { etykieta: 'Odcinek – plan', wartosc: `${formatLiczby(bilans.dlugoscPlanM, 2)} m` },
                  {
                    etykieta: 'Metry wykonane',
                    wartosc: `${formatLiczby(bilans.metryWykonane, 2)} m`,
                    dopisek: `${znakMetry}${formatLiczby(bilans.deltaMetry, 2)} m`,
                    kolor: kolorMetry,
                  },
                  { etykieta: 'Grubość – plan', wartosc: `${formatLiczby(bilans.gruboscPlanCm, 2)} cm` },
                  {
                    etykieta: 'Grubość uzyskana',
                    wartosc: `${formatLiczby(bilans.gruboscUzyskanaCm, 2)} cm`,
                    dopisek: `${znakGr}${formatLiczby(bilans.deltaGruboscCm, 2)} cm`,
                    kolor: kolorGr,
                  },
                ]}
              />
              <WierszDanych etykieta="Plan" wartosc={`${formatujPikietaz(bilans.startM)} – ${formatujPikietaz(bilans.koniecPlanM)}`} />
              <WierszDanych etykieta="Wykonano" wartosc={`${formatujPikietaz(bilans.startM)} – ${formatujPikietaz(bilans.koniecWykonanyM)}`} />
              <Przycisk
                tekst="Edytuj plan"
                ikona="edytuj"
                wariant="drugi"
                onPress={() => router.push(`/plan/edytuj/${plan.id}` as any)}
              />
            </Sekcja>
          </>
        )}

        {/* ======== TABELA LIVE ======== */}
        {aktywnaZakladka === 'live' && wybraDzialka && (
          <Sekcja tytul={`${wybraDzialka.nazwa} – tabela aut (Live)`}>
            {wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id).length === 0 ? (
              <Text style={[styles.brakWpisow, { color: theme.colors.textSecondary }]}>Brak zapisów Live dla tej działki.</Text>
            ) : (
              <TabelaLive
                dzialka={wybraDzialka}
                wpisy={wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id)}
                ciezarObjetosciowy={getMieszanka(wybraDzialka.mieszankaId)?.ciezarObjetosciowy}
                theme={theme}
              />
            )}
          </Sekcja>
        )}

        {/* ======== SZKIC ======== */}
        {aktywnaZakladka === 'szkic' && wybraDzialka && (
          <Sekcja tytul={`Szkic: ${wybraDzialka.nazwa}`}>
            {projektSzkicu ? (
              obszarySzkicuPlanu(plan).length > 0 ? obszarySzkicuPlanu(plan).map((obszar) => (
                <View key={obszar.id} style={{ marginBottom: 16 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', marginBottom: 4 }}>
                    {obszar.numer}. {obszar.nazwa}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                    {formatujKmM(obszar.kilometrazOdM)} - {formatujKmM(obszar.kilometrazDoM)}
                  </Text>
                  <SzkicPlanuBudowy
                    projekt={projektSzkicu}
                    plan={plan}
                    theme={theme}
                    wpisy={wpisyLive.filter((w) => obszar.dzialkaIds.includes(w.dzialkaId))}
                    wysokosc={420}
                    zakres={obszar}
                  />
                </View>
              )) : (
                <SzkicPlanuBudowy projekt={projektSzkicu} plan={plan} theme={theme} wpisy={wpisyLive} wysokosc={420} />
              )
            ) : (
              <DzialkaSketch
                dzialka={wybraDzialka}
                ciezarObjetosciowy={getMieszanka(wybraDzialka.mieszankaId)?.ciezarObjetosciowy ?? 2.4}
                wykonaneMetry={wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id).reduce((s, w) => s + w.przejechaneMetry, 0)}
              />
            )}
          </Sekcja>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal udostępniania */}
      <Modal visible={udostepnijModal} transparent animationType="slide" onRequestClose={() => setUdostepnijModal(false)}>
        <Pressable style={uStyles.tlo} onPress={() => setUdostepnijModal(false)}>
          <Pressable style={[uStyles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[uStyles.tytul, { color: theme.colors.text }]}>Udostępnij archiwum</Text>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]} onPress={async () => { setUdostepnijModal(false); handleGenerujPDF(); }}>
              <Text style={uStyles.btnIkona}>📄</Text>
              <View><Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Generuj raport PDF</Text><Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Pełny raport dnia z bilansem końcowym</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.danger}15`, borderColor: theme.colors.danger }]} onPress={async () => { setUdostepnijModal(false); handleWyslijMail(); }}>
              <Text style={uStyles.btnIkona}>✉️</Text>
              <View><Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Wyślij e-mailem</Text><Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>PDF w załączniku. W przeglądarce zapisz PDF z okna drukowania i dołącz go do maila.</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.info}15`, borderColor: theme.colors.info }]} onPress={async () => { setUdostepnijModal(false); try { await eksportujJSON(plan, mieszanki); } catch {} }}>
              <Text style={uStyles.btnIkona}>📦</Text>
              <View><Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Eksportuj JSON</Text><Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Import przez innego użytkownika aplikacji</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.secondary}15`, borderColor: theme.colors.secondary }]} onPress={async () => { setUdostepnijModal(false); try { await generujInteraktywnyHTML(plan, mieszanki); } catch {} }}>
              <Text style={uStyles.btnIkona}>🌐</Text>
              <View><Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Generuj interaktywny HTML</Text><Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Kalkulator offline w przeglądarce</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btnAnuluj, { borderColor: theme.colors.border }]} onPress={() => setUdostepnijModal(false)}>
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
  karta: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  tytul: { fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  btnIkona: { fontSize: 26 },
  btnTytul: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  btnOpis: { fontSize: 12 },
  btnAnuluj: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAnulujTekst: { fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  wstecz: { fontSize: 17, minWidth: 60 },
  tytulN: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  btnPDF: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  btnEdytuj: { marginTop: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  zakladki: { flexDirection: 'row', borderBottomWidth: 1 },
  zakladka: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  zakladkaTekst: { fontSize: 13, fontWeight: '600' },
  selectorScroll: { paddingHorizontal: 16, paddingVertical: 10, maxHeight: 56 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  zawartosc: { padding: 16, gap: 12 },
  karta: { ...kartaWspolna, padding: 16 },
  kartaTytul: { fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  bilansBoks: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bilansLabel: { fontSize: 14, fontWeight: '600' },
  bilansWartosc: { fontSize: 18, fontWeight: '900' },
  brakWpisow: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  tabelaNagl: { flexDirection: 'row', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 2 },
  tabelaKomNagl: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabelaRzad: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, alignItems: 'center' },
  tabelaKom: { flex: 1, fontSize: 12, textAlign: 'center' },
  tabelaSuma: { borderBottomWidth: 0, borderRadius: 8, marginTop: 4 },
});
