import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';
import { InfoTooltip } from './InfoTooltip';

interface NumericInputProps extends Omit<TextInputProps, 'onChangeText' | 'value' | 'keyboardType'> {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  tooltip?: string;
  required?: boolean;
  decimals?: number;
}

export function NumericInput({
  label,
  value,
  onChangeText,
  unit,
  tooltip,
  required,
  decimals = 2,
  placeholder,
  ...rest
}: NumericInputProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const handleChange = (text: string) => {
    // Allow commas as decimal separator, strip other non-numeric chars
    const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
    // Only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] !== undefined && parts[1].length > decimals) return;
    onChangeText(cleaned);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
          {required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
        </Text>
        {tooltip ? <InfoTooltip tresc={tooltip} /> : null}
      </View>
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { color: theme.colors.text }]}
          {...rest}
        />
        {unit ? (
          <Text style={[styles.unit, { color: theme.colors.textSecondary }]}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  unit: { fontSize: 14, marginLeft: 8 },
});
