import React, { useRef } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { CZAS, SKALA_NACISKU } from '../../constants/styl';

const AnimowanyPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Każdy klikalny element: lekkie zmniejszenie i przygaszenie przy wciśnięciu. */
export function Naciskany({ style, children, onPressIn, onPressOut, disabled, ...reszta }: Props) {
  const skala = useRef(new Animated.Value(1)).current;
  const animuj = (cel: number) => Animated.timing(skala, {
    toValue: cel,
    duration: CZAS.nacisk,
    useNativeDriver: Platform.OS !== 'web',
  }).start();

  return (
    <AnimowanyPressable
      {...reszta}
      disabled={disabled}
      onPressIn={(e) => { animuj(SKALA_NACISKU); onPressIn?.(e); }}
      onPressOut={(e) => { animuj(1); onPressOut?.(e); }}
      style={[
        style,
        { transform: [{ scale: skala }], opacity: skala.interpolate({ inputRange: [SKALA_NACISKU, 1], outputRange: [0.85, 1] }) },
        disabled ? { opacity: 0.5 } : null,
        Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as ViewStyle) : null,
      ]}
    >
      {children}
    </AnimowanyPressable>
  );
}
