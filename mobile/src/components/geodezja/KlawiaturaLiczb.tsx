// Mała klawiatura liczbowa w aplikacji: zamiast systemowej, która zasłania pół ekranu i przesuwa widok.
// Pole liczby rejestruje się jako aktywne, a klawiatura rysuje się w swojej strefie (okienko, panel).

import React, { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useMotyw } from '../../hooks/useMotyw';
import { PROMIEN } from '../../constants/styl';
import { Pole } from '../common/Formularz';
import { Naciskany } from '../ui/Naciskany';
import { klawiszLiczby } from '../../utils/klawiszLiczby';

type Aktywne = {
  id: string;
  strefa: string;
  /** Pierwszy klawisz zastępuje całą wartość (jak zaznaczony tekst). */
  zastap: boolean;
  pole: { current: { wartosc: string; zmien: (t: string) => void; onGotowe?: () => void } };
};

let aktywne: Aktywne | null = null;
const sluchacze = new Set<() => void>();
const powiadom = () => sluchacze.forEach((f) => f());
const subskrybuj = (f: () => void) => {
  sluchacze.add(f);
  return () => {
    sluchacze.delete(f);
  };
};
const stan = () => aktywne;

/** Czy klawiatura liczbowa jest otwarta (np. żeby przewinąć do niej ekran). */
export function useKlawiaturaOtwarta(): boolean {
  return !!useSyncExternalStore(subskrybuj, stan, stan);
}

export function zamknijKlawiature() {
  if (!aktywne) return;
  aktywne = null;
  powiadom();
}

const StrefaKontekst = createContext('');

/** Obszar z własną klawiaturą – pola liczb w środku pokazują ją w miejscu `<KlawiaturaLiczb />`. */
export function StrefaKlawiatury({ children }: { children: React.ReactNode }) {
  const id = useId();
  return <StrefaKontekst.Provider value={id}>{children}</StrefaKontekst.Provider>;
}

export function PoleLiczby({ etykieta, value, onChangeText, placeholder, accessibilityLabel, info, jednostka, onGotowe, autoAktywne }: {
  etykieta?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  info?: string;
  jednostka?: string;
  /** Wywoływane klawiszem OK (np. „Ustaw cel”). */
  onGotowe?: () => void;
  /** Klawiatura otwarta od razu (np. odczyt nowego punktu). */
  autoAktywne?: boolean;
}) {
  const id = useId();
  const strefa = useContext(StrefaKontekst);
  const pole = useRef({ wartosc: value, zmien: onChangeText, onGotowe });
  pole.current = { wartosc: value, zmien: onChangeText, onGotowe };
  const akt = useSyncExternalStore(subskrybuj, stan, stan);
  const aktywuj = () => {
    Keyboard.dismiss();
    aktywne = { id, strefa, zastap: true, pole };
    powiadom();
  };
  useEffect(() => {
    if (autoAktywne && strefa) aktywuj();
    return () => {
      if (aktywne?.id === id) zamknijKlawiature();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <Pole
      etykieta={etykieta}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={accessibilityLabel}
      info={info}
      jednostka={jednostka}
      liczba
      bezKlawiatury={!!strefa}
      aktywne={akt?.id === id}
      onFocus={strefa ? aktywuj : undefined}
    />
  );
}

const KLAWISZE = [
  ['7', '8', '9', '⌫'],
  ['4', '5', '6', '±'],
  ['1', '2', '3', 'C'],
  [',', '0', 'OK'],
];

export function KlawiaturaLiczb() {
  const theme = useMotyw();
  const strefa = useContext(StrefaKontekst);
  const akt = useSyncExternalStore(subskrybuj, stan, stan);
  if (!akt || akt.strefa !== strefa) return null;

  const nacisnij = (k: string) => {
    const a = aktywne;
    if (!a) return;
    if (k === 'OK') {
      const gotowe = a.pole.current.onGotowe;
      zamknijKlawiature();
      gotowe?.();
      return;
    }
    a.pole.current.zmien(klawiszLiczby(a.pole.current.wartosc, k, a.zastap));
    if (a.zastap) {
      aktywne = { ...a, zastap: false };
      powiadom();
    }
  };

  return (
    <View accessibilityLabel="Klawiatura liczbowa" style={styles.klawiatura}>
      {KLAWISZE.map((rzad, i) => (
        <View key={i} style={styles.rzad}>
          {rzad.map((k) => {
            const ok = k === 'OK';
            const funkcja = !/^[\d,]$/.test(k);
            return (
              <Naciskany
                key={k}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Usuń znak' : k === 'C' ? 'Wyczyść' : k === '±' ? 'Zmień znak' : ok ? 'Gotowe' : `Klawisz ${k}`}
                onPress={() => nacisnij(k)}
                style={[styles.klawisz, {
                  flex: ok ? 2.08 : 1,
                  backgroundColor: ok ? theme.colors.primary : funkcja ? theme.colors.border : theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                }]}
              >
                <Text style={{ color: ok ? '#1A1A1A' : theme.colors.text, fontSize: 18, fontWeight: ok ? '800' : '700' }}>{k}</Text>
              </Naciskany>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  klawiatura: { gap: 5 },
  rzad: { flexDirection: 'row', gap: 5 },
  klawisz: { height: 40, borderRadius: PROMIEN.m, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
