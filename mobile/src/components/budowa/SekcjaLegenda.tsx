import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import { karta } from '../../constants/layout';
import { uzupelnijKonstrukcjeDlaLegendy } from '../../utils/projektBudowy';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
}

export function SekcjaLegenda({ projekt, theme, onZmien }: Props) {
  const obszary = projekt.legenda.filter((w) => w.typ === 'obszar');
  const linie = projekt.legenda.filter((w) => w.typ === 'linia');

  const zmienNazwe = (id: string, nazwa: string) => {
    const legenda = projekt.legenda.map((w) => (w.id === id ? { ...w, nazwa } : w));
    onZmien({
      ...projekt,
      legenda,
      konstrukcje: uzupelnijKonstrukcjeDlaLegendy(projekt.konstrukcje, legenda),
    });
  };

  const wiersz = (typLabel: string) => (w: typeof projekt.legenda[0]) => (
    <View
      key={w.id}
      style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}
    >
      <View style={styles.nag}>
        <View style={[styles.probka, { backgroundColor: w.kolor, borderColor: theme.colors.border }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
            {typLabel} · {w.kolor}
          </Text>
          {w.sugerowanaNazwa ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
              podpowiedź: {w.sugerowanaNazwa}
            </Text>
          ) : null}
        </View>
      </View>
      <TextInput
        value={w.nazwa}
        onChangeText={(t) => zmienNazwe(w.id, t)}
        placeholder={w.typ === 'obszar' ? 'np. wjazd, droga powiatowa…' : 'np. krawężnik, opornik…'}
        placeholderTextColor={theme.colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: w.nazwa.trim() ? theme.colors.border : theme.colors.warning,
            color: theme.colors.text,
          },
        ]}
      />
    </View>
  );

  if (projekt.legenda.length === 0) {
    return (
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        Najpierw wgraj arkusze PZT — program zbierze kolory obszarów i linii do legendy.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Każdy kolor z PZT przypisz do nazwy. Żółty / różowy to trasa główna L/P, czerwona linia — krawężnik (bez odsadzek). Inne kolory: wjazdy, drogi boczne.
      </Text>
      {obszary.length > 0 && (
        <Text style={[styles.sek, { color: theme.colors.primary }]}>Obszary</Text>
      )}
      {obszary.map(wiersz('obszar'))}
      {linie.length > 0 && (
        <Text style={[styles.sek, { color: theme.colors.primary }]}>Linie</Text>
      )}
      {linie.map(wiersz('linia'))}
    </View>
  );
}

const styles = StyleSheet.create({
  nag: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  probka: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  sek: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
});
