import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch,
} from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import { PztArkuszPodglad } from './PztArkuszPodglad';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';
import { wybierzIParsujWieleXfdf } from '../../utils/xfdfImport';
import {
  dodajArkuszeDoProjektu,
  formatujKmM,
  przeliczProjektPoZmianieKm,
  usunArkusz,
  zastosujKilometrazArkuszy,
} from '../../utils/projektBudowy';
import { karta } from '../../constants/layout';
import { Z_METROW_BIEZACYCH } from '../../constants';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
}

export function SekcjaPzt({ projekt, theme, onZmien }: Props) {
  const [arkuszId, setArkuszId] = useState(projekt.arkusze[0]?.id);
  const aktywny = projekt.arkusze.find((a) => a.id === arkuszId) ?? projekt.arkusze[0];
  const startPola = polaZKilometraza(
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).km,
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).m,
  );

  const importuj = async () => {
    const r = await wybierzIParsujWieleXfdf();
    if (!r.sukces) {
      if (!r.blad.includes('Anulowano')) Alert.alert('Import XFDF', r.blad);
      return;
    }
    const next = dodajArkuszeDoProjektu(projekt, r.wyniki);
    onZmien(next);
    const nowy = next.arkusze[next.arkusze.length - 1];
    if (nowy) setArkuszId(nowy.id);
    if (r.pominiete.length > 0) {
      Alert.alert('Część plików pominięto', r.pominiete.slice(0, 4).join('\n'));
    }
  };

  const ustawStart = (kmStr: string, mStr: string) => {
    const { km, m } = parsujPolaKilometraza(kmStr, mStr);
    onZmien(przeliczProjektPoZmianieKm({
      ...projekt,
      kilometrazPoczatkowyM: km * 1000 + m,
    }));
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
        Wgraj arkusze XFDF (cały PZT). Podaj kilometraż początku trasy — kolejne arkusze zaznacz jako kontynuację, aby uciąglić pikietaż.
      </Text>

      <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Kilometraż początkowy trasy</Text>
        <PoleKilometraz
          theme={theme}
          km={startPola.km}
          m={startPola.m}
          onKm={(v) => ustawStart(v, startPola.m)}
          onM={(v) => ustawStart(startPola.km, v)}
        />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Skala PZT 1:{projekt.skala.mianownik} ({projekt.skala.metryNaCm} m / cm)
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.colors.primary }]}
        onPress={importuj}
      >
        <Text style={styles.btnTekst}>+ Dodaj arkusze XFDF</Text>
      </TouchableOpacity>

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
                      onKm={(kmStr) => {
                        const { km, m } = parsujPolaKilometraza(kmStr, String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).m));
                        const arkusze = zastosujKilometrazArkuszy(
                          projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kilometrazPoczatkowyM: km * 1000 + m } : a),
                          projekt.kilometrazPoczatkowyM,
                        );
                        onZmien({ ...projekt, arkusze });
                      }}
                      onM={(mStr) => {
                        const { km, m } = parsujPolaKilometraza(String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).km), mStr);
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
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '800', fontSize: 15 },
  tab: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 120 },
  rzad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
