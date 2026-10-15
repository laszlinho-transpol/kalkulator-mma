import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { wstecz } from '../../../src/budzet/nawigacja';

export default function GrupaBitumicznaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Grupa bitumiczna"
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet') }}
      />
      <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
        Grupa bitumiczna będzie w kolejnym kroku.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  opis: { padding: 20, fontSize: 16, lineHeight: 22 },
});
