import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import type { Mieszanka } from '../../types';

interface MieszankaPickerProps {
  visible: boolean;
  selectedId: string;
  onSelect: (mieszanka: Mieszanka) => void;
  onClose: () => void;
  onDodajNowa?: () => void;
}

export function MieszankaPicker({
  visible,
  selectedId,
  onSelect,
  onClose,
  onDodajNowa,
}: MieszankaPickerProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const mieszanki = useMieszankiStore((s) => s.mieszanki);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.modalBackground }]}>
        <View style={[styles.naglowek, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.anuluj, { color: theme.colors.danger }]}>Anuluj</Text>
          </TouchableOpacity>
          <Text style={[styles.tytul, { color: theme.colors.text }]}>Wybierz mieszankę</Text>
          <View style={{ width: 60 }} />
        </View>

        {mieszanki.length === 0 ? (
          <View style={styles.puste}>
            <Text style={[styles.pusteTekst, { color: theme.colors.textSecondary }]}>
              Brak zapisanych mieszanek.
            </Text>
            {onDodajNowa && (
              <TouchableOpacity
                style={[styles.btnDodaj, { backgroundColor: theme.colors.primary }]}
                onPress={() => { onClose(); onDodajNowa(); }}
              >
                <Text style={styles.btnDodajTekst}>+ Dodaj pierwszą mieszankę</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={mieszanki}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[
                    styles.pozycja,
                    { backgroundColor: theme.colors.card, borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                    isSelected && { borderWidth: 2 },
                  ]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <View style={styles.pozycjaLewo}>
                    <Text style={[styles.rodzaj, { color: theme.colors.text }]}>{item.rodzaj}</Text>
                    <Text style={[styles.szczegoły, { color: theme.colors.textSecondary }]}>
                      ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³
                      {item.wytwórnia ? `  •  ${item.wytwórnia}` : ''}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  naglowek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  tytul: { fontSize: 17, fontWeight: '700' },
  anuluj: { fontSize: 17 },
  puste: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  pusteTekst: { fontSize: 15, textAlign: 'center' },
  btnDodaj: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnDodajTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pozycja: { borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  pozycjaLewo: { flex: 1 },
  rodzaj: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  szczegoły: { fontSize: 13 },
  ptaszek: { fontSize: 22, fontWeight: '700' },
});
