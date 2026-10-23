// Małe okienko nad kartką (dane punktu, odległość, cel) i przyciski pływającego paska narzędzi.
// Okienko stoi przy górnej krawędzi – klawiatura (systemowa lub liczbowa w okienku) jest pod nim i go nie zasłania.

import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMotyw } from '../../hooks/useMotyw';
import { PROMIEN, TYPOGRAFIA, cien } from '../../constants/styl';
import { Naciskany } from '../ui/Naciskany';
import { Przycisk } from '../ui/Przycisk';
import { KlawiaturaLiczb, StrefaKlawiatury } from './KlawiaturaLiczb';

export function Okienko({ widoczne, tytul, onAnuluj, onZapisz, tekstZapisz = 'Zapisz', children, dodatkowe }: {
  widoczne: boolean;
  tytul: string;
  onAnuluj: () => void;
  onZapisz?: () => void;
  tekstZapisz?: string;
  children: React.ReactNode;
  /** Przycisk po lewej stronie stopki (np. „Usuń”). */
  dodatkowe?: React.ReactNode;
}) {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  if (!widoczne) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onAnuluj}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.tlo, { paddingTop: insets.top + 10 }]}>
        <StrefaKlawiatury>
          <View accessibilityLabel={`Okno ${tytul}`} style={[styles.okno, cien(theme), { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]} numberOfLines={1}>{tytul}</Text>
            <ScrollView style={styles.tresc} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            <KlawiaturaLiczb />
            <View style={styles.stopka}>
              {dodatkowe}
              <View style={{ flex: 1 }} />
              <Przycisk wariant="drugi" maly tekst={onZapisz ? 'Anuluj' : 'Zamknij'} onPress={onAnuluj} />
              {onZapisz ? <Przycisk maly tekst={tekstZapisz} onPress={onZapisz} /> : null}
            </View>
          </View>
        </StrefaKlawiatury>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Kompaktowy przycisk pływającego paska (zaznaczony = aktywny tryb). */
export function PrzyciskPaska({ tekst, onPress, aktywny, accessibilityLabel, kolor, style }: {
  tekst: string;
  onPress: () => void;
  aktywny?: boolean;
  accessibilityLabel?: string;
  kolor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useMotyw();
  const k = kolor ?? theme.colors.primary;
  return (
    <Naciskany
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? tekst}
      accessibilityState={{ selected: !!aktywny }}
      onPress={onPress}
      hitSlop={4}
      style={[styles.pigulka, {
        borderColor: aktywny ? k : theme.colors.border,
        backgroundColor: aktywny ? `${k}26` : theme.colors.card,
      }, style]}
    >
      <Text style={{ color: theme.colors.text, fontWeight: aktywny ? '800' : '700', fontSize: 13 }} numberOfLines={1}>{tekst}</Text>
    </Naciskany>
  );
}

export function PasekPlywajacy({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useMotyw();
  return (
    <View style={[styles.pasek, cien(theme), { backgroundColor: `${theme.colors.card}F2`, borderColor: theme.colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12, paddingBottom: 12 },
  okno: { width: '100%', maxWidth: 440, maxHeight: '100%', borderRadius: PROMIEN.l, borderWidth: 1, padding: 14, gap: 6 },
  // Przewija się tylko wtedy, gdy treść naprawdę nie mieści się nad klawiaturą.
  tresc: { flexGrow: 0, flexShrink: 1 },
  stopka: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  pigulka: { borderWidth: 1, borderRadius: PROMIEN.pigulka, paddingHorizontal: 11, paddingVertical: 7 },
  pasek: { borderWidth: 1, borderRadius: PROMIEN.l, padding: 8, gap: 8 },
});
