// ============================================================
// WYBÓR BUDOWY – modal z listą zwijaną (do formularza planu)
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeModal } from './SafeModal';
import { CollapsibleSection } from './CollapsibleSection';
import type { AppTheme } from '../../constants/theme';
import type { Budowa } from '../../types';
import { karta, tekstTytul, tekstPodtytul } from '../../constants/layout';

interface BudowaPickerProps {
  visible: boolean;
  budowy: Budowa[];
  selectedId?: string;
  theme: AppTheme;
  onSelect: (budowaId: string | undefined, budowa?: Budowa) => void;
  onClose: () => void;
  onDodajNowa?: () => void;
}

export function BudowaPicker({ visible, budowy, selectedId, theme, onSelect, onClose, onDodajNowa }: BudowaPickerProps) {
  const bezPrzypisania = !selectedId;

  const wybierz = (id?: string, b?: Budowa) => {
    onSelect(id, b);
    onClose();
  };

  return (
    <SafeModal visible={visible} tytul="Wybierz budowę" theme={theme} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <TouchableOpacity
          style={[karta, { backgroundColor: bezPrzypisania ? `${theme.colors.primary}15` : theme.colors.card, borderColor: bezPrzypisania ? theme.colors.primary : theme.colors.border }]}
          onPress={() => wybierz(undefined)}
        >
          <Text style={[tekstTytul, { color: theme.colors.text }]}>Bez przypisania</Text>
          <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]}>Plan nie należy do konkretnej budowy</Text>
        </TouchableOpacity>

        {budowy.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
            Brak zapisanych budów. Dodaj budowę na ekranie „Budowa" lub w „Zaplanuj Masę".
          </Text>
        ) : (
          <CollapsibleSection tytul="Budowy" liczba={budowy.length} theme={theme} ikona="🏗️" domyslnieRozwinieta>
            {budowy.map((b) => {
              const sel = b.id === selectedId;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[karta, { backgroundColor: sel ? `${theme.colors.primary}15` : theme.colors.card, borderColor: sel ? theme.colors.primary : theme.colors.border, borderWidth: sel ? 2 : 1 }]}
                  onPress={() => wybierz(b.id, b)}
                >
                  <Text style={[tekstTytul, { color: theme.colors.text }]} numberOfLines={2}>{b.nazwaInwestycji}</Text>
                  <Text style={[tekstPodtytul, { color: theme.colors.textSecondary }]}>Kod: {b.kodBudowy}</Text>
                  {sel && <Text style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4 }}>✓ Wybrano</Text>}
                </TouchableOpacity>
              );
            })}
          </CollapsibleSection>
        )}

        {onDodajNowa && (
          <TouchableOpacity style={[styles.btnDodaj, { backgroundColor: theme.colors.primary }]} onPress={() => { onClose(); onDodajNowa(); }}>
            <Text style={styles.btnDodajTekst}>+ Dodaj nową budowę</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  btnDodaj: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDodajTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
