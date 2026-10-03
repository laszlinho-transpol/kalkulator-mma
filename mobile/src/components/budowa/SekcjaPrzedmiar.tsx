import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform, TextInput,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import { karta } from '../../constants/layout';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import {
  csvSumMieszanek,
  czyLegendaUzupelniona,
  obliczPrzedmiar,
  rozlaczWiersz,
  scalWiersze,
  sumyMieszanek,
  zmienNazweScalonegoWiersza,
  type WierszPrzedmiaru,
} from '../../utils/projektBudowy';
import { formatLiczby } from '../../utils/calculations';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  kodBudowy: string;
  onZmien: (p: ProjektBudowy) => void;
}

const KAT_KOLUMNY: { kat: WierszPrzedmiaru['warstwy'][0]['kategoria']; etykieta: string }[] = [
  { kat: 'sma', etykieta: 'SMA' },
  { kat: 'wiazaca', etykieta: 'Wiążąca' },
  { kat: 'podbudowa', etykieta: 'Podbudowa' },
  { kat: 'klsm', etykieta: 'KŁSM' },
];

export function SekcjaPrzedmiar({ projekt, theme, kodBudowy, onZmien }: Props) {
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const [edycja, setEdycja] = useState(false);
  const [zaznaczone, setZaznaczone] = useState<string[]>([]);

  const wiersze = useMemo(
    () => obliczPrzedmiar(projekt, mieszanki),
    [projekt, mieszanki],
  );
  const sumy = useMemo(
    () => sumyMieszanek(wiersze, mieszanki, (id) => wytwornie.find((w) => w.id === id)?.nazwa),
    [wiersze, mieszanki, wytwornie],
  );

  if (!czyLegendaUzupelniona(projekt.legenda) || projekt.konstrukcje.length === 0) {
    return (
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Przedmiar pojawi się po uzupełnieniu legendy i konstrukcji warstw.
      </Text>
    );
  }

  const komorka = (w: WierszPrzedmiaru, kat: typeof KAT_KOLUMNY[0]['kat']) => {
    const war = w.warstwy.filter((x) => x.kategoria === kat);
    if (war.length === 0) return '—';
    const m2 = war.reduce((s, x) => s + x.powierzchniaM2, 0);
    const t = war.reduce((s, x) => s + x.tony, 0);
    return `${formatLiczby(m2, 1)} m²\n${formatLiczby(t, 2)} t`;
  };

  const eksportuj = async () => {
    try {
      const csv = csvSumMieszanek(sumy);
      const fileName = `${kodBudowy || 'budowa'}_przedmiar.csv`;
      const doc = new File(Paths.document, fileName);
      doc.write(`\uFEFF${csv}`);
      await Sharing.shareAsync(doc.uri, { mimeType: 'text/csv', dialogTitle: 'Eksport sum mieszanek' });
    } catch (e) {
      Alert.alert('Eksport', e instanceof Error ? e.message : 'Nie udało się udostępnić pliku CSV.');
    }
  };

  const scal = () => {
    const ids = wiersze
      .filter((w) => zaznaczone.includes(w.id))
      .flatMap((w) => w.legendaIds);
    if (ids.length < 2) {
      Alert.alert('Scalanie', 'Zaznacz co najmniej dwa wiersze o tych samych warstwach.');
      return;
    }
    onZmien(scalWiersze(projekt, ids));
    setZaznaczone([]);
    setEdycja(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Powierzchnie z obrysów PZT, tony z grubości i gęstości recepty (albo 2,45 t/m³ MMA / 2,0 t/m³ KŁSM). Odsadzka powiększa m² warstwy.
      </Text>
      <View style={styles.rzad}>
        <View style={styles.rzad}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Edycja / scalanie</Text>
          <Switch value={edycja} onValueChange={(v) => { setEdycja(v); setZaznaczone([]); }} />
        </View>
        <TouchableOpacity onPress={eksportuj} style={[styles.btn, { backgroundColor: theme.colors.secondary }]}>
          <Text style={styles.btnTekst}>Eksport mieszanek</Text>
        </TouchableOpacity>
      </View>
      {edycja ? (
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={scal}
            style={[styles.btn, { backgroundColor: theme.colors.primary, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.btnTekst}>Scal zaznaczone</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            Zaznacz wiersze i scal. Scalone: zmień nazwę w polu albo wciśnij „Rozłącz”.
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.thead, { borderColor: theme.colors.border, backgroundColor: `${theme.colors.primary}18` }]}>
            <Text style={[styles.th, styles.colNazwa, { color: theme.colors.text }]}>Obszar</Text>
            {KAT_KOLUMNY.map((k) => (
              <Text key={k.kat} style={[styles.th, styles.colKat, { color: theme.colors.text }]}>{k.etykieta}</Text>
            ))}
          </View>
          {wiersze.map((w) => {
            const scalony = w.legendaIds.length > 1;
            const zazn = zaznaczone.includes(w.id);
            const rozlacz = () => {
              const wykonaj = () => onZmien(rozlaczWiersz(projekt, w.id));
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && !window.confirm(`Rozłączyć „${w.nazwa}”?`)) return;
                wykonaj();
                return;
              }
              Alert.alert('Rozłącz wiersz', 'Przywrócić osobne pozycje?', [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Rozłącz', onPress: wykonaj },
              ]);
            };
            return (
              <View
                key={w.id}
                style={[
                  styles.trow,
                  {
                    borderColor: zazn ? theme.colors.primary : theme.colors.border,
                    backgroundColor: zazn ? `${theme.colors.primary}14` : theme.colors.card,
                  },
                ]}
              >
                <View style={styles.colNazwa}>
                  {edycja && scalony ? (
                    <TextInput
                      value={w.nazwa}
                      onChangeText={(t) => onZmien(zmienNazweScalonegoWiersza(projekt, w.id, t))}
                      style={[styles.nazwaInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    />
                  ) : (
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>{w.nazwa}</Text>
                  )}
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                    {formatLiczby(w.powierzchniaObrysuM2, 1)} m² obrys
                    {scalony ? ' · scalony' : ''}
                  </Text>
                  {edycja ? (
                    <TouchableOpacity
                      onPress={() => setZaznaczone((prev) => prev.includes(w.id) ? prev.filter((id) => id !== w.id) : [...prev, w.id])}
                    >
                      <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                        {zazn ? '✓ Zaznaczony' : 'Zaznacz do scalenia'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {scalony ? (
                    <TouchableOpacity onPress={rozlacz}>
                      <Text style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '800', marginTop: 4 }}>
                        Rozłącz
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {KAT_KOLUMNY.map((k) => (
                  <Text key={k.kat} style={[styles.td, styles.colKat, { color: theme.colors.text }]}>
                    {komorka(w, k.kat)}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12 }}>SUMA MIESZANEK</Text>
      {sumy.map((s) => (
        <View key={s.klucz} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{s.nazwa}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {s.wytwornia ? `${s.wytwornia} · ` : ''}
            {formatLiczby(s.powierzchniaM2, 1)} m² · grubość ważona {formatLiczby(s.gruboscWazonaCm, 1)} cm · {formatLiczby(s.tony, 2)} t
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rzad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  btn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnTekst: { color: '#fff', fontWeight: '800', fontSize: 13 },
  thead: { flexDirection: 'row', borderWidth: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingVertical: 8 },
  trow: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, paddingVertical: 8, alignItems: 'center' },
  th: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8 },
  td: { fontSize: 11, paddingHorizontal: 8, lineHeight: 16 },
  colNazwa: { width: 168, paddingHorizontal: 8 },
  colKat: { width: 96, textAlign: 'right' },
  nazwaInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
});
