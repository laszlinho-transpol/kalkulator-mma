// Wybór jednego dnia. Zapis dopiero po OK.

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

const MIESIACE = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];
const DNI = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoZData(rok: number, miesiac: number, dzien: number): string {
  return `${rok}-${pad(miesiac + 1)}-${pad(dzien)}`;
}

function siatkaMiesiaca(rok: number, miesiac: number): (string | null)[] {
  const pierwszy = new Date(rok, miesiac, 1);
  const przesuniecie = (pierwszy.getDay() + 6) % 7;
  const ile = new Date(rok, miesiac + 1, 0).getDate();
  const komorki: (string | null)[] = Array.from({ length: przesuniecie }, () => null);
  for (let d = 1; d <= ile; d += 1) komorki.push(isoZData(rok, miesiac, d));
  while (komorki.length % 7 !== 0) komorki.push(null);
  return komorki;
}

export function formatujDzienIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  wartosc: string;
  theme: AppTheme;
  onZatwierdz: (iso: string) => void;
}

export function KalendarzDnia({ wartosc, theme, onZatwierdz }: Props) {
  const [otwarty, setOtwarty] = useState(false);
  const [wybrany, setWybrany] = useState(wartosc);
  const start = wartosc.split('-').map(Number);
  const [rok, setRok] = useState(start[0]);
  const [miesiac, setMiesiac] = useState((start[1] || 1) - 1);
  const komorki = useMemo(() => siatkaMiesiaca(rok, miesiac), [rok, miesiac]);
  const dzis = isoZData(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const otworz = () => {
    setWybrany(wartosc);
    const [y, m] = wartosc.split('-').map(Number);
    setRok(y);
    setMiesiac((m || 1) - 1);
    setOtwarty(true);
  };

  const zmienMiesiac = (delta: number) => {
    const data = new Date(rok, miesiac + delta, 1);
    setRok(data.getFullYear());
    setMiesiac(data.getMonth());
  };

  return (
    <>
      <TouchableOpacity
        onPress={otworz}
        accessibilityLabel="Wybierz datę raportu"
        style={[styles.pole, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      >
        <Text style={[styles.poleTekst, { color: theme.colors.text }]}>{formatujDzienIso(wartosc)}</Text>
        <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={otwarty} transparent animationType="fade" onRequestClose={() => setOtwarty(false)}>
        <Pressable style={styles.tlo} onPress={() => setOtwarty(false)}>
          <Pressable style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => {}}>
            <View style={styles.nawigacja}>
              <TouchableOpacity onPress={() => zmienMiesiac(-1)} accessibilityLabel="Poprzedni miesiąc" style={styles.strzalka}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.miesiac, { color: theme.colors.text }]}>{MIESIACE[miesiac]} {rok}</Text>
              <TouchableOpacity onPress={() => zmienMiesiac(1)} accessibilityLabel="Następny miesiąc" style={styles.strzalka}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.siatka}>
              {DNI.map((d) => (
                <Text key={d} style={[styles.naglowek, { color: theme.colors.textSecondary }]}>{d}</Text>
              ))}
              {komorki.map((iso, i) => {
                if (!iso) return <View key={`p-${i}`} style={styles.komorka} />;
                const on = iso === wybrany;
                const dzisiaj = iso === dzis;
                return (
                  <TouchableOpacity key={iso} style={styles.komorka} onPress={() => setWybrany(iso)} accessibilityLabel={iso}>
                    <View style={[
                      styles.dzien,
                      on && { backgroundColor: theme.colors.primary },
                      dzisiaj && !on && { borderWidth: 2, borderColor: theme.colors.info },
                    ]}
                    >
                      <Text style={{ color: on ? '#1A1A1A' : theme.colors.text, fontWeight: on || dzisiaj ? '800' : '500' }}>
                        {Number(iso.slice(8))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>{formatujDzienIso(wybrany)}</Text>
            <View style={styles.akcje}>
              <TouchableOpacity onPress={() => setOtwarty(false)} style={[styles.btn, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Zatwierdź datę"
                onPress={() => { onZatwierdz(wybrany); setOtwarty(false); }}
                style={[styles.btn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              >
                <Text style={{ color: '#1A1A1A', fontWeight: '800' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pole: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  poleTekst: { fontSize: 16, fontWeight: '700', flex: 1 },
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  karta: { width: '100%', maxWidth: 380, borderRadius: 16, borderWidth: 1, padding: 16 },
  nawigacja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  miesiac: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  strzalka: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  siatka: { flexDirection: 'row', flexWrap: 'wrap' },
  naglowek: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  komorka: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dzien: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  akcje: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
