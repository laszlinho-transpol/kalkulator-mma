import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeModal } from './SafeModal';
import { CollapsibleSection } from './CollapsibleSection';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { grupujPoKluczu } from '../../utils/grouping';
import type { AppTheme } from '../../constants/theme';
import type { Mieszanka } from '../../types';
import { karta, tekstTytul, tekstPodtytul } from '../../constants/layout';

interface MieszankaPickerProps {
  visible: boolean;
  selectedId: string;
  theme: AppTheme;
  onSelect: (mieszanka: Mieszanka) => void;
  onClose: () => void;
  onDodajNowa?: () => void;
}

export function MieszankaPicker({ visible, selectedId, theme, onSelect, onClose, onDodajNowa }: MieszankaPickerProps) {
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const grupy = useMemo(() => grupujPoKluczu(mieszanki, (m) => m.wytwórnia, 'Bez wytwórni'), [mieszanki]);

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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {grupy.map((grupa) => (
            <CollapsibleSection
              key={grupa.klucz}
              tytul={grupa.tytul}
              liczba={grupa.elementy.length}
              theme={theme}
              ikona="🏭"
              plaski={grupa.bezPrzypisania}
            >
              {grupa.elementy.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[karta, { backgroundColor: theme.colors.card, borderColor: isSelected ? theme.colors.primary : theme.colors.border, borderWidth: isSelected ? 2 : 1, flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => { onSelect(item); onClose(); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[tekstTytul, { color: theme.colors.text }]} numberOfLines={1}>{item.rodzaj}</Text>
                      <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        ρ = {item.ciezarObjetosciowy.toFixed(3)} t/m³
                      </Text>
                    </View>
                    {isSelected && <Text style={{ color: theme.colors.primary, fontSize: 20, fontWeight: '700' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </CollapsibleSection>
          ))}
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
