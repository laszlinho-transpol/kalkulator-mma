// ============================================================
// SAFE MODAL – modal z AppHeader i bezpiecznymi marginesami
// ============================================================

import React from 'react';
import { Modal, View, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from './AppHeader';
import type { AppTheme } from '../../constants/theme';

interface PrzyciskNaglowka {
  tekst: string;
  onPress: () => void;
  kolor?: string;
}

interface SafeModalProps {
  visible: boolean;
  tytul: string;
  theme: AppTheme;
  onClose: () => void;
  lewy?: PrzyciskNaglowka;
  prawy?: PrzyciskNaglowka;
  children: React.ReactNode;
  presentation?: 'pageSheet' | 'fullScreen';
}

export function SafeModal({
  visible, tytul, theme, onClose, lewy, prawy, children, presentation = 'pageSheet',
}: SafeModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={presentation}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.modalBackground }]}>
        <AppHeader
          tytul={tytul}
          lewy={lewy ?? { tekst: 'Anuluj', onPress: onClose, kolor: theme.colors.danger }}
          prawy={prawy}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
