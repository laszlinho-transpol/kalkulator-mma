// ============================================================
// TABELA LIVE – układ kolumn jak tabela planu (dane z rozpiski LIVE)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatLiczby } from '../../utils/calculations';
import { formatujPikietaz } from '../../utils/chainage';
import { obliczPikietazFigur } from '../../utils/chainage';
import type { DzialkaRobocza, WpisLive } from '../../types';
import type { AppTheme } from '../../constants/theme';

interface TabelaLiveProps {
  dzialka: DzialkaRobocza;
  wpisy: WpisLive[];
  theme: AppTheme;
}

export function TabelaLive({ dzialka, wpisy, theme }: TabelaLiveProps) {
  const posortowane = [...wpisy].sort((a, b) => a.numerAuta - b.numerAuta);
  const pikietaze = obliczPikietazFigur(dzialka);
  const kmStart = pikietaze.length > 0 ? pikietaze[0].poczatek : dzialka.kilometrazPoczatkowyKm * 1000 + dzialka.kilometrazPoczatkowyM;

  const kolumny = ['L.p.', 'Mg', '∑ Mg', 'm', '∑ m', 'km'];

  let cumTon = 0;
  let cumMetr = 0;

  return (
    <View>
      <View style={[styles.rzad, styles.rzadNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
        {kolumny.map((h) => (
          <Text key={h} style={[styles.komNagl, { color: theme.colors.textSecondary, flex: h === 'km' ? 1.4 : 1 }]}>{h}</Text>
        ))}
      </View>

      {posortowane.map((wp) => {
        cumTon += wp.tonazPrzywieziony;
        cumMetr += wp.przejechaneMetry;
        const kmKoniec = kmStart + cumMetr;
        return (
          <View key={wp.id} style={[styles.rzad, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.kom, { color: theme.colors.textSecondary }]}>{wp.numerAuta}</Text>
            <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wp.tonazPrzywieziony)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(cumTon, 2)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wp.przejechaneMetry)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(cumMetr)}</Text>
            <Text style={[styles.kom, { color: theme.colors.info, flex: 1.4, fontSize: 11 }]}>{formatujPikietaz(kmKoniec)}</Text>
          </View>
        );
      })}

      {posortowane.length > 0 && (
        <View style={[styles.rzad, styles.suma, { backgroundColor: `${theme.colors.primary}10` }]}>
          <Text style={[styles.kom, { color: theme.colors.textSecondary, fontWeight: '700' }]}>∑</Text>
          <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(cumTon, 2)}</Text>
          <Text style={[styles.kom, {}]} />
          <Text style={[styles.kom, {}]} />
          <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '700' }]}>{formatLiczby(cumMetr)}</Text>
          <Text style={[styles.kom, { color: theme.colors.info, flex: 1.4, fontSize: 11 }]}>{formatujPikietaz(kmStart + cumMetr)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rzad: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1 },
  rzadNagl: { paddingVertical: 10 },
  komNagl: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  kom: { flex: 1, fontSize: 12, textAlign: 'center' },
  suma: { borderBottomWidth: 0, borderRadius: 8, marginTop: 4 },
});
