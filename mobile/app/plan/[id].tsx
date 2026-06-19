// ============================================================
// EKRAN: SZCZEGÓŁY PLANU – podsumowanie, tabela aut, szkic, udostępnianie
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, useColorScheme, Alert, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { DzialkaSketch } from '../../src/components/sketch/DzialkaSketch';
import {
  obliczWynikiDzialki, obliczTabeleAut, obliczLacznaDlugosc,
  formatLiczby, generujDomyslneRzuty,
} from '../../src/utils/calculations';
import { formatujDatePl } from '../../src/utils/dates';
import { eksportujJSON, generujInteraktywnyHTML } from '../../src/utils/htmlGenerator';
import type { DzialkaRobocza, Rzut } from '../../src/types';
import type { AppTheme } from '../../src/constants/theme';

type ZakladkaTyp = 'plan' | 'tabela' | 'szkic';

export default function PlanDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan = usePlanyStore((s) => s.pobierzPlan(id));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');
  const [wybranaIdx, setWybranaIdx] = useState(0);
  const [udostepnijModal, setUdostepnijModal] = useState(false);

  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 17 }}>‹ Wstecz</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getMieszanka = (id: string) => mieszanki.find((m) => m.id === id);

  const udostepnijJSON = async () => {
    try { await eksportujJSON(plan, mieszanki); } catch { /* cancelled */ }
    setUdostepnijModal(false);
  };

  const udostepnijHTML = async () => {
    try { await generujInteraktywnyHTML(plan, mieszanki); } catch { /* cancelled */ }
    setUdostepnijModal(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={[styles.naglowek, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.wstecz, { color: theme.colors.primary }]}>‹ Wstecz</Text>
        </TouchableOpacity>
        <View style={styles.naglowekSrodek}>
          <Text style={[styles.tytul, { color: theme.colors.text }]} numberOfLines={1}>
            {formatujDatePl(plan.dataWbudowywania).split(',')[0]}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setUdostepnijModal(true)}>
          <Text style={[styles.udostepnij, { color: theme.colors.secondary }]}>↑ Udostępnij</Text>
        </TouchableOpacity>
      </View>

      {/* Zakładki */}
      <View style={[styles.zakladki, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        {(['plan', 'tabela', 'szkic'] as ZakladkaTyp[]).map((z) => {
          const etykiety: Record<ZakladkaTyp, string> = { plan: 'Plan', tabela: 'Tabela aut', szkic: 'Szkic' };
          return (
            <TouchableOpacity
              key={z}
              style={[styles.zakladka, aktywnaZakladka === z && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setZakladka(z)}
            >
              <Text style={[styles.zakladkaTekst, { color: aktywnaZakladka === z ? theme.colors.primary : theme.colors.textSecondary }]}>
                {etykiety[z]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.zawartosc} showsVerticalScrollIndicator={false}>

        {/* ---- ZAKŁADKA: PLAN ---- */}
        {aktywnaZakladka === 'plan' && (
          <>
            <InfoRow label="Data" wartosc={formatujDatePl(plan.dataWbudowywania)} theme={theme} />
            <InfoRow label="Tonaż auta" wartosc={`${plan.tonazAuta} t`} theme={theme} />
            <InfoRow label="Działki" wartosc={`${plan.dzialki.length}`} theme={theme} />

            {plan.dzialki.map((dz, dzIdx) => {
              const mieszanka = getMieszanka(dz.mieszankaId);
              if (!mieszanka) return null;
              const wyniki = obliczWynikiDzialki(dz, mieszanka.ciezarObjetosciowy, plan.tonazAuta);
              return (
                <View key={dz.id} style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>{dz.nazwa}</Text>
                  <InfoRow label="Mieszanka" wartosc={`${mieszanka.rodzaj}  ρ=${mieszanka.ciezarObjetosciowy.toFixed(3)}`} theme={theme} />
                  <InfoRow label="Grubość" wartosc={`${dz.grubosc} cm`} theme={theme} />
                  <InfoRow label="Figury" wartosc={`${dz.figury.length}`} theme={theme} />
                  <View style={[styles.podsumWrap, { backgroundColor: `${theme.colors.primary}10`, borderColor: theme.colors.primary }]}>
                    <SummaryRow label="Powierzchnia" wartosc={`${formatLiczby(wyniki.lacznaPowierzchnia)} m²`} theme={theme} />
                    <SummaryRow label="Masa" wartosc={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} bold />
                    <SummaryRow label="Samochodów" wartosc={`${wyniki.iloscSamochodow}`} theme={theme} bold />
                  </View>
                </View>
              );
            })}

            {/* Suma zbiorcza */}
            <View style={[styles.kartaDzialki, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>RAZEM</Text>
              {(() => {
                let suma = 0, sumaAut = 0;
                plan.dzialki.forEach((dz) => {
                  const m = getMieszanka(dz.mieszankaId);
                  if (!m) return;
                  const w = obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta);
                  suma += w.lacznaIloscMasy;
                });
                sumaAut = Math.ceil(suma / plan.tonazAuta);
                return (
                  <View style={[styles.podsumWrap, { backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.success }]}>
                    <SummaryRow label="Łączna masa" wartosc={`${formatLiczby(suma, 2)} Mg`} theme={theme} bold />
                    <SummaryRow label="Łącznie aut" wartosc={`${sumaAut}`} theme={theme} bold />
                  </View>
                );
              })()}
            </View>
          </>
        )}

        {/* ---- ZAKŁADKA: TABELA AUT ---- */}
        {aktywnaZakladka === 'tabela' && (
          <>
            {/* Selektor działki */}
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

            <TabelaAut dzialka={plan.dzialki[wybranaIdx]} tonazAuta={plan.tonazAuta} rzuty={plan.rzuty} mieszankiAll={mieszanki} theme={theme} />
          </>
        )}

        {/* ---- ZAKŁADKA: SZKIC ---- */}
        {aktywnaZakladka === 'szkic' && (
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

        <View style={{ height: 32 }} />
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
            <TouchableOpacity style={[uStyles.btn, { backgroundColor: `${theme.colors.secondary}15`, borderColor: theme.colors.secondary }]} onPress={udostepnijHTML}>
              <Text style={uStyles.btnIkona}>🌐</Text>
              <View>
                <Text style={[uStyles.btnTytul, { color: theme.colors.text }]}>Generuj interaktywny HTML</Text>
                <Text style={[uStyles.btnOpis, { color: theme.colors.textSecondary }]}>Samodzielny kalkulator offline w przeglądarce</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[uStyles.btnAnuluj, { borderColor: theme.colors.border }]} onPress={() => setUdostepnijModal(false)}>
              <Text style={[uStyles.btnAnulujTekst, { color: theme.colors.textSecondary }]}>Anuluj</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
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
});

// ---- Tabela aut ----
function TabelaAut({ dzialka, tonazAuta, rzuty, mieszankiAll, theme }: {
  dzialka: DzialkaRobocza;
  tonazAuta: number;
  rzuty: Rzut[];
  mieszankiAll: Array<{ id: string; ciezarObjetosciowy: number; rodzaj: string }>;
  theme: AppTheme;
}) {
  const mieszanka = mieszankiAll.find((m) => m.id === dzialka.mieszankaId);
  if (!mieszanka) return <Text style={{ color: theme.colors.danger, padding: 16 }}>Brak mieszanki dla tej działki.</Text>;

  const wyniki = obliczWynikiDzialki(dzialka, mieszanka.ciezarObjetosciowy, tonazAuta);
  const lacznasDlugosc = obliczLacznaDlugosc(dzialka);
  const rzutyDoUzycia = (rzuty as any[]).length > 0 ? rzuty as any : generujDomyslneRzuty(wyniki.iloscSamochodow);
  const tabela = obliczTabeleAut(wyniki.lacznaIloscMasy, lacznasDlugosc, rzutyDoUzycia, tonazAuta);

  let ostatniRzut = 0;
  return (
    <View>
      <View style={[styles.tabelaNaglowek, { backgroundColor: `${theme.colors.primary}15` }]}>
        <SummaryRow label="Do wbudowania" wartosc={`${formatLiczby(wyniki.lacznaIloscMasy, 2)} Mg`} theme={theme} bold />
        <SummaryRow label="Ilość samochodów" wartosc={`${wyniki.iloscSamochodow}`} theme={theme} bold />
        <SummaryRow label="Łącznie metrów" wartosc={`${formatLiczby(lacznasDlugosc)} m`} theme={theme} />
      </View>

      {/* Nagłówek tabeli */}
      <View style={[styles.tabelaRzad, styles.tabelaRzadNagl, { backgroundColor: theme.colors.card }]}>
        {['L.p.', 'Mg', '∑ Mg', 'm', '∑ m'].map((h) => (
          <Text key={h} style={[styles.tabelaKomNagl, { color: theme.colors.textSecondary }]}>{h}</Text>
        ))}
      </View>

      {tabela.map((wiersz) => {
        const nowyRzut = wiersz.numerRzutu !== ostatniRzut;
        ostatniRzut = wiersz.numerRzutu;
        return (
          <React.Fragment key={wiersz.numerAuta}>
            {nowyRzut && (
              <View style={[styles.rzutSeparator, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.rzutLabel}>RZUT {wiersz.numerRzutu}</Text>
              </View>
            )}
            <View style={[styles.tabelaRzad, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.tabelaKom, { color: theme.colors.textSecondary }]}>{wiersz.numerAuta}</Text>
              <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wiersz.masa)}</Text>
              <Text style={[styles.tabelaKom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(wiersz.masaNarastajaco, 2)}</Text>
              <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wiersz.metry)}</Text>
              <Text style={[styles.tabelaKom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(wiersz.metryNarastajaco)}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ---- Pomocnicze ----
function InfoRow({ label, wartosc, theme }: { label: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={infoStyles.wiersz}>
      <Text style={[infoStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.wartosc, { color: theme.colors.text }]}>{wartosc}</Text>
    </View>
  );
}

function SummaryRow({ label, wartosc, theme, bold }: { label: string; wartosc: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={infoStyles.wiersz}>
      <Text style={[infoStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.wartosc, { color: theme.colors.text, fontWeight: bold ? '700' : '400' }]}>{wartosc}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  wiersz: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { fontSize: 14 },
  wartosc: { fontSize: 14 },
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
  kartaDzialki: { borderRadius: 14, padding: 16, borderWidth: 1 },
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
