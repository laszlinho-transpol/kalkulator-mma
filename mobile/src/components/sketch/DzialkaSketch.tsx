// ============================================================
// SZKIC 2D – wizualizacja figur działki roboczej (widok pionowy)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';
import { obliczPowierzchniFigury, dlugoscFigury, obliczWynikiDzialki } from '../../utils/calculations';
import { obliczPikietazFigur, formatujPikietaz } from '../../utils/chainage';
import { formatLiczby } from '../../utils/calculations';
import type { DzialkaRobocza, Figura } from '../../types';
import { NAZWY_FIGUR } from '../../constants';

interface DzialkaSketchProps {
  dzialka: DzialkaRobocza;
  ciezarObjetosciowy: number;
  /** Metry liniowe już wykonane (dla trybu Live) */
  wykonaneMetry?: number;
  /** Numer auta dla każdego metra (dla trybu Live) */
  markeryAut?: Array<{ metr: number; nrAuta: number }>;
}

const MIN_HEIGHT = 30;
const MAX_HEIGHT = 120;
const SKETCH_WIDTH = 120;

function normalizujWysokosci(figury: Figura[]): number[] {
  if (figury.length === 0) return [];
  const długości = figury.map(dlugoscFigury);
  const max = Math.max(...długości);
  return długości.map((d) => Math.max(MIN_HEIGHT, Math.round((d / max) * MAX_HEIGHT)));
}

