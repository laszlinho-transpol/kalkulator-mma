// ============================================================
// EKRAN: WBUDOWYWANIE – Live Tracker (Plan / Kontrola / Live)
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView,
  Platform, Modal, Pressable, Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useLiveStore } from '../../src/stores/liveStore';
import { useAppTheme } from '../../src/context/ThemeContext';
import type { AppTheme } from '../../src/constants/theme';
import { DzialkaSketch, type WpisLiveMarker } from '../../src/components/sketch/DzialkaSketch';
import { AppHeader } from '../../src/components/common/AppHeader';
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import {
  obliczWynikiDzialki, obliczLacznaDlugosc, obliczKontrolę,
  obliczPowierzchnioweOdStartu, formatLiczby, generujDomyslneRzuty,
} from '../../src/utils/calculations';
import { formatujDatePl, aktualnaGodzina } from '../../src/utils/dates';
import type { DzialkaRobocza, WpisLive } from '../../src/types';

type ZakladkaTyp = 'plan' | 'kontrola' | 'live';

const SCREEN_W = Dimensions.get('window').width;

// Kolumny tabeli Live (przewijane poziomo)
const KOLUMNY = [
  { id: 'auto', label: '#', width: 36 },
  { id: 'mg', label: 'Mg', width: 56 },
  { id: 'metry', label: 'm', width: 56 },
  { id: 'grubosc', label: 'Gr.', width: 56 },
  { id: 'doKonca', label: 'Do końca m', width: 80 },
  { id: 'godzina', label: 'Godz.', width: 56 },
];

