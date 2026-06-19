// ============================================================
// EKRAN: ARCHIWUM – szczegóły zakończonego planu + PDF
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { DzialkaSketch } from '../../src/components/sketch/DzialkaSketch';
import { generujRaportPDF } from '../../src/utils/pdfGenerator';
import {
  obliczWynikiDzialki, obliczLacznaDlugosc,
  formatLiczby,
} from '../../src/utils/calculations';
import { formatujDatePl } from '../../src/utils/dates';
import type { AppTheme } from '../../src/constants/theme';

type ZakladkaTyp = 'podsumowanie' | 'live' | 'szkic';

export default function ArchiwumDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan = usePlanyStore((s) => s.pobierzPlan(id));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const { wpisyDlaPlanu } = useLiveStore();

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('podsumowanie');
  const [wybranaIdx, setWybranaIdx] = useState(0);
  const [generujePDF, setGenerujePDF] = useState(false);

  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 17 }}>‹ Wstecz</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>Plan nie znaleziony.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const wpisyLive = wpisyDlaPlanu(plan.id);
  const wybraDzialka = plan.dzialki[wybranaIdx];

  const handleGenerujPDF = async () => {
    setGenerujePDF(true);
    try {
      await generujRaportPDF({ plan, wpisyLive, mieszanki });
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się wygenerować PDF. Spróbuj ponownie.');
    } finally {
      setGenerujePDF(false);
    }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <Text style={[styles.tytulN, { color: theme.colors.text }]} numberOfLines={1}>
          {formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        </Text>
        <TouchableOpacity onPress={handleGenerujPDF} disabled={generujePDF}>
          {generujePDF
            ? <ActivityIndicator color={theme.colors.primary} />
            : <Text style={[styles.btnPDF, { color: theme.colors.primary }]}>📄 PDF</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Zakładki */}
      <View style={[styles.zakladki, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        {(['podsumowanie', 'live', 'szkic'] as ZakladkaTyp[]).map((z) => {
          const etykiety: Record<ZakladkaTyp, string> = { podsumowanie: 'Podsumowanie', live: 'Tabela Live', szkic: 'Szkic' };
          const aktywna = aktywnaZakladka === z;
          return (
            <TouchableOpacity key={z} style={[styles.zakladka, aktywna && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2.5 }]} onPress={() => setZakladka(z)}>
              <Text style={[styles.zakladkaTekst, { color: aktywna ? theme.colors.primary : theme.colors.textSecondary }]}>{etykiety[z]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      <ScrollView contentContainerStyle={styles.zawartosc} showsVerticalScrollIndicator={false}>

        {/* ======== PODSUMOWANIE ======== */}
        {aktywnaZakladka === 'podsumowanie' && (
          <>
            {/* Bilans końcowy */}
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>BILANS KOŃCOWY</Text>
              <IR label="Data" v={formatujDatePl(plan.dataWbudowywania)} theme={theme} />
              <IR label="Działki" v={`${plan.dzialki.length}`} theme={theme} />
              <IR label="Masa zaplanowana" v={`${formatLiczby(sumaMasyPlan, 2)} Mg`} theme={theme} />
              {wpisyLive.length > 0 && (
                <>
                  <IR label="Masa wbudowana" v={`${formatLiczby(sumaMasyLive, 2)} Mg`} theme={theme} />
                  <IR label="Metry wykonane" v={`${formatLiczby(sumaMetrLive)} m`} theme={theme} />
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
              return (
                <View key={dz.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>{dz.nazwa}</Text>
                  <IR label="Mieszanka" v={mie?.rodzaj ?? '–'} theme={theme} />
                  <IR label="Grubość" v={`${dz.grubosc} cm`} theme={theme} />
                  {wyniki && <IR label="Masa planu" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} />}
                  {wpisyDz.length > 0 && (
                    <>
                      <IR label="Wbudowano" v={`${formatLiczby(sumaTonDz, 2)} Mg`} theme={theme} bold />
                      <IR label="Aut" v={`${wpisyDz.length}`} theme={theme} />
                    </>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ======== TABELA LIVE ======== */}
        {aktywnaZakladka === 'live' && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
              {wybraDzialka?.nazwa ?? 'Działka'} – tabela aut
            </Text>
            {wpisyLive.filter((w) => w.dzialkaId === wybraDzialka?.id).length === 0 ? (
              <Text style={[styles.brakWpisow, { color: theme.colors.textSecondary }]}>Brak zapisów Live dla tej działki.</Text>
            ) : (
              <>
                <View style={[styles.tabelaNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
                  {['#', 'Mg', 'm', 'Godz.', 'Komentarz'].map((h) => (
                    <Text key={h} style={[styles.tabelaKomNagl, { color: theme.colors.textSecondary }]}>{h}</Text>
                  ))}
                </View>
                {wpisyLive.filter((w) => w.dzialkaId === wybraDzialka?.id).map((wp) => (
                  <View key={wp.id} style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.tabelaKom, { color: theme.colors.textSecondary }]}>{wp.numerAuta}</Text>
                    <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wp.tonazPrzywieziony)}</Text>
                    <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wp.przejechaneMetry)}</Text>
                    <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{wp.godzinaWybudowania}</Text>
                    <Text style={[styles.tabelaKom, { color: theme.colors.textSecondary, fontSize: 11 }]} numberOfLines={1}>{wp.komentarz ?? '–'}</Text>
                  </View>
                ))}
                {/* Suma */}
                {(() => {
                  const wpisyDz = wpisyLive.filter((w) => w.dzialkaId === wybraDzialka?.id);
                  const st = wpisyDz.reduce((s, w) => s + w.tonazPrzywieziony, 0);
                  const sm = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);
                  return (
                    <View style={[styles.tabelaRzad, styles.tabelaSuma, { backgroundColor: `${theme.colors.primary}10` }]}>
                      <Text style={[styles.tabelaKom, { color: theme.colors.textSecondary, fontWeight: '700' }]}>∑</Text>
                      <Text style={[styles.tabelaKom, { color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(st, 2)}</Text>
                      <Text style={[styles.tabelaKom, { color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(sm)}</Text>
                      <Text style={[styles.tabelaKom, {}]} />
                      <Text style={[styles.tabelaKom, {}]} />
                    </View>
                  );
                })()}
              </>
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
    </SafeAreaView>
  );
}

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
