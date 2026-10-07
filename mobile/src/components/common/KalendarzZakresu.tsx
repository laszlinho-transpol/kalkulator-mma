import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { dzisIso, wyborDnia, type FazaKalendarza } from '../../utils/zakresDat';

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

function formatujDzien(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function etykietaZakresu(od: string, doDnia: string): string {
  if (od === doDnia) return formatujDzien(od);
  return `${formatujDzien(od)} – ${formatujDzien(doDnia)}`;
}

interface Props {
  od: string;
  doDnia: string;
  theme: AppTheme;
  onZatwierdz: (od: string, doDnia: string) => void;
}

export function KalendarzZakresu({ od, doDnia, theme, onZatwierdz }: Props) {
  const dzis = dzisIso();
  const [otwarty, setOtwarty] = useState(false);
  const [faza, setFaza] = useState<FazaKalendarza>('gotowy');
  const [robOd, setRobOd] = useState(od);
  const [robDo, setRobDo] = useState(doDnia);
  const start = od.split('-').map(Number);
  const [rok, setRok] = useState(start[0]);
  const [miesiac, setMiesiac] = useState(start[1] - 1);

  const komorki = useMemo(() => siatkaMiesiaca(rok, miesiac), [rok, miesiac]);

  const otworz = () => {
    setRobOd(od);
    setRobDo(doDnia);
    setFaza('gotowy');
    const [y, m] = od.split('-').map(Number);
    setRok(y);
    setMiesiac(m - 1);
    setOtwarty(true);
  };

  const zmienMiesiac = (delta: number) => {
    const data = new Date(rok, miesiac + delta, 1);
    setRok(data.getFullYear());
    setMiesiac(data.getMonth());
  };

  const klik = (dzien: string) => {
    const next = wyborDnia(faza, robOd, dzien);
    setFaza(next.faza);
    setRobOd(next.od);
    setRobDo(next.do);
  };

  return (
    <>
      <TouchableOpacity
        onPress={otworz}
        accessibilityLabel={`Wybierz datę, teraz ${etykietaZakresu(od, doDnia)}`}
        style={[styles.pole, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
      >
        <Text style={[styles.poleTekst, { color: theme.colors.text }]}>{etykietaZakresu(od, doDnia)}</Text>
        <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={otwarty} transparent animationType="fade" onRequestClose={() => setOtwarty(false)}>
        <Pressable style={styles.tlo} onPress={() => setOtwarty(false)}>
          <Pressable style={[styles.karta, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]} onPress={() => {}}>
            <View style={styles.nawigacja}>
              <TouchableOpacity onPress={() => zmienMiesiac(-1)} accessibilityLabel="Poprzedni miesiąc" style={styles.strzalka}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.miesiac, { color: theme.colors.text }]}>
                {MIESIACE[miesiac]} {rok}
              </Text>
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
                const wZakresie = iso >= robOd && iso <= robDo;
                const kraniec = iso === robOd || iso === robDo;
                const dzisiaj = iso === dzis;
                return (
                  <TouchableOpacity
                    key={iso}
                    style={styles.komorka}
                    onPress={() => klik(iso)}
                    accessibilityLabel={dzisiaj ? `Dziś, ${iso}` : iso}
                  >
                    <View
                      style={[
                        styles.dzien,
                        wZakresie && !kraniec && { backgroundColor: `${theme.colors.primary}33` },
                        kraniec && { backgroundColor: theme.colors.primary },
                        dzisiaj && styles.dzis,
                        dzisiaj && { borderColor: theme.colors.info },
                      ]}
                    >
                      <Text style={{
                        color: kraniec ? '#1A1A1A' : theme.colors.text,
                        fontWeight: dzisiaj || kraniec ? '800' : '500',
                      }}
                      >
                        {Number(iso.slice(8))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
              {etykietaZakresu(robOd, robDo)}
            </Text>
            <View style={styles.akcje}>
              <TouchableOpacity onPress={() => setOtwarty(false)} style={[styles.btn, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onZatwierdz(robOd, robDo);
                  setOtwarty(false);
                }}
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
  pole: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  poleTekst: { fontSize: 16, fontWeight: '700', flex: 1 },
  tlo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  karta: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  nawigacja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  miesiac: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  strzalka: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  siatka: { flexDirection: 'row', flexWrap: 'wrap' },
  naglowek: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  komorka: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dzien: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dzis: { borderWidth: 2 },
  akcje: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
