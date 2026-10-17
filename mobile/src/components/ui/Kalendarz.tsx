// ============================================================
// KALENDARZ – jedna siatka miesiąca dla całej aplikacji.
// Soboty, niedziele i święta mają własne kolory (styl.kolorDnia).
// ============================================================

import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { czySwieto } from '../../budzet/kalendarzPracy';
import { kolorDnia, ODSTEP, PROMIEN, rodzajDnia } from '../../constants/styl';
import { useMotyw } from '../../hooks/useMotyw';
import { Naciskany } from './Naciskany';
import { Przycisk, PrzyciskIkony } from './Przycisk';

export const MIESIACE = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];
const DNI = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

const pad = (n: number) => String(n).padStart(2, '0');

export function isoZData(rok: number, miesiac: number, dzien: number): string {
  return `${rok}-${pad(miesiac + 1)}-${pad(dzien)}`;
}

export function isoZDaty(d: Date): string {
  return isoZData(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dataZIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 6);
}

export function siatkaMiesiaca(rok: number, miesiac: number): (string | null)[] {
  const pierwszy = new Date(rok, miesiac, 1);
  const przesuniecie = (pierwszy.getDay() + 6) % 7;
  const ile = new Date(rok, miesiac + 1, 0).getDate();
  const komorki: (string | null)[] = Array.from({ length: przesuniecie }, () => null);
  for (let d = 1; d <= ile; d += 1) komorki.push(isoZData(rok, miesiac, d));
  while (komorki.length % 7 !== 0) komorki.push(null);
  return komorki;
}

export interface StanDnia {
  wybrany?: boolean;
  wZakresie?: boolean;
  /** Zielone tło, np. dzień z raportem. */
  oznaczony?: boolean;
  /** Czerwone tło, np. dzień roboczy bez obowiązkowego raportu. */
  brak?: boolean;
}

interface SiatkaProps {
  rok: number;
  miesiac: number;
  onZmienMiesiac: (rok: number, miesiac: number) => void;
  stanDnia: (iso: string) => StanDnia;
  onWybierz: (iso: string) => void;
  /** Dni wcześniejsze są wyszarzone i nieaktywne. */
  min?: string;
  /** Podpis zielonych dni w legendzie. */
  legendaOznaczonych?: string;
  /** Podpis czerwonych dni w legendzie. */
  legendaBraku?: string;
}

export function SiatkaKalendarza({ rok, miesiac, onZmienMiesiac, stanDnia, onWybierz, min, legendaOznaczonych, legendaBraku }: SiatkaProps) {
  const theme = useMotyw();
  const komorki = useMemo(() => siatkaMiesiaca(rok, miesiac), [rok, miesiac]);
  const dzis = isoZDaty(new Date());

  const zmien = (delta: number) => {
    const d = new Date(rok, miesiac + delta, 1);
    onZmienMiesiac(d.getFullYear(), d.getMonth());
  };

  return (
    <View>
      <View style={styles.nawigacja}>
        <PrzyciskIkony ikona="wstecz" accessibilityLabel="Poprzedni miesiąc" onPress={() => zmien(-1)} kolor={theme.colors.text} />
        <Text style={[styles.miesiac, { color: theme.colors.text }]}>{MIESIACE[miesiac]} {rok}</Text>
        <PrzyciskIkony ikona="dalej" accessibilityLabel="Następny miesiąc" onPress={() => zmien(1)} kolor={theme.colors.text} />
      </View>
      <View style={styles.siatka}>
        {DNI.map((d, i) => (
          <Text
            key={d}
            style={[
              styles.naglowek,
              { color: i === 5 ? theme.colors.sobota : i === 6 ? theme.colors.niedziela : theme.colors.textSecondary },
            ]}
          >
            {d}
          </Text>
        ))}
        {komorki.map((iso, i) => {
          if (!iso) return <View key={`p-${i}`} style={styles.komorka} />;
          const { wybrany, wZakresie, oznaczony, brak } = stanDnia(iso);
          const pelne = oznaczony || brak;
          const dzisiaj = iso === dzis;
          const zablokowany = !!min && iso < min;
          const swieto = czySwieto(iso);
          const kolor = wybrany ? '#1A1A1A' : pelne ? '#FFFFFF' : kolorDnia(theme, iso);
          return (
            <Naciskany
              key={iso}
              style={styles.komorka}
              onPress={() => onWybierz(iso)}
              disabled={zablokowany}
              accessibilityLabel={`${dzisiaj ? 'Dziś, ' : ''}${iso}${oznaczony && legendaOznaczonych ? `, ${legendaOznaczonych}` : ''}${brak && legendaBraku ? `, ${legendaBraku}` : ''}`}
            >
              <View
                style={[
                  styles.dzien,
                  wZakresie && !wybrany && { backgroundColor: `${theme.colors.primary}33` },
                  oznaczony && !wybrany && { backgroundColor: theme.colors.success },
                  brak && !oznaczony && !wybrany && { backgroundColor: theme.colors.danger },
                  wybrany && { backgroundColor: theme.colors.primary },
                  dzisiaj && { borderWidth: 2, borderColor: theme.colors.info },
                  zablokowany && { opacity: 0.3 },
                ]}
              >
                <Text style={{ color: kolor, fontWeight: wybrany || dzisiaj || rodzajDnia(iso) !== 'roboczy' ? '800' : '500' }}>
                  {Number(iso.slice(8))}
                </Text>
                {swieto ? <View style={[styles.kropka, { backgroundColor: wybrany ? '#1A1A1A' : pelne ? '#FFFFFF' : theme.colors.niedziela }]} /> : null}
              </View>
            </Naciskany>
          );
        })}
      </View>
      <View style={styles.legenda}>
        {legendaOznaczonych ? <Legenda kolor={theme.colors.success} tekst={legendaOznaczonych} /> : null}
        {legendaBraku ? <Legenda kolor={theme.colors.danger} tekst={legendaBraku} /> : null}
        <Legenda kolor={theme.colors.sobota} tekst="sobota" />
        <Legenda kolor={theme.colors.niedziela} tekst="niedziela / święto" />
        <Legenda kolor={theme.colors.info} tekst="dziś" obwodka />
      </View>
    </View>
  );
}

