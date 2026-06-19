// Komponent ikonki "i" z wyjaśnieniem – pojawia się przy każdej opcji
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';

interface InfoTooltipProps {
  tresc: string;
}

export function InfoTooltip({ tresc }: InfoTooltipProps) {
  const [widoczny, setWidoczny] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <>
      <TouchableOpacity
        onPress={() => setWidoczny(true)}
        style={[styles.przycisk, { borderColor: theme.colors.info, backgroundColor: `${theme.colors.info}20` }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Informacja"
      >
        <Text style={[styles.litera, { color: theme.colors.info }]}>i</Text>
      </TouchableOpacity>

      <Modal
        visible={widoczny}
        transparent
        animationType="fade"
        onRequestClose={() => setWidoczny(false)}
      >
        <Pressable style={styles.tlo} onPress={() => setWidoczny(false)}>
          <View style={[styles.karta, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
            <Text style={[styles.tekst, { color: theme.colors.text }]}>{tresc}</Text>
            <TouchableOpacity
              onPress={() => setWidoczny(false)}
              style={[styles.przyciskZamknij, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.tekstZamknij}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  przycisk: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  litera: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  tlo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  karta: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    maxWidth: 340,
    width: '100%',
  },
  tekst: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  przyciskZamknij: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tekstZamknij: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
