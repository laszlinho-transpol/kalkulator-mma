import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

export default function NotatnikScreen() {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { wpisy, zaladuj, dodaj, usun } = useNotatnikStore();
  const [notatka, setNotatka] = useState('');

  useEffect(() => { zaladuj(); }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Notatnik" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text, minHeight: 80 }]}
          value={notatka}
          onChangeText={setNotatka}
          placeholder="Szybka notatka z budowy..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={() => { if (notatka.trim()) { dodaj(notatka.trim(), 'Ręczna'); setNotatka(''); } }}>
          <Text style={styles.btnTekst}>Dodaj notatkę</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', marginTop: 8 }}>Zapisane pomiary i notatki</Text>
        {wpisy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>Brak wpisów – użyj „Zapisz do Notatnika” w kalkulatorach.</Text>
        ) : wpisy.map((w) => (
          <View key={w.id} style={[styles.wiersz, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{new Date(w.createdAt).toLocaleString('pl-PL')}{w.zrodlo ? ` · ${w.zrodlo}` : ''}</Text>
            <Text style={{ color: theme.colors.text, marginTop: 4 }}>{w.tresc}</Text>
            <TouchableOpacity onPress={() => usun(w.id)} style={{ marginTop: 6 }}>
              <Text style={{ color: theme.colors.danger, fontSize: 13 }}>Usuń</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '700' },
  wiersz: { borderWidth: 1, borderRadius: 10, padding: 12 },
});
