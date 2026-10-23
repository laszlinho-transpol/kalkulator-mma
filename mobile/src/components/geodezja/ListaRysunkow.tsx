// Lista zapisanych szkiców / szablonów przekroju: zakładki Aktywne | Archiwum, „Nowy” na górze.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Karta, Przycisk, Zakladki, ZasadaDzialania, useMotyw, type SlajdZasady } from '../ui';
import { EmptyState } from '../common/EmptyState';

export interface PozycjaRysunku {
  id: string;
  nazwa: string;
  opis?: string;
  podsumowanie: string;
  archiwum?: boolean;
  updatedAt: string;
}

export function ListaRysunkow({ tytul, pozycje, tekstNowy, onNowy, onOtworz, pusteTytul, zasada }: {
  tytul: string;
  zasada?: { klucz: string; slajdy: SlajdZasady[] };
  pozycje: PozycjaRysunku[];
  tekstNowy: string;
  onNowy: () => void;
  onOtworz: (id: string) => void;
  pusteTytul: string;
}) {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const [zakladka, setZakladka] = useState<'aktywne' | 'archiwum'>('aktywne');
  const lista = pozycje
    .filter((p) => (zakladka === 'archiwum' ? !!p.archiwum : !p.archiwum))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const wArchiwum = pozycje.filter((p) => p.archiwum).length;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul={tytul} lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={zasada?.klucz} />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {zasada ? <ZasadaDzialania klucz={zasada.klucz} slajdy={zasada.slajdy} /> : null}
        <Zakladki
          theme={theme}
          aktywna={zakladka}
          onZmien={setZakladka}
          zakladki={[['aktywne', `Aktywne · ${pozycje.length - wArchiwum}`], ['archiwum', `Archiwum · ${wArchiwum}`]]}
        />
        {zakladka === 'aktywne' ? <Przycisk ikona="plus" tekst={tekstNowy} onPress={onNowy} /> : null}
        {lista.length === 0 ? (
          <EmptyState
            ikona={zakladka === 'archiwum' ? '🗄️' : '📐'}
            tytul={zakladka === 'archiwum' ? 'Archiwum jest puste' : pusteTytul}
            opis={zakladka === 'archiwum' ? 'Tu trafiają rysunki przeniesione do archiwum.' : 'Utwórz pierwszy przyciskiem powyżej.'}
          />
        ) : (
          lista.map((p) => (
            <Karta
              key={p.id}
              tytul={p.nazwa}
              podtytul={p.opis}
              podsumowanie={p.podsumowanie}
              znaczek={p.archiwum ? { tekst: 'Archiwum', kolor: theme.colors.textSecondary } : undefined}
              onPress={() => onOtworz(p.id)}
              accessibilityLabel={`Otwórz ${p.nazwa}`}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ ekran: { flex: 1 } });
