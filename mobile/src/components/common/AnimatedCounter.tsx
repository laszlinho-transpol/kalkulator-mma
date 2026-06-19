// ============================================================
// ANIMOWANY LICZNIK – płynne odliczanie do wartości docelowej
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, type TextStyle } from 'react-native';

interface AnimatedCounterProps {
  wartosc: number;
  czas?: number;
  delay?: number;
  style?: TextStyle;
}

export function AnimatedCounter({ wartosc, czas = 600, delay = 0, style }: AnimatedCounterProps) {
  const animacja = useRef(new Animated.Value(0)).current;
  const [wyswietlana, setWyswietlana] = useState(0);

  useEffect(() => {
    animacja.setValue(0);
    const timeout = setTimeout(() => {
      Animated.timing(animacja, {
        toValue: wartosc,
        duration: czas,
        useNativeDriver: false,
      }).start();
    }, delay);

    const listener = animacja.addListener(({ value }) => {
      setWyswietlana(Math.round(value));
    });

    return () => {
      clearTimeout(timeout);
      animacja.removeListener(listener);
    };
  }, [wartosc]);

  return <Text style={style}>{wyswietlana}</Text>;
}
