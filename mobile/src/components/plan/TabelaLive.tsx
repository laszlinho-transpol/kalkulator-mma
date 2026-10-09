// ============================================================
// TABELA LIVE – układ kolumn jak tabela planu (dane z rozpiski LIVE)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatLiczby } from '../../utils/calculations';
import { formatujPikietaz, obliczPikietazFigur, pikietazPoMetrach } from '../../utils/chainage';
import { gruboscWbudowywania } from '../../utils/grubosc';
import { gruboscSegmentuLive } from '../../utils/liveProgress';
import type { DzialkaRobocza, WpisLive } from '../../types';
import type { AppTheme } from '../../constants/theme';

const RZYM = ['I', 'II', 'III', 'IV', 'V'];

interface TabelaLiveProps {
  dzialka: DzialkaRobocza;
  wpisy: WpisLive[];
  theme: AppTheme;
  ciezarObjetosciowy?: number;
}

export function TabelaLive({ dzialka, wpisy, theme, ciezarObjetosciowy }: TabelaLiveProps) {
  const posortowane = [...wpisy].sort((a, b) => a.numerAuta - b.numerAuta);
  const pikietaze = obliczPikietazFigur(dzialka);
  const kmStart = pikietaze.length > 0 ? pikietaze[0].poczatek : dzialka.kilometrazPoczatkowyKm * 1000 + dzialka.kilometrazPoczatkowyM;
  const grPlan = gruboscWbudowywania(dzialka);
  const metryRazem = posortowane.reduce((s, w) => s + w.przejechaneMetry, 0);
  const kmKoniecWyk = pikietazPoMetrach(kmStart, metryRazem, dzialka.kierunekUkladania);

  const kolumny = ['L.p.', 'Mg', '∑ Mg', 'm', '∑ m', 'Gr.', 'km'];

  let cumTon = 0;
  let cumMetr = 0;

  return (
    <View>
      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>
        Wykonano {formatujPikietaz(kmStart)} – {formatujPikietaz(kmKoniecWyk)} ({formatLiczby(metryRazem, 2)} m)
      </Text>
      <View style={[styles.rzad, styles.rzadNagl, { backgroundColor: `${theme.colors.primary}15` }]}>
        {kolumny.map((h) => (
          <Text key={h} style={[styles.komNagl, { color: theme.colors.textSecondary, flex: h === 'km' ? 1.4 : 1 }]}>{h}</Text>
        ))}
      </View>

      {posortowane.map((wp) => {
        const przed = cumMetr;
        cumTon += wp.tonazPrzywieziony;
        cumMetr += wp.przejechaneMetry;
        const kmKoniec = pikietazPoMetrach(kmStart, cumMetr, dzialka.kierunekUkladania);
        const gr = ciezarObjetosciowy
          ? gruboscSegmentuLive(dzialka, przed, wp.przejechaneMetry, wp.tonazPrzywieziony, ciezarObjetosciowy).grubosc
          : 0;
        const ponad = gr > grPlan + 0.2;
        const ponizej = gr > 0 && gr < grPlan - 0.2;
        const kolorGr = ponad ? theme.colors.danger : ponizej ? theme.colors.warning : theme.colors.success;
        const rzut = RZYM[Math.min(5, Math.max(1, wp.numerRzutu ?? 1)) - 1];
        return (
          <View key={wp.id} style={[styles.rzad, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.kom, { color: theme.colors.textSecondary }]}>{wp.numerAuta} {rzut}</Text>
            <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wp.tonazPrzywieziony)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(cumTon, 2)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wp.przejechaneMetry)}</Text>
            <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(cumMetr)}</Text>
            <Text style={[styles.kom, { color: kolorGr, fontWeight: '700' }]}>
              {gr > 0 ? `${formatLiczby(gr)} ${ponad ? '▲' : ponizej ? '▼' : ''} / ${formatLiczby(grPlan)}` : '–'}
            </Text>
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
          <Text style={[styles.kom, {}]} />
          <Text style={[styles.kom, { color: theme.colors.info, flex: 1.4, fontSize: 11 }]}>{formatujPikietaz(pikietazPoMetrach(kmStart, cumMetr, dzialka.kierunekUkladania))}</Text>
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
