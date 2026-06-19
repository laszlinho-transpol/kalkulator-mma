// ============================================================
// EKRAN: WBUDOWYWANIE – Live Tracker (3 zakładki)
// Zakładka 1: Plan | Zakładka 2: Kontrola | Zakładka 3: Live
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, useColorScheme, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { lightTheme, darkTheme } from '../../src/constants/theme';
import { DzialkaSketch } from '../../src/components/sketch/DzialkaSketch';
import {
  obliczWynikiDzialki, obliczTabeleAut, obliczLacznaDlugosc,
  obliczKontrolę, formatLiczby, generujDomyslneRzuty,
} from '../../src/utils/calculations';
import { formatujDatePl, aktualnaGodzina } from '../../src/utils/dates';
import type { AppTheme } from '../../src/constants/theme';
import type { DzialkaRobocza } from '../../src/types';

type ZakladkaTyp = 'plan' | 'kontrola' | 'live';

export default function WbudowywanieDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan = usePlanyStore((s) => s.pobierzPlan(id));
  const archiwizujPlan = usePlanyStore((s) => s.archiwizujPlan);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const { wpisyDlaDzialki, dodajWpisAuta, edytujWpisAuta, usunWpisAuta } = useLiveStore();

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');
  const [wybranaIdx, setWybranaIdx] = useState(0);

  // Stany dla zakładki Kontrola
  const [wbudowaneTonyStr, setWbudowaneTony] = useState('');
  const [przejechaneMetryStr, setPrzejechaneMetry] = useState('');

  // Stan dla nowego wpisu Live
  const [nowyTonaz, setNowyTonaz] = useState('');
  const [nowyMetry, setNowyMetry] = useState('');
  const [nowyKomentarz, setNowyKomentarz] = useState('');
  const [nowyGodzina, setNowyGodzina] = useState(aktualnaGodzina());

  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.danger, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const wybraDzialka: DzialkaRobocza = plan.dzialki[wybranaIdx];
  const mieszanka = getMieszanka(wybraDzialka?.mieszankaId ?? '');

  const wpisyBiezacej = wpisyDlaDzialki(plan.id, wybraDzialka?.id ?? '');

  const zakoncz = () => {
    Alert.alert(
      'Zakończ i archiwizuj',
      'Czy na pewno chcesz zakończyć realizację tego planu? Zostanie przeniesiony do archiwum.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zakończ',
          style: 'destructive',
          onPress: async () => {
            await archiwizujPlan(plan.id);
            router.replace('/archiwum' as any);
          },
        },
      ],
    );
  };

  const dodajWpisLive = async () => {
    const ton = parseFloat(nowyTonaz.replace(',', '.'));
    const met = parseFloat(nowyMetry.replace(',', '.'));
    if (isNaN(ton) || ton <= 0) { Alert.alert('Błąd', 'Podaj prawidłowy tonaż.'); return; }
    if (isNaN(met) || met <= 0) { Alert.alert('Błąd', 'Podaj prawidłowe metry.'); return; }
    const nrAuta = wpisyBiezacej.length + 1;
    await dodajWpisAuta({
      planId: plan.id,
      dzialkaId: wybraDzialka.id,
      numerAuta: nrAuta,
      tonazPrzywieziony: ton,
      przejechaneMetry: met,
      komentarz: nowyKomentarz.trim() || undefined,
      godzinaWybudowania: nowyGodzina,
    });
    setNowyTonaz('');
    setNowyMetry('');
    setNowyKomentarz('');
    setNowyGodzina(aktualnaGodzina());
  };

  // ---- Obliczenia sumaryczne dla Live ----
  const sumaTonLive = wpisyBiezacej.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const sumaMetrLive = wpisyBiezacej.reduce((s, w) => s + w.przejechaneMetry, 0);

  // ---- Obliczenia dla Kontroli ----
  let wynikiKontroli = null;
  const tonyK = parseFloat(wbudowaneTonyStr.replace(',', '.'));
  const metryK = parseFloat(przejechaneMetryStr.replace(',', '.'));
  if (wybraDzialka && mieszanka && !isNaN(tonyK) && !isNaN(metryK) && tonyK > 0 && metryK > 0) {
    wynikiKontroli = obliczKontrolę(tonyK, metryK, wybraDzialka, mieszanka.ciezarObjetosciowy, plan.tonazAuta);
  }

  const grubosc = wybraDzialka?.grubosc ?? 0;

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
        <TouchableOpacity onPress={zakoncz} style={[styles.btnZakoncz, { backgroundColor: theme.colors.danger }]}>
          <Text style={styles.btnZakonczTekst}>Zakończ</Text>
        </TouchableOpacity>
      </View>

      {/* Zakładki */}
      <View style={[styles.zakladki, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        {(['plan', 'kontrola', 'live'] as ZakladkaTyp[]).map((z) => {
          const etykiety: Record<ZakladkaTyp, string> = { plan: 'Plan', kontrola: 'Kontrola', live: 'Live' };
          const aktywna = aktywnaZakladka === z;
          return (
            <TouchableOpacity key={z} style={[styles.zakladka, aktywna && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2.5 }]} onPress={() => setZakladka(z)}>
              <Text style={[styles.zakladkaTekst, { color: aktywna ? theme.colors.primary : theme.colors.textSecondary }]}>{etykiety[z]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selektor działki (dla Kontrola i Live) */}
      {aktywnaZakladka !== 'plan' && plan.dzialki.length > 1 && (
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.zawartosc} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ======== PLAN ======== */}
          {aktywnaZakladka === 'plan' && plan.dzialki.map((dz, dzIdx) => {
            const mie = getMieszanka(dz.mieszankaId);
            if (!mie) return null;
            const wyniki = obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta);
            const len = obliczLacznaDlugosc(dz);
            const rzuty = (plan.rzuty as any[]).length > 0 ? plan.rzuty : generujDomyslneRzuty(wyniki.iloscSamochodow);
            return (
              <View key={dz.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>{dz.nazwa}</Text>
                <IR label="Mieszanka" v={`${mie.rodzaj}  ρ=${mie.ciezarObjetosciowy.toFixed(3)}`} theme={theme} />
                <IR label="Grubość" v={`${dz.grubosc} cm`} theme={theme} />
                <IR label="Figury" v={`${dz.figury.length}`} theme={theme} />
                <IR label="Powierzchnia" v={`${formatLiczby(wyniki.lacznaPowierzchnia)} m²`} theme={theme} />
                <IR label="Masa" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} bold />
                <IR label="Samochodów" v={`${wyniki.iloscSamochodow}`} theme={theme} bold />
                <IR label="Metrów liniowych" v={`${formatLiczby(len)} m`} theme={theme} />
                <View style={{ marginTop: 12 }}>
                  <DzialkaSketch dzialka={dz} ciezarObjetosciowy={mie.ciezarObjetosciowy} />
                </View>
              </View>
            );
          })}

          {/* ======== KONTROLA ======== */}
          {aktywnaZakladka === 'kontrola' && wybraDzialka && mieszanka && (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Szybka kontrola</Text>
              <Text style={[styles.kontrolaOpis, { color: theme.colors.textSecondary }]}>
                Wpisz faktyczne dane z budowy, aby porównać z planem.
              </Text>

              <NumInput label="Wbudowane tony [Mg]" value={wbudowaneTonyStr} onChange={setWbudowaneTony} theme={theme} />
              <NumInput label="Przejechane metry [m]" value={przejechaneMetryStr} onChange={setPrzejechaneMetry} theme={theme} />

              {wynikiKontroli ? (
                <View style={styles.wynikKontroli}>
                  <Text style={[styles.wynikNagl, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>Wyniki porównania:</Text>

                  <WynikRow
                    label="Zakryta powierzchnia"
                    wartosc={`${formatLiczby(wynikiKontroli.zakrytaPowierzchnia)} m²`}
                    theme={theme}
                  />

                  <WynikRowGrubosc
                    uzyskana={wynikiKontroli.uzyskanaGrubosc}
                    planowana={grubosc}
                    theme={theme}
                  />

                  <WynikRowBilans bilans={wynikiKontroli.bilansMasy} theme={theme} />

                  <View style={[styles.wynikSep, { backgroundColor: theme.colors.border }]} />
                  <WynikRow label="Do końca metrów" wartosc={`${formatLiczby(wynikiKontroli.pozostaloMetrow)} m`} theme={theme} />
                  <WynikRow label="Do wbudowania pow." wartosc={`${formatLiczby(wynikiKontroli.pozostaloPowierzchni)} m²`} theme={theme} />
                  <WynikRow label={`Do wbudowania wg planu (${grubosc} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgZalozen, 2)} Mg`} theme={theme} />
                  <WynikRow label={`Do wbudowania wg śr. (${formatLiczby(wynikiKontroli.uzyskanaGrubosc, 2)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgSredniej, 2)} Mg`} theme={theme} />
                </View>
              ) : (
                <View style={[styles.wynikPuste, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.wynikPusteTekst, { color: theme.colors.textSecondary }]}>
                    Wpisz tony i metry, aby zobaczyć porównanie.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ======== LIVE ======== */}
          {aktywnaZakladka === 'live' && wybraDzialka && (
            <>
              {/* Szkic z postępem */}
              {mieszanka && (
                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Postęp: {wybraDzialka.nazwa}</Text>
                  <DzialkaSketch
                    dzialka={wybraDzialka}
                    ciezarObjetosciowy={mieszanka.ciezarObjetosciowy}
                    wykonaneMetry={sumaMetrLive}
                  />
                  <Text style={[styles.postepInfo, { color: theme.colors.textSecondary }]}>
                    {wpisyBiezacej.length} aut  •  {formatLiczby(sumaTonLive, 2)} Mg  •  {formatLiczby(sumaMetrLive)} m
                  </Text>
                </View>
              )}

              {/* Tabela live */}
              {wpisyBiezacej.length > 0 && (
                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Tabela aut</Text>

                  {/* Nagłówek tabeli */}
                  <View style={[styles.tabelaNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
                    {['Auto', 'Mg', 'm', 'Godz.', ''].map((h) => (
                      <Text key={h} style={[styles.tabelaKomNagl, { color: theme.colors.textSecondary }]}>{h}</Text>
                    ))}
                  </View>

                  {wpisyBiezacej.map((wpis, idx) => {
                    const sumaMetrDotad = wpisyBiezacej.slice(0, idx + 1).reduce((s, w) => s + w.przejechaneMetry, 0);
                    const sumaTonDotad = wpisyBiezacej.slice(0, idx + 1).reduce((s, w) => s + w.tonazPrzywieziony, 0);
                    return (
                      <View key={wpis.id}>
                        <View style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border }]}>
                          <Text style={[styles.tabelaKom, { color: theme.colors.textSecondary }]}>{wpis.numerAuta}</Text>
                          <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wpis.tonazPrzywieziony)}</Text>
                          <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{formatLiczby(wpis.przejechaneMetry)}</Text>
                          <Text style={[styles.tabelaKom, { color: theme.colors.text }]}>{wpis.godzinaWybudowania}</Text>
                          <TouchableOpacity
                            onPress={() => Alert.alert('Usuń wpis', `Auto #${wpis.numerAuta}?`, [
                              { text: 'Anuluj', style: 'cancel' },
                              { text: 'Usuń', style: 'destructive', onPress: () => usunWpisAuta(wpis.id) },
                            ])}
                          >
                            <Text style={{ color: theme.colors.danger, fontSize: 16, fontWeight: '700' }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        {wpis.komentarz ? (
                          <Text style={[styles.komentarz, { color: theme.colors.textSecondary, borderBottomColor: theme.colors.border }]}>
                            💬 {wpis.komentarz}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}

                  {/* Suma */}
                  <View style={[styles.tabelaSuma, { backgroundColor: `${theme.colors.primary}10` }]}>
                    <Text style={[styles.sumaLabel, { color: theme.colors.textSecondary }]}>∑</Text>
                    <Text style={[styles.sumaWartosc, { color: theme.colors.text }]}>{formatLiczby(sumaTonLive, 2)} Mg</Text>
                    <Text style={[styles.sumaWartosc, { color: theme.colors.text }]}>{formatLiczby(sumaMetrLive)} m</Text>
                    <Text style={{ flex: 1 }} />
                    <Text style={{ flex: 0.5 }} />
                  </View>
                </View>
              )}

              {/* Formularz nowego auta */}
              <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
                  Auto #{wpisyBiezacej.length + 1}
                </Text>
                <NumInput label="Tonaż [Mg]" value={nowyTonaz} onChange={setNowyTonaz} theme={theme} placeholder={String(plan.tonazAuta)} />
                <NumInput label="Przejechane metry [m]" value={nowyMetry} onChange={setNowyMetry} theme={theme} />
                <View style={styles.godzinWrap}>
                  <Text style={[styles.godzLabel, { color: theme.colors.textSecondary }]}>Godzina wybudowania</Text>
                  <TextInput
                    style={[styles.godzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={nowyGodzina}
                    onChangeText={setNowyGodzina}
                    maxLength={5}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <TextInput
                  style={[styles.komentarzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={nowyKomentarz}
                  onChangeText={setNowyKomentarz}
                  placeholder="Komentarz / uwagi (opcjonalnie)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.btnDodajAuto, { backgroundColor: theme.colors.success }]}
                  onPress={dodajWpisLive}
                >
                  <Text style={styles.btnDodajAutoTekst}>+ Dodaj auto #{wpisyBiezacej.length + 1}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- Komponenty pomocnicze ----

function IR({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: bold ? '700' : '400' }}>{v}</Text>
    </View>
  );
}

function NumInput({ label, value, onChange, theme, placeholder }: { label: string; value: string; onChange: (v: string) => void; theme: AppTheme; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(',', '.'))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
      />
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

function WynikRowGrubosc({ uzyskana, planowana, theme }: { uzyskana: number; planowana: number; theme: AppTheme }) {
  const roznica = uzyskana - planowana;
  const ikona = roznica > 0.05 ? ' ▲' : roznica < -0.05 ? ' ▼' : '';
  const kolor = Math.abs(roznica) <= 0.05 ? theme.colors.success : theme.colors.danger;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Uzyskana grubość</Text>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>
        {formatLiczby(uzyskana)} cm{ikona}
      </Text>
    </View>
  );
}

function WynikRowBilans({ bilans, theme }: { bilans: number; theme: AppTheme }) {
  const czyOszczednosc = bilans < 0;
  const kolor = czyOszczednosc ? theme.colors.success : theme.colors.danger;
  const tloBg = czyOszczednosc ? `${theme.colors.success}20` : `${theme.colors.danger}20`;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: tloBg, marginVertical: 4 }}>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '600' }}>
        Bilans masy {czyOszczednosc ? '(oszczędność)' : '(przepał)'}
      </Text>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>
        {bilans > 0 ? '+' : ''}{formatLiczby(bilans, 2)} Mg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  wstecz: { fontSize: 17, minWidth: 60 },
  tytulN: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  btnZakoncz: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  btnZakonczTekst: { color: '#fff', fontWeight: '700', fontSize: 13 },
  zakladki: { flexDirection: 'row', borderBottomWidth: 1 },
  zakladka: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  zakladkaTekst: { fontSize: 14, fontWeight: '600' },
  selectorScroll: { paddingHorizontal: 16, paddingVertical: 10, maxHeight: 56 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  zawartosc: { padding: 16, gap: 12 },
  karta: { borderRadius: 14, padding: 16, borderWidth: 1 },
  kartaTytul: { fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  kontrolaOpis: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  wynikKontroli: { marginTop: 16 },
  wynikNagl: { fontSize: 14, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8 },
  wynikSep: { height: 1, marginVertical: 10 },
  wynikPuste: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  wynikPusteTekst: { fontSize: 14, textAlign: 'center' },
  tabelaNagl: { flexDirection: 'row', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 2 },
  tabelaKomNagl: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabelaRzad: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, alignItems: 'center' },
  tabelaKom: { flex: 1, fontSize: 13, textAlign: 'center' },
  komentarz: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 5, borderBottomWidth: 1, fontStyle: 'italic' },
  tabelaSuma: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, marginTop: 4, alignItems: 'center' },
  sumaLabel: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sumaWartosc: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  postepInfo: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  godzinWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  godzLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  godzInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlign: 'center' },
  komentarzInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 50, marginBottom: 12 },
  btnDodajAuto: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnDodajAutoTekst: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
