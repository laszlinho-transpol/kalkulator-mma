import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import { InfoTooltip } from '../common/InfoTooltip';

interface PoleProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: AppTheme;
  placeholder?: string;
}

export function PoleNumeryczne({ label, value, onChange, theme, placeholder }: PoleProps) {
  return (
    <View>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 4, fontSize: 13 }}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );
}

export function WynikKafelek({ etykieta, wartosc, theme }: { etykieta: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={[styles.wynik, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{etykieta}</Text>
      <Text style={{ color: theme.colors.primary, fontSize: 24, fontWeight: '800', marginTop: 4 }}>{wartosc}</Text>
    </View>
  );
}

export function SchematInfo({ tekst }: { tekst: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '700' }}>Jak liczyć</Text>
      <InfoTooltip tresc={tekst} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  wynik: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8 },
  schemat: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
});
