import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Modal,
  Platform,
  useColorScheme,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { lightTheme, darkTheme } from '../../constants/theme';
import { formatujDatePl } from '../../utils/dates';

interface DatePickerButtonProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePickerButton({ label, value, onChange, minimumDate }: DatePickerButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <input
          type="date"
          value={ymd(value)}
          min={minimumDate ? ymd(minimumDate) : undefined}
          onChange={(e) => {
            const v = (e.target as HTMLInputElement).value;
            if (!v) return;
            const d = new Date(`${v}T06:00:00`);
            if (!Number.isNaN(d.getTime())) onChange(d);
          }}
          style={{
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.text,
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 15,
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </View>
    );
  }

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(selectedDate);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          📅 {formatujDatePl(value)}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          locale="pl"
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.iosBackdrop}>
            <View style={[styles.iosSheet, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.iosHeader, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosDone, { color: theme.colors.primary }]}>Gotowe</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                locale="pl"
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateText: { fontSize: 15 },
  iosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
  },
  iosDone: { fontSize: 17, fontWeight: '700' },
});
