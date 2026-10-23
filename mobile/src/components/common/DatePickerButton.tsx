import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { dataZIso, isoZDaty } from '../ui/Kalendarz';
import { KalendarzDnia } from './KalendarzDnia';

interface DatePickerButtonProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

/** Pole daty na obiektach Date – ten sam kalendarz co w całej aplikacji. */
export function DatePickerButton({ label, value, onChange, minimumDate }: DatePickerButtonProps) {
  const theme = useMotyw();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <KalendarzDnia
        wartosc={isoZDaty(value)}
        min={minimumDate ? isoZDaty(minimumDate) : undefined}
        accessibilityLabel={`${label}: wybierz datę`}
        onZatwierdz={(iso) => onChange(dataZIso(iso))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
});