export function DzialkaSketch({ dzialka, ciezarObjetosciowy, wykonaneMetry = 0, markeryAut = [] }: DzialkaSketchProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [selectedFigura, setSelectedFigura] = useState<Figura | null>(null);

  const pikietaze = obliczPikietazFigur(dzialka);
  const wynikiDzialki = obliczWynikiDzialki(dzialka, ciezarObjetosciowy);
  const wysokosci = normalizujWysokosci(dzialka.figury);

  // Oblicz metrów narastająco do każdej figury (do nakładki live)
  let metrumStart = 0;
  const metryCum: number[] = [];
  for (const figura of dzialka.figury) {
    metryCum.push(metrumStart);
    metrumStart += dlugoscFigury(figura);
  }

  if (dzialka.figury.length === 0) {
    return (
      <View style={[styles.pusty, { borderColor: theme.colors.border }]}>
        <Text style={[styles.pustyTekst, { color: theme.colors.textSecondary }]}>
          Dodaj figury, aby zobaczyć szkic
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView horizontal={false} style={styles.scrollWrapper}>
        <View style={styles.szkicWrap}>
          {dzialka.figury.map((figura, idx) => {
            const pik = pikietaze[idx];
            const wys = wysokosci[idx];
            const pow = obliczPowierzchniFigury(figura);
            const metrStartFigury = metryCum[idx];
            const dlugF = dlugoscFigury(figura);

            // Oblicz ile metrów wykonano w tej figurze
            const wykonaneWFigurze = Math.max(0, Math.min(dlugF, wykonaneMetry - metrStartFigury));
            const procentWykonania = dlugF > 0 ? wykonaneWFigurze / dlugF : 0;

            // Kolor figury
            const isEven = idx % 2 === 0;
            const kolorBazy = isEven ? theme.colors.primary : theme.colors.secondary;

            return (
              <View key={figura.id} style={styles.wiersz}>
                {/* Pikietaż początkowy */}
                <Text style={[styles.pikietazLewy, { color: theme.colors.textSecondary }]}>
                  {formatujPikietaz(pik.poczatek)}
                </Text>

                {/* Blok figury */}
                <TouchableOpacity
                  style={[
                    styles.blokFigury,
                    {
                      height: wys,
                      width: SKETCH_WIDTH,
                      backgroundColor: `${kolorBazy}30`,
                      borderColor: kolorBazy,
                    },
                  ]}
                  onPress={() => setSelectedFigura(figura)}
                  activeOpacity={0.7}
                >
                  {/* Nakładka postępu (Live) */}
                  {procentWykonania > 0 && (
                    <View
                      style={[
                        styles.nakładkaPostępu,
                        { height: `${procentWykonania * 100}%`, backgroundColor: `${kolorBazy}80` },
                      ]}
                    />
                  )}
                  <Text style={[styles.numerFigury, { color: kolorBazy }]}>{idx + 1}</Text>
                  <Text style={[styles.powierzchniaFigury, { color: theme.colors.text }]}>
                    {pow.toFixed(0)} m²
                  </Text>
                </TouchableOpacity>

                {/* Pikietaż końcowy */}
                <Text style={[styles.pikietazPrawy, { color: theme.colors.textSecondary }]}>
                  {formatujPikietaz(pik.koniec)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal – szczegóły figury */}
      {selectedFigura && (() => {
        const idx = dzialka.figury.indexOf(selectedFigura);
        const pik = idx >= 0 ? pikietaze[idx] : null;
        const pow = obliczPowierzchniFigury(selectedFigura);
        const masa = pow * (dzialka.grubosc / 100) * ciezarObjetosciowy;
        const dlugFig = dlugoscFigury(selectedFigura);
        const metrStartFig = idx >= 0 ? metryCum[idx] : 0;
        const pozostaloMetrow = Math.max(0, (metrStartFig + dlugFig) - wykonaneMetry);
        const pozostaloPow = pow * (pozostaloMetrow / Math.max(dlugFig, 1));
        const pozostaloMasa = pozostaloPow * (dzialka.grubosc / 100) * ciezarObjetosciowy;

        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedFigura(null)}>
            <Pressable style={styles.modalTło} onPress={() => setSelectedFigura(null)}>
              <View style={[styles.modalKarta, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTytul, { color: theme.colors.text }]}>
                  {pik ? `Odcinek ${formatujPikietaz(pik.poczatek)} – ${formatujPikietaz(pik.koniec)}` : NAZWY_FIGUR[selectedFigura.typ]}
                </Text>
                <Text style={[styles.modalPodtytul, { color: theme.colors.textSecondary }]}>
                  {NAZWY_FIGUR[selectedFigura.typ]}
                </Text>

                <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />

                <WierszInfo label="Powierzchnia" wartosc={`${formatLiczby(pow)} m²`} theme={theme} />
                <WierszInfo label="Długość" wartosc={`${formatLiczby(dlugFig)} m`} theme={theme} />
                <WierszInfo label="Ilość masy" wartosc={`${formatLiczby(masa, 2)} Mg`} theme={theme} />

                {wykonaneMetry > 0 && (
                  <>
                    <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.modalSekcja, { color: theme.colors.textSecondary }]}>Pozostało do końca:</Text>
                    <WierszInfo label="Długość" wartosc={`${formatLiczby(pozostaloMetrow)} m`} theme={theme} />
                    <WierszInfo label="Powierzchnia" wartosc={`${formatLiczby(pozostaloPow)} m²`} theme={theme} />
                    <WierszInfo label="Masa" wartosc={`${formatLiczby(pozostaloMasa, 2)} Mg`} theme={theme} />
                  </>
                )}

                <TouchableOpacity
                  style={[styles.btnZamknij, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setSelectedFigura(null)}
                >
                  <Text style={styles.btnZamknijTekst}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        );
      })()}
    </>
  );
}

function WierszInfo({ label, wartosc, theme }: { label: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={styles.infoWiersz}>
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoWartosc, { color: theme.colors.text }]}>{wartosc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pusty: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  pustyTekst: { fontSize: 14 },
  scrollWrapper: { maxHeight: 500 },
  szkicWrap: { paddingVertical: 8, alignItems: 'flex-start' },
  wiersz: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  pikietazLewy: {
    fontSize: 11,
    width: 60,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  pikietazPrawy: {
    fontSize: 11,
    width: 60,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  blokFigury: {
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nakładkaPostępu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  numerFigury: { fontSize: 14, fontWeight: '800' },
  powierzchniaFigury: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  modalTło: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKarta: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTytul: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalPodtytul: { fontSize: 13, marginBottom: 12 },
  modalDivider: { height: 1, marginVertical: 12 },
  modalSekcja: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  infoWiersz: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoWartosc: { fontSize: 14, fontWeight: '600' },
  btnZamknij: { marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnZamknijTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
