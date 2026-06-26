// ============================================================
// ERROR BOUNDARY – łapie błędy React zamiast natychmiastowego crashu
// ============================================================

import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  blad: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { blad: null };

  static getDerivedStateFromError(error: Error): State {
    return { blad: error };
  }

  render() {
    if (!this.state.blad) return this.props.children;

    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.tytul}>Coś poszło nie tak</Text>
        <Text style={styles.opis}>
          Aplikacja napotkała błąd przy starcie. Spróbuj uruchomić ponownie.
          Jeśli problem wraca, odinstaluj aplikację i zainstaluj jeszcze raz z Play Store.
        </Text>
        <Text style={styles.kod}>{this.state.blad.message}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => this.setState({ blad: null })}>
          <Text style={styles.btnTekst}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0F0F1A' },
  tytul: { fontSize: 22, fontWeight: '800', color: '#E8A020', marginBottom: 12 },
  opis: { fontSize: 15, lineHeight: 22, color: '#ccc', marginBottom: 16 },
  kod: { fontSize: 12, color: '#888', fontFamily: 'monospace', marginBottom: 24 },
  btn: { backgroundColor: '#E8A020', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
