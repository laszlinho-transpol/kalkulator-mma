import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeModal } from './SafeModal';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { WyborMieszanki } from '../mieszanki/WyborMieszanki';
import type { AppTheme } from '../../constants/theme';
import type { Mieszanka } from '../../types';

interface MieszankaPickerProps {
  visible: boolean;
  selectedId: string;
  theme: AppTheme;
  onSelect: (mieszanka: Mieszanka) => void;
  onClose: () => void;
  onDodajNowa?: () => void;
  dozwoloneIds?: string[];
}

export function MieszankaPicker({ visible, selectedId, theme, onSelect, onClose, onDodajNowa, dozwoloneIds }: MieszankaPickerProps) {
  const wszystkie = useMieszankiStore((s) => s.mieszanki);
  const mieszanki = useMemo(
    () => (dozwoloneIds && dozwoloneIds.length > 0 ? wszystkie.filter((m) => dozwoloneIds.includes(m.id)) : wszystkie),
    [wszystkie, dozwoloneIds],
  );

  return (
    <SafeModal visible={visible} tytul="Wybierz mieszankę" theme={theme} onClose={onClose}>
      {mieszanki.length === 0 ? (
        <View style={styles.puste}>
          <Text style={[styles.pusteTekst, { color: theme.colors.textSecondary }]}>Brak zapisanych mieszanek.</Text>
          {onDodajNowa && (
            <TouchableOpacity style={[styles.btnDodaj, { backgroundColor: theme.colors.primary }]} onPress={() => { onClose(); onDodajNowa(); }}>
              <Text style={styles.btnDodajTekst}>+ Dodaj pierwszą mieszankę</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <WyborMieszanki
            mieszanki={mieszanki}
            zaznaczone={selectedId ? [selectedId] : []}
            onWybierz={(m) => { onSelect(m); onClose(); }}
          />
        </ScrollView>
      )}
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  puste: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  pusteTekst: { fontSize: 15, textAlign: 'center' },
  btnDodaj: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnDodajTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
