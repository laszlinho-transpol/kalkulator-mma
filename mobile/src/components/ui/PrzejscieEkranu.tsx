import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { CZAS } from '../../constants/styl';

/**
 * Płynne wejście każdego ekranu (podpięte globalnie w app/_layout przez `screenLayout`).
 * W aplikacji animację przejścia robi natywny stos, więc tu działa tylko w przeglądarce.
 */
export function PrzejscieEkranu({ children }: { children: React.ReactNode }) {
  const postep = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 1)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    Animated.timing(postep, { toValue: 1, duration: CZAS.wejscie, useNativeDriver: false }).start();
  }, [postep]);

  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <Animated.View
      style={[styles.ekran, {
        opacity: postep,
        transform: [{ translateX: postep.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
});
