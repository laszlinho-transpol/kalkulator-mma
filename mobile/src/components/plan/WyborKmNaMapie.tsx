import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '../../constants/theme';
import type { ArkuszPzt, ProjektBudowy, TloArkuszaPzt } from '../../types';
import { PztArkuszPodglad } from '../budowa/PztArkuszPodglad';
import { obszaryLegendy } from '../../utils/planZBudowy';
import { etykietaZakladkiArkusza, formatujKmM, kluczLegendy } from '../../utils/projektBudowy';
import { kilometrazZPunktuPdf } from '../../utils/osPzt';

interface Props {
  visible: boolean;
  rola: 'start' | 'koniec';
  projekt: ProjektBudowy;
  legendaId: string;
  kilometrazM: number;
  drugiKmM: number;
  theme: AppTheme;
  onWybierz: (metry: number) => void;
  onClose: () => void;
}

export function WyborKmNaMapie({
  visible, rola, projekt, legendaId, kilometrazM, drugiKmM, theme, onWybierz, onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [km, setKm] = useState(kilometrazM);
  const [tloPatch, setTloPatch] = useState<Record<string, Partial<TloArkuszaPzt>>>({});

  const arkusze = useMemo(() => {
    const widziane = new Set<string>();
    const out: ArkuszPzt[] = [];
    for (const { arkusz } of obszaryLegendy(projekt, legendaId)) {
      if (widziane.has(arkusz.id)) continue;
      widziane.add(arkusz.id);
      out.push(arkusz);
    }
    return out;
  }, [projekt, legendaId]);

  const wpis = projekt.legenda.find((w) => w.id === legendaId);

  useEffect(() => {
    if (!visible) return;
    setKm(kilometrazM);
    const i = arkusze.findIndex((a) =>
      kilometrazM >= a.kilometrazPoczatkowyM - 0.5 && kilometrazM <= a.kilometrazKoncowyM + 0.5);
    setIdx(i >= 0 ? i : 0);
  }, [visible, kilometrazM, arkusze]);

  const bazowy = arkusze[Math.min(idx, Math.max(0, arkusze.length - 1))];
  const arkusz = bazowy && wpis
    ? {
      ...bazowy,
      obszary: bazowy.obszary.filter((o) => kluczLegendy('obszar', o.kolorWypelnienia) === wpis.klucz),
      tlo: bazowy.tlo ? { ...bazowy.tlo, ...tloPatch[bazowy.id] } : bazowy.tlo,
    }
    : undefined;

  const tytul = rola === 'start' ? 'Start na mapie' : 'Koniec na mapie';
  const wysokosc = Math.max(280, height - insets.top - insets.bottom - 210);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styl.ekran, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={styl.naglowek}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Anuluj</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{tytul}</Text>
          <TouchableOpacity onPress={() => { onWybierz(Math.round(km)); onClose(); }} hitSlop={8}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Gotowe</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styl.km, { color: rola === 'start' ? '#16A34A' : '#DC2626' }]}>
          {formatujKmM(km)}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
          Widać tylko wybrany obszar. Przybliż tło i stuknij punkt, np. wpust za wjazdem.
        </Text>

        {arkusze.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 8 }}>
            {arkusze.map((a, i) => {
              const on = i === Math.min(idx, arkusze.length - 1);
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setIdx(i)}
                  style={[styl.tab, {
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                    backgroundColor: on ? `${theme.colors.primary}15` : theme.colors.inputBackground,
                  }]}
                >
                  <Text style={{ color: on ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                    {etykietaZakladkiArkusza(a.nazwa || a.zrodloNazwa)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {arkusz ? (
          <PztArkuszPodglad
            arkusz={arkusz}
            theme={theme}
            wysokosc={wysokosc}
            podzialkaM={projekt.podzialkaKilometrazuM ?? 50}
            zakresStartM={rola === 'start' ? km : drugiKmM}
            zakresKoniecM={rola === 'koniec' ? km : drugiKmM}
            onWskazPdf={(p) => {
              const odczyt = kilometrazZPunktuPdf(arkusz, p);
              if (odczyt == null) return;
              setKm(Math.round(odczyt));
            }}
            onTloZmiana={(patch) => setTloPatch((prev) => ({ ...prev, [arkusz.id]: { ...prev[arkusz.id], ...patch } }))}
          />
        ) : (
          <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>
            Wybrany obszar nie leży na żadnym arkuszu.
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styl = StyleSheet.create({
  ekran: { flex: 1, paddingHorizontal: 12 },
  naglowek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  km: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  tab: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
});
