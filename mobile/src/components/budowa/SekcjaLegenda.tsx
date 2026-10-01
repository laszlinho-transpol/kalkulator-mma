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
  const osie = projekt.legenda.filter((w) => w.typ === 'os');

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
        <View
          style={[
            styles.probka,
            {
              backgroundColor: w.typ === 'os' ? 'transparent' : w.kolor,
              borderColor: w.kolor || theme.colors.border,
              borderStyle: w.typ === 'os' ? 'dashed' : 'solid',
            },
          ]}
        />
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
        placeholder={
          w.typ === 'obszar' ? 'np. zjazd, droga boczna…'
            : w.typ === 'os' ? 'oś trasy'
              : 'np. krawężnik, opornik…'
        }
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
        Najpierw wgraj arkusze PZT — program zbierze kolory obszarów, linii i osi do legendy.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Każdy nowy kolor z XFDF wpada tu sam — tak samo jak do przedmiaru. Żółty / różowy to trasa główna L/P, czerwona linia — krawężnik, czarna przerywana — oś. Inne kolory (zjazdy, drogi boczne) nazwij ręcznie; konstrukcja i przedmiar dopiszą się po nazwie.
      </Text>
      {obszary.length > 0 && (
        <Text style={[styles.sek, { color: theme.colors.primary }]}>Obszary</Text>
      )}
      {obszary.map(wiersz('obszar'))}
      {linie.length > 0 && (
        <Text style={[styles.sek, { color: theme.colors.primary }]}>Linie</Text>
      )}
      {linie.map(wiersz('linia'))}
      {osie.length > 0 && (
        <Text style={[styles.sek, { color: theme.colors.primary }]}>Oś</Text>
      )}
      {osie.map(wiersz('oś'))}
    </View>
  );
}

const styles = StyleSheet.create({
  nag: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  probka: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  sek: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
});