function Legenda({ kolor, tekst, obwodka }: { kolor: string; tekst: string; obwodka?: boolean }) {
  const theme = useMotyw();
  return (
    <View style={styles.legendaPoz}>
      <View style={[styles.legendaZnak, obwodka ? { borderWidth: 2, borderColor: kolor } : { backgroundColor: kolor }]} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{tekst}</Text>
    </View>
  );
}

interface OknoProps {
  widoczny: boolean;
  podpis: string;
  onZamknij: () => void;
  onOk: () => void;
  etykietaOk: string;
  children: React.ReactNode;
}

/** Okno z kalendarzem: siatka + podpis wyboru + Anuluj / OK. */
export function OknoKalendarza({ widoczny, podpis, onZamknij, onOk, etykietaOk, children }: OknoProps) {
  const theme = useMotyw();
  return (
    <Modal visible={widoczny} transparent animationType="fade" onRequestClose={onZamknij}>
      <Pressable style={styles.tlo} onPress={onZamknij}>
        <Pressable style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => {}}>
          {children}
          <Text style={[styles.podpis, { color: theme.colors.textSecondary }]}>{podpis}</Text>
          <View style={styles.akcje}>
            <Przycisk tekst="Anuluj" wariant="drugi" onPress={onZamknij} style={{ flex: 1 }} />
            <Przycisk tekst="OK" accessibilityLabel={etykietaOk} onPress={onOk} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface PoleProps {
  tekst: string;
  onPress: () => void;
  accessibilityLabel: string;
  tlo?: string;
  /** Kolor tekstu daty – soboty, niedziele i święta (kolorDnia). */
  kolor?: string;
}

/** Pole formularza otwierające kalendarz. */
export function PoleDaty({ tekst, onPress, accessibilityLabel, tlo, kolor }: PoleProps) {
  const theme = useMotyw();
  return (
    <Naciskany
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[styles.pole, { borderColor: theme.colors.border, backgroundColor: tlo ?? theme.colors.inputBackground }]}
    >
      <Text style={{ fontSize: 16 }}>📅</Text>
      <Text style={[styles.poleTekst, { color: kolor ?? theme.colors.text }]} numberOfLines={1}>{tekst}</Text>
      <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>▾</Text>
    </Naciskany>
  );
}

const styles = StyleSheet.create({
  pole: {
    borderWidth: 1,
    borderRadius: PROMIEN.m,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ODSTEP.s,
  },
  poleTekst: { fontSize: 16, fontWeight: '700', flex: 1 },
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  karta: { width: '100%', maxWidth: 380, borderRadius: PROMIEN.l, borderWidth: 1, padding: ODSTEP.l },
  nawigacja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ODSTEP.s },
  miesiac: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  siatka: { flexDirection: 'row', flexWrap: 'wrap' },
  naglowek: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  komorka: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dzien: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kropka: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: ODSTEP.m, marginTop: ODSTEP.s },
  legendaPoz: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaZnak: { width: 10, height: 10, borderRadius: 5 },
  podpis: { textAlign: 'center', marginVertical: ODSTEP.m },
  akcje: { flexDirection: 'row', gap: ODSTEP.s },
});
