// ============================================================
// EKRAN: ARCHIWUM – szczegóły zakończonego planu + PDF
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, Alert,
  Modal, Pressable,
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
import { TabelaLive } from '../../src/components/plan/TabelaLive';
import { generujRaportPDF } from '../../src/utils/pdfGenerator';
import { eksportujJSON, generujInteraktywnyHTML } from '../../src/utils/htmlGenerator';
import * as MailComposer from 'expo-mail-composer';
import {
  obliczWynikiDzialki,
  formatLiczby,
  obliczPowierzchnioweOdStartu,
} from '../../src/utils/calculations';
import { formatujDatePl } from '../../src/utils/dates';
import { formatujPikietaz } from '../../src/utils/chainage';
import { gruboscWbudowywania } from '../../src/utils/grubosc';
import type { AppTheme } from '../../src/constants/theme';

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
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 17 }}>‹ Wstecz</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const budowa = plan.budowaId ? budowy.find((b) => b.id === plan.budowaId) : undefined;

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const wpisyLive = wpisyDlaPlanu(plan.id);
  const wybraDzialka = plan.dzialki[wybranaIdx];

  const handleGenerujPDF = async () => {
    setGenerujePDF(true);
    try { await generujRaportPDF({ plan, wpisyLive, mieszanki, budowa: budowa ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji } : undefined }); }
    catch { Alert.alert('Błąd', 'Nie udało się wygenerować PDF. Spróbuj ponownie.'); }
    finally { setGenerujePDF(false); }
  };

  const handleWyslijMail = async () => {
    const dostepny = await MailComposer.isAvailableAsync();
    if (!dostepny) { Alert.alert('Brak klienta e-mail', 'Na urządzeniu nie skonfigurowano konta e-mail.'); return; }
    await MailComposer.composeAsync({
      subject: `Raport MMA – ${formatujDatePl(plan.dataWbudowywania)}`,
      body: `W załączniku znajdziesz raport dnia roboczego z ${formatujDatePl(plan.dataWbudowywania)}.\n\nWygenerowano: Kalkulator MMA`,
    });
  };

  // Statystyki sumaryczne
  const sumaMasyPlan = plan.dzialki.reduce((s, dz) => {
    const m = getMieszanka(dz.mieszankaId);
    if (!m) return s;
    return s + obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta).lacznaIloscMasy;
  }, 0);
  const sumaMasyLive = wpisyLive.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const sumaMetrLive = wpisyLive.reduce((s, w) => s + w.przejechaneMetry, 0);
  const bilansMasy = sumaMasyLive - sumaMasyPlan;
  const kmStartGlobal = plan.dzialki.length > 0
    ? plan.dzialki[0].kilometrazPoczatkowyKm * 1000 + plan.dzialki[0].kilometrazPoczatkowyM
    : 0;
  const kmKoniecGlobal = kmStartGlobal + sumaMetrLive;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytulN, { color: theme.colors.text }]} numberOfLines={1}>
          {formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => setUdostepnijModal(true)}>
            <Text style={[styles.btnPDF, { color: theme.colors.secondary }]}>↑ Udostępnij</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGenerujPDF} disabled={generujePDF}>
            {generujePDF
              ? <ActivityIndicator color={theme.colors.primary} />
              : <Text style={[styles.btnPDF, { color: theme.colors.primary }]}>📄 PDF</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

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
            {budowa && (
              <View style={[styles.karta, { backgroundColor: `${theme.colors.secondary}12`, borderColor: theme.colors.secondary }]}>
                <Text style={{ color: theme.colors.secondary, fontWeight: '700' }}>{budowa.kodBudowy} – {budowa.nazwaInwestycji}</Text>
              </View>
            )}
            {/* Bilans końcowy */}
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>BILANS KOŃCOWY</Text>
              <IR label="Data" v={formatujDatePl(plan.dataWbudowywania)} theme={theme} />
              <IR label="Działki" v={`${plan.dzialki.length}`} theme={theme} />
              <IR label="Masa zaplanowana" v={`${formatLiczby(sumaMasyPlan, 2)} Mg`} theme={theme} />
              {wpisyLive.length > 0 && (
                <>
                  <IR label="Masa wbudowana" v={`${formatLiczby(sumaMasyLive, 2)} Mg (${bilansMasy >= 0 ? '+' : ''}${formatLiczby(bilansMasy, 2)} Mg)`} theme={theme} />
                  <IR label="Metry wykonane" v={`${formatLiczby(sumaMetrLive)} m (${formatujPikietaz(kmStartGlobal)} – ${formatujPikietaz(kmKoniecGlobal)})`} theme={theme} />
                  <IR label="Aut przybyło" v={`${wpisyLive.length}`} theme={theme} />
                  <View style={[styles.bilansBoks, { backgroundColor: bilansMasy > 0 ? `${theme.colors.danger}15` : `${theme.colors.success}15`, borderColor: bilansMasy > 0 ? theme.colors.danger : theme.colors.success }]}>
                    <Text style={[styles.bilansLabel, { color: bilansMasy > 0 ? theme.colors.danger : theme.colors.success }]}>
                      {bilansMasy > 0 ? '⚠ Przepał' : '✓ Oszczędność'}
                    </Text>
                    <Text style={[styles.bilansWartosc, { color: bilansMasy > 0 ? theme.colors.danger : theme.colors.success }]}>
                      {bilansMasy > 0 ? '+' : ''}{formatLiczby(bilansMasy, 2)} Mg
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Każda działka */}
            {plan.dzialki.map((dz) => {
              const mie = getMieszanka(dz.mieszankaId);
              const wyniki = mie ? obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta) : null;
              const wpisyDz = wpisyLive.filter((w) => w.dzialkaId === dz.id);
              const sumaTonDz = wpisyDz.reduce((s, w) => s + w.tonazPrzywieziony, 0);
              const sumaMetrDz = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);
              const kmStart = dz.kilometrazPoczatkowyKm * 1000 + dz.kilometrazPoczatkowyM;
              const powLaczna = mie ? obliczPowierzchnioweOdStartu(dz, sumaMetrDz) : 0;
              const uzyskGr = powLaczna > 0 && mie ? (sumaTonDz / (mie.ciezarObjetosciowy * powLaczna)) * 100 : 0;
              const grWb = gruboscWbudowywania(dz);
              const strzalka = uzyskGr > grWb + 0.05 ? ' ▲' : uzyskGr < grWb - 0.05 && uzyskGr > 0 ? ' ▼' : '';
              return (
                <View key={dz.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>{dz.nazwa}</Text>
                  <IR label="Mieszanka" v={mie?.rodzaj ?? '–'} theme={theme} />
                  <IR label="Grubość wbudowywania" v={`${grWb} cm${uzyskGr > 0 ? ` (${formatLiczby(uzyskGr, 2)} cm${strzalka})` : ''}`} theme={theme} />
                  {wyniki && <IR label="Masa planu" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} />}
                  {wpisyDz.length > 0 && (
                    <>
                      <IR label="Wbudowano" v={`${formatLiczby(sumaTonDz, 2)} Mg`} theme={theme} bold />
                      <IR label="Metry" v={`${formatLiczby(sumaMetrDz)} m (${formatujPikietaz(kmStart)} – ${formatujPikietaz(dz.kierunekUkladania === 'malejacy' ? kmStart - sumaMetrDz : kmStart + sumaMetrDz)})`} theme={theme} />
                      <IR label="Aut" v={`${wpisyDz.length}`} theme={theme} />
                    </>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ======== TABELA LIVE ======== */}
        {aktywnaZakladka === 'live' && wybraDzialka && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
              {wybraDzialka.nazwa} – tabela aut (Live)
            </Text>
            {wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id).length === 0 ? (
              <Text style={[styles.brakWpisow, { color: theme.colors.textSecondary }]}>Brak zapisów Live dla tej działki.</Text>
            ) : (
              <TabelaLive
                dzialka={wybraDzialka}
                wpisy={wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id)}
                theme={theme}
              />
            )}
          </View>
        )}

        {/* ======== SZKIC ======== */}
        {aktywnaZakladka === 'szkic' && wybraDzialka && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Szkic: {wybraDzialka.nazwa}</Text>
            <DzialkaSketch
              dzialka={wybraDzialka}
              ciezarObjetosciowy={getMieszanka(wybraDzialka.mieszankaId)?.ciezarObjetosciowy ?? 2.4}
              wykonaneMetry={wpisyLive.filter((w) => w.dzialkaId === wybraDzialka.id).reduce((s, w) => s + w.przejechaneMetry, 0)}
            />
          </View>
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
              <View><Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Wyślij e-mailem</Text><Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Otwórz klienta poczty z raportem</Text></View>
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

function IR({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: bold ? '700' : '400' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  wstecz: { fontSize: 17, minWidth: 60 },
  tytulN: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  btnPDF: { fontSize: 15, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  zakladki: { flexDirection: 'row', borderBottomWidth: 1 },
  zakladka: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  zakladkaTekst: { fontSize: 13, fontWeight: '600' },
  selectorScroll: { paddingHorizontal: 16, paddingVertical: 10, maxHeight: 56 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  zawartosc: { padding: 16, gap: 12 },
  karta: { borderRadius: 14, padding: 16, borderWidth: 1 },
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
