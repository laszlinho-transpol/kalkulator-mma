import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy, Punkt2D } from '../../types';
import { PztArkuszPodglad } from '../budowa/PztArkuszPodglad';
import { Przycisk } from '../ui';
import { SafeModal } from '../common/SafeModal';
import { etykietaZakladkiArkusza, formatujKmM } from '../../utils/projektBudowy';
import { kilometrazZPunktuPdf } from '../../utils/osPzt';
import { metryNaPunktPdf } from '../../utils/obmiarGeometry';
import { powierzchniaMiedzyPunktamiPdf } from '../../utils/odsadzkaObszaru';
import { punktWWielokacie } from '../../liniowka/liniowka';
import { formatLiczby } from '../../utils/calculations';

interface WynikZakresu {
  kmOdM: number;
  kmDoM: number;
  powierzchniaM2: number;
  obszarId?: string;
}

interface Props {
  visible: boolean;
  projekt: ProjektBudowy;
  theme: AppTheme;
  /** Ogranicza podgląd do tych obszarów. Puste = cały arkusz. */
  obszarIds?: string[];
  odsLewaCm: number;
  odsPrawaCm: number;
  onWybierz: (wynik: WynikZakresu) => void;
  onClose: () => void;
}

export function WyborZakresuNaPlanie({
  visible, projekt, theme, obszarIds, odsLewaCm, odsPrawaCm, onWybierz, onClose,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [punkty, setPunkty] = useState<Punkt2D[]>([]);
  const arkusze = projekt.arkusze.filter((a) => (
    !obszarIds?.length || a.obszary.some((o) => obszarIds.includes(o.id))
  ));
  const bazowy = arkusze[Math.min(idx, Math.max(0, arkusze.length - 1))];
  const arkusz = bazowy && obszarIds?.length
    ? { ...bazowy, obszary: bazowy.obszary.filter((o) => obszarIds.includes(o.id)) }
    : bazowy;

  const wynik = useMemo(() => {
    if (!arkusz || punkty.length < 2) return null;
    const kmA = kilometrazZPunktuPdf(arkusz, punkty[0]);
    const kmB = kilometrazZPunktuPdf(arkusz, punkty[1]);
    if (kmA == null || kmB == null) return null;
    const trafiony = arkusz.obszary.find((o) => punktWWielokacie(punkty[0], o.wierzcholkiPdf))
      ?? arkusz.obszary.find((o) => punktWWielokacie(punkty[1], o.wierzcholkiPdf));
    const cele = trafiony ? [trafiony] : arkusz.obszary;
    const k = metryNaPunktPdf(projekt.skala);
    const m2 = cele.reduce((s, o) => s + powierzchniaMiedzyPunktamiPdf(
      o, arkusz, k, punkty[0], punkty[1], odsLewaCm, odsPrawaCm,
    ), 0);
    return {
      kmOdM: Math.round(Math.min(kmA, kmB)),
      kmDoM: Math.round(Math.max(kmA, kmB)),
      powierzchniaM2: Math.round(m2 * 10) / 10,
      obszarId: trafiony?.id,
    };
  }, [arkusz, punkty, odsLewaCm, odsPrawaCm, projekt.skala]);

  const krok = punkty.length === 0 ? 'Stuknij początek odcinka.' : punkty.length === 1 ? 'Stuknij koniec odcinka.' : 'Zakres gotowy.';

  return (
    <SafeModal
      visible={visible}
      tytul="Zakres na planie"
      theme={theme}
      onClose={onClose}
      lewy={{ tekst: 'Anuluj', onPress: onClose }}
      prawy={{
        tekst: 'Gotowe',
        kolor: theme.colors.primary,
        onPress: () => {
          if (!wynik) return;
          onWybierz(wynik);
          onClose();
        },
      }}
    >
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{krok}</Text>
        {wynik ? (
          <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
            {formatujKmM(wynik.kmOdM)} – {formatujKmM(wynik.kmDoM)} · {formatLiczby(wynik.powierzchniaM2, 1)} m²
          </Text>
        ) : null}
        {arkusze.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {arkusze.map((a, i) => (
              <Przycisk
                key={a.id}
                tekst={etykietaZakladkiArkusza(a.nazwa || a.zrodloNazwa)}
                maly
                wariant={i === Math.min(idx, arkusze.length - 1) ? 'glowny' : 'drugi'}
                onPress={() => { setIdx(i); setPunkty([]); }}
              />
            ))}
          </ScrollView>
        ) : null}
        {arkusz ? (
          <PztArkuszPodglad
            arkusz={arkusz}
            theme={theme}
            wysokosc={360}
            podzialkaM={projekt.podzialkaKilometrazuM ?? 50}
            zakresStartM={wynik?.kmOdM}
            zakresKoniecM={wynik?.kmDoM}
            onWskazPdf={(p) => setPunkty((prev) => (prev.length >= 2 ? [p] : [...prev, p]))}
          />
        ) : (
          <Text style={{ color: theme.colors.textSecondary }}>Brak arkusza z tym obszarem.</Text>
        )}
        <View style={styl.rzad}>
          <Przycisk tekst="Od nowa" wariant="drugi" maly onPress={() => setPunkty([])} />
        </View>
      </View>
    </SafeModal>
  );
}

const styl = StyleSheet.create({
  rzad: { flexDirection: 'row' },
});
