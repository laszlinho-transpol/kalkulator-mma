// ============================================================
// ANIMOWANY KAFELEK – fade + slide przy wejściu na ekran
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: 'bottom' | 'left' | 'right';
}

export function AnimatedCard({ children, delay = 0, duration = 350, from = 'bottom' }: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from === 'bottom' ? 24 : 0)).current;
  const translateX = useRef(new Animated.Value(from === 'left' ? -24 : from === 'right' ? 24 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    >
      {children}
    </Animated.View>
  );
}
