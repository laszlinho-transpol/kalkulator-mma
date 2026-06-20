// ============================================================
// PRESSABLE SCALE – lekkie "wciśnięcie" przy dotknięciu
// ============================================================

import React, { useRef } from 'react';
import { Animated, Pressable, type PressableProps } from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  scaleValue?: number;
}

export function PressableScale({ children, scaleValue = 0.96, onPress, style, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const nacisnij = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress?.({} as any);
  };

  return (
    <Pressable onPress={nacisnij} style={style} {...rest}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
