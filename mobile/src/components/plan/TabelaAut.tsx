// ============================================================
// TABELA AUT – rozpiska samochodów (plan / wbudowywanie)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  obliczWynikiDzialki, obliczTabeleAut, obliczLacznaDlugosc,
  formatLiczby, generujDomyslneRzuty,
} from '../../utils/calculations';
import { formatujPikietaz } from '../../utils/chainage';
import { obliczPikietazFigur } from '../../utils/chainage';
import type { DzialkaRobocza, Rzut } from '../../types';
import type { AppTheme } from '../../constants/theme';

interface TabelaAutProps {
  dzialka: DzialkaRobocza;
  tonazAuta: number;
  rzuty: Rzut[];
  ciezarObjetosciowy: number;
  theme: AppTheme;
  pokazKilometraz?: boolean;
}

export function TabelaAut({
  dzialka, tonazAuta, rzuty, ciezarObjetosciowy, theme, pokazKilometraz = true,
}: TabelaAutProps) {
  const wyniki = obliczWynikiDzialki(dzialka, ciezarObjetosciowy, tonazAuta);
  const lacznasDlugosc = obliczLacznaDlugosc(dzialka);
  const rzutyDoUzycia = rzuty.length > 0 ? rzuty : generujDomyslneRzuty(wyniki.iloscSamochodow);
  const tabela = obliczTabeleAut(wyniki.lacznaIloscMasy, lacznasDlugosc, rzutyDoUzycia, tonazAuta);
  const pikietaze = obliczPikietazFigur(dzialka);
  const kmStart = pikietaze.length > 0 ? pikietaze[0].poczatek : 0;

  const kolumny = pokazKilometraz
    ? ['L.p.', 'Mg', '∑ Mg', 'm', '∑ m', 'km']
    : ['L.p.', 'Mg', '∑ Mg', 'm', '∑ m'];

  let ostatniRzut = 0;

  return (
    <View>
      <View style={[styles.naglowek, { backgroundColor: `${theme.colors.primary}15` }]}>
        <SummaryRow label="Do wbudowania" wartosc={`${formatLiczby(wyniki.lacznaIloscMasy, 2)} Mg`} theme={theme} bold />
        <SummaryRow label="Ilość samochodów" wartosc={`${wyniki.iloscSamochodow}`} theme={theme} bold />
        <SummaryRow label="Rzuty" wartosc={rzutyDoUzycia.map((r) => r.iloscSamochodow).join('+')} theme={theme} />
        <SummaryRow label="Łącznie metrów" wartosc={`${formatLiczby(lacznasDlugosc)} m`} theme={theme} />
      </View>

      <View style={[styles.rzad, styles.rzadNagl, { backgroundColor: theme.colors.card }]}>
        {kolumny.map((h) => (
          <Text key={h} style={[styles.komNagl, { color: theme.colors.textSecondary, flex: h === 'km' ? 1.4 : 1 }]}>{h}</Text>
        ))}
      </View>

      {tabela.map((wiersz) => {
        const nowyRzut = wiersz.numerRzutu !== ostatniRzut;
        ostatniRzut = wiersz.numerRzutu;
        const kmKoniec = kmStart + wiersz.metryNarastajaco;
        return (
          <React.Fragment key={wiersz.numerAuta}>
            {nowyRzut && (
              <View style={[styles.rzutSep, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.rzutLabel}>RZUT {wiersz.numerRzutu}</Text>
              </View>
            )}
            <View style={[styles.rzad, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.kom, { color: theme.colors.textSecondary }]}>{wiersz.numerAuta}</Text>
              <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wiersz.masa)}</Text>
              <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(wiersz.masaNarastajaco, 2)}</Text>
              <Text style={[styles.kom, { color: theme.colors.text }]}>{formatLiczby(wiersz.metry)}</Text>
              <Text style={[styles.kom, { color: theme.colors.text, fontWeight: '600' }]}>{formatLiczby(wiersz.metryNarastajaco)}</Text>
              {pokazKilometraz && (
                <Text style={[styles.kom, { color: theme.colors.info, flex: 1.4, fontSize: 11 }]}>
                  {formatujPikietaz(kmKoniec)}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SummaryRow({ label, wartosc, theme, bold }: { label: string; wartosc: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={styles.infoWiersz}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: bold ? '700' : '400' }}>{wartosc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  naglowek: { borderRadius: 10, padding: 12, marginBottom: 8, gap: 2 },
  infoWiersz: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rzad: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1 },
  rzadNagl: { paddingVertical: 10 },
  komNagl: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  kom: { flex: 1, fontSize: 12, textAlign: 'center' },
  rzutSep: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, marginVertical: 4 },
  rzutLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
