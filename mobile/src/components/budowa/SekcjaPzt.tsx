import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform,
} from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import { PztArkuszPodglad } from './PztArkuszPodglad';
import { PrzyciskImportuXfdf } from './PrzyciskImportuXfdf';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';
import { parsujWebFileList, wybierzIParsujWieleXfdf } from '../../utils/xfdfImport';
import {
  dodajArkuszeDoProjektu,
  formatujKmM,
  przeliczProjektPoZmianieKm,
  usunArkusz,
  zastosujKilometrazArkuszy,
} from '../../utils/projektBudowy';
import { karta } from '../../constants/layout';
import { Z_METROW_BIEZACYCH } from '../../constants';
import type { WynikParsowaniaXfdf } from '../../utils/xfdfParser';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
}

function pokazKomunikat(tytul: string, tresc: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${tytul}\n\n${tresc}`);
    return;
  }
  Alert.alert(tytul, tresc);
}

export function SekcjaPzt({ projekt, theme, onZmien }: Props) {
  const [arkuszId, setArkuszId] = useState(projekt.arkusze[0]?.id);
  const [busy, setBusy] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const startInit = polaZKilometraza(
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).km,
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).m,
  );
  const [kmStr, setKmStr] = useState(startInit.km);
  const [mStr, setMStr] = useState(startInit.m);
  const aktywny = projekt.arkusze.find((a) => a.id === arkuszId) ?? projekt.arkusze[0];

  const zastosujWynik = (
    r: { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] } | { sukces: false; blad: string },
  ) => {
    if (!r.sukces) {
      if (!r.blad.includes('Anulowano')) {
        setBlad(r.blad);
        pokazKomunikat('Import XFDF', r.blad);
      }
      return;
    }
    setBlad(null);
    const next = dodajArkuszeDoProjektu(projekt, r.wyniki);
    onZmien(next);
    const nowy = next.arkusze[next.arkusze.length - 1];
    if (nowy) setArkuszId(nowy.id);
    if (r.pominiete.length > 0) {
      const msg = r.pominiete.slice(0, 6).join('\n');
      setBlad(msg);
      pokazKomunikat('Część plików pominięto', msg);
    }
  };

  const importujNative = async () => {
    setBusy(true);
    setBlad(null);
    try {
      zastosujWynik(await wybierzIParsujWieleXfdf());
    } finally {
      setBusy(false);
    }
  };

  const importujWeb = async (lista: ArrayLike<{ name: string; text: () => Promise<string> }>) => {
    setBusy(true);
    setBlad(null);
    try {
      zastosujWynik(await parsujWebFileList(lista));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się wczytać plików XFDF.';
      setBlad(msg);
      pokazKomunikat('Import XFDF', msg);
    } finally {
      setBusy(false);
    }
  };

  const ustawStart = (kmN: string, mN: string) => {
    setKmStr(kmN);
    setMStr(mN);
    const { km, m } = parsujPolaKilometraza(kmN, mN);
    const next = km * 1000 + m;
    if (next === projekt.kilometrazPoczatkowyM) return;
    onZmien(przeliczProjektPoZmianieKm({
      ...projekt,
      kilometrazPoczatkowyM: next,
    }));
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
        Wgraj arkusze XFDF (albo TXT/XML z polygonami). Podaj kilometraż początku trasy — kolejne arkusze zaznacz jako kontynuację, aby uciąglić pikietaż.
      </Text>

      <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Kilometraż początkowy</Text>
        <View style={styles.kmRzad}>
          <PoleKilometraz
            theme={theme}
            compact
            km={kmStr}
            m={mStr}
            onKm={(v) => ustawStart(v, mStr)}
            onM={(v) => ustawStart(kmStr, v)}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
            {formatujKmM(projekt.kilometrazPoczatkowyM)}
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Skala PZT 1:{projekt.skala.mianownik} ({projekt.skala.metryNaCm} m / cm)
        </Text>
      </View>

      <PrzyciskImportuXfdf
        etykieta={busy ? 'Wczytywanie…' : '+ Dodaj arkusze XFDF'}
        kolorTla={theme.colors.primary}
        disabled={busy}
        onPressNative={importujNative}
        onWebFiles={(files) => { void importujWeb(files); }}
      />
      {blad ? (
        <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{blad}</Text>
      ) : (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Wybierz jeden lub wiele plików .xfdf / .xml / .txt z zaznaczeniami z PDF-XChange.
        </Text>
      )}

      {projekt.arkusze.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          Brak arkuszy. Dodaj pliki XFDF z zaznaczonymi obszarami i krawężnikami.
        </Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {projekt.arkusze.map((a, i) => {
              const sel = a.id === aktywny?.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: sel ? `${theme.colors.primary}22` : theme.colors.card,
                      borderColor: sel ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setArkuszId(a.id)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                    {i + 1}. {a.nazwa.replace(/^DK25M_kowarsko_/i, 'Ark. ')}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                    {formatujKmM(a.kilometrazPoczatkowyM)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {aktywny ? (
            <>
              <PztArkuszPodglad arkusz={aktywny} theme={theme} />
              <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 10 }]}>
                <View style={styles.rzad}>
                  <Text style={{ color: theme.colors.text, flex: 1, fontWeight: '600' }}>Kontynuacja poprzedniego arkusza</Text>
                  <Switch
                    value={aktywny.kontynuacjaPoprzedniego}
                    onValueChange={(v) => {
                      const arkusze = zastosujKilometrazArkuszy(
                        projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kontynuacjaPoprzedniego: v } : a),
                        projekt.kilometrazPoczatkowyM,
                      );
                      onZmien({ ...projekt, arkusze });
                    }}
                    disabled={aktywny.kolejnosc === 1}
                  />
                </View>
                {!aktywny.kontynuacjaPoprzedniego && aktywny.kolejnosc > 1 ? (
                  <View>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Własny kilometraż startu</Text>
                    <PoleKilometraz
                      theme={theme}
                      compact
                      km={String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).km)}
                      m={String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).m).padStart(3, '0')}
                      onKm={(kmN) => {
                        const { km, m } = parsujPolaKilometraza(kmN, String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).m));
                        const arkusze = zastosujKilometrazArkuszy(
                          projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kilometrazPoczatkowyM: km * 1000 + m } : a),
                          projekt.kilometrazPoczatkowyM,
                        );
                        onZmien({ ...projekt, arkusze });
                      }}
                      onM={(mN) => {
                        const { km, m } = parsujPolaKilometraza(String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).km), mN);
                        const arkusze = zastosujKilometrazArkuszy(
                          projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kilometrazPoczatkowyM: km * 1000 + m } : a),
                          projekt.kilometrazPoczatkowyM,
                        );
                        onZmien({ ...projekt, arkusze });
                      }}
                    />
                  </View>
                ) : null}
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  Plik: {aktywny.zrodloNazwa}
                  {aktywny.zrodloPdfHref ? `\nPDF: ${aktywny.zrodloPdfHref}` : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Usuń arkusz', `Usunąć „${aktywny.nazwa}”?`, [
                      { text: 'Anuluj', style: 'cancel' },
                      {
                        text: 'Usuń',
                        style: 'destructive',
                        onPress: () => {
                          const next = usunArkusz(projekt, aktywny.id);
                          onZmien(next);
                          setArkuszId(next.arkusze[0]?.id);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń arkusz</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  opis: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700' },
  tab: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 120 },
  rzad: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kmRzad: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
});