export default function WbudowywanieDetailScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan = usePlanyStore((s) => s.pobierzPlan(id));
  const archiwizujPlan = usePlanyStore((s) => s.archiwizujPlan);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const { wpisyDlaDzialki, dodajWpisAuta, usunWpisAuta, czyDzialkaZakonczona, zakonczDzialke, cofnijZakonczenieDzialki } = useLiveStore();

  const [aktywnaZakladka, setZakladka] = useState<ZakladkaTyp>('plan');
  const [wybranaIdx, setWybranaIdx] = useState(0);

  // Kontrola
  const [wbudowaneTonyStr, setWbudowaneTony] = useState('');
  const [przejechaneMetryStr, setPrzejechaneMetry] = useState('');

  // Nowy wpis Live
  const [nowyTonaz, setNowyTonaz] = useState('');
  const [nowyMetry, setNowyMetry] = useState('');
  const [nowyKomentarz, setNowyKomentarz] = useState('');
  const [nowyGodzina, setNowyGodzina] = useState(aktualnaGodzina());

  // Modal auta
  const [autaModal, setAutaModal] = useState<{ wpis: WpisLive; idxWpisu: number } | null>(null);
  const [autaModalZakladka, setAutaModalZakladka] = useState<'szczegoły' | 'odcinek'>('szczegoły');

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Wbudowywanie" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.danger, fontSize: 16 }}>Plan nie znaleziony.</Text>
        </View>
      </View>
    );
  }

  const getMieszanka = (mId: string) => mieszanki.find((m) => m.id === mId);
  const wybraDzialka: DzialkaRobocza = plan.dzialki[wybranaIdx];
  const mieszanka = getMieszanka(wybraDzialka?.mieszankaId ?? '');

  const wpisyBiezacej = wpisyDlaDzialki(plan.id, wybraDzialka?.id ?? '');
  const dzialkaZakonczona = wybraDzialka ? czyDzialkaZakonczona(plan.id, wybraDzialka.id) : false;
  const sumaTonLive = wpisyBiezacej.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const sumaMetrLive = wpisyBiezacej.reduce((s, w) => s + w.przejechaneMetry, 0);
  const grubosc = wybraDzialka?.grubosc ?? 0;

  // Markery aut
  const markery: WpisLiveMarker[] = [];
  let cumM = 0;
  for (let i = 0; i < wpisyBiezacej.length; i++) {
    const wpis = wpisyBiezacej[i];
    cumM += wpis.przejechaneMetry;
    const ostatnieAuto = dzialkaZakonczona && i === wpisyBiezacej.length - 1;
    markery.push({ wpis, metryKumulatywne: cumM, ostatnieAuto });
  }

  // Obliczenia Kontrola
  let wynikiKontroli = null;
  const tonyK = parseFloat(wbudowaneTonyStr.replace(',', '.'));
  const metryK = parseFloat(przejechaneMetryStr.replace(',', '.'));
  if (wybraDzialka && mieszanka && !isNaN(tonyK) && !isNaN(metryK) && tonyK > 0 && metryK > 0) {
    wynikiKontroli = obliczKontrolę(tonyK, metryK, wybraDzialka, mieszanka.ciezarObjetosciowy, plan.tonazAuta);
  }

  // Obliczenia do tabeli Live (grubość + do końca m dla każdego wiersza)
  const obliczWierszLive = (wpis: WpisLive, idxW: number) => {
    if (!mieszanka || !wybraDzialka) return { grubosc: 0, doKoncaM: 0 };
    const metryDotad = wpisyBiezacej.slice(0, idxW + 1).reduce((s, w) => s + w.przejechaneMetry, 0);
    const tonDotad = wpisyBiezacej.slice(0, idxW + 1).reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const pow = obliczPowierzchnioweOdStartu(wybraDzialka, metryDotad);
    const gr = pow > 0 ? (wpis.tonazPrzywieziony / (mieszanka.ciezarObjetosciowy * obliczPowierzchnioweOdStartu(wybraDzialka, wpis.przejechaneMetry))) * 100 : 0;
    const lacznasDl = obliczLacznaDlugosc(wybraDzialka);
    const doK = Math.max(0, lacznasDl - metryDotad);
    return { grubosc: gr, doKoncaM: doK };
  };

  // Śr. grubość łączna
  const sredniaGruboscLaczna = () => {
    if (!mieszanka || !wybraDzialka || wpisyBiezacej.length === 0) return 0;
    const pow = obliczPowierzchnioweOdStartu(wybraDzialka, sumaMetrLive);
    if (pow <= 0) return 0;
    return (sumaTonLive / (mieszanka.ciezarObjetosciowy * pow)) * 100;
  };
  const srGr = sredniaGruboscLaczna();
  const wynikiDzialki = mieszanka ? obliczWynikiDzialki(wybraDzialka, mieszanka.ciezarObjetosciowy, plan.tonazAuta) : null;
  const pozostaloPowLive = wynikiDzialki ? Math.max(0, wynikiDzialki.lacznaPowierzchnia - obliczPowierzchnioweOdStartu(wybraDzialka, sumaMetrLive)) : 0;
  const pozostaloMasyWgPlan = mieszanka ? Math.round(pozostaloPowLive * (grubosc / 100) * mieszanka.ciezarObjetosciowy * 1000) / 1000 : 0;
  const pozostaloMasyWgSr = mieszanka ? Math.round(pozostaloPowLive * (srGr / 100) * mieszanka.ciezarObjetosciowy * 1000) / 1000 : 0;

  const zakonczDzialkeLive = () => {
    if (wpisyBiezacej.length === 0) {
      Alert.alert('Brak aut', 'Dodaj co najmniej jedno auto, zanim zakończysz działkę.');
      return;
    }
    Alert.alert(
      'Zakończ działkę roboczą',
      `Auto #${wpisyBiezacej.length} zostanie oznaczone jako ostatnie. Działka „${wybraDzialka.nazwa}" będzie ukończona.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zakończ działkę',
          onPress: async () => { await zakonczDzialke(plan.id, wybraDzialka.id); },
        },
      ],
    );
  };

  const zakonczPlan = () => Alert.alert('Zakończ i archiwizuj', 'Czy na pewno chcesz zakończyć cały plan?', [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Zakończ', style: 'destructive', onPress: async () => { await archiwizujPlan(plan.id); router.replace('/archiwum' as any); } },
  ]);

  const dodajWpisLive = async () => {
    const ton = parseFloat(nowyTonaz.replace(',', '.'));
    const met = parseFloat(nowyMetry.replace(',', '.'));
    if (isNaN(ton) || ton <= 0) { Alert.alert('Błąd', 'Podaj prawidłowy tonaż.'); return; }
    if (isNaN(met) || met <= 0) { Alert.alert('Błąd', 'Podaj prawidłowe metry.'); return; }
    await dodajWpisAuta({ planId: plan.id, dzialkaId: wybraDzialka.id, numerAuta: wpisyBiezacej.length + 1, tonazPrzywieziony: ton, przejechaneMetry: met, komentarz: nowyKomentarz.trim() || undefined, godzinaWybudowania: nowyGodzina });
    setNowyTonaz(''); setNowyMetry(''); setNowyKomentarz(''); setNowyGodzina(aktualnaGodzina());
  };

  // Selektor działki
  const SelectorDzialek = () => plan.dzialki.length > 1 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.selectorScroll, { backgroundColor: theme.colors.card }]}>
      {plan.dzialki.map((dz, idx) => (
        <TouchableOpacity key={dz.id} style={[styles.selectorBtn, { borderColor: wybranaIdx === idx ? theme.colors.primary : theme.colors.border, backgroundColor: wybranaIdx === idx ? `${theme.colors.primary}15` : theme.colors.inputBackground }]} onPress={() => setWybranaIdx(idx)}>
          <Text style={{ color: wybranaIdx === idx ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{dz.nazwa}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={formatujDatePl(plan.dataWbudowywania).split(',')[0]}
        podtytul={wybraDzialka?.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Zakończ plan', onPress: zakonczPlan, kolor: '#fff', tlo: theme.colors.danger }}
      />

      <AnimatedTabBar
        tabs={[{ id: 'plan', etykieta: 'Plan' }, { id: 'kontrola', etykieta: 'Kontrola' }, { id: 'live', etykieta: '● Live' }]}
        aktywnaId={aktywnaZakladka}
        onChange={(id) => setZakladka(id as ZakladkaTyp)}
        akcentKolor={aktywnaZakladka === 'live' ? theme.colors.success : theme.colors.primary}
      />

      {aktywnaZakladka !== 'plan' && <SelectorDzialek />}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ======== PLAN ======== */}
          {aktywnaZakladka === 'plan' && plan.dzialki.map((dz, dzIdx) => {
            const mie = getMieszanka(dz.mieszankaId);
            if (!mie) return null;
            const wyniki = obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta);
            const wBiez = wpisyDlaDzialki(plan.id, dz.id);
            const cumMDz: WpisLiveMarker[] = [];
            let c = 0;
            for (const w of wBiez) { c += w.przejechaneMetry; cumMDz.push({ wpis: w, metryKumulatywne: c }); }
            return (
              <View key={dz.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.primary }]}>{dz.nazwa}</Text>
                <IR label="Mieszanka" v={`${mie.rodzaj}  ρ=${mie.ciezarObjetosciowy.toFixed(3)}`} theme={theme} />
                <IR label="Grubość" v={`${dz.grubosc} cm`} theme={theme} />
                <IR label="Masa" v={`${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg`} theme={theme} bold />
                <IR label="Metrów" v={`${formatLiczby(obliczLacznaDlugosc(dz))} m`} theme={theme} />
                <View style={{ marginTop: 12 }}>
                  <DzialkaSketch
                    dzialka={dz}
                    ciezarObjetosciowy={mie.ciezarObjetosciowy}
                    wykonaneMetry={wBiez.reduce((s, w) => s + w.przejechaneMetry, 0)}
                    markery={cumMDz}
                    onTruckPress={(wpis, idxW) => { setAutaModal({ wpis, idxWpisu: idxW }); setAutaModalZakladka('szczegoły'); }}
                  />
                </View>
              </View>
            );
          })}

          {/* ======== KONTROLA ======== */}
          {aktywnaZakladka === 'kontrola' && wybraDzialka && mieszanka && (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Szybka kontrola</Text>
              <Text style={[styles.opisMaly, { color: theme.colors.textSecondary }]}>Wpisz faktyczne dane z budowy, aby porównać z planem.</Text>
              <NumInput label="Wbudowane tony [Mg]" value={wbudowaneTonyStr} onChange={setWbudowaneTony} theme={theme} />
              <NumInput label="Przejechane metry [m]" value={przejechaneMetryStr} onChange={setPrzejechaneMetry} theme={theme} />
              {wynikiKontroli ? (
                <View style={styles.wynikKontroli}>
                  <Text style={[styles.wynikNagl, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>Wyniki porównania:</Text>
                  <WynikRow label="Zakryta powierzchnia" wartosc={`${formatLiczby(wynikiKontroli.zakrytaPowierzchnia)} m²`} theme={theme} />
                  <WynikRowGrubosc uzyskana={wynikiKontroli.uzyskanaGrubosc} planowana={grubosc} theme={theme} />
                  <WynikRowBilans bilans={wynikiKontroli.bilansMasy} theme={theme} />
                  <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                  <WynikRow label="Do końca metrów" wartosc={`${formatLiczby(wynikiKontroli.pozostaloMetrow)} m`} theme={theme} />
                  <WynikRow label="Do wbudowania pow." wartosc={`${formatLiczby(wynikiKontroli.pozostaloPowierzchni)} m²`} theme={theme} />
                  <WynikRow label={`Wg planu (${grubosc} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgZalozen, 2)} Mg`} theme={theme} />
                  <WynikRow label={`Wg śr. (${formatLiczby(wynikiKontroli.uzyskanaGrubosc, 2)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgSredniej, 2)} Mg`} theme={theme} />
                </View>
              ) : (
                <View style={[styles.wynikPuste, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Wpisz tony i metry, aby zobaczyć porównanie.</Text>
                </View>
              )}
            </View>
          )}

          {/* ======== LIVE ======== */}
          {aktywnaZakladka === 'live' && wybraDzialka && (
            <>
              {/* Szkic + podsumowanie obok */}
              {mieszanka && (
                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>{wybraDzialka.nazwa}</Text>
                  <View style={styles.szkicRow}>
                    <View style={{ flex: 1 }}>
                      <DzialkaSketch
                        dzialka={wybraDzialka}
                        ciezarObjetosciowy={mieszanka.ciezarObjetosciowy}
                        wykonaneMetry={sumaMetrLive}
                        markery={markery}
                        onTruckPress={(wpis, idxW) => { setAutaModal({ wpis, idxWpisu: idxW }); setAutaModalZakladka('szczegoły'); }}
                      />
                    </View>
                    {/* Panel prawej strony */}
                    <View style={[styles.szkicPanel, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <PanelStat label="Aut" wartosc={String(wpisyBiezacej.length)} theme={theme} kolor={theme.colors.primary} />
                      <PanelStat label="Mg" wartosc={formatLiczby(sumaTonLive, 2)} theme={theme} kolor={theme.colors.text} />
                      <PanelStat label="m" wartosc={formatLiczby(sumaMetrLive)} theme={theme} kolor={theme.colors.text} />
                      {srGr > 0 && <PanelStat label="Śr.gr." wartosc={`${formatLiczby(srGr, 2)} cm`} theme={theme} kolor={Math.abs(srGr - grubosc) > 0.3 ? theme.colors.danger : theme.colors.success} />}
                    </View>
                  </View>
                </View>
              )}

              {/* Tabela aut z poziomym przewijaniem */}
              {wpisyBiezacej.length > 0 && (
                <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Tabela aut</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      {/* Nagłówek */}
                      <View style={[styles.tabelaNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
                        {KOLUMNY.map((k) => (
                          <Text key={k.id} style={[styles.tabelaNaglTekst, { width: k.width, color: theme.colors.textSecondary }]}>{k.label}</Text>
                        ))}
                        <Text style={[styles.tabelaNaglTekst, { width: 32, color: theme.colors.textSecondary }]} />
                      </View>
                      {wpisyBiezacej.map((wpis, idxW) => {
                        const { grubosc: grW, doKoncaM } = obliczWierszLive(wpis, idxW);
                        const przepal = grW > grubosc + 0.2;
                        const niedomiar = grW < grubosc - 0.2;
                        return (
                          <View key={wpis.id}>
                            <View style={[styles.tabelaRzad, { borderBottomColor: theme.colors.border }]}>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[0].width, color: theme.colors.textSecondary }]}>{wpis.numerAuta}</Text>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[1].width, color: theme.colors.text }]}>{formatLiczby(wpis.tonazPrzywieziony)}</Text>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[2].width, color: theme.colors.text }]}>{formatLiczby(wpis.przejechaneMetry)}</Text>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[3].width, color: przepal ? theme.colors.danger : niedomiar ? theme.colors.warning : theme.colors.success }]}>
                                {grW > 0 ? `${formatLiczby(grW)} ${przepal ? '▲' : niedomiar ? '▼' : ''}` : '–'}
                              </Text>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[4].width, color: theme.colors.text }]}>{formatLiczby(doKoncaM)}</Text>
                              <Text style={[styles.tabelaKom, { width: KOLUMNY[5].width, color: theme.colors.text }]}>{wpis.godzinaWybudowania}</Text>
                              <TouchableOpacity onPress={() => Alert.alert('Usuń', `Auto #${wpis.numerAuta}?`, [
                                { text: 'Anuluj', style: 'cancel' },
                                { text: 'Usuń', style: 'destructive', onPress: () => usunWpisAuta(wpis.id) },
                              ])} style={{ width: 32, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.danger, fontSize: 16 }}>✕</Text>
                              </TouchableOpacity>
                            </View>
                            {wpis.komentarz ? (
                              <Text style={[styles.komentarzTekst, { color: theme.colors.textSecondary, borderBottomColor: theme.colors.border }]}>💬 {wpis.komentarz}</Text>
                            ) : null}
                          </View>
                        );
                      })}
                      {/* Suma + statystyki */}
                      <View style={[styles.tabelaSuma, { backgroundColor: `${theme.colors.primary}10` }]}>
                        <Text style={[styles.tabelaKom, { width: KOLUMNY[0].width, color: theme.colors.textSecondary, fontWeight: '700' }]}>∑</Text>
                        <Text style={[styles.tabelaKom, { width: KOLUMNY[1].width, color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(sumaTonLive, 2)}</Text>
                        <Text style={[styles.tabelaKom, { width: KOLUMNY[2].width, color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(sumaMetrLive)}</Text>
                        <Text style={[styles.tabelaKom, { width: KOLUMNY[3].width, color: theme.colors.primary, fontWeight: '700' }]}>{srGr > 0 ? `${formatLiczby(srGr, 2)} cm` : '–'}</Text>
                        <Text style={[styles.tabelaKom, { width: KOLUMNY[4].width + KOLUMNY[5].width + 32, color: theme.colors.textSecondary }]} />
                      </View>
                    </View>
                  </ScrollView>
                  {/* Podsumowanie pod tabelą */}
                  {wynikiDzialki && wpisyBiezacej.length > 0 && (
                    <View style={[styles.livePodsumWrap, { backgroundColor: `${theme.colors.info}10`, borderColor: theme.colors.info }]}>
                      <Text style={[styles.livePodsumTytul, { color: theme.colors.info }]}>Podsumowanie Live</Text>
                      <IR label="Śr. grubość łączna" v={srGr > 0 ? `${formatLiczby(srGr, 2)} cm` : '–'} theme={theme} bold />
                      <IR label="Pozostało pow." v={`${formatLiczby(pozostaloPowLive)} m²`} theme={theme} />
                      <IR label={`Do wbudowania wg planu (${grubosc} cm)`} v={`${formatLiczby(pozostaloMasyWgPlan, 2)} Mg`} theme={theme} />
                      <IR label="Do wbudowania wg śr. grubości" v={`${formatLiczby(pozostaloMasyWgSr, 2)} Mg`} theme={theme} bold />
                    </View>
                  )}
                </View>
              )}

              {/* Formularz nowego auta */}
              {dzialkaZakonczona ? (
                <View style={[styles.karta, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
                  <Text style={[styles.kartaTytul, { color: theme.colors.success }]}>✓ Działka zakończona</Text>
                  <Text style={[styles.opisMaly, { color: theme.colors.textSecondary }]}>
                    Ostatnie auto: #{wpisyBiezacej.length}. Możesz przejść do kolejnej działki lub zakończyć cały plan.
                  </Text>
                  <TouchableOpacity
                    style={[styles.btnCofnijZakonczenie, { borderColor: theme.colors.border }]}
                    onPress={() => cofnijZakonczenieDzialki(plan.id, wybraDzialka.id)}
                  >
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cofnij zakończenie</Text>
                  </TouchableOpacity>
                </View>
              ) : (
              <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Auto #{wpisyBiezacej.length + 1}</Text>
                <NumInput label="Tonaż [Mg]" value={nowyTonaz} onChange={setNowyTonaz} theme={theme} placeholder={String(plan.tonazAuta)} />
                <NumInput label="Przejechane metry [m]" value={nowyMetry} onChange={setNowyMetry} theme={theme} />
                <View style={styles.godzinWrap}>
                  <Text style={[styles.godzLabel, { color: theme.colors.textSecondary }]}>Godz. wybudowania</Text>
                  <TextInput style={[styles.godzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyGodzina} onChangeText={setNowyGodzina} maxLength={5} placeholder="HH:MM" placeholderTextColor={theme.colors.textSecondary} keyboardType="numbers-and-punctuation" />
                </View>
                <TextInput style={[styles.komentarzInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]} value={nowyKomentarz} onChangeText={setNowyKomentarz} placeholder="Komentarz / uwagi (opcjonalnie)" placeholderTextColor={theme.colors.textSecondary} multiline />
                <TouchableOpacity style={[styles.btnDodajAuto, { backgroundColor: theme.colors.success }]} onPress={dodajWpisLive}>
                  <Text style={styles.btnDodajAutoTekst}>+ Dodaj auto #{wpisyBiezacej.length + 1}</Text>
                </TouchableOpacity>
                {wpisyBiezacej.length > 0 && (
                  <TouchableOpacity style={[styles.btnZakonczDzialke, { backgroundColor: theme.colors.primary }]} onPress={zakonczDzialkeLive}>
                    <Text style={styles.btnZakonczDzialkeTekst}>✓ Zakończ działkę (auto #{wpisyBiezacej.length} = ostatnie)</Text>
                  </TouchableOpacity>
                )}
              </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ======= MODAL AUTA – 2 zakładki ======= */}
      {autaModal && mieszanka && wybraDzialka && (() => {
        const { wpis, idxWpisu } = autaModal;
        // Dane od początku do tego auta
        const wpisyDo = wpisyBiezacej.slice(0, idxWpisu + 1);
        const metryDo = wpisyDo.reduce((s, w) => s + w.przejechaneMetry, 0);
        const tonDo = wpisyDo.reduce((s, w) => s + w.tonazPrzywieziony, 0);
        const powDo = obliczPowierzchnioweOdStartu(wybraDzialka, metryDo);
        const grDo = powDo > 0 ? (tonDo / (mieszanka.ciezarObjetosciowy * powDo)) * 100 : 0;
        const bilansDo = tonDo - powDo * (grubosc / 100) * mieszanka.ciezarObjetosciowy;

        // Dane tylko tego auta
        const powAuta = obliczPowierzchnioweOdStartu(wybraDzialka, wpis.przejechaneMetry);
        const grAuta = powAuta > 0 ? (wpis.tonazPrzywieziony / (mieszanka.ciezarObjetosciowy * powAuta)) * 100 : 0;
        const bilansAuta = wpis.tonazPrzywieziony - powAuta * (grubosc / 100) * mieszanka.ciezarObjetosciowy;

        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => setAutaModal(null)}>
            <Pressable style={[styles.modalTlo, { paddingBottom: insets.bottom }]} onPress={() => setAutaModal(null)}>
              <Pressable style={[styles.modalKarta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTytul, { color: theme.colors.text }]}>Auto #{wpis.numerAuta}</Text>
                <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>Godz. {wpis.godzinaWybudowania}</Text>

                {/* Mini zakładki */}
                <View style={[styles.miniTabs, { borderColor: theme.colors.border }]}>
                  {(['szczegoły', 'odcinek'] as const).map((z) => (
                    <TouchableOpacity key={z} style={[styles.miniTab, autaModalZakladka === z && { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary }]} onPress={() => setAutaModalZakladka(z)}>
                      <Text style={[styles.miniTabTekst, { color: autaModalZakladka === z ? theme.colors.primary : theme.colors.textSecondary }]}>
                        {z === 'szczegoły' ? 'Szczegóły auta' : `Odcinek 1→${wpis.numerAuta}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {autaModalZakladka === 'szczegoły' && (
                  <>
                    <ModalRow label="Tonaż przywieziony" v={`${formatLiczby(wpis.tonazPrzywieziony)} Mg`} theme={theme} />
                    <ModalRow label="Przejechane metry" v={`${formatLiczby(wpis.przejechaneMetry)} m`} theme={theme} />
                    <ModalRow label="Zakryta powierzchnia" v={`${formatLiczby(powAuta)} m²`} theme={theme} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Uzyskana grubość</Text>
                      <Text style={{ color: Math.abs(grAuta - grubosc) > 0.3 ? theme.colors.danger : theme.colors.success, fontSize: 14, fontWeight: '700' }}>
                        {formatLiczby(grAuta)} cm {grAuta > grubosc ? '▲' : grAuta < grubosc ? '▼' : ''}
                      </Text>
                    </View>
                    <View style={[styles.bilansBoks, { backgroundColor: bilansAuta > 0 ? `${theme.colors.danger}20` : `${theme.colors.success}20` }]}>
                      <Text style={{ color: bilansAuta > 0 ? theme.colors.danger : theme.colors.success, fontWeight: '700', fontSize: 14 }}>
                        Bilans: {bilansAuta > 0 ? '+' : ''}{formatLiczby(bilansAuta, 2)} Mg {bilansAuta > 0 ? '(przepał)' : '(oszczędność)'}
                      </Text>
                    </View>
                    {wpis.komentarz && <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginTop: 8 }]}>💬 {wpis.komentarz}</Text>}
                  </>
                )}

                {autaModalZakladka === 'odcinek' && (
                  <>
                    <Text style={[styles.opisMaly, { color: theme.colors.textSecondary, marginBottom: 8 }]}>Podsumowanie od auta #1 do #{wpis.numerAuta}</Text>
                    <ModalRow label="Łączny tonaż" v={`${formatLiczby(tonDo, 2)} Mg`} theme={theme} />
                    <ModalRow label="Łącznie metrów" v={`${formatLiczby(metryDo)} m`} theme={theme} />
                    <ModalRow label="Zakryta powierzchnia" v={`${formatLiczby(powDo)} m²`} theme={theme} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Śr. grubość (1→{wpis.numerAuta})</Text>
                      <Text style={{ color: Math.abs(grDo - grubosc) > 0.3 ? theme.colors.danger : theme.colors.success, fontSize: 14, fontWeight: '700' }}>
                        {formatLiczby(grDo)} cm {grDo > grubosc ? '▲' : grDo < grubosc ? '▼' : ''}
                      </Text>
                    </View>
                    <View style={[styles.bilansBoks, { backgroundColor: bilansDo > 0 ? `${theme.colors.danger}20` : `${theme.colors.success}20` }]}>
                      <Text style={{ color: bilansDo > 0 ? theme.colors.danger : theme.colors.success, fontWeight: '700', fontSize: 14 }}>
                        Bilans łączny: {bilansDo > 0 ? '+' : ''}{formatLiczby(bilansDo, 2)} Mg {bilansDo > 0 ? '(przepał)' : '(oszczędność)'}
                      </Text>
                    </View>
                  </>
                )}

                <TouchableOpacity style={[styles.btnModalZamknij, { backgroundColor: theme.colors.primary }]} onPress={() => setAutaModal(null)}>
                  <Text style={styles.btnModalZamknijTekst}>Zamknij</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </View>
  );
}

// ---- Komponenty pomocnicze ----

function PanelStat({ label, wartosc, theme, kolor }: { label: string; wartosc: string; theme: AppTheme; kolor: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)' }}>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>{wartosc}</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function IR({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: bold ? '700' : '400', marginLeft: 8 }}>{v}</Text>
    </View>
  );
}

function ModalRow({ label, v, theme }: { label: string; v: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{v}</Text>
    </View>
  );
}

function NumInput({ label, value, onChange, theme, placeholder }: { label: string; value: string; onChange: (v: string) => void; theme: AppTheme; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput value={value} onChangeText={(t) => onChange(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={theme.colors.textSecondary} style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }} />
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
  const kolor = Math.abs(roznica) <= 0.05 ? theme.colors.success : theme.colors.danger;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Uzyskana grubość</Text>
      <Text style={{ color: kolor, fontSize: 13, fontWeight: '700' }}>{formatLiczby(uzyskana)} cm {roznica > 0.05 ? '▲' : roznica < -0.05 ? '▼' : ''}</Text>
    </View>
  );
}

function WynikRowBilans({ bilans, theme }: { bilans: number; theme: AppTheme }) {
  const czyOszczednosc = bilans < 0;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: czyOszczednosc ? `${theme.colors.success}20` : `${theme.colors.danger}20`, marginVertical: 4 }}>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '600' }}>Bilans {czyOszczednosc ? '(oszczędność)' : '(przepał)'}</Text>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '700' }}>{bilans > 0 ? '+' : ''}{formatLiczby(bilans, 2)} Mg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectorScroll: { paddingHorizontal: 14, paddingVertical: 8, maxHeight: 50 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  kartaTytul: { fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  opisMaly: { fontSize: 13, lineHeight: 18 },
  sep: { height: 1, marginVertical: 10 },
  wynikKontroli: { marginTop: 14 },
  wynikNagl: { fontSize: 14, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8 },
  wynikPuste: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  szkicRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  szkicPanel: { width: 72, borderRadius: 10, borderWidth: 1, padding: 6, gap: 2 },
  tabelaNagl: { flexDirection: 'row', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4 },
  tabelaNaglTekst: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabelaRzad: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, alignItems: 'center' },
  tabelaKom: { fontSize: 12, textAlign: 'center' },
  komentarzTekst: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 1, fontStyle: 'italic' },
  tabelaSuma: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, marginTop: 4, alignItems: 'center' },
  livePodsumWrap: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, gap: 2 },
  livePodsumTytul: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  godzinWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  godzLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  godzInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlign: 'center' },
  komentarzInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 48, marginBottom: 12 },
  btnDodajAuto: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnDodajAutoTekst: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnZakonczDzialke: { marginTop: 10, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnZakonczDzialkeTekst: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  btnCofnijZakonczenie: { marginTop: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modalTlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKarta: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  modalTytul: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  miniTabs: { flexDirection: 'row', gap: 8, marginBottom: 12, borderWidth: 0 },
  miniTab: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  miniTabTekst: { fontSize: 13, fontWeight: '600' },
  bilansBoks: { borderRadius: 10, padding: 12, marginTop: 8, alignItems: 'center' },
  btnModalZamknij: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnModalZamknijTekst: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
